# PromptHub AI

PromptHub AI is a mobile-first Progressive Web App for browsing, searching, favoriting, copying, and sharing AI prompts. It is built with plain HTML, CSS, and vanilla JavaScript for simple hosting on GitHub Pages and other static platforms.

## Features
- Material-inspired dark UI
- Bottom navigation for Home, Library, Favorites, and Settings
- Search and category filtering
- Favorites with local persistence
- Copy and share prompt actions
- Offline support through a service worker and manifest
- 100 sample prompts stored in a JSON data file

## Project Structure
- index.html
- manifest.json
- sw.js
- assets/css/styles.css
- assets/js/app.js
- data/prompts.json
- assets/icons/
- pages/

## Run locally
1. Serve the site from the repository root. Examples:

```bash
npm start
# or
python3 -m http.server 8000
```

2. Open http://127.0.0.1:8000/ in your browser.

## Deploy to GitHub Pages
1. Push this repository to GitHub.
2. Open the repository settings and enable GitHub Pages.
3. Choose the root folder or the main branch as the publish source.
4. The app is compatible with static hosting and uses relative asset paths.
