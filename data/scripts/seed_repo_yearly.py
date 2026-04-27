"""Insert per-repo yearly commit data into SQLite."""
import json
import os
import sys

scripts_dir = os.path.dirname(__file__)
sys.path.insert(0, scripts_dir)
from db import get_db, setup_schema

RAW_PATH = os.path.join(scripts_dir, "..", "raw", "repo_yearly_commits.json")


def seed(conn):
    if not os.path.exists(RAW_PATH):
        print(f"SKIP: {RAW_PATH} not found. Run fetch_repo_yearly.py first.")
        return

    with open(RAW_PATH, encoding="utf-8") as f:
        rows = json.load(f)

    for r in rows:
        conn.execute(
            """
            INSERT INTO repo_contributor_yearly (repo, login, year, commits)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(repo, login, year) DO UPDATE SET
                commits = excluded.commits
            """,
            (r["repo"], r["login"], r["year"], r.get("commits", 0)),
        )
    conn.commit()
    print(f"repo_contributor_yearly: {len(rows)} rows upserted.")


def main():
    conn = get_db()
    setup_schema(conn)
    seed(conn)
    conn.close()


if __name__ == "__main__":
    main()
