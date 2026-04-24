"""
Fetch yearly GitHub contribution stats for curated-repo contributors via GraphQL.

Uses contributionsCollection() which counts ALL public activity on GitHub — not just
the curated repos. This is intentional: it measures how much people in the AI
ecosystem contribute overall.

Resumable: saves progress to data/raw/contributor_yearly_progress.json.
Stops cleanly when rate limit is low and resumes on next run.
"""
import json
import os
import sys
import time
from datetime import datetime

import requests

scripts_dir = os.path.dirname(__file__)
sys.path.insert(0, scripts_dir)
from db import get_db, setup_schema

CONTRIBUTORS_PATH = os.path.join(scripts_dir, "..", "processed", "ai_contributors.json")
PROGRESS_PATH = os.path.join(scripts_dir, "..", "raw", "contributor_yearly_progress.json")

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Content-Type": "application/json",
}

YEARS = list(range(2017, 2026))  # 2017 through 2025
RATE_LIMIT_THRESHOLD = 100  # stop when fewer than this many points remain
GRAPHQL_URL = "https://api.github.com/graphql"

GRAPHQL_QUERY = """
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalPullRequestReviewContributions
    }
  }
}
"""


def fetch_for_year(login: str, year: int):
    """Return dict with stats or None if user not found / error."""
    from_date = f"{year}-01-01T00:00:00Z"
    to_date = f"{year + 1}-01-01T00:00:00Z"
    payload = {
        "query": GRAPHQL_QUERY,
        "variables": {"login": login, "from": from_date, "to": to_date},
    }
    r = requests.post(GRAPHQL_URL, headers=HEADERS, json=payload, timeout=30)
    if not r.ok:
        print(f"    HTTP {r.status_code} for {login}/{year}")
        return None, r.headers

    data = r.json()
    if data.get("errors"):
        # Some errors are recoverable (e.g. user not found), others are rate limits.
        for err in data["errors"]:
            msg = err.get("message", "")
            if "rate limit" in msg.lower() or "API rate limit" in msg:
                print(f"    Rate limit error for {login}/{year}")
                return None, r.headers
        # Non-rate error (e.g. user does not exist) -> mark not_found.
        print(f"    GraphQL error for {login}/{year}: {data['errors'][0].get('message')}")
        return "not_found", r.headers

    user = data.get("data", {}).get("user")
    if user is None:
        return "not_found", r.headers

    coll = user.get("contributionsCollection", {})
    return {
        "commits": coll.get("totalCommitContributions", 0),
        "prs": coll.get("totalPullRequestContributions", 0),
        "issues": coll.get("totalIssueContributions", 0),
        "reviews": coll.get("totalPullRequestReviewContributions", 0),
    }, r.headers


def save_progress(progress: dict):
    os.makedirs(os.path.dirname(PROGRESS_PATH), exist_ok=True)
    with open(PROGRESS_PATH, "w", encoding="utf-8") as f:
        json.dump(progress, f, indent=2, ensure_ascii=False)


def write_to_db(progress: dict):
    conn = get_db()
    setup_schema(conn)

    # Only insert logins that actually exist in contributors table.
    valid_logins = {r["login"] for r in conn.execute("SELECT login FROM contributors").fetchall()}
    print(f"Valid contributors in DB: {len(valid_logins)}")

    rows_written = 0
    skipped = 0
    for login, years in progress.items():
        if login not in valid_logins:
            skipped += 1
            continue
        if years.get("not_found"):
            continue
        for year, stats in years.items():
            if year == "not_found" or not isinstance(stats, dict):
                continue
            try:
                y = int(year)
            except ValueError:
                continue
            conn.execute(
                """
                INSERT OR REPLACE INTO contributor_yearly
                (login, year, commits, prs, issues, reviews)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    login,
                    y,
                    stats.get("commits", 0),
                    stats.get("prs", 0),
                    stats.get("issues", 0),
                    stats.get("reviews", 0),
                ),
            )
            rows_written += 1
    conn.commit()
    conn.close()
    print(f"\nWrote {rows_written} rows to contributor_yearly.")
    if skipped:
        print(f"  Skipped {skipped} logins not found in contributors table.")


def main():
    if not GITHUB_TOKEN:
        print("ERROR: GITHUB_TOKEN environment variable required.")
        return

    if not os.path.exists(CONTRIBUTORS_PATH):
        print(f"ERROR: {CONTRIBUTORS_PATH} not found. Run fetch_repo_contributors.py + infer_gender.py first.")
        return

    with open(CONTRIBUTORS_PATH, encoding="utf-8") as f:
        contributors = json.load(f)

    logins = [c["login"] for c in contributors if c.get("login")]

    # Load existing progress.
    progress = {}
    if os.path.exists(PROGRESS_PATH):
        with open(PROGRESS_PATH, encoding="utf-8") as f:
            progress = json.load(f)
        print(f"Resuming: {len(progress)} / {len(logins)} logins partially processed.")

    total_cells = len(logins) * len(YEARS)
    completed = 0
    for login, years in progress.items():
        if years.get("not_found"):
            completed += len(YEARS)
        else:
            completed += sum(1 for y in YEARS if str(y) in years)

    print(f"Total work: {total_cells} (login × year). Completed: {completed}. Remaining: {total_cells - completed}.")
    print("Starting GraphQL queries...\n")

    rate_limit_stop = False
    queries_this_batch = 0

    for login in logins:
        if login not in progress:
            progress[login] = {}

        login_data = progress[login]
        if login_data.get("not_found"):
            continue

        for year in YEARS:
            sy = str(year)
            if sy in login_data:
                continue

            result, headers = fetch_for_year(login, year)

            # Track rate limit.
            remaining = headers.get("X-RateLimit-Remaining")
            if remaining is not None:
                try:
                    rem = int(remaining)
                    if rem < RATE_LIMIT_THRESHOLD:
                        print(f"\n  Rate limit almost exhausted ({rem} remaining). Stopping to resume later.")
                        rate_limit_stop = True
                        break
                except ValueError:
                    pass

            if result is None:
                # Likely rate limit or transient error — stop to retry later.
                rate_limit_stop = True
                break

            if result == "not_found":
                login_data["not_found"] = True
                print(f"  {login}: user not found (skipping all years)")
                break

            login_data[sy] = result
            completed += 1
            queries_this_batch += 1

            if queries_this_batch % 50 == 0:
                save_progress(progress)
                print(f"  Saved progress ({completed}/{total_cells} completed)")

            time.sleep(0.4)  # be nice to the API

        if rate_limit_stop:
            break

    save_progress(progress)
    print(f"\nProgress saved to {PROGRESS_PATH}")
    print(f"Completed {completed}/{total_cells} cells.")

    # Always write what we have to the DB.
    write_to_db(progress)

    if rate_limit_stop:
        print("\nNOTE: Stopped early due to rate limit. Re-run tomorrow to continue.")
    else:
        print("\nAll done!")


if __name__ == "__main__":
    main()
