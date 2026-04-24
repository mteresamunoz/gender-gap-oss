# Data pipeline

Fetches the top 500 GitHub users by followers, contributors from ~20 key AI repos, infers gender offline with gender-guesser + names-dataset, and stores everything in `data/db/gender_gap.db` (SQLite).

## Setup (first time only)

```bash
cd data
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
```

### Environment variables

Required before running scripts:

```bash
# Windows (PowerShell)
$env:GITHUB_TOKEN="ghp_xxx"

# macOS/Linux
export GITHUB_TOKEN=ghp_xxx
```

- `GITHUB_TOKEN`: raises rate limit from 60/h → 5000/h. [Create here](https://github.com/settings/tokens)
  (no scopes needed — a token without permissions is enough for the public API).

## Execution (in this order)

```bash
python scripts/fetch_github.py           # ~2-3 min — downloads top 500 + profiles
python scripts/fetch_repo_contributors.py # ~5 min — downloads AI repo contributors
python scripts/infer_gender.py          # offline gender classification, saves cache in DB
python scripts/fetch_yearly_contributions.py  # GraphQL — yearly contributions (resumable)
python scripts/seed_database.py         # writes everything to SQLite
```

### What each script does

1. **`fetch_github.py`** — downloads the GitHub top 500 by followers. For each user
   saves name, country (inferred from `location`), account creation year, most-used
   language, and avatar. Output: `data/raw/github_users.json`.

2. **`fetch_repo_contributors.py`** — downloads the top 100 contributors from ~20
   key AI repos (pytorch, transformers, langchain, etc.). Output:
   `data/raw/ai_repo_contributors.json` and `data/raw/ai_contributors.json`.

3. **`infer_gender.py`** — gender classification with a tiered approach:
   - First: self-declared pronouns from GitHub GraphQL API
   - Second: pronouns written in profile bio
   - Third: organisation detection (`type: "Organization"` + known-org list)
   - Fourth: manual overrides for known misclassifications
   - Fifth: gender-guesser offline name dictionary (fallback)
   - Sixth: names-dataset fallback (~728K names)
   Checks the `gender_cache` DB table to avoid re-classifying known names.

4. **`fetch_yearly_contributions.py`** — uses GitHub GraphQL API to get
   yearly contributions (commits, PRs, issues, reviews) for each contributor.
   It is resumable: saves progress to `data/raw/contributor_yearly_progress.json`.
   If the rate limit is hit, it stops and resumes on re-run.

5. **`seed_database.py`** — upserts processed users into `github_users`,
   contributors into `contributors`, repo-contributors into `ai_repo_contributors`,
   and adds a row to `snapshots` with the monthly aggregate.

## First run

The top users are processed in two stages:
1. `fetch_github.py` downloads profiles via REST API + pronouns via GraphQL API
2. `infer_gender.py` applies the tiered classification (pronouns → bio → org → override → gender-guesser)

Classification is instant for the statistical layer (gender-guesser is offline).

## Monthly runs

The GitHub Actions workflow (in `.github/workflows/update.yml`) runs the full
pipeline on the 1st of each month. Additionally, `.github/workflows/cache-warmer.yml`
runs daily to keep populating yearly contributions.

## Inspecting the DB manually

```bash
sqlite3 db/gender_gap.db

# Gender distribution
SELECT gender, COUNT(*) FROM github_users GROUP BY gender;

# % women by account creation year (the 2017→today chart)
SELECT account_created_year,
       COUNT(*) AS total,
       SUM(CASE WHEN gender='female' THEN 1 ELSE 0 END) AS female,
       ROUND(100.0 * SUM(CASE WHEN gender='female' THEN 1 ELSE 0 END) / COUNT(*), 1) AS female_pct
FROM github_users
WHERE account_created_year >= 2017
GROUP BY account_created_year
ORDER BY account_created_year;

# % women by yearly contributions in AI repos
SELECT cy.year,
       COUNT(DISTINCT cy.login) AS contributors,
       SUM(CASE WHEN c.gender='female' THEN cy.commits ELSE 0 END) AS female_commits,
       SUM(cy.commits) AS total_commits,
       ROUND(100.0 * SUM(CASE WHEN c.gender='female' THEN cy.commits ELSE 0 END)
             / NULLIF(SUM(cy.commits), 0), 1) AS female_commit_pct
FROM contributor_yearly cy
JOIN contributors c ON cy.login = c.login
WHERE cy.year >= 2017
GROUP BY cy.year
ORDER BY cy.year;

# Gender cache size
SELECT COUNT(*) FROM gender_cache;
```
