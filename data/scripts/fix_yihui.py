import sqlite3
import json
import os

scripts_dir = os.path.dirname(__file__)
conn = sqlite3.connect(os.path.join(scripts_dir, '..', 'db', 'gender_gap.db'))

# Delete stale yihui cache entry
conn.execute('DELETE FROM gender_cache WHERE first_name = ?', ('yihui',))
conn.commit()
print('Deleted yihui from gender_cache')

# Check raw files
for fname in ['raw/github_users_by_country.json', 'raw/ai_contributors.json', 'raw/github_users.json']:
    path = os.path.join(scripts_dir, '..', fname)
    try:
        with open(path, encoding='utf-8') as f:
            data = json.load(f)
        hits = [u for u in data if 'yihui' in str(u.get('login','')).lower() or 'yihui' in str(u.get('name','')).lower()]
        print(f'{fname}: {len(hits)} matches')
        for h in hits:
            print(f'  login={h.get("login")}, name={h.get("name")}')
    except FileNotFoundError:
        print(f'{fname}: not found')

conn.close()
