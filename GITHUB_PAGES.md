# GitHub Pages setup

This project is ready to deploy to **GitHub Pages** using GitHub Actions.

## Steps

1. **Create a GitHub repo** (if you haven’t already) and push this project:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/PinchordSite.git
   git branch -M main
   git push -u origin main
   ```

2. **Turn on GitHub Pages with Actions**
   - Open the repo on GitHub → **Settings** → **Pages**.
   - Under **Build and deployment**, set **Source** to **GitHub Actions**.

3. **Deploy**
   - Every push to `main` runs the workflow, builds the site, and deploys it.
   - You can also run it manually: **Actions** → **Deploy to GitHub Pages** → **Run workflow**.

4. **View the site**
   - After the first successful run, the site will be at:
     **`https://YOUR_USERNAME.github.io/PinchordSite/`**
   - The URL is also shown in **Settings** → **Pages** and in the **Environments** tab.

## What was changed for Pages

- **`src/chord-worker.ts`**  
  Chord data is loaded with a path relative to the worker script (`../chord-versions/...`) so it works when the site is served from a subpath (e.g. `.../PinchordSite/`).

- **`.github/workflows/deploy-pages.yml`**  
  Workflow that installs deps, runs `npm run build`, and deploys the built site (including `index.html`, `dist/`, `chord-versions/`, and `key-orders.json`) to GitHub Pages.

- **`.gitignore`**  
  `_site/` is ignored (used as the deploy artifact in CI).

No need to commit the `dist/` folder; the workflow builds it on each deploy.
