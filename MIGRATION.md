# Migration & Deployment

## Local development

```bash
npm install
npm run dev
```

Vite will serve the static site with live reload at the URL it prints (typically http://localhost:5173).

## Production build

```bash
npm run build
```

The build outputs a production-ready static site to `dist/` with hashed assets, pre-rendered education cards, and an updated sitemap.

## Preview the production build

```bash
npm run preview
```

## Deployment

Deploy the contents of the `dist/` directory to your static host (GitHub Pages, Netlify, Render static, etc.). Ensure the site is served from the root path (`/`) so asset URLs resolve correctly.
