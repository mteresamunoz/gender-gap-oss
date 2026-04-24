"""
Fetch top contributors of each curated AI repo.

Output:
  data/raw/ai_repo_contributors.json  — [(repo, login, contributions, rank)]
  data/raw/ai_contributors.json       — unique contributor profiles (login, name, country, ...)

API cost: 20 repos * 1 page (per_page=100) + ~N unique profiles.
With overlap, expect ~600-1000 unique profiles.
GitHub rate limit authenticated = 5000/h — fits in one run.
"""
import json
import os
import time

import requests

from curated_repos import CURATED_REPOS
from fetch_github import HEADERS, infer_country

TOP_CONTRIBUTORS_PER_REPO = 100

REPO_CONTRIB_PATH = os.path.join(os.path.dirname(__file__), "..", "raw", "ai_repo_contributors.json")
CONTRIBUTORS_PATH = os.path.join(os.path.dirname(__file__), "..", "raw", "ai_contributors.json")


def fetch_contributors(repo):
    """Return list of (login, contributions) for top contributors of a repo."""
    owner, name = repo.split("/")
    url = (
        f"https://api.github.com/repos/{owner}/{name}/contributors"
        f"?per_page={TOP_CONTRIBUTORS_PER_REPO}&anon=false"
    )
    r = requests.get(url, headers=HEADERS)
    if r.status_code == 404:
        print(f"    ! repo not found: {repo}")
        return []
    if not r.ok:
        print(f"    ! error {r.status_code} fetching {repo}: {r.text[:200]}")
        return []
    return [
        {"login": c["login"], "contributions": c.get("contributions", 0), "type": c.get("type")}
        for c in r.json()
        if c.get("type") != "Bot"  # skip dependabot et al.
    ]


def fetch_profile(login):
    r = requests.get(f"https://api.github.com/users/{login}", headers=HEADERS)
    if not r.ok:
        return None
    p = r.json()
    if p.get("type") != "User":
        # orgs appear occasionally in contributor lists; skip.
        return None
    location = p.get("location")
    created = p.get("created_at") or ""
    return {
        "login": p["login"],
        "name": p.get("name"),
        "bio": p.get("bio"),
        "company": p.get("company"),
        "location": location,
        "country": infer_country(location),
        "avatar_url": p.get("avatar_url"),
        "account_created_year": int(created[:4]) if created else None,
    }


def main():
    os.makedirs(os.path.dirname(REPO_CONTRIB_PATH), exist_ok=True)

    # Step 1: contributors per repo.
    all_rows = []
    unique_logins = {}  # login -> first contributions count we saw (for priority if needed)

    print(f"Fetching top {TOP_CONTRIBUTORS_PER_REPO} contributors of {len(CURATED_REPOS)} repos...\n")
    for repo, category in CURATED_REPOS:
        print(f"  {repo} ({category})")
        contributors = fetch_contributors(repo)
        for rank, c in enumerate(contributors, 1):
            all_rows.append({
                "repo": repo,
                "login": c["login"],
                "contributions": c["contributions"],
                "rank": rank,
            })
            unique_logins.setdefault(c["login"], c["contributions"])
        print(f"    -> {len(contributors)} contributors")
        time.sleep(0.5)

    with open(REPO_CONTRIB_PATH, "w", encoding="utf-8") as f:
        json.dump(all_rows, f, indent=2, ensure_ascii=False)
    print(f"\nSaved {len(all_rows)} repo-contributor rows to {REPO_CONTRIB_PATH}")
    print(f"Unique contributors across all curated repos: {len(unique_logins)}\n")

    # Step 2: unique contributor profiles (resume if partial).
    existing = {}
    if os.path.exists(CONTRIBUTORS_PATH):
        with open(CONTRIBUTORS_PATH, encoding="utf-8") as f:
            existing = {p["login"]: p for p in json.load(f)}
        print(f"Resuming: {len(existing)} profiles already fetched.")

    to_fetch = [l for l in unique_logins if l not in existing]
    print(f"Fetching {len(to_fetch)} new profiles...")

    profiles = list(existing.values())
    for i, login in enumerate(to_fetch, 1):
        print(f"  {i}/{len(to_fetch)}: @{login}")
        profile = fetch_profile(login)
        if profile:
            profiles.append(profile)
        if i % 50 == 0:
            # Incremental save every 50 in case something breaks.
            with open(CONTRIBUTORS_PATH, "w", encoding="utf-8") as f:
                json.dump(profiles, f, indent=2, ensure_ascii=False)
        time.sleep(0.3)

    with open(CONTRIBUTORS_PATH, "w", encoding="utf-8") as f:
        json.dump(profiles, f, indent=2, ensure_ascii=False)
    print(f"\nSaved {len(profiles)} unique contributor profiles to {CONTRIBUTORS_PATH}")


if __name__ == "__main__":
    main()
