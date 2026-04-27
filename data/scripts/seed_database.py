"""Write processed GitHub users and curated-repo contributors into SQLite."""
import json
import os
import sys
from datetime import datetime

scripts_dir = os.path.dirname(__file__)
sys.path.insert(0, scripts_dir)
from db import get_db, setup_schema
from curated_repos import CURATED_REPOS
from seed_repo_yearly import seed as seed_repo_yearly

PROCESSED_PATH = os.path.join(scripts_dir, "..", "processed", "github_users.json")
AI_CONTRIB_RAW_PATH = os.path.join(scripts_dir, "..", "raw", "ai_repo_contributors.json")
AI_CONTRIB_PROCESSED_PATH = os.path.join(scripts_dir, "..", "processed", "ai_contributors.json")


def seed_github(conn):
    if not os.path.exists(PROCESSED_PATH):
        print(f"ERROR: {PROCESSED_PATH} does not exist. Run infer_gender.py first.")
        return 0

    with open(PROCESSED_PATH, encoding="utf-8") as f:
        users = json.load(f)

    now = datetime.utcnow().isoformat()
    snapshot_date = datetime.utcnow().strftime("%Y-%m-%d")

    for u in users:
        conn.execute(
            """
            INSERT INTO github_users (
                login, name, bio, first_name_used, followers, public_repos,
                company, location, country, account_created_year, avatar_url,
                top_language, gender, gender_probability, gender_confidence,
                last_updated, snapshot_date
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(login) DO UPDATE SET
                name = excluded.name,
                bio = excluded.bio,
                first_name_used = excluded.first_name_used,
                followers = excluded.followers,
                public_repos = excluded.public_repos,
                company = excluded.company,
                location = excluded.location,
                country = excluded.country,
                account_created_year = excluded.account_created_year,
                avatar_url = excluded.avatar_url,
                top_language = excluded.top_language,
                gender = excluded.gender,
                gender_probability = excluded.gender_probability,
                gender_confidence = excluded.gender_confidence,
                last_updated = excluded.last_updated,
                snapshot_date = excluded.snapshot_date
            """,
            (
                u["login"], u.get("name"), u.get("bio"), u.get("first_name_used"),
                u.get("followers", 0), u.get("public_repos"),
                u.get("company"), u.get("location"), u.get("country"),
                u.get("account_created_year"), u.get("avatar_url"),
                u.get("top_language"), u.get("gender"),
                u.get("gender_probability"), u.get("gender_confidence"),
                now, snapshot_date,
            ),
        )
    conn.commit()

    total = len(users)
    female = sum(1 for u in users if u.get("gender") == "female")
    male = sum(1 for u in users if u.get("gender") == "male")
    unknown = total - female - male

    conn.execute(
        """
        INSERT INTO snapshots (
            platform, scope, date,
            total_analyzed, female_count, male_count, unknown_count, female_percent
        ) VALUES (?,?,?,?,?,?,?,?)
        ON CONFLICT(platform, scope, date) DO UPDATE SET
            total_analyzed = excluded.total_analyzed,
            female_count = excluded.female_count,
            male_count = excluded.male_count,
            unknown_count = excluded.unknown_count,
            female_percent = excluded.female_percent
        """,
        (
            "github", "top_500", snapshot_date,
            total, female, male, unknown,
            round(female / total * 100, 2) if total else 0.0,
        ),
    )
    conn.commit()

    print(f"GitHub: {total} users upserted.")
    print(f"  Female:  {female} ({female / total * 100:.1f}%)")
    print(f"  Male:    {male} ({male / total * 100:.1f}%)")
    print(f"  Unknown: {unknown}")
    return total


def seed_ai_repos(conn):
    """Insert curated repos list."""
    now = datetime.utcnow().isoformat()
    for repo, category in CURATED_REPOS:
        conn.execute(
            """
            INSERT INTO ai_repos (repo, category, added_at)
            VALUES (?, ?, ?)
            ON CONFLICT(repo) DO UPDATE SET
                category = excluded.category
            """,
            (repo, category, now),
        )
    conn.commit()
    print(f"ai_repos: {len(CURATED_REPOS)} repos upserted.")


def seed_ai_repo_contributors(conn):
    if not os.path.exists(AI_CONTRIB_RAW_PATH):
        print(f"SKIP: {AI_CONTRIB_RAW_PATH} not found.")
        return

    with open(AI_CONTRIB_RAW_PATH, encoding="utf-8") as f:
        rows = json.load(f)

    for r in rows:
        conn.execute(
            """
            INSERT INTO ai_repo_contributors (repo, login, contributions, rank)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(repo, login) DO UPDATE SET
                contributions = excluded.contributions,
                rank = excluded.rank
            """,
            (r["repo"], r["login"], r.get("contributions", 0), r.get("rank", 0)),
        )
    conn.commit()
    print(f"ai_repo_contributors: {len(rows)} rows upserted.")


