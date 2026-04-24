import sqlite3
import sys
sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect('db/gender_gap.db')
c = conn.cursor()

print("=== REPOS INCLUIDOS EN EL ESTUDIO ===")
print("(Estos son los 20 repos de IA de los que sacamos los top 100 contributors)")
print()
c.execute("SELECT repo, category FROM ai_repos ORDER BY repo")
for repo, cat in c.fetchall():
    print(f"  - {repo} ({cat})")

print()
print("=== COMO FUNCIONA EL TIMELINE ===")
print()
print("1. De cada repo sacamos los TOP 100 contributors (por # de commits)")
print("   = 20 repos x ~100 = ~1,700 contributors unicos")
print()
print("2. Para CADA contributor, pedimos a GitHub GraphQL:")
print("   'Cuantos commits/PRs/issues hiciste en 2017? Y en 2018? ... 2025?'")
print()
print("3. Los resultados se guardan en contributor_yearly:")
print("   login | year | commits | prs | issues | reviews")
print()

print("=== DATOS REALES POR ANO ===")
c.execute('''
    SELECT
        cy.year,
        COUNT(DISTINCT cy.login) AS contributors_con_actividad,
        SUM(cy.commits) AS total_commits,
        SUM(cy.prs) AS total_prs,
        SUM(cy.issues) AS total_issues
    FROM contributor_yearly cy
    WHERE cy.year >= 2017
    GROUP BY cy.year
    ORDER BY cy.year
''')

print(f"{'Year':<6} {'Contributors':<14} {'Commits':<12} {'PRs':<10} {'Issues':<10}")
print("-" * 60)
for row in c.fetchall():
    print(f"{row[0]:<6} {row[1]:<14,} {row[2]:<12,} {row[3]:<10,} {row[4]:<10,}")

print()
print("=== GENDER BREAKDOWN DE LOS 1,708 CONTRIBUTORS ===")
c.execute('SELECT gender, COUNT(*) FROM contributors GROUP BY gender')
for gender, count in c.fetchall():
    label = gender if gender else "Unclassified"
    print(f"  {label}: {count}")

print()
print("=== EJEMPLO: CUANTOS COMMITS HICIERON MUJERES EN 2023? ===")
c.execute('''
    SELECT
        SUM(CASE WHEN c.gender='female' THEN cy.commits ELSE 0 END) AS female_commits,
        SUM(cy.commits) AS total_commits
    FROM contributor_yearly cy
    JOIN contributors c ON cy.login = c.login
    WHERE cy.year = 2023
''')
female_c, total_c = c.fetchone()
print(f"  Commits por mujeres: {female_c:,}")
print(f"  Commits totales: {total_c:,}")
print(f"  Porcentaje: {(female_c/total_c*100):.1f}%")

conn.close()
