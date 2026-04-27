"""
Fetch per-repo, per-year commit counts for all curated repos.

Uses GitHub REST API /repos/{owner}/{repo}/stats/contributors.
This endpoint returns weekly commit counts per contributor;
we aggregate weeks into calendar years.

Resumable: saves progress to data/raw/repo_yearly_progress.json.
Repos that return 202 (computing) or hit rate limit are skipped
and retried on the next run.

Output:
  data/raw/repo_yearly_commits.json  — [{repo, login, year, commits}, ...]
"""
import json
import os
import time

import requests

from curated_repos import CURATED_REPOS
from fetch_github import HEADERS

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "raw", "repo_yearly_commits.json")
PROGRESS_PATH = os.path.join(os.path.dirname(__file__), "..", "raw", "repo_yearly_progress.json")

MAX_RETRIES = 10          # increased for large repos
BASE_DELAY = 2            # seconds
RATE_LIMIT_PAUSE = 600    # 10 minutes when we hit 403


def load_existing():
    """Load any previously saved rows."""
    if os.path.exists(OUTPUT_PATH):
        with open(OUTPUT_PATH, encoding="utf-8") as f:
            return json.load(f)
    return []


def save_rows(rows):
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2, ensure_ascii=False)


def load_progress():
    """Return set of repos already successfully fetched."""
    if os.path.exists(PROGRESS_PATH):
        with open(PROGRESS_PATH, encoding="utf-8") as f:
            data = json.load(f)
        return set(data.get("done", []))
    return set()


def save_progress(done_repos):
    os.makedirs(os.path.dirname(PROGRESS_PATH), exist_ok=True)
    with open(PROGRESS_PATH, "w", encoding="utf-8") as f:
        json.dump({"done": sorted(done_repos)}, f, indent=2)


def fetch_repo_stats(repo):
    """Fetch contributor stats for a repo; retry on 202 (computing)."""
    owner, name = repo.split("/")
    url = f"https://api.github.com/repos/{owner}/{name}/stats/contributors"

    for attempt in range(MAX_RETRIES):
        r = requests.get(url, headers=HEADERS)

        if r.status_code == 202:
            delay = BASE_DELAY * (2 ** attempt)
            print(f"    ! stats computing for {repo}, retrying in {delay}s...")
            time.sleep(delay)
            continue

        if r.status_code == 403:
            # Rate limit hit.
            reset_ts = r.headers.get("X-RateLimit-Reset")
            if reset_ts:
                wait = max(0, int(reset_ts) - int(time.time()) + 5)
                print(f"    ! rate limit for {repo}. Waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"    ! rate limit for {repo}. Waiting {RATE_LIMIT_PAUSE}s...")
                time.sleep(RATE_LIMIT_PAUSE)
            continue

        if r.status_code == 404:
            print(f"    ! repo not found: {repo}")
            return []

        if not r.ok:
            print(f"    ! error {r.status_code} fetching {repo}: {r.text[:200]}")
            return []

        return r.json()

    print(f"    ! gave up waiting for {repo} stats")
    return None  # None = should retry later


def aggregate_yearly(contributor_stats):
    """
    contributor_stats is the raw JSON for one contributor from GitHub:
      { author: { login }, total: N, weeks: [{ w: ts, a: _, d: _, c: commits }, ...] }
    Returns list of { year, commits } dicts.
    """
    year_commits = {}
    for week in contributor_stats.get("weeks", []):
        ts = week.get("w")
        commits = week.get("c", 0)
        if ts and commits:
            year = int(time.strftime("%Y", time.gmtime(ts)))
            year_commits[year] = year_commits.get(year, 0) + commits
    return [{"year": y, "commits": c} for y, c in sorted(year_commits.items())]


def main():
    # 1. Load existing data so we can merge incrementally.
    all_rows = load_existing()
    existing_repos = {r["repo"] for r in all_rows}
    done_repos = load_progress()

    # Build a lookup by repo for dedup inside this run.
    rows_by_key = {}
    for r in all_rows:
        key = (r["repo"], r["login"], r["year"])
        rows_by_key[key] = r

    repos_to_fetch = [(repo, cat) for repo, cat in CURATED_REPOS if repo not in done_repos]

    if not repos_to_fetch:
        print("All repos already fetched. Nothing to do.")
        return

    print(f"Fetching contributor stats for {len(repos_to_fetch)} remaining repos...\n")

    new_rows = 0
    for repo, category in repos_to_fetch:
        print(f"  {repo} ({category})")
        stats = fetch_repo_stats(repo)

        if stats is None:
            # 202 retries exhausted or rate limit — stop and resume later.
            print(f"    -> will retry {repo} on next run")
            break

        if not stats:
            # 404 or other hard error — mark as done so we don't retry forever.
            done_repos.add(repo)
            continue

        for contrib in stats:
            author = contrib.get("author")
            if not author:
                continue
            login = author.get("login")
            if not login:
                continue

            yearly = aggregate_yearly(contrib)
            for yc in yearly:
                key = (repo, login, yc["year"])
                rows_by_key[key] = {
                    "repo": repo,
                    "login": login,
                    "year": yc["year"],
                    "commits": yc["commits"],
                }
                new_rows += 1

        done_repos.add(repo)
        print(f"    -> {new_rows} new yearly rows this batch")
        time.sleep(0.5)

    # Save merged dataset.
    final_rows = list(rows_by_key.values())
    save_rows(final_rows)
    save_progress(done_repos)

    print(f"\nSaved {len(final_rows)} total rows to {OUTPUT_PATH}")
    print(f"  ({len(final_rows) - len(all_rows)} new this run)")
    print(f"  {len(done_repos)}/{len(CURATED_REPOS)} repos completed.")
    remaining = len(CURATED_REPOS) - len(done_repos)
    if remaining > 0:
        print(f"  {remaining} repos remaining — re-run to continue.")


if __name__ == "__main__":
    main()
