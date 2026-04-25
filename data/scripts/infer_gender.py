"""Infer gender using a tiered approach that prioritises self-declared data.

Priority (highest to lowest):
  1. GitHub pronouns field (GraphQL API) — e.g. "she/her", "he/him"
  2. Pronouns declared in profile bio — e.g. "he/him" in bio text
  3. Organisation accounts — type="Organization" from API or known-org list
  4. Manual overrides — known individuals misclassified by name-based tools
  5. gender-guesser offline dictionary (~61K names, 43 countries)
  6. names-dataset fallback (~728K names from global Facebook data)

gender-guesser mapping:
  male          -> gender='male',    probability=0.95
  female        -> gender='female',  probability=0.95
  mostly_male   -> gender='male',    probability=0.75
  mostly_female -> gender='female',  probability=0.75
  andy          -> gender=None,      probability=0.0
  unknown       -> gender=None,      probability=0.0
"""
import json
import os
from datetime import datetime, timezone

import gender_guesser.detector as gender
from names_dataset import NameDataset

from db import get_db, setup_schema

# Initialise once — reads the bundled ~4 MB dictionary into memory.
detector = gender.Detector()

# Lazy-load names-dataset only when needed (heavy: ~3GB RAM, ~7s load).
_name_dataset = None

def get_name_dataset():
    global _name_dataset
    if _name_dataset is None:
        print("  Loading names-dataset (this may take a few seconds)...")
        _name_dataset = NameDataset()
    return _name_dataset


def classify_names_dataset(first_name):
    """Fallback classifier using names-dataset (~728K names).

    Returns (gender, probability, confidence) or (None, 0.0, 'unknown').
    """
    if not first_name:
        return None, 0.0, "unknown"
    try:
        nd = get_name_dataset()
        r = nd.search(first_name)
        if r and r.get("first_name") and r["first_name"].get("gender"):
            g = r["first_name"]["gender"]
            female_p = g.get("Female", 0)
            male_p = g.get("Male", 0)
            total = female_p + male_p
            if total == 0:
                return None, 0.0, "unknown"
            p_female = female_p / total
            if p_female >= 0.85:
                return "female", round(p_female, 2), "high"
            elif p_female <= 0.15:
                return "male", round(1 - p_female, 2), "high"
            elif p_female >= 0.65:
                return "female", round(p_female, 2), "medium"
            elif p_female <= 0.35:
                return "male", round(1 - p_female, 2), "medium"
            else:
                return None, max(p_female, 1 - p_female), "low"
    except Exception as e:
        print(f"    names-dataset error for '{first_name}': {e}")
    return None, 0.0, "unknown"

# Known organisation logins (common ones that may slip through the type check).
# These are skipped for gender classification.
KNOWN_ORGS = {
    # Big tech
    "facebook", "facebookresearch", "meta", "google", "microsoft", "openai",
    "apple", "amazon", "nvidia", "tesla", "github", "gitlab", "bitbucket",
    "twitter", "x", "linkedin", "instagram", "youtube", "reddit", "discord",
    # AI / ML orgs
    "huggingface", "deepmind", "google-deepmind", "anthropics", "anthropic",
    "deepseek-ai", "stabilityai", "midjourney", "runwayml", "cohere",
    "eleutherai", "bigscience", "bigcode", "laion", "allenai", "ai2",
    "baai", "damo-academy", "sensetime", "megvii", "mosaicml",
    "modelcontextprotocol", "claude",
    # Developer tools / platforms
    "vercel", "netlify", "cloudflare", "docker", "kubernetes",
    "terraform", "npm", "yarn", "pnpm", "bun", "deno", "nodejs",
    "python", "rust-lang", "golang", "swift", "kotlin",
    "visual-studio-code", "jetbrains", "unity", "unrealengine",
    # Gaming
    "epicgames", "valve", "blizzard", "riotgames", "supercell",
    # Databases / infra
    "mongodb", "redis", "elastic", "grafana", "prometheus",
    # Education / community
    "freecodecamp", "programminghero1", "thealgorithms", "datawhalechina",
    "community", "revanced", "elyxdev", "microsoft-corp",
    # Misc known orgs
    "apache", "mozilla", "netflix", "spotify", "uber", "airbnb",
    "stripe", "square", "tiktok", "snapchat", "pinterest",
    "slack", "notion", "figma", "gradle", "maven", "ansible",
    "istio", "envoyproxy", "cilium", "linkerd", "helm",
    "knative", "tektoncd", "argo", "fluxcd", "crossplane",
    "kubeflow", "mlflow", "dvc", "feast", "tfx", "pytorch",
    "tensorflow", "jax", "flax", "deepspeed", "fairseq", "vllm", "sglang",
}

