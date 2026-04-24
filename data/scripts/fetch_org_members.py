"""Fetch public members of GitHub orgs and infer gender.

Resumable: saves progress to data/raw/org_members_progress.json
Output: data/processed/org_members.json
"""
import json
import os
import time
import requests

from db import get_db, setup_schema
from infer_gender import (
    parse_pronouns_field, parse_pronouns_from_bio, is_organization,
    classify, get_first_name, save_cache_entry, OVERRIDES
)

ORG_LOGINS = [
    "openai", "microsoft", "deepseek-ai", "github", "google",
    "huggingface", "TheAlgorithms", "anthropics", "EpicGames",
    "modelcontextprotocol", "Microsoft-corp", "apple",
    "facebookresearch", "facebook", "freeCodeCamp",
    "Visual-Studio-Code", "python", "ReVanced", "community",
    "vercel", "brahmGAN", "datawhalechina", "NVIDIA", "google-deepmind",
]

PROGRESS_PATH = os.path.join(os.path.dirname(__file__), "..", "raw", "org_members_progress.json")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "processed", "org_members.json")

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")
HEADERS = {"Accept": "application/vnd.github+json"}
if GITHUB_TOKEN:
    HEADERS["Authorization"] = f"Bearer {GITHUB_TOKEN}"

GRAPHQL_HEADERS = {"Content-Type": "application/json"}
if GITHUB_TOKEN:
    GRAPHQL_HEADERS["Authorization"] = f"Bearer {GITHUB_TOKEN}"


def fetch_public_members(org):
    """Return list of member logins for an org."""
    members = []
    page = 1
    while True:
        url = f"https://api.github.com/orgs/{org}/public_members?per_page=100&page={page}"
        r = requests.get(url, headers=HEADERS)
        if not r.ok:
            print(f"  Error {r.status_code} fetching members of {org}")
            break
        data = r.json()
        if not data:
            break
        members.extend(m["login"] for m in data)
        if len(data) < 100:
            break
        page += 1
        time.sleep(0.5)
    return members


def fetch_profiles_batch(logins):
    """Fetch basic profiles for a list of logins."""
    profiles = []
    for i, login in enumerate(logins, 1):
        r = requests.get(f"https://api.github.com/users/{login}", headers=HEADERS)
        if r.ok:
            p = r.json()
            profiles.append({
                "login": p["login"],
                "name": p.get("name"),
                "type": p.get("type"),
                "bio": p.get("bio"),
                "followers": p.get("followers", 0),
                "avatar_url": p.get("avatar_url"),
            })
        if i % 50 == 0:
            print(f"    Fetched {i}/{len(logins)} profiles")
        time.sleep(0.12)
    return profiles


def fetch_pronouns_batch(logins):
    """Fetch pronouns via GraphQL for up to 100 logins."""
    if not logins:
        return {}
    aliases = [f'  u{i}: user(login: "{login}") {{ pronouns }}' for i, login in enumerate(logins)]
    query = "query {\n" + "\n".join(aliases) + "\n}"
    r = requests.post("https://api.github.com/graphql", headers=GRAPHQL_HEADERS, json={"query": query}, timeout=30)
    if not r.ok:
        return {}
    data = r.json()
    result = {}
    for i, login in enumerate(logins):
        node = data.get("data", {}).get(f"u{i}")
        if node:
            result[login] = node.get("pronouns")
    return result


