import sqlite3
import sys

# Fix encoding for Windows
sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect('db/gender_gap.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

c.execute('''
    SELECT login, name, first_name_used, country, top_language, gender, gender_confidence, followers
    FROM github_users
    WHERE gender = 'female'
      AND snapshot_date = (SELECT MAX(snapshot_date) FROM github_users)
    ORDER BY followers DESC
''')

women = c.fetchall()
print(f'Total women found: {len(women)}')
print()

print(f"{'#':<4} {'Login':<22} {'Name':<30} {'First Name':<15} {'Country':<15} {'Language':<12} {'Confidence':<12} {'Followers':<12}")
print('-' * 140)

for i, w in enumerate(women, 1):
    login = (w['login'] or '')[:21]
    name = (w['name'] or '')[:29]
    first = (w['first_name_used'] or '')[:14]
    country = (w['country'] or 'N/A')[:14]
    lang = (w['top_language'] or 'N/A')[:11]
    conf = w['gender_confidence'] or 'N/A'
    followers = w['followers'] or 0
    print(f'{i:<4} {login:<22} {name:<30} {first:<15} {country:<15} {lang:<12} {conf:<12} {followers:<12,}')

# Check Kailash Nadh
c.execute('''
    SELECT login, name, first_name_used, country, gender, gender_confidence
    FROM github_users WHERE login = 'knadh'
''')
knadh = c.fetchone()
print()
if knadh:
    print('>>> Kailash Nadh (knadh):')
    print(f'    Name: {knadh["name"]}')
    print(f'    First name used: {knadh["first_name_used"]}')
    print(f'    Gender: {knadh["gender"]}')
    print(f'    Confidence: {knadh["gender_confidence"]}')
else:
    print('>>> knadh not found in github_users')

conn.close()
