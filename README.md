# Where Are the Women?
### A data study on the gender gap in open source AI

> Live dashboard: [gender-gap-oss.vercel.app](https://gender-gap-oss.vercel.app)

---

## Why this exists

When I started the [Hugging Face AI Agents course](https://huggingface.co/learn/agents-course), I noticed something: **there wasn't a single woman on the author team**. It wasn't the first time I'd seen it, but this time I decided to measure it.

This project tracks gender representation at scale across the most influential open-source AI communities. The numbers are uncomfortable — which is exactly why they need to be visible.

---

## Current results — *updated monthly by GitHub Actions*

### GitHub — top 500 users by followers

| | Count | Percentage |
|---|---|---|
| Women (inferred) | 24 | 8.2% |
| Men (inferred) | 269 | 53.8% |
| Unclassified / orgs | 206 | 41.2% |

### AI repo contributors — 20 key repos

| | Count | Percentage |
|---|---|---|
| Women contributors | 126 | 7.4% |
| Men contributors | 1,082 | 63.3% |
| Unclassified | 500 | 29.3% |

*Repos: PyTorch, TensorFlow, Transformers, LangChain, Llama, Keras, JAX, scikit-learn, and 12 more.*

### Hugging Face — coming in Phase 3

| Category | % women authors |
|---|---|
| NLP | — |
| Vision | — |
| Audio | — |
| Multimodal | — |
| RL | — |

*Hugging Face data is currently in development. The category breakdown will show which areas of AI have better (or worse) gender representation.*

---

## What's on the dashboard

🌐 **[gender-gap-oss.vercel.app](https://gender-gap-oss.vercel.app)**

| Section | What it shows | Status |
|---|---|---|
| **Hero stat** | % of women in the top 500 GitHub users | ✅ Live |
| **Women carousel** | Scrollable profiles of women in the top 500 | ✅ Live |
| **Platform comparison** | GitHub vs Hugging Face side by side | ⚠️ GitHub live, HF coming |
| **Timeline** | % of commits by women in AI repos, year by year (2017→2025) | ✅ Live |
| **World map** | Top 100 GitHub users per country, with gender breakdown | 🔄 Phase 2 (in progress) |
| **Organizations** | Gender diversity in 22 top orgs (OpenAI, Google, Microsoft, NVIDIA, HF, etc.) | ✅ Live |

Click any country on the globe to see:
- How many women vs men vs unclassified in that country's top 100
- Individual profiles of the women identified

Click any organization to see:
- Total members, women count, men count
- A proportional donut chart
- Scrollable lists of women and men members

---

## Methodology

### What we measure

- **GitHub top 500** — the 500 most-followed individual accounts on GitHub
- **AI repo contributors** — top 100 contributors from each of 20 curated open-source AI repositories
- **Organizations** — public members of 22 influential AI/tech orgs
- **Per-country top 100** — the 100 most-followed users in ~30 countries (rolling update, one country per day)

### How we infer gender

We use a **tiered, caching approach** that prioritises self-declared information and learns from past classifications. The pipeline runs on every data update (monthly for the main dataset, daily for per-country data).

#### Classification flow (per user)

For each user, the pipeline checks the following sources **in order**. The first match wins:

| Step | Source | How it works | Reliability |
|---|---|---|---|
| 1 | **Self-declared pronouns** | GitHub's dedicated `pronouns` field (e.g. "she/her", "he/him") | Highest |
| 2 | **Pronouns in bio** | Scans profile bio text for pronoun declarations | High |
| 3 | **Organisation check** | Skips accounts where `type: "Organization"` or login is in a known-org list | High |
| 4 | **Manual login override** | Hard-coded list of specific GitHub logins with known gender (e.g. `yihui` → male) | High |
| 5 | **Universal name override** | Hard-coded list of first names that are always one gender across all countries (e.g. `Yihui` → male) | High |
| 6 | **Cached name+country lookup** | Queries an internal SQLite cache: *"Have we already classified a person named X from country Y?"* If yes, reuses that result. | High |
| 7 | **gender-guesser** | Offline dictionary of ~61K names across 43 countries. Respects country context (e.g. `Andrea` is female in Spain, male in Italy). | Medium |
| 8 | **names-dataset fallback** | Offline Facebook-derived dataset of ~728K global names. Used only when gender-guesser returns "unknown". | Medium |

#### How the cache works

Every time a name is classified (by any method), the result is stored in the `gender_cache` table:

```
(first_name, country_iso2) → (gender, probability, confidence)
```

On the next pipeline run, if we encounter the **same first name + same country**, we skip all dictionaries and reuse the cached result instantly. This makes re-runs fast and consistent.

**Example:**
- `Lucas` from `Spain` is classified as `male` via gender-guesser → stored in cache.
- Next pipeline run: another `Lucas` from `Spain` → **cache hit**, classified as `male` immediately.
- But `Andrea` from `Italy` is NOT in the cache yet → falls through to gender-guesser (which returns `male` for Italy).

#### What gets classified

| Dataset | Sample size | Update frequency |
|---|---|---|
| **GitHub Top 500** | 500 most-followed users | Monthly (day 1) |
| **AI repo contributors** | ~1,700 top contributors across 20 AI repos | Monthly (day 1) |
| **Per-country top 100** | 100 users × ~30 countries (rotating) | Daily (one country per day) |
| **Organization members** | Public members of 22 orgs | On-demand (manual fetch) |

**Important:** No API calls to external gender inference services. Everything is offline, free, and reproducible.

### Limitations we acknowledge

- Only covers "male" and "female" in the statistical layer — non-binary gender is not represented by our tools
- Users without a real name in their profile, or with rare/non-Western names, may be marked "unknown"
- This is an approximation of a structural pattern, not a census of individuals
- If you are misclassified or want your profile removed, use the [report form](https://gender-gap-oss.vercel.app) on the site or email us at [gendergapintech@gmail.com](mailto:gendergapintech@gmail.com)

---

## Automatic updates

Data refreshes automatically via GitHub Actions:

- **Monthly** (day 1) — full pipeline: top 500 + AI repo contributors + gender classification + org members
- **Daily** — resume unfinished jobs (yearly contributions, per-country fetches)

Every commit to `main` triggers a Vercel redeploy with the latest data.

---

## Roadmap

| Phase | Feature | Status |
|---|---|---|
| **Phase 1** | Top 500 GitHub + AI repo contributors + orgs + timeline | ✅ Done |
| **Phase 2** | Top 100 per country for the world map | 🔄 In progress |
| **Phase 3** | Hugging Face models, datasets, and categories | 📋 Planned |
| **Phase 4** | Real-time profile search ("find yourself in the study") | 📋 Planned |

---

## Correct a classification

If your name is misclassified (or you know someone who is), use the **report form** directly on the [live dashboard](https://gender-gap-oss.vercel.app) (bottom-right corner) or email us at **gendergapintech@gmail.com** with the GitHub username and the correct gender. We maintain a manual overrides list that gets applied on every pipeline run.

---

## Credits

- [GitHub REST API](https://docs.github.com/en/rest) + [GraphQL API](https://docs.github.com/en/graphql)
- [gender-guesser](https://github.com/lead-ratings/gender-guesser) — offline name dictionary
- [names-dataset](https://github.com/philipperemy/name-dataset) — global name frequency data
- [Next.js](https://nextjs.org) + [Tailwind CSS](https://tailwindwindcss.com) + [Framer Motion](https://www.framer.com/motion/) + [D3.js](https://d3js.org)

---

*Created by [@mteresamunoz](https://github.com/mteresamunoz) · Data updated monthly · [Full methodology](#methodology)*