# Manual overrides for individuals misclassified by gender-guesser.
# Key = login (lowercase), value = (gender, probability, confidence)
OVERRIDES = {
    "kelseyhightower": ("male", 1.0, "high"),  # Kelsey Hightower
    "taylorotwell": ("male", 1.0, "high"),      # Taylor Otwell
    "hkirat": ("male", 1.0, "high"),             # Kirat (male)
    "donnemartin": ("male", 1.0, "high"),        # Donne Martin (male)
    "knadh": ("male", 1.0, "high"),               # Kailash Nadh (male)
    "premchapagain": ("male", 1.0, "high"),       # Prem Chapagain (male)
    "zdaxie": ("male", 0.82, "medium"),           # Zhenda Xie (male)
    "yihui": ("male", 1.0, "high"),                # Yihui Xie (male)
}

# Name-based overrides (case-insensitive first name → gender).
# Use sparingly: only when a name is universally one gender across all countries.
# If country-specific, add to gender_cache via login override instead.
NAME_OVERRIDES = {
    "yihui": "male",
}


def is_organization(u, login):
    """Check if this account is an organisation.

    We ONLY use two sources:
      1. GitHub API type field == 'Organization' (most reliable)
      2. Login matches KNOWN_ORGS set (manual curation of obvious orgs)

    We NEVER use name-based heuristics (e.g. first_name == login)
    because that misclassifies real people with nicknames.
    """
    if u.get("type") == "Organization":
        return True
    if login.lower() in KNOWN_ORGS:
        return True
    return False

JOBS = [
    {
        "input": os.path.join(os.path.dirname(__file__), "..", "raw", "github_users.json"),
        "output": os.path.join(os.path.dirname(__file__), "..", "processed", "github_users.json"),
        "name_field": "name",
        "login_field": "login",
        "country_field": "country",
    },
    {
        "input": os.path.join(os.path.dirname(__file__), "..", "raw", "ai_contributors.json"),
        "output": os.path.join(os.path.dirname(__file__), "..", "processed", "ai_contributors.json"),
        "name_field": "name",
        "login_field": "login",
        "country_field": "country",
    },
    {
        "input": os.path.join(os.path.dirname(__file__), "..", "raw", "github_users_by_country.json"),
        "output": os.path.join(os.path.dirname(__file__), "..", "processed", "github_users_by_country.json"),
        "name_field": "name",
        "login_field": "login",
        "country_field": "country",
    },
]

# Map country names from our data to gender-guesser country codes.
COUNTRY_MAP = {
    "United States": "usa",
    "United Kingdom": "great_britain",
    "Germany": "germany",
    "France": "france",
    "Spain": "spain",
    "India": "india",
    "China": "china",
    "Japan": "japan",
    "Brazil": "other_countries",
    "Canada": "other_countries",
    "Australia": "other_countries",
    "Netherlands": "the_netherlands",
    "Sweden": "sweden",
    "Switzerland": "swiss",
    "Russia": "russia",
    "South Korea": "korea",
    "Italy": "italy",
    "Mexico": "other_countries",
    "Argentina": "other_countries",
    "Israel": "israel",
    "Turkey": "turkey",
    "Poland": "poland",
    "Ukraine": "ukraine",
    "Singapore": "other_countries",
    "Hong Kong": "other_countries",
    "Taiwan": "other_countries",
    "Vietnam": "vietnam",
    "Indonesia": "other_countries",
    "Nigeria": "other_countries",
    "South Africa": "other_countries",
    "Portugal": "portugal",
    "Belgium": "belgium",
    "Denmark": "denmark",
    "Norway": "norway",
    "Finland": "finland",
    "Austria": "austria",
    "Ireland": "ireland",
    "Greece": "greece",
}


def get_first_name(full_name):
    if not full_name:
        return None
    clean = "".join(c for c in full_name if c.isalpha() or c.isspace())
    parts = clean.strip().split()
    return parts[0] if parts else None


