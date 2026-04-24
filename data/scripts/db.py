"""Shared DB helpers: connection and schema."""
import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "gender_gap.db")


def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def _add_column_if_missing(conn, table, column, coldef):
    """Add a column to a table only if it doesn't already exist."""
    cols = [r[1] for r in conn.execute(f"PRAGMA table_info({table})")]
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {coldef}")


def setup_schema(conn):
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS github_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            login TEXT UNIQUE NOT NULL,
            name TEXT,
            first_name_used TEXT,
            followers INTEGER NOT NULL,
            public_repos INTEGER,
            company TEXT,
            location TEXT,
            country TEXT,
            account_created_year INTEGER,
            avatar_url TEXT,
            top_language TEXT,
            gender TEXT,
            gender_probability REAL,
            gender_confidence TEXT,
            last_updated TEXT NOT NULL,
            snapshot_date TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_github_users_country ON github_users(country);
        CREATE INDEX IF NOT EXISTS idx_github_users_year ON github_users(account_created_year);
        CREATE INDEX IF NOT EXISTS idx_github_users_gender ON github_users(gender);

        -- Cache of gender lookups. Country '' means "no country hint".
        -- Prevents re-classifying already-known (name, country) pairs.
        CREATE TABLE IF NOT EXISTS gender_cache (
            first_name TEXT NOT NULL,
            country_iso2 TEXT NOT NULL DEFAULT '',
            gender TEXT,
            probability REAL,
            confidence TEXT,
            queried_at TEXT NOT NULL,
            PRIMARY KEY (first_name, country_iso2)
        );

        CREATE TABLE IF NOT EXISTS snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            platform TEXT NOT NULL,
            scope TEXT NOT NULL,
            date TEXT NOT NULL,
            total_analyzed INTEGER NOT NULL,
            female_count INTEGER NOT NULL,
            male_count INTEGER NOT NULL,
            unknown_count INTEGER NOT NULL,
            female_percent REAL NOT NULL,
            UNIQUE (platform, scope, date)
        );

        -- Lista curada de repos clave del ecosistema IA.
        CREATE TABLE IF NOT EXISTS ai_repos (
            repo TEXT PRIMARY KEY,  -- "owner/name"
            category TEXT NOT NULL,  -- "framework", "llm", "vision", ...
            added_at TEXT NOT NULL
        );

        -- Top N contributors de cada repo curado. Una fila por (repo, login).
        CREATE TABLE IF NOT EXISTS ai_repo_contributors (
            repo TEXT NOT NULL REFERENCES ai_repos(repo),
            login TEXT NOT NULL,
            contributions INTEGER NOT NULL,  -- commits al repo (del endpoint REST)
            rank INTEGER NOT NULL,
            PRIMARY KEY (repo, login)
        );
        CREATE INDEX IF NOT EXISTS idx_repo_contrib_login ON ai_repo_contributors(login);

        -- Perfil unico de cada contributor (deduplicado de ai_repo_contributors).
        CREATE TABLE IF NOT EXISTS contributors (
            login TEXT PRIMARY KEY,
            name TEXT,
            first_name_used TEXT,
            company TEXT,
            location TEXT,
            country TEXT,
            avatar_url TEXT,
            account_created_year INTEGER,
            gender TEXT,
            gender_probability REAL,
            gender_confidence TEXT,
            is_organization_account INTEGER DEFAULT 0,
            last_updated TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_contributors_gender ON contributors(gender);

        -- Actividad anual de cada contributor (de GraphQL contributionsCollection).
        -- NOTA: es actividad total del usuario en GitHub ese ano, no solo en repos curados.
        -- Usamos esto como proxy del volumen de trabajo de quienes estan en el ecosistema IA.
        CREATE TABLE IF NOT EXISTS contributor_yearly (
            login TEXT NOT NULL REFERENCES contributors(login),
            year INTEGER NOT NULL,
            commits INTEGER NOT NULL DEFAULT 0,
            prs INTEGER NOT NULL DEFAULT 0,
            issues INTEGER NOT NULL DEFAULT 0,
            reviews INTEGER NOT NULL DEFAULT 0,
            PRIMARY KEY (login, year)
        );
        CREATE INDEX IF NOT EXISTS idx_contributor_yearly_year ON contributor_yearly(year);

        -- Public members of GitHub orgs (from fetch_org_members.py).
        -- Each row is one member of one org.
        CREATE TABLE IF NOT EXISTS org_members (
            org_login TEXT NOT NULL,
            member_login TEXT NOT NULL,
            name TEXT,
            avatar_url TEXT,
            followers INTEGER DEFAULT 0,
            gender TEXT,
            gender_source TEXT,
            fetched_at TEXT NOT NULL,
            PRIMARY KEY (org_login, member_login)
        );
        CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_login);
        CREATE INDEX IF NOT EXISTS idx_org_members_gender ON org_members(gender);
    """)
    # Migrate: add bio column if missing (introduced after initial schema)
    _add_column_if_missing(conn, "github_users", "bio", "TEXT")
    _add_column_if_missing(conn, "contributors", "bio", "TEXT")
    conn.commit()
