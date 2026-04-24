"""Fetch top 500 GitHub users by followers + their profile details.

Output: data/raw/github_users.json
Rate limits: authenticated GitHub API = 5000 req/hour (with GITHUB_TOKEN).
"""
import json
import os
import time

import requests

TOP_N = 500
RAW_PATH = os.path.join(os.path.dirname(__file__), "..", "raw", "github_users.json")

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
HEADERS = {"Accept": "application/vnd.github+json"}
if GITHUB_TOKEN:
    HEADERS["Authorization"] = f"Bearer {GITHUB_TOKEN}"

# Heuristic location string → country. Case-insensitive substring match.
# Order matters: more specific hints first (city before country keyword collisions).
COUNTRY_HINTS = [
    ("san francisco", "United States"), ("new york", "United States"),
    ("seattle", "United States"), ("bay area", "United States"),
    ("los angeles", "United States"), ("boston", "United States"),
    ("austin", "United States"), ("chicago", "United States"),
    ("usa", "United States"), ("u.s.a", "United States"),
    ("united states", "United States"), (", us", "United States"),
    ("london", "United Kingdom"), ("manchester", "United Kingdom"),
    ("uk", "United Kingdom"), ("united kingdom", "United Kingdom"),
    ("england", "United Kingdom"), ("scotland", "United Kingdom"),
    ("berlin", "Germany"), ("munich", "Germany"), ("germany", "Germany"),
    ("deutschland", "Germany"),
    ("paris", "France"), ("france", "France"),
    ("madrid", "Spain"), ("barcelona", "Spain"), ("spain", "Spain"),
    ("españa", "Spain"),
    ("amsterdam", "Netherlands"), ("netherlands", "Netherlands"),
    ("stockholm", "Sweden"), ("sweden", "Sweden"),
    ("zurich", "Switzerland"), ("switzerland", "Switzerland"),
    ("moscow", "Russia"), ("russia", "Russia"),
    ("beijing", "China"), ("shanghai", "China"), ("shenzhen", "China"),
    ("hangzhou", "China"), ("china", "China"),
    ("tokyo", "Japan"), ("japan", "Japan"),
    ("seoul", "South Korea"), ("south korea", "South Korea"), ("korea", "South Korea"),
    ("bangalore", "India"), ("bengaluru", "India"), ("mumbai", "India"),
    ("delhi", "India"), ("hyderabad", "India"), ("india", "India"),
    ("toronto", "Canada"), ("vancouver", "Canada"), ("montreal", "Canada"),
    ("canada", "Canada"),
    ("sydney", "Australia"), ("melbourne", "Australia"), ("australia", "Australia"),
    ("são paulo", "Brazil"), ("sao paulo", "Brazil"), ("rio de janeiro", "Brazil"),
    ("brazil", "Brazil"), ("brasil", "Brazil"),
    ("mexico", "Mexico"), ("méxico", "Mexico"),
    ("buenos aires", "Argentina"), ("argentina", "Argentina"),
    ("tel aviv", "Israel"), ("israel", "Israel"),
    ("istanbul", "Turkey"), ("turkey", "Turkey"),
    ("rome", "Italy"), ("milan", "Italy"), ("italy", "Italy"), ("italia", "Italy"),
    ("warsaw", "Poland"), ("poland", "Poland"),
    ("kyiv", "Ukraine"), ("ukraine", "Ukraine"),
    ("singapore", "Singapore"),
    ("hong kong", "Hong Kong"),
    ("taipei", "Taiwan"), ("taiwan", "Taiwan"),
    ("vietnam", "Vietnam"), ("hanoi", "Vietnam"),
    ("indonesia", "Indonesia"), ("jakarta", "Indonesia"),
    ("nigeria", "Nigeria"), ("lagos", "Nigeria"),
    ("south africa", "South Africa"), ("cape town", "South Africa"),
    ("portugal", "Portugal"), ("lisbon", "Portugal"),
    ("belgium", "Belgium"), ("brussels", "Belgium"),
    ("denmark", "Denmark"), ("copenhagen", "Denmark"),
    ("norway", "Norway"), ("oslo", "Norway"),
    ("finland", "Finland"), ("helsinki", "Finland"),
    ("austria", "Austria"), ("vienna", "Austria"),
    ("ireland", "Ireland"), ("dublin", "Ireland"),
    ("greece", "Greece"), ("athens", "Greece"),
]


def infer_country(location):
    if not location:
        return None
    loc = location.lower()
    for hint, country in COUNTRY_HINTS:
        if hint in loc:
            return country
    return None


def top_languages_for(login):
    """Return the most-used language across the user's public repos."""
    counts = {}
    url = f"https://api.github.com/users/{login}/repos?per_page=100&sort=updated"
    r = requests.get(url, headers=HEADERS)
    if not r.ok:
        return None
    for repo in r.json():
        if repo.get("fork"):
            continue
        lang = repo.get("language")
        if lang:
            counts[lang] = counts.get(lang, 0) + 1
    if not counts:
        return None
    return max(counts.items(), key=lambda kv: kv[1])[0]


