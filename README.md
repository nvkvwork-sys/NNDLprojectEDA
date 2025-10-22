# IMDB Reviews EDA (GitHub Pages)

Simple static site showing exploratory data analysis for the IMDB reviews dataset.

## Quickstart

1. Generate assets:

```bash
python3 src/generate_eda.py --input "IMDB Dataset.csv" --outdir docs/assets --top_k 50
```

2. Open the site locally by serving `docs/` (or open `docs/index.html` directly):

```bash
cd docs && python3 -m http.server 8000
# Visit http://localhost:8000
```

## Publish on GitHub Pages

- Commit this repository and push to GitHub.
- In repo Settings → Pages, set Source = Deploy from a branch, Branch = `main`, Folder = `/docs`.
- Your site will be available at `https://<your-username>.github.io/<repo-name>/`.

## Contents

- `src/generate_eda.py`: EDA script that reads the CSV and produces JSON assets.
- `docs/`: static site with `index.html`, `styles.css`, `main.js`, and `assets/` outputs.
- Visualizations built with Vega-Lite via CDN.

## Notes

- Tokenizer removes HTML, lowercases, keeps alphabetic tokens; negations kept.
- Log-odds highlights words more indicative of positive/negative sentiment.
- Larger `top_k` means bigger JSON and slower rendering.
