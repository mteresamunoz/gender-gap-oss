# Where Are the Women?
### A data study on the gender gap in open source AI

> **⚠️ Stats below are placeholders — they will be populated automatically when the data pipeline runs for the first time.**

---

When I started the [Hugging Face AI Agents course](https://huggingface.co/learn/agents-course), I noticed something: **there wasn't a single woman on the author team**. It wasn't the first time I'd seen it, but this time I decided to measure it.

This repository is a data study on the gender gap in the most influential open source and artificial intelligence communities.

---

## An important note before the data

This study uses statistical gender inference from first names, which has real limitations that need to be named honestly:

**What this study does NOT do:**
- It does not define or question anyone's gender identity
- It is not a classification of individuals — it is a representation analysis at scale
- It does not intentionally erase trans or non-binary people; the tool we use (gender-guesser) simply does not include those categories, which is itself a limitation we acknowledge

**What this study DOES do:**
- Uses statistical inference on names to detect a structural pattern at scale
- Treats data as what it is: an imperfect approximation of a real problem
- Seeks to make visible a disproportion that exists, without reducing people to a category

The gap this study shows is not a judgment on anyone. It is a reflection of systemic barriers — of access, visibility, and opportunity — that disproportionately affect women and anyone who does not fit the dominant profile of this sector.

If you are a trans or non-binary person and want your profile shown with a different description, open an issue or a PR. This project is open precisely for that.

---

## Results — *updated monthly by GitHub Actions*

<!-- STATS_START -->

### GitHub — top 500 users by followers

| | Count | Percentage |
|---|---|---|
| Women (inferred) | — | —% |
| Men (inferred) | — | —% |
| No data | — | —% |

### Hugging Face — top models by downloads

| | Count | Percentage |
|---|---|---|
| Women authors (inferred) | — | —% |
| Men authors (inferred) | — | —% |
| No data | — | —% |

### Hugging Face — by category

| Category | % women authors |
|---|---|
| NLP | —% |
| Vision | —% |
| Audio | —% |
| Multimodal | —% |
| RL | —% |

*Last update: pending first run.*

<!-- STATS_END -->

---

## Interactive Dashboard

🌐 **[View the dashboard →](https://gender-gap-oss.vercel.app)** *(available after first deploy)*

### Cross filters

All data is connected. You can combine any filter and all charts update:

- **By country** → within that country, which categories have more female representation? Which organizations stand out?
- **By category** → within NLP or vision, which countries have more women? Which organizations lead in diversity?
- **By organization** → within Google or Mistral, what areas do the women work in? Where are they from?

All active filters are reflected in the URL — any view is directly shareable.

### Find yourself in the study

You can search any GitHub or Hugging Face profile and see yourself in context:

- If you are in the dataset: your position in the ranking, representation in your country, your category, your organization
- If you are not in the top: we show your environment data — how is representation in your country, your area, your org

The goal is that the study is not just abstract numbers. It is also a mirror.

---

## Why this matters

Artificial intelligence is redefining how the world works. The people building these tools determine which problems get prioritized, which biases are perpetuated, and which voices are heard.

If those people are almost exclusively men, that is not a minor detail.

This project does not seek to point fingers. It seeks to make visible a pattern that, when looked at directly, is hard to justify.

---

## Methodology

### Data sources

- **GitHub REST API v3** — top 500 users by number of followers
- **GitHub GraphQL API** — yearly contributions from contributors to key AI repos
- **Hugging Face API** — top models and datasets by downloads, organization members (Phase 3)

### Gender inference

We use a **tiered approach** that prioritises self-declared information over statistical inference:

| Priority | Source | Reliability |
|---|---|---|
| 1 | **Self-declared pronouns** — GitHub's pronouns field (via GraphQL API) | Highest — set by the user |
| 2 | **Pronouns in bio** — "he/him", "she/her" etc. written in profile bio | High — self-declared |
| 3 | **Organisation accounts** — `type: "Organization"` from GitHub API + known-org list | High — never classified as person |
| 4 | **Manual overrides** — known misclassifications we correct by hand | High |
| 5 | **gender-guesser** — offline name dictionary (~61K names, 43 countries) | Medium — statistical fallback |

**Why this matters:**
- Users who set pronouns on their GitHub profile are classified directly from that data
- Only when no pronouns are found do we fall back to name-based inference
- Organisations (OpenAI, Google, Microsoft, etc.) are filtered out before any gender analysis
- The result is more accurate and more respectful of self-identification

**Limitations:**
- Only covers "male" and "female" in the statistical layer — non-binary gender is not represented by gender-guesser
- Users who haven't set pronouns and have rare/non-Western names may be marked "unknown"
- It is an approximation, not a census
- If you are misclassified or want your profile removed, open an issue

### Categories

**Hugging Face:** official `pipeline_tag` field for each model, mapped to readable categories (NLP, Vision, Audio, Multimodal, RL). 100% reliable.

**GitHub:** there is no per-user category in the API. The user's primary language is used as a proxy, shown as "Primary language" in the dashboard to avoid misleading.

---

## Repository structure

```
gender-gap-oss/
├── data/
│   ├── scripts/          ← Python data collection & inference pipeline
│   ├── db/
│   │   └── gender_gap.db ← SQLite updated monthly
│   └── processed/        ← JSONs enriched with gender
├── frontend/             ← Next.js dashboard
│   ├── app/
│   │   └── page.tsx      ← home with hero + timeline + sections
│   ├── components/
│   └── lib/
└── .github/workflows/    ← monthly + daily automation
```

---

## Automatic updates

Data is updated on the **first day of each month** via GitHub Actions:

1. Download top GitHub users (REST API) + their pronouns (GraphQL API)
2. Download AI repo contributors
3. Apply tiered gender classification (pronouns → bio → org → override → gender-guesser)
4. Update the SQLite database
5. Commit → Vercel redeploys automatically

History: [commits in `data/`](../../commits/main/data)

---

## Running locally

```bash
git clone https://github.com/YOUR_USER/gender-gap-oss.git
cd gender-gap-oss

cd data
pip install -r requirements.txt
export GITHUB_TOKEN=ghp_xxx
python scripts/fetch_github.py           # fetches profiles + pronouns via GraphQL
python scripts/fetch_repo_contributors.py
python scripts/infer_gender.py           # tiered: pronouns → bio → org → override → gender-guesser
python scripts/fetch_yearly_contributions.py
python scripts/seed_database.py

cd ../frontend && npm install && npm run dev   # → http://localhost:3000
```

---

## Contributing

- **Run the pipeline** and PR with the initial DB
- **Improve country coverage** — name inference for Chinese, Korean, or Arabic names has lower accuracy
- **Add organizations** in `data/scripts/fetch_huggingface.py`
- **Correct a classification** — open an issue with the username and correct gender
- **Improve the dashboard** — components in `frontend/components/`

---

## Credits

- [GitHub REST API](https://docs.github.com/en/rest)
- [Hugging Face API](https://huggingface.co/docs/hub/api)
- [gender-guesser](https://github.com/lead-ratings/gender-guesser)
- [Next.js](https://nextjs.org) + [Tailwind CSS](https://tailwindcss.com) + [Framer Motion](https://www.framer.com/motion/)

---

*Created by [@YOUR_USER](https://github.com/mteresamunoz) · Data updated monthly · [Full methodology](#methodology)*
