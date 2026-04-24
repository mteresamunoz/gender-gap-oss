import sqlite3
c = sqlite3.connect('db/gender_gap.db')
rows = c.execute("SELECT member_login, name, gender FROM org_members WHERE org_login='deepseek-ai'").fetchall()
print('deepseek-ai members:')
for r in rows:
    print(f'  {r[0]} | {r[1]} | {r[2]}')
c.close()
