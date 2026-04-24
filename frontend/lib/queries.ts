import "server-only"
import { db } from "./db"

export type TopUser = {
  login: string
  name: string | null
  avatar_url: string | null
  followers: number
  top_language: string | null
  company: string | null
  country: string | null
  gender: string | null
  isWoman: boolean
}

/** All top-500 users ordered by followers desc. Used for the mosaic grid. */
export function getTopUsers(): TopUser[] {
  return db()
    .prepare(
      `
      SELECT
        login,
        name,
        avatar_url,
        followers,
        top_language,
        company,
        gender,
        CASE WHEN gender = 'female' THEN 1 ELSE 0 END AS isWoman
      FROM github_users
      WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM github_users)
      ORDER BY followers DESC
      `,
    )
    .all() as TopUser[]
}

/** Only women from the top users, ordered by followers desc. */
export function getWomenTopUsers(): TopUser[] {
  return db()
    .prepare(
      `
      SELECT
        login,
        name,
        avatar_url,
        followers,
        top_language,
        company,
        country,
        gender,
        1 AS isWoman
      FROM github_users
      WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM github_users)
        AND gender = 'female'
      ORDER BY followers DESC
      `,
    )
    .all() as TopUser[]
}

export type OverallStats = {
  /** Total rows in the latest snapshot. */
  total: number
  female: number
  male: number
  /** Rows where gender couldn't be inferred (no name, non-latin only, org accounts). */
  unknown: number
  /** Rows that look like organisation accounts (first_name == login). */
  orgs: number
  /** % women out of classified people (female + male) — the main stat. */
  femalePercent: number
  /** % women over total analyzed, including unclassified. */
  femalePercentOfTotal: number
  /** ISO date of the snapshot these numbers came from. */
  snapshotDate: string
}

export function getOverallStats(): OverallStats {
  const row = db()
    .prepare(
      `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) AS female,
        SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) AS male,
        SUM(CASE WHEN gender IS NULL THEN 1 ELSE 0 END) AS unknown,
        SUM(CASE WHEN lower(first_name_used) = lower(login) THEN 1 ELSE 0 END) AS orgs,
        MAX(snapshot_date) AS snapshotDate
      FROM github_users
      WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM github_users)
    `,
    )
    .get() as {
    total: number
    female: number
    male: number
    unknown: number
    orgs: number
    snapshotDate: string
  }

  const classified = row.female + row.male
  return {
    total: row.total,
    female: row.female,
    male: row.male,
    unknown: row.unknown,
    orgs: row.orgs,
    femalePercent: classified ? +((row.female / classified) * 100).toFixed(1) : 0,
    femalePercentOfTotal: row.total ? +((row.female / row.total) * 100).toFixed(1) : 0,
    snapshotDate: row.snapshotDate,
  }
}

export type YearStats = {
  year: number
  total: number
  female: number
  male: number
  femalePct: number
}

/** For the "2017 → today" evolution chart. Grouped by GitHub account creation year. */
export function getTimelineByYear(minYear = 2017): YearStats[] {
  return db()
    .prepare(
      `
      SELECT
        account_created_year AS year,
        COUNT(*) AS total,
        SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) AS female,
        SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) AS male,
        ROUND(
          100.0 * SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END)
                / NULLIF(SUM(CASE WHEN gender IN ('male','female') THEN 1 ELSE 0 END), 0),
          1
        ) AS femalePct
      FROM github_users
      WHERE account_created_year IS NOT NULL
        AND account_created_year >= ?
        AND snapshot_date = (SELECT MAX(snapshot_date) FROM github_users)
      GROUP BY account_created_year
      ORDER BY account_created_year
    `,
    )
    .all(minYear) as YearStats[]
}

export type LanguageStats = {
  language: string
  total: number
  female: number
  femalePct: number
}

