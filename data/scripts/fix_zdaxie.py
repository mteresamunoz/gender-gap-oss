import sqlite3
conn = sqlite3.connect('db/gender_gap.db')
c = conn.cursor()
c.execute("UPDATE org_members SET gender='male', gender_source='override' WHERE member_login='zdaxie'")
print('Updated rows:', c.rowcount)
c.execute("SELECT member_login, name, gender, gender_source FROM org_members WHERE member_login='zdaxie'")
print(c.fetchone())
conn.commit()
conn.close()
