import sqlite3
import os

scripts_dir = os.path.dirname(__file__)
conn = sqlite3.connect(os.path.join(scripts_dir, '..', 'db', 'gender_gap.db'))
conn.row_factory = sqlite3.Row

# Search for Soma
for table, login_col, name_col in [
    ('github_users', 'login', 'name'),
    ('contributors', 'login', 'name'),
    ('org_members', 'member_login', 'name'),
    ('github_users_by_country', 'login', 'name'),
]:
    try:
        rows = conn.execute(
            f"SELECT {login_col} as login, {name_col} as name FROM {table} WHERE {name_col} LIKE ? OR {login_col} LIKE ?",
            ('%soma%', '%soma%')
        ).fetchall()
        if rows:
            print(f"=== {table} ===")
            for r in rows:
                print(f"  login={r['login']}, name={r['name']}")
    except Exception as e:
        print(f"{table}: {e}")

conn.close()