/** Top languages among the top-500 users and their gender breakdown. */
export function getByLanguage(minUsers = 3): LanguageStats[] {
  return db()
    .prepare(
      `
      SELECT
        top_language AS language,
        COUNT(*) AS total,
        SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) AS female,
        ROUND(
          100.0 * SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END)
                / NULLIF(SUM(CASE WHEN gender IN ('male','female') THEN 1 ELSE 0 END), 0),
          1
        ) AS femalePct
      FROM github_users
      WHERE top_language IS NOT NULL
        AND snapshot_date = (SELECT MAX(snapshot_date) FROM github_users)
      GROUP BY top_language
      HAVING total >= ?
      ORDER BY total DESC
    `,
    )
    .all(minUsers) as LanguageStats[]
}

export type CountryStats = {
  country: string
  total: number
  female: number
  male: number
  femalePct: number
}

/**
 * Gender breakdown by country among the top-500. NOTE: with only 500 global
 * users, most countries still have small samples. This is a placeholder until phase 2
 * (per-country top 100) lands.
 */
export function getByCountry(minUsers = 2): CountryStats[] {
  return db()
    .prepare(
      `
      SELECT
        country,
        COUNT(*) AS total,
        SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) AS female,
        ROUND(
          100.0 * SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END)
                / NULLIF(SUM(CASE WHEN gender IN ('male','female') THEN 1 ELSE 0 END), 0),
          1
        ) AS femalePct
      FROM github_users
      WHERE country IS NOT NULL
        AND snapshot_date = (SELECT MAX(snapshot_date) FROM github_users)
      GROUP BY country
      HAVING total >= ?
      ORDER BY total DESC
    `,
    )
    .all(minUsers) as CountryStats[]
}

// ───────────────────────────────────────────────
// Curated-repo contributor timeline
// ───────────────────────────────────────────────

export type ContributorYearStats = {
  year: number
  total_contributors: number
  female: number
  male: number
  femalePct: number
  femaleCommitPct: number
  maleCommitPct: number
  unclassifiedCommitPct: number
}

/**
 * Yearly stats from the curated AI repos contributors.
 * Uses contributor_yearly joined with contributors for gender.
 * Falls back to empty array when no data has been populated yet.
 */
export function getContributorTimeline(minYear = 2017): ContributorYearStats[] {
  try {
    return db()
      .prepare(
        `
        SELECT
          cy.year,
          COUNT(DISTINCT cy.login) AS total_contributors,
          SUM(CASE WHEN c.gender = 'female' THEN 1 ELSE 0 END) AS female,
          SUM(CASE WHEN c.gender = 'male' THEN 1 ELSE 0 END) AS male,
          ROUND(
            100.0 * SUM(CASE WHEN c.gender = 'female' THEN 1 ELSE 0 END)
                  / NULLIF(SUM(CASE WHEN c.gender IN ('male','female') THEN 1 ELSE 0 END), 0),
            1
          ) AS femalePct,
          ROUND(
            100.0 * SUM(CASE WHEN c.gender = 'female' THEN cy.commits ELSE 0 END)
                  / NULLIF(SUM(cy.commits), 0),
            1
          ) AS femaleCommitPct,
          ROUND(
            100.0 * SUM(CASE WHEN c.gender = 'male' THEN cy.commits ELSE 0 END)
                  / NULLIF(SUM(cy.commits), 0),
            1
          ) AS maleCommitPct,
          ROUND(
            100.0 * SUM(CASE WHEN c.gender IS NULL THEN cy.commits ELSE 0 END)
                  / NULLIF(SUM(cy.commits), 0),
            1
          ) AS unclassifiedCommitPct
        FROM contributor_yearly cy
        JOIN contributors c ON cy.login = c.login
        WHERE cy.year >= ?
        GROUP BY cy.year
        ORDER BY cy.year
        `,
      )
      .all(minYear) as ContributorYearStats[]
  } catch {
    // Table may not exist until the curated-repos pipeline has run.
    return []
  }
}

export type UserWithCountry = {
  login: string
  name: string | null
  avatar_url: string | null
  followers: number
  country: string
  gender: string | null
  top_language: string | null
}

