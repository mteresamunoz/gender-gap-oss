"""Fetch top 100 GitHub users by country (by followers).

Usage:
    python fetch_github_by_country.py "United States"
    python fetch_github_by_country.py --all

Searches GitHub API with location:<country> sort:followers-desc.
Reuses the same profile enrichment logic as fetch_github.py.
Output: data/raw/github_users_by_country.json (appended per-country).
"""
import json
import os
import sys
import time
import argparse

import requests

# Import shared utilities from fetch_github
from fetch_github import (
    HEADERS, GRAPHQL_HEADERS, GRAPHQL_URL,
    infer_country, top_languages_for, fetch_pronouns_batch,
    get_profile,
)

TOP_N = 100
RAW_PATH = os.path.join(os.path.dirname(__file__), "..", "raw", "github_users_by_country.json")

# Countries to fetch (Phase 2 list)
COUNTRIES = [
    "United States", "China", "India", "United Kingdom", "Germany",
    "France", "Brazil", "Canada", "Japan", "Russia",
    "Spain", "Netherlands", "Australia", "Poland", "Ukraine",
    "Italy", "Sweden", "South Korea", "Mexico", "Turkey",
    "Indonesia", "Vietnam", "Israel", "Argentina", "Switzerland",
    "Belgium", "Singapore", "Taiwan", "Portugal", "Denmark",
]


def fetch_top_for_country(country, n=100):
    """Search GitHub users with location:country, sorted by followers."""
    logins = []
    page = 1
    while len(logins) < n:
        query = f"location:{country} sort:followers-desc"
        url = (
            "https://api.github.com/search/users"
            f"?q={requests.utils.quote(query)}&per_page=100&page={page}"
        )
        r = requests.get(url, headers=HEADERS)
        if not r.ok:
            print(f"  Search error {r.status_code}: {r.text[:200]}")
            break
        data = r.json()
        items = data.get("items", [])
        if not items:
            break
        logins.extend(u["login"] for u in items)
        if len(items) < 100:
            break
        page += 1
        time.sleep(2)
    return logins[:n]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("country", nargs="?", help="Country name to fetch")
    parser.add_argument("--all", action="store_true", help="Fetch all countries in the list")
    args = parser.parse_args()

    if args.all:
        countries_to_fetch = COUNTRIES
    elif args.country:
        countries_to_fetch = [args.country]
    else:
        parser.print_help()
        sys.exit(1)

    # Load existing data if any
    existing = []
    if os.path.exists(RAW_PATH):
        with open(RAW_PATH, encoding="utf-8") as f:
            existing = json.load(f)
        print(f"Loaded {len(existing)} existing records from {RAW_PATH}")

    # Index existing by (login, country_scope) to avoid duplicates
    existing_keys = set()
    for u in existing:
        existing_keys.add((u.get("login"), u.get("country_scope")))

    all_profiles = list(existing)

    for country in countries_to_fetch:
        print(f"\n=== {country} ===")
        logins = fetch_top_for_country(country, TOP_N)
        print(f"  Found {len(logins)} users")

        if not logins:
            print("  No users found, skipping.")
            continue

        profiles = []
        for i, login in enumerate(logins, 1):
            print(f"    Profile {i}/{len(logins)}: @{login}")
            profile = get_profile(login)
            if profile:
                profile["country_scope"] = country
                profiles.append(profile)
            time.sleep(0.3)

        # Fetch pronouns
        user_profiles = [p for p in profiles if p.get("type") != "Organization"]
        pronoun_map = {}
        BATCH = 100
        for batch_i in range(0, len(user_profiles), BATCH):
            batch = user_profiles[batch_i : batch_i + BATCH]
            batch_pronouns = fetch_pronouns_batch([p["login"] for p in batch])
            pronoun_map.update(batch_pronouns)
            time.sleep(1)

        for p in profiles:
            p["pronouns"] = pronoun_map.get(p["login"])

        # Add only new ones
        new_count = 0
        for p in profiles:
            key = (p["login"], p["country_scope"])
            if key not in existing_keys:
                all_profiles.append(p)
                existing_keys.add(key)
                new_count += 1

        print(f"  Added {new_count} new profiles for {country}")
        time.sleep(2)

    os.makedirs(os.path.dirname(RAW_PATH), exist_ok=True)
    with open(RAW_PATH, "w", encoding="utf-8") as f:
        json.dump(all_profiles, f, indent=2, ensure_ascii=False)
    print(f"\nSaved {len(all_profiles)} total profiles to {RAW_PATH}")


if __name__ == "__main__":
    main()
