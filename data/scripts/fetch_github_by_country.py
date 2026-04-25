"""Fetch top 100 GitHub users per country using GraphQL (single query per country).

Usage:
    python fetch_github_by_country.py "Spain"
    python fetch_github_by_country.py --all

Uses GitHub GraphQL search API:
    search(type: USER, query: "location:Spain sort:followers-desc", first: 100)

Returns ~100 users in a single request. Each user includes login, name, bio,
location, pronouns, createdAt, avatarUrl, and follower count.

Output: data/raw/github_users_by_country.json
"""
import json
import os
import sys
import time
import argparse
from datetime import datetime

import requests

from fetch_github import HEADERS, GRAPHQL_HEADERS, GRAPHQL_URL, infer_country

TOP_N = 100
RAW_PATH = os.path.join(os.path.dirname(__file__), "..", "raw", "github_users_by_country.json")

COUNTRIES = [
    "United States", "China", "India", "United Kingdom", "Germany",
    "France", "Brazil", "Canada", "Japan", "Russia",
    "Spain", "Netherlands", "Australia", "Poland", "Ukraine",
    "Italy", "Sweden", "South Korea", "Mexico", "Turkey",
    "Indonesia", "Vietnam", "Israel", "Argentina", "Switzerland",
    "Belgium", "Singapore", "Taiwan", "Portugal", "Denmark",
]

SEARCH_QUERY = """
query($query: String!, $first: Int!) {
  search(type: USER, query: $query, first: $first) {
    userCount
    edges {
      node {
        ... on User {
          login
          name
          bio
          location
          pronouns
          createdAt
          avatarUrl
          followers {
            totalCount
          }
          repositories(isFork: false, first: 100, orderBy: {field: UPDATED_AT, direction: DESC}) {
            nodes {
              primaryLanguage {
                name
              }
            }
          }
        }
      }
    }
  }
}
"""


def top_language_from_repos(nodes):
    """Pick the most-used primaryLanguage across public repos."""
    counts = {}
    for r in nodes or []:
        lang = r.get("primaryLanguage", {}).get("name")
        if lang:
            counts[lang] = counts.get(lang, 0) + 1
    if not counts:
        return None
    return max(counts.items(), key=lambda kv: kv[1])[0]


def fetch_for_country(country, n=100, max_retries=3):
    """Return list of user dicts for the given country via single GraphQL query."""
    query_str = f'location:{country} sort:followers-desc'
    payload = {
        "query": SEARCH_QUERY,
        "variables": {"query": query_str, "first": n},
    }

    for attempt in range(1, max_retries + 1):
        try:
            r = requests.post(GRAPHQL_URL, headers=GRAPHQL_HEADERS, json=payload, timeout=30)
            if r.status_code in (502, 503, 504):
                print(f"  GraphQL HTTP {r.status_code} (attempt {attempt}/{max_retries}), retrying...")
                time.sleep(2 ** attempt)
                continue
            if not r.ok:
                print(f"  GraphQL HTTP {r.status_code}: {r.text[:200]}")
                return []

            data = r.json()
            if data.get("errors"):
                print(f"  GraphQL errors: {data['errors'][:2]}")
                return []

            break
        except requests.RequestException as e:
            print(f"  Request error on attempt {attempt}/{max_retries}: {e}")
            time.sleep(2 ** attempt)
    else:
        print(f"  Failed after {max_retries} attempts.")
        return []

    edges = data.get("data", {}).get("search", {}).get("edges", [])
    results = []
    for e in edges:
        node = e.get("node")
        if not node or not node.get("login"):
            continue
        created = node.get("createdAt") or ""
        profile = {
            "login": node["login"],
            "name": node.get("name"),
            "type": "User",
            "bio": node.get("bio"),
            "followers": node.get("followers", {}).get("totalCount", 0),
            "public_repos": None,
            "company": None,
            "location": node.get("location"),
            "country": infer_country(node.get("location")),
            "avatar_url": node.get("avatarUrl"),
            "account_created_year": int(created[:4]) if created else None,
            "top_language": top_language_from_repos(node.get("repositories", {}).get("nodes")),
            "pronouns": node.get("pronouns"),
            "country_scope": country,
        }
        results.append(profile)

    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("country", nargs="?", help="Country name to fetch")
    parser.add_argument("--all", action="store_true", help="Fetch all countries in the list")
    parser.add_argument("--daily", action="store_true", help="Fetch 1 country per day (rotating)")
    args = parser.parse_args()

    if args.daily:
        # Pick country based on day of year (rotates through the list)
        day_of_year = datetime.utcnow().timetuple().tm_yday
        country_idx = day_of_year % len(COUNTRIES)
        countries_to_fetch = [COUNTRIES[country_idx]]
        print(f"Daily mode: day {day_of_year} -> country index {country_idx} -> {COUNTRIES[country_idx]}")
    elif args.all:
        countries_to_fetch = COUNTRIES
    elif args.country:
        countries_to_fetch = [args.country]
    else:
        parser.print_help()
        sys.exit(1)

    existing = []
    if os.path.exists(RAW_PATH):
        with open(RAW_PATH, encoding="utf-8") as f:
            existing = json.load(f)
        print(f"Loaded {len(existing)} existing records from {RAW_PATH}")

    # Build index: country_scope -> set of logins
    existing_by_country: dict[str, set[str]] = {}
    for u in existing:
        scope = u.get("country_scope", "")
        existing_by_country.setdefault(scope, set()).add(u["login"])

    all_profiles = list(existing)

    for country in countries_to_fetch:
        print(f"\n=== {country} ===")

        # Check if we already have complete data for this country
        existing_count = len(existing_by_country.get(country, set()))
        if existing_count >= 100:
            print(f"  Already have {existing_count} profiles for {country}, skipping.")
            continue
        if existing_count > 0 and existing_count < 100:
            print(f"  Have {existing_count} incomplete profiles for {country}, re-fetching...")

        users = fetch_for_country(country, TOP_N)
        print(f"  Fetched {len(users)} users")

        if not users:
            print("  No users found, skipping.")
            time.sleep(2)
            continue

        # Remove old entries for this country before adding new ones
        all_profiles = [u for u in all_profiles if u.get("country_scope") != country]
        all_profiles.extend(users)
        print(f"  Stored {len(users)} profiles for {country}")

        # GitHub Search API (both REST and GraphQL) has a separate limit:
        # 10 search queries per minute. Sleep 7s to stay well under that.
        time.sleep(7)

    os.makedirs(os.path.dirname(RAW_PATH), exist_ok=True)
    with open(RAW_PATH, "w", encoding="utf-8") as f:
        json.dump(all_profiles, f, indent=2, ensure_ascii=False)
    print(f"\nSaved {len(all_profiles)} total profiles to {RAW_PATH}")


if __name__ == "__main__":
    main()
