import sqlite3

conn = sqlite3.connect('db/gender_gap.db')
c = conn.cursor()

print("=== Contributors gender breakdown ===")
c.execute('''
    SELECT gender, COUNT(*) FROM contributors GROUP BY gender
''')
for row in c.fetchall():
    print(f"  {row[0] or 'NULL'}: {row[1]}")

print("\n=== Timeline data per year ===")
c.execute('''
    SELECT
        cy.year,
        COUNT(DISTINCT cy.login) AS total_contributors,
        SUM(CASE WHEN c.gender='female' THEN 1 ELSE 0 END) AS female,
        SUM(CASE WHEN c.gender='male' THEN 1 ELSE 0 END) AS male,
        SUM(CASE WHEN c.gender IS NULL THEN 1 ELSE 0 END) AS unknown,
        ROUND(100.0 * SUM(CASE WHEN c.gender='female' THEN cy.commits ELSE 0 END) / NULLIF(SUM(cy.commits), 0), 1) AS female_commit_pct,
        SUM(cy.commits) AS total_commits,
        SUM(cy.prs) AS total_prs,
        SUM(cy.issues) AS total_issues
    FROM contributor_yearly cy
    JOIN contributors c ON cy.login = c.login
    WHERE cy.year >= 2017
    GROUP BY cy.year
    ORDER BY cy.year
''')

print(f"{'Year':<6} {'Contrib':<8} {'Female':<7} {'Male':<7} {'Unknown':<8} {'F%Commits':<10} {'Commits':<10} {'PRs':<8} {'Issues':<8}")
print("-" * 90)
for row in c.fetchall():
    print(f"{row[0]:<6} {row[1]:<8} {row[2]:<7} {row[3]:<7} {row[4]:<8} {row[5] or 0:<10} {row[6] or 0:<10,} {row[7] or 0:<8,} {row[8] or 0:<8,}")

print("\n=== Example: contributors without gender in 2023 ===")
c.execute('''
    SELECT DISTINCT cy.login, c.name
    FROM contributor_yearly cy
    JOIN contributors c ON cy.login = c.login
    WHERE cy.year = 2023 AND c.gender IS NULL
    LIMIT 10
''')
for row in c.fetchall():
    print(f"  {row[0]} ({row[1] or 'no name'})")

conn.close()