# Pronoun patterns that appear in GitHub profiles.
# Maps pronoun phrases to (gender, probability, confidence, source)
PRONOUN_MAP = {
    # she/her
    "she/her": ("female", 0.99, "high", "pronouns"),
    "she / her": ("female", 0.99, "high", "pronouns"),
    "she\\her": ("female", 0.99, "high", "pronouns"),
    # he/him
    "he/him": ("male", 0.99, "high", "pronouns"),
    "he / him": ("male", 0.99, "high", "pronouns"),
    "he\\him": ("male", 0.99, "high", "pronouns"),
    # they/them
    "they/them": (None, 0.0, "unknown", "pronouns"),
    "they / them": (None, 0.0, "unknown", "pronouns"),
    # she/they
    "she/they": (None, 0.0, "unknown", "pronouns"),
    "she / they": (None, 0.0, "unknown", "pronouns"),
    # he/they
    "he/they": (None, 0.0, "unknown", "pronouns"),
    "he / they": (None, 0.0, "unknown", "pronouns"),
    # any pronouns
    "any pronouns": (None, 0.0, "unknown", "pronouns"),
    "all pronouns": (None, 0.0, "unknown", "pronouns"),
}


def parse_pronouns_field(pronouns):
    """Parse the explicit pronouns field from GitHub GraphQL API.

    Returns (gender, probability, confidence, source) or None.
    """
    if not pronouns:
        return None
    # Split by slash so "she" is not mistaken for containing "he"
    parts = [part.strip() for part in pronouns.lower().split("/")]
    if "she" in parts and "he" not in parts:
        return ("female", 0.99, "high", "pronouns")
    if "he" in parts and "she" not in parts:
        return ("male", 0.99, "high", "pronouns")
    # they/them, he/they, she/they, any pronouns -> unknown (respectful ambiguity)
    return (None, 0.0, "unknown", "pronouns")


def parse_pronouns_from_bio(bio):
    """Look for pronoun declarations in a GitHub bio (fallback).

    Returns (gender, probability, confidence, source) or None if not found.
    """
    if not bio:
        return None
    bio_lower = bio.lower()
    for pattern, result in PRONOUN_MAP.items():
        if pattern in bio_lower:
            return result
    return None


def get_cache_entry(conn, first_name, country_iso2):
    """Look up a (first_name, country) pair in the gender cache.

    Returns (gender, probability, confidence) or None if not found.
    """
    if not first_name:
        return None
    row = conn.execute(
        """
        SELECT gender, probability, confidence
        FROM gender_cache
        WHERE first_name = ? AND country_iso2 = ?
        """,
        (first_name.lower(), country_iso2 or ""),
    ).fetchone()
    if row:
        return row["gender"], row["probability"], row["confidence"]
    return None


def classify(conn, first_name, country=None):
    """Classify a single first name: cache → gender-guesser → names-dataset fallback.

    Returns (gender, probability, confidence, source).
    """
    if not first_name:
        return None, 0.0, "unknown", "none"

    first_lc = first_name.lower()
    iso2 = COUNTRY_MAP.get(country, "")

    # 0. Name-based override (universal, country-agnostic).
    if first_lc in NAME_OVERRIDES:
        g = NAME_OVERRIDES[first_lc]
        return g, 1.0, "high", "name-override"

    # 1. Check cache first (avoids re-inferring known names).
    cached = get_cache_entry(conn, first_name, iso2)
    if cached:
        g, prob, conf = cached
        return g, prob, conf, "cache"

    # 2. Try gender-guesser (fast, 61K names, 43 countries).
    raw = None
    if iso2:
        raw = detector.get_gender(first_name, iso2.lower())
    if not raw or raw == "unknown":
        raw = detector.get_gender(first_name)

    mapping = {
        "male": ("male", 0.95, "high", "gender-guesser"),
        "female": ("female", 0.95, "high", "gender-guesser"),
        "mostly_male": ("male", 0.75, "medium", "gender-guesser"),
        "mostly_female": ("female", 0.75, "medium", "gender-guesser"),
        "andy": (None, 0.0, "unknown", "gender-guesser"),
        "unknown": (None, 0.0, "unknown", "gender-guesser"),
    }
    result = mapping.get(raw, (None, 0.0, "unknown", "gender-guesser"))

    # 3. If gender-guesser is unknown, try names-dataset fallback (728K names).
    if result[0] is None:
        g, prob, conf = classify_names_dataset(first_name)
        if g:
            return g, prob, conf, "names-dataset"

    return result


