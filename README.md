# AdaptBTCstatic

Static website source for the AdaptBTC Education Hub and related pages/tools.

## Repository layout

```text
.
├── index.html                 # Main homepage
├── learning.html              # Education landing page
├── community.html             # Community directory page
├── consulting.html            # Consulting page
├── get-involved.html          # Get involved page
├── tools.html                 # Tools landing page
├── education/                 # Individual education topic pages
├── tools/dca/                 # DCA calculator app (isolated CSS/JS)
├── assets/                    # Shared static assets
│   ├── hero-graphic.svg
│   └── data/education-topics.js
├── styles.css                 # Shared global stylesheet
├── script.js                  # Shared global script
├── btcChartData.js            # BTC chart/source data script
├── sitemap.xml                # SEO sitemap
└── CNAME                      # GitHub Pages custom domain
```

## Organization conventions

- Keep route-backed pages (e.g. `index.html`, `tools.html`) in the repo root for GitHub Pages compatibility.
- Put reusable/static files under `assets/`.
- Keep feature-specific code co-located with the feature (example: `tools/dca/css` + `tools/dca/js`).
- Place educational article pages under `education/`.

## Suggested workflow

1. Add/update page content in the corresponding HTML file.
2. Keep shared style changes in `styles.css`.
3. Keep shared behavior in `script.js`; feature-specific scripts should stay local to their feature folder.
4. Verify internal links after adding/moving files.

## Future cleanup opportunities

- Split shared CSS into `assets/css/` while keeping a compatibility import path.
- Split shared JS into `assets/js/` while keeping stable script includes.
- Add lightweight CI for HTML link validation.