def classify_member(u, conn, cache):
    """Classify a single member using the same tiered approach."""
    login = u["login"]
    name = u.get("name") or ""
    first = get_first_name(name)
    bio = u.get("bio") or ""
    pronouns = u.get("pronouns") or ""

    # 1. Pronouns field
    result = parse_pronouns_field(pronouns)
    if result:
        g, prob, conf, src = result
        return {"gender": g, "probability": prob, "confidence": conf, "source": src}

    # 2. Pronouns in bio
    result = parse_pronouns_from_bio(bio)
    if result:
        g, prob, conf, src = result
        return {"gender": g, "probability": prob, "confidence": conf, "source": src}

    # 3. Org check
    if is_organization(u, login):
        return {"gender": None, "probability": 0.0, "confidence": "unknown", "source": "org"}

    if not first:
        return {"gender": None, "probability": 0.0, "confidence": "unknown", "source": "no_name"}

    # 4. Override
    if login.lower() in OVERRIDES:
        g, prob, conf = OVERRIDES[login.lower()]
        return {"gender": g, "probability": prob, "confidence": conf, "source": "override"}

    # 5. Name-based classification
    g, prob, conf, src = classify(first)
    return {"gender": g, "probability": prob, "confidence": conf, "source": src}


def main():
    if not GITHUB_TOKEN:
        print("ERROR: GITHUB_TOKEN required")
        return

    conn = get_db()
    setup_schema(conn)

    # Load progress
    progress = {}
    if os.path.exists(PROGRESS_PATH):
        with open(PROGRESS_PATH, encoding="utf-8") as f:
            progress = json.load(f)
        print(f"Resuming: {len(progress)} orgs partially processed")

    all_results = []

    for org in ORG_LOGINS:
        if org in progress:
            print(f"\nSkipping {org} (already in progress)")
            all_results.append(progress[org])
            continue

        print(f"\n--- {org} ---")
        members = fetch_public_members(org)
        print(f"  {len(members)} public members")

        if not members:
            progress[org] = {"org": org, "members": [], "stats": {"total": 0, "female": 0, "male": 0}}
            continue

        # Fetch profiles
        profiles = fetch_profiles_batch(members)
        print(f"  Fetched {len(profiles)} profiles")

        # Fetch pronouns in batches of 100
        users_only = [p for p in profiles if p.get("type") != "Organization"]
        pronoun_map = {}
        for i in range(0, len(users_only), 100):
            batch = users_only[i:i + 100]
            batch_pronouns = fetch_pronouns_batch([p["login"] for p in batch])
            pronoun_map.update(batch_pronouns)
            time.sleep(0.5)

        for p in profiles:
            p["pronouns"] = pronoun_map.get(p["login"])

        # Classify each member
        classified = []
        female = 0
        male = 0
        for p in profiles:
            result = classify_member(p, conn, {})
            p.update(result)
            classified.append(p)
            if result["gender"] == "female":
                female += 1
            elif result["gender"] == "male":
                male += 1

        stats = {
            "total": len(classified),
            "female": female,
            "male": male,
            "unknown": len(classified) - female - male,
            "femalePct": round(female / max(female + male, 1) * 100, 1) if (female + male) > 0 else 0,
        }

        org_result = {"org": org, "members": classified, "stats": stats}
        progress[org] = org_result
        all_results.append(org_result)

        # Save incremental progress
        os.makedirs(os.path.dirname(PROGRESS_PATH), exist_ok=True)
        with open(PROGRESS_PATH, "w", encoding="utf-8") as f:
            json.dump(progress, f, indent=2, ensure_ascii=False)

        print(f"  Stats: {stats}")
        time.sleep(1)

    # Final output
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)

    print(f"\nSaved {len(all_results)} orgs to {OUTPUT_PATH}")

    # Write to SQLite
    print("Writing to database...")
    conn = get_db()
    setup_schema(conn)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM org_members")
    for org_result in all_results:
        org = org_result["org"]
        for member in org_result["members"]:
            cursor.execute("""
                INSERT OR REPLACE INTO org_members
                (org_login, member_login, name, avatar_url, followers, gender, gender_source, fetched_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
            """, (
                org,
                member.get("login"),
                member.get("name"),
                member.get("avatar_url"),
                member.get("followers", 0),
                member.get("gender"),
                member.get("gender_source"),
            ))
    conn.commit()
    print(f"Wrote {sum(len(o['members']) for o in all_results)} members to org_members table")


if __name__ == "__main__":
    main()
