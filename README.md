# IMDB Reviews EDA (GitHub Pages)

Static, client-side exploratory data analysis for the IMDB reviews dataset. No backend or build step required. Works on GitHub Pages.

## Features
- Word frequency plots for positive vs. negative reviews (stopwords removed)
- Average review length (overall, positive, negative)
- Sentiment distribution (counts)
- Upload your own CSV or use the bundled `IMDB Dataset.csv`

## Expected CSV format
- Headers: at least `review` and `sentiment`
  - `sentiment` values: `positive` or `negative`
- Other header names are partially supported (`text`/`content` for review; `label` for sentiment) but prefer the above.

## Local usage
1. Ensure the dataset file is present at the project root as `IMDB Dataset.csv` (or use Upload).
2. Open `index.html` directly in your browser, or start a local server:
   
   ```bash
   python3 -m http.server 8000
   ```
   
   Then visit `http://localhost:8000`.

## Publish on GitHub Pages
1. Create a new GitHub repo and push these files.
2. Commit `.nojekyll` at the repo root to disable Jekyll processing.
3. In GitHub, go to Settings → Pages:
   - Source: `Deploy from a branch`
   - Branch: `main` (or `master`), folder `/ (root)`
4. Place `IMDB Dataset.csv` at the repository root so the app can load it, or use the Upload button in the UI.

## Notes
- All parsing is client-side using Papa Parse; charts are rendered with Chart.js.
- Tokenization: lowercase, strip URLs/non-letters, split on whitespace, remove common English stopwords.
- For large CSVs, loading is limited by the browser; consider sampling if performance is slow.

## License
MIT