def seed_contributors(conn):
    if not os.path.exists(AI_CONTRIB_PROCESSED_PATH):
        print(f"SKIP: {AI_CONTRIB_PROCESSED_PATH} not found. Run infer_gender.py after fetch_repo_contributors.py.")
        return

    with open(AI_CONTRIB_PROCESSED_PATH, encoding="utf-8") as f:
        users = json.load(f)

    now = datetime.utcnow().isoformat()
    for u in users:
        conn.execute(
            """
            INSERT INTO contributors (
                login, name, bio, first_name_used, company, location, country,
                avatar_url, account_created_year, gender, gender_probability,
                gender_confidence, is_organization_account, last_updated
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(login) DO UPDATE SET
                name = excluded.name,
                bio = excluded.bio,
                first_name_used = excluded.first_name_used,
                company = excluded.company,
                location = excluded.location,
                country = excluded.country,
                avatar_url = excluded.avatar_url,
                account_created_year = excluded.account_created_year,
                gender = excluded.gender,
                gender_probability = excluded.gender_probability,
                gender_confidence = excluded.gender_confidence,
                is_organization_account = excluded.is_organization_account,
                last_updated = excluded.last_updated
            """,
            (
                u["login"], u.get("name"), u.get("bio"), u.get("first_name_used"),
                u.get("company"), u.get("location"), u.get("country"),
                u.get("avatar_url"), u.get("account_created_year"),
                u.get("gender"), u.get("gender_probability"), u.get("gender_confidence"),
                1 if u.get("is_organization_account") else 0,
                now,
            ),
        )
    conn.commit()

    total = len(users)
    female = sum(1 for u in users if u.get("gender") == "female")
    male = sum(1 for u in users if u.get("gender") == "male")
    print(f"contributors: {total} profiles upserted.")
    print(f"  Female: {female} ({female / total * 100:.1f}%)")
    print(f"  Male:   {male} ({male / total * 100:.1f}%)")


ORG_MEMBERS_PATH = os.path.join(scripts_dir, "..", "processed", "org_members.json")


def seed_org_members(conn):
    if not os.path.exists(ORG_MEMBERS_PATH):
        return

    with open(ORG_MEMBERS_PATH, encoding="utf-8") as f:
        orgs = json.load(f)

    now = datetime.utcnow().isoformat()
    total_members = 0

    for org_data in orgs:
        org = org_data["org"]
        for m in org_data.get("members", []):
            conn.execute(
                """
                INSERT INTO org_members (org_login, member_login, name, avatar_url, followers, gender, gender_source, fetched_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(org_login, member_login) DO UPDATE SET
                    name = excluded.name,
                    avatar_url = excluded.avatar_url,
                    followers = excluded.followers,
                    gender = excluded.gender,
                    gender_source = excluded.gender_source,
                    fetched_at = excluded.fetched_at
                """,
                (org, m["login"], m.get("name"), m.get("avatar_url"), m.get("followers", 0),
                 m.get("gender"), m.get("gender_source", ""), now),
            )
            total_members += 1

    conn.commit()
    print(f"org_members: {total_members} rows upserted from {len(orgs)} orgs.")


BY_COUNTRY_PATH = os.path.join(scripts_dir, "..", "processed", "github_users_by_country.json")


def seed_github_by_country(conn):
    if not os.path.exists(BY_COUNTRY_PATH):
        print(f"SKIP: {BY_COUNTRY_PATH} not found. Run fetch_github_by_country.py first.")
        return

    with open(BY_COUNTRY_PATH, encoding="utf-8") as f:
        users = json.load(f)

    now = datetime.utcnow().isoformat()
    snapshot_date = datetime.utcnow().strftime("%Y-%m-%d")

    for u in users:
        conn.execute(
            """
            INSERT INTO github_users_by_country (
                login, name, bio, first_name_used, followers, public_repos,
                company, location, country, country_scope, account_created_year, avatar_url,
                top_language, gender, gender_probability, gender_confidence,
                last_updated, snapshot_date
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ON CONFLICT(login) DO UPDATE SET
                name = excluded.name,
                bio = excluded.bio,
                first_name_used = excluded.first_name_used,
                followers = excluded.followers,
                public_repos = excluded.public_repos,
                company = excluded.company,
                location = excluded.location,
                country = excluded.country,
                country_scope = excluded.country_scope,
                account_created_year = excluded.account_created_year,
                avatar_url = excluded.avatar_url,
                top_language = excluded.top_language,
                gender = excluded.gender,
                gender_probability = excluded.gender_probability,
                gender_confidence = excluded.gender_confidence,
                last_updated = excluded.last_updated,
                snapshot_date = excluded.snapshot_date
            """,
            (
                u["login"], u.get("name"), u.get("bio"), u.get("first_name_used"),
                u.get("followers", 0), u.get("public_repos"),
                u.get("company"), u.get("location"), u.get("country"),
                u.get("country_scope"), u.get("account_created_year"), u.get("avatar_url"),
                u.get("top_language"), u.get("gender"),
                u.get("gender_probability"), u.get("gender_confidence"),
                now, snapshot_date,
            ),
        )
    conn.commit()

    total = len(users)
    female = sum(1 for u in users if u.get("gender") == "female")
    male = sum(1 for u in users if u.get("gender") == "male")
    print(f"github_users_by_country: {total} profiles upserted.")
    print(f"  Female: {female} ({female / total * 100:.1f}%)")
    print(f"  Male:   {male} ({male / total * 100:.1f}%)")


def main():
    conn = get_db()
    setup_schema(conn)
    seed_github(conn)
    seed_github_by_country(conn)
    seed_ai_repos(conn)
    seed_ai_repo_contributors(conn)
    seed_contributors(conn)
    seed_repo_yearly(conn)
    seed_org_members(conn)
    conn.close()
    print("\nDB updated.")


if __name__ == "__main__":
    main()
