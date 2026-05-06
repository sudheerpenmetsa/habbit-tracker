# Mindful Momentum

A static, mobile-first habit tracker using the supplied visual system. It stores habits and completions in the browser with `localStorage`, so it can be hosted directly on GitHub Pages without a backend.

## Run Locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Deploy To GitHub Pages

1. Create a GitHub repository.
2. Push these files to the repository root.
3. In GitHub, open `Settings` -> `Pages`.
4. Under `Build and deployment`, select `Deploy from a branch`.
5. Choose `main` and `/root`, then save.

GitHub will publish the app at:

```text
https://<your-github-username>.github.io/<repository-name>/
```

## Files

- `index.html` - app shell and screens
- `styles.css` - responsive visual system and card layout
- `script.js` - habit state, local persistence, stats, and interactions
- `manifest.webmanifest` - mobile install metadata