def save_cache_entry(conn, first_name, country_iso2, gender, probability, confidence):
    conn.execute(
        """
        INSERT OR REPLACE INTO gender_cache
        (first_name, country_iso2, gender, probability, confidence, queried_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (
            first_name.lower() if first_name else "",
            country_iso2 or "",
            gender,
            probability,
            confidence,
            datetime.now(timezone.utc).isoformat(),
        ),
    )
    conn.commit()


def process_file(conn, job):
    input_path = job["input"]
    output_path = job["output"]
    name_field = job["name_field"]
    login_field = job["login_field"]
    country_field = job.get("country_field")

    if not os.path.exists(input_path):
        print(f"\nSKIP: {input_path} does not exist.")
        return

    with open(input_path, encoding="utf-8") as f:
        users = json.load(f)

    orgs_skipped = 0
    classified = 0
    female = 0
    male = 0

    for u in users:
        raw_name = u.get(name_field) or ""
        first = get_first_name(raw_name)
        u["first_name_used"] = first
        login = u.get(login_field) or ""
        bio = u.get("bio") or ""
        pronouns = u.get("pronouns") or ""

        # ── 0. Explicit pronouns field from GitHub GraphQL (most reliable) ──
        pronoun_result = parse_pronouns_field(pronouns)
        if pronoun_result:
            g, prob, conf, src = pronoun_result
            u["gender"] = g
            u["gender_probability"] = prob
            u["gender_confidence"] = conf
            u["gender_source"] = src
            if first:
                save_cache_entry(conn, first, "", g, prob, conf)
            if g:
                classified += 1
                if g == "female":
                    female += 1
                elif g == "male":
                    male += 1
            continue

        # ── 1. Self-declared pronouns in bio (second most reliable) ──
        bio_result = parse_pronouns_from_bio(bio)
        if bio_result:
            g, prob, conf, src = bio_result
            u["gender"] = g
            u["gender_probability"] = prob
            u["gender_confidence"] = conf
            u["gender_source"] = src
            if first:
                save_cache_entry(conn, first, "", g, prob, conf)
            if g:
                classified += 1
                if g == "female":
                    female += 1
                elif g == "male":
                    male += 1
            continue

        # ── 2. Organisation check ──
        if is_organization(u, login):
            orgs_skipped += 1
            u["is_organization_account"] = True
            u.update(gender=None, gender_probability=None, gender_confidence="unknown")
            u["gender_source"] = "org"
            if first:
                save_cache_entry(conn, first, "", None, 0.0, "unknown")
            continue

        if not first:
            u.update(gender=None, gender_probability=None, gender_confidence="unknown")
            u["gender_source"] = "no_name"
            continue

        # ── 3. Manual override for known individuals ──
        login_lc = login.lower()
        if login_lc in OVERRIDES:
            g, prob, conf = OVERRIDES[login_lc]
            u["gender"] = g
            u["gender_probability"] = prob
            u["gender_confidence"] = conf
            u["gender_source"] = "override"
            save_cache_entry(conn, first, "", g, prob, conf)
            if g:
                classified += 1
                if g == "female":
                    female += 1
                elif g == "male":
                    male += 1
            continue

        # ── 4. Name-based classification (cache → gender-guesser → names-dataset fallback) ──
        country = u.get(country_field) if country_field else None
        g, prob, conf, src = classify(conn, first, country)

        u["gender"] = g
        u["gender_probability"] = prob
        u["gender_confidence"] = conf
        u["gender_source"] = src

        save_cache_entry(conn, first, COUNTRY_MAP.get(country, ""), g, prob, conf)

        if g:
            classified += 1
            if g == "female":
                female += 1
            elif g == "male":
                male += 1

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(users, f, indent=2, ensure_ascii=False)

    total = len(users)
    print(f"\n--- {os.path.basename(input_path)} ---")
    print(f"  {total} records")
    print(f"  {orgs_skipped} org accounts skipped")
    print(f"  Classified {classified}/{total}")
    if total > 0:
        print(f"    Female: {female} ({female / total * 100:.1f}%)")
        print(f"    Male:   {male} ({male / total * 100:.1f}%)")
        print(f"    Unknown: {total - classified - orgs_skipped}")
    else:
        print(f"    Female: {female} (N/A)")
        print(f"    Male:   {male} (N/A)")
        print(f"    Unknown: 0")
    print(f"  Saved to {output_path}")


def main():
    conn = get_db()
    setup_schema(conn)
    print("Using gender-guesser (offline). No API calls required.\n")

    for job in JOBS:
        process_file(conn, job)

    print("\nAll done.")


if __name__ == "__main__":
    main()