def fetch_top_logins(n):
    """Use search API to list usernames by followers (descending)."""
    logins = []
    page = 1
    while len(logins) < n:
        url = (
            "https://api.github.com/search/users"
            f"?q=followers:>1000&sort=followers&order=desc&per_page=100&page={page}"
        )
        r = requests.get(url, headers=HEADERS)
        r.raise_for_status()
        items = r.json().get("items", [])
        if not items:
            break
        logins.extend(u["login"] for u in items)
        if len(items) < 100:
            break
        page += 1
        time.sleep(2)
    return logins[:n]


def get_profile(login):
    r = requests.get(f"https://api.github.com/users/{login}", headers=HEADERS)
    if not r.ok:
        return None
    p = r.json()
    location = p.get("location")
    created = p.get("created_at") or ""
    return {
        "login": p["login"],
        "name": p.get("name"),
        "type": p.get("type"),  # "User" or "Organization"
        "bio": p.get("bio"),
        "followers": p.get("followers", 0),
        "public_repos": p.get("public_repos"),
        "company": p.get("company"),
        "location": location,
        "country": infer_country(location),
        "avatar_url": p.get("avatar_url"),
        "account_created_year": int(created[:4]) if created else None,
        "top_language": top_languages_for(p["login"]),
    }


GRAPHQL_URL = "https://api.github.com/graphql"
GRAPHQL_HEADERS = {"Content-Type": "application/json"}
if GITHUB_TOKEN:
    GRAPHQL_HEADERS["Authorization"] = f"Bearer {GITHUB_TOKEN}"


def fetch_pronouns_batch(logins):
    """Fetch pronouns for up to 100 logins via GraphQL aliases.

    Returns dict: login -> pronouns string (or None/empty).
    """
    if not logins:
        return {}

    # Build alias query: u0: user(login: "foo") { pronouns }
    aliases = []
    for i, login in enumerate(logins):
        aliases.append(f'  u{i}: user(login: "{login}") {{ pronouns }}')
    query = "query {\n" + "\n".join(aliases) + "\n}"

    r = requests.post(
        GRAPHQL_URL,
        headers=GRAPHQL_HEADERS,
        json={"query": query},
        timeout=30,
    )
    if not r.ok:
        print(f"    GraphQL error {r.status_code}: {r.text[:200]}")
        return {}

    data = r.json()
    if data.get("errors"):
        print(f"    GraphQL errors: {data['errors'][:2]}")

    result = {}
    for i, login in enumerate(logins):
        key = f"u{i}"
        node = data.get("data", {}).get(key)
        if node:
            result[login] = node.get("pronouns")  # may be None or ""
    return result


def main():
    print(f"Fetching top {TOP_N} GitHub logins by followers...")
    logins = fetch_top_logins(TOP_N)
    print(f"Got {len(logins)} logins. Fetching profile details...")

    profiles = []
    for i, login in enumerate(logins, 1):
        print(f"  {i}/{len(logins)}: @{login}")
        profile = get_profile(login)
        if profile:
            profiles.append(profile)
        time.sleep(0.3)

    # Fetch pronouns via GraphQL (up to 100 per batch)
    print(f"\nFetching pronouns via GraphQL for {len(profiles)} profiles...")
    user_profiles = [p for p in profiles if p.get("type") != "Organization"]
    BATCH = 100
    pronoun_map = {}
    for batch_i in range(0, len(user_profiles), BATCH):
        batch = user_profiles[batch_i : batch_i + BATCH]
        batch_logins = [p["login"] for p in batch]
        print(f"  GraphQL batch {batch_i // BATCH + 1}/{(len(user_profiles) - 1) // BATCH + 1} ({len(batch_logins)} users)")
        batch_pronouns = fetch_pronouns_batch(batch_logins)
        pronoun_map.update(batch_pronouns)
        time.sleep(1)

    # Merge pronouns into profiles
    for p in profiles:
        p["pronouns"] = pronoun_map.get(p["login"])

    female_pronouns = sum(1 for p in profiles if p.get("pronouns") and "she" in p["pronouns"].lower())
    male_pronouns = sum(1 for p in profiles if p.get("pronouns") and "he" in p["pronouns"].lower())
    print(f"\nPronouns found: {len([p for p in profiles if p.get('pronouns')])}")
    print(f"  she/her: {female_pronouns}")
    print(f"  he/him:  {male_pronouns}")

    os.makedirs(os.path.dirname(RAW_PATH), exist_ok=True)
    with open(RAW_PATH, "w", encoding="utf-8") as f:
        json.dump(profiles, f, indent=2, ensure_ascii=False)
    print(f"\nSaved {len(profiles)} profiles to {RAW_PATH}")


if __name__ == "__main__":
    main()
