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
| Women (inferred) | 25 | 5.0% |
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

We use a **tiered approach** that prioritises self-declared information:

| Priority | Source | Reliability |
|---|---|---|
| 1 | **Self-declared pronouns** — GitHub's pronouns field (GraphQL API) | Highest |
| 2 | **Pronouns in bio** — "he/him", "she/her" etc. written in profile bio | High |
| 3 | **Organisation accounts** — `type: "Organization"` from GitHub API + known-org list | High |
| 4 | **Manual overrides** — known misclassifications we correct by hand | High |
| 5 | **gender-guesser** — offline name dictionary (~61K names, 43 countries) | Medium |
| 6 | **names-dataset** — fallback offline dictionary (~728K names) | Medium |

**Important:** No API calls to external gender inference services. Everything is offline, free, and reproducible.

### Limitations we acknowledge

- Only covers "male" and "female" in the statistical layer — non-binary gender is not represented by our tools
- Users without a real name in their profile, or with rare/non-Western names, may be marked "unknown"
- This is an approximation of a structural pattern, not a census of individuals
- If you are misclassified or want your profile removed, [open an issue](https://github.com/mteresamunoz/gender-gap-oss/issues)

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

If your name is misclassified (or you know someone who is), [open an issue](https://github.com/mteresamunoz/gender-gap-oss/issues) with the GitHub username and the correct gender. We maintain a manual overrides list that gets applied on every pipeline run.

---

## Credits

- [GitHub REST API](https://docs.github.com/en/rest) + [GraphQL API](https://docs.github.com/en/graphql)
- [gender-guesser](https://github.com/lead-ratings/gender-guesser) — offline name dictionary
- [names-dataset](https://github.com/philipperemy/name-dataset) — global name frequency data
- [Next.js](https://nextjs.org) + [Tailwind CSS](https://tailwindwindcss.com) + [Framer Motion](https://www.framer.com/motion/) + [D3.js](https://d3js.org)

---

*Created by [@mteresamunoz](https://github.com/mteresamunoz) · Data updated monthly · [Full methodology](#methodology)*