/** Per-country top 100 data for the interactive map. */
export function getUsersByCountry(): UserWithCountry[] {
  try {
    return db()
      .prepare(
        `
        SELECT
          login,
          name,
          avatar_url,
          followers,
          country_scope AS country,
          gender,
          top_language
        FROM github_users_by_country
        ORDER BY country_scope, followers DESC
        `,
      )
      .all() as UserWithCountry[]
  } catch {
    // Table may not exist until fetch_github_by_country.py has run.
    return []
  }
}

/** All users with a known country, for the interactive map. */
export function getUsersWithCountry(): UserWithCountry[] {
  return db()
    .prepare(
      `
      SELECT
        login,
        name,
        avatar_url,
        followers,
        country,
        gender,
        top_language
      FROM github_users
      WHERE country IS NOT NULL
        AND snapshot_date = (SELECT MAX(snapshot_date) FROM github_users)
      ORDER BY followers DESC
      `,
    )
    .all() as UserWithCountry[]
}

export type OrgStat = {
  org_login: string
  total_members: number
  female: number
  male: number
  unclassified: number
  female_pct: number
  male_pct: number
  unclassified_pct: number
  has_data: boolean
}

/** Gender stats per GitHub org (from public members). Returns empty if fetch_org_members.py has not been run yet. */
export function getOrgStats(): OrgStat[] {
  try {
    return db()
      .prepare(
        `
        SELECT
          org_login,
          COUNT(*) AS total_members,
          SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END) AS female,
          SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END) AS male,
          SUM(CASE WHEN gender IS NULL THEN 1 ELSE 0 END) AS unclassified,
          ROUND(
            100.0 * SUM(CASE WHEN gender = 'female' THEN 1 ELSE 0 END)
                  / NULLIF(COUNT(*), 0),
            1
          ) AS female_pct,
          ROUND(
            100.0 * SUM(CASE WHEN gender = 'male' THEN 1 ELSE 0 END)
                  / NULLIF(COUNT(*), 0),
            1
          ) AS male_pct,
          ROUND(
            100.0 * SUM(CASE WHEN gender IS NULL THEN 1 ELSE 0 END)
                  / NULLIF(COUNT(*), 0),
            1
          ) AS unclassified_pct
        FROM org_members
        GROUP BY org_login
        ORDER BY total_members DESC
        `,
      )
      .all() as OrgStat[]
  } catch {
    return []
  }
}

export type Org = {
  login: string
  name: string | null
  avatar_url: string | null
  followers: number
}

export type OrgMember = {
  org_login: string
  member_login: string
  name: string | null
  avatar_url: string | null
  followers: number
  gender: string | null
  gender_source: string | null
}

/** All org members across all orgs (for the detail modal). */
export function getAllOrgMembers(): OrgMember[] {
  try {
    return db()
      .prepare(
        `
        SELECT
          org_login,
          member_login,
          name,
          avatar_url,
          followers,
          gender,
          gender_source
        FROM org_members
        ORDER BY org_login, followers DESC
        `,
      )
      .all() as OrgMember[]
  } catch {
    return []
  }
}

/** Individual members of a specific org (for the detail modal). */
export function getOrgMembers(org_login: string): OrgMember[] {
  try {
    return db()
      .prepare(
        `
        SELECT
          member_login,
          name,
          avatar_url,
          followers,
          gender,
          gender_source
        FROM org_members
        WHERE org_login = ?
        ORDER BY followers DESC
        `,
      )
      .all(org_login) as OrgMember[]
  } catch {
    return []
  }
}

/** Organisation accounts detected in the top users. */
export function getOrganizations(): Org[] {
  return db()
    .prepare(
      `
      SELECT
        login,
        name,
        avatar_url,
        followers
      FROM github_users
      WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM github_users)
        AND gender IS NULL
      ORDER BY followers DESC
      `,
    )
    .all() as Org[]
}
