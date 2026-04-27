"""
Fetch per-repo, per-year commit counts for all curated repos.

Uses GitHub REST API /repos/{owner}/{repo}/stats/contributors.
This endpoint returns weekly commit counts per contributor;
we aggregate weeks into calendar years.

Output:
  data/raw/repo_yearly_commits.json  — [{repo, login, year, commits}, ...]

Rate limit: 1 call per repo. With 20 repos, trivial cost.
Note: GitHub may return 202 if stats are still being computed.
We retry with exponential backoff in that case.
"""
import json
import os
import time

import requests

from curated_repos import CURATED_REPOS
from fetch_github import HEADERS

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "raw", "repo_yearly_commits.json")

MAX_RETRIES = 5
BASE_DELAY = 2  # seconds


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
        if r.status_code == 404:
            print(f"    ! repo not found: {repo}")
            return []
        if not r.ok:
            print(f"    ! error {r.status_code} fetching {repo}: {r.text[:200]}")
            return []
        return r.json()

    print(f"    ! gave up waiting for {repo} stats")
    return []


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
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

    all_rows = []

    print(f"Fetching contributor stats for {len(CURATED_REPOS)} repos...\n")
    for repo, category in CURATED_REPOS:
        print(f"  {repo} ({category})")
        stats = fetch_repo_stats(repo)
        if not stats:
            continue

        repo_rows = 0
        for contrib in stats:
            author = contrib.get("author")
            if not author:
                continue
            login = author.get("login")
            if not login:
                continue

            yearly = aggregate_yearly(contrib)
            for yc in yearly:
                all_rows.append({
                    "repo": repo,
                    "login": login,
                    "year": yc["year"],
                    "commits": yc["commits"],
                })
                repo_rows += 1

        print(f"    -> {repo_rows} yearly rows")
        time.sleep(0.5)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_rows, f, indent=2, ensure_ascii=False)

    print(f"\nSaved {len(all_rows)} rows to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
