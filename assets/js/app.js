const state = {
  view: "home",
  prompts: [],
  favorites: new Set(),
  search: "",
  category: "all",
};

const validViews = ["home", "library", "favorites", "settings"];

let installPrompt = null;

const cache = {
  main: document.getElementById("main-content"),
  toast: document.getElementById("toast"),
  installBtn: document.getElementById("installBtn"),
};

function init() {
  state.view = getInitialView();
  bindNavigation();
  bindInstall();
  registerServiceWorker();
  loadPrompts();
  cache.main.addEventListener("click", handleMainAction);
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    cache.installBtn.classList.remove("hidden");
  });
  window.addEventListener("hashchange", () => {
    state.view = getInitialView();
    render();
  });
}

function bindNavigation() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.view;
      render();
    });
  });
}

function bindInstall() {
  cache.installBtn.addEventListener("click", async () => {
    if (!installPrompt) {
      showToast("Install is not available yet.");
      return;
    }
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      showToast("PromptHub AI installed. Welcome offline!");
    }
    installPrompt = null;
    cache.installBtn.classList.add("hidden");
  });
}

async function loadPrompts() {
  try {
    const response = await fetch("./data/prompts.json");
    const prompts = await response.json();
    state.prompts = prompts;

    const saved = JSON.parse(localStorage.getItem("promptHubFavorites") || "[]");
    state.favorites = new Set(saved);
    render();
  } catch (error) {
    console.error("Unable to load prompts", error);
    cache.main.innerHTML = '<div class="empty-state">Unable to initialize PromptHub AI right now.</div>';
  }
}

function render() {
  updateNav();
  updateHash();

  if (!state.prompts.length) {
    cache.main.innerHTML = '<div class="empty-state">Loading prompts...</div>';
    return;
  }

  if (state.view === "home") {
    renderHome();
  } else if (state.view === "library") {
    renderLibrary();
  } else if (state.view === "favorites") {
    renderFavorites();
  } else {
    renderSettings();
  }
}

function renderHome() {
  const featured = state.prompts.slice(0, 6);
  const categories = ["Favorites", "Learn AI", "AI Tools", "Settings"];

  cache.main.innerHTML = `
    <section class="hero-card">
      <h2>Launch better prompts in seconds</h2>
      <p>Browse a polished prompt library for writing, automation, strategy, and AI productivity. Everything is ready for mobile, offline, and fast sharing.</p>
      <div class="hero-actions">
        <button class="primary-btn" data-view="library" type="button">Browse library</button>
        <button class="secondary-btn" data-view="favorites" type="button">Open favorites</button>
      </div>
    </section>

    <section class="grid-2">
      <div class="stat-card">
        <strong>${state.prompts.length}</strong>
        <span>sample prompts</span>
      </div>
      <div class="stat-card">
        <strong>${state.favorites.size}</strong>
        <span>saved favorites</span>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3>Browse by collection</h3>
      </div>
      <div class="chip-row">
        ${categories
          .map(
            (category) => `
              <button class="chip-btn" data-action="set-category" data-category="${category}" type="button">${category}</button>
            `
          )
          .join("")}
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3>Featured prompts</h3>
      </div>
      <div class="prompt-grid">
        ${featured
          .map((prompt) => createPromptCard(prompt, true))
          .join("")}
      </div>
    </section>
  `;

  document.querySelectorAll("[data-action='set-category']").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      state.view = "library";
      render();
    });
  });
}

function renderLibrary() {
  const filteredPrompts = state.prompts.filter((prompt) => {
    const matchesSearch = prompt.title.toLowerCase().includes(state.search.toLowerCase()) || prompt.content.toLowerCase().includes(state.search.toLowerCase()) || prompt.tags.some((tag) => tag.toLowerCase().includes(state.search.toLowerCase()));
    const matchesCategory = state.category === "all" || prompt.category === state.category;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...new Set(state.prompts.map((item) => item.category))];

  cache.main.innerHTML = `
    <section class="panel">
      <div class="toolbar">
        <input id="promptSearch" type="search" placeholder="Search prompts" value="${state.search}" />
        <button class="secondary-btn" id="clearSearch" type="button">Clear</button>
      </div>
      <div class="chip-row">
        ${categories
          .map((category) => `
            <button class="chip-btn ${state.category === category ? "active" : ""}" data-action="set-category" data-category="${category}" type="button">
              ${category === "all" ? "All" : category}
            </button>
          `)
          .join("")}
      </div>
      <div class="panel-header" style="margin-top: 0.8rem;">
        <h3>${filteredPrompts.length} prompts</h3>
      </div>
      <div class="prompt-grid">
        ${filteredPrompts.length ? filteredPrompts.map((prompt) => createPromptCard(prompt)).join("") : '<div class="empty-state">No prompts matched your search.</div>'}
      </div>
    </section>
  `;

  const searchInput = document.getElementById("promptSearch");
  searchInput?.addEventListener("input", (event) => {
    state.search = event.target.value;
    renderLibrary();
  });

  document.getElementById("clearSearch")?.addEventListener("click", () => {
    state.search = "";
    renderLibrary();
  });

  document.querySelectorAll("[data-action='set-category']").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      renderLibrary();
    });
  });
}

function renderFavorites() {
  const favorites = state.prompts.filter((prompt) => state.favorites.has(prompt.id));

  cache.main.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h3>Favorites</h3>
        <span class="prompt-meta">${favorites.length} saved</span>
      </div>
      <div class="prompt-grid">
        ${favorites.length ? favorites.map((prompt) => createPromptCard(prompt)).join("") : '<div class="empty-state">Your favorite prompts will appear here.</div>'}
      </div>
    </section>
  `;
}

function renderSettings() {
  cache.main.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h3>App settings</h3>
      </div>
      <div class="info-card" style="margin-bottom: 0.8rem;">
        <p>PromptHub AI is designed to work as a Progressive Web App. It installs cleanly on supported devices and caches key assets for offline use.</p>
      </div>
      <div class="info-card">
        <p><strong>Favorites sync locally</strong> with your device and remain available after refreshes.</p>
      </div>
    </section>
  `;
}

function createPromptCard(prompt, compact = false) {
  const isFavorite = state.favorites.has(prompt.id);
  return `
    <article class="prompt-card">
      <div class="prompt-meta">
        <span>${prompt.category}</span>
        <span>•</span>
        <span>${prompt.subcategory}</span>
      </div>
      <h4>${prompt.title}</h4>
      <p>${compact ? prompt.content.slice(0, 140) + (prompt.content.length > 140 ? "..." : "") : prompt.content}</p>
      <div class="prompt-tags">
        ${prompt.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}
      </div>
      <div class="prompt-actions">
        <button class="icon-btn ${isFavorite ? "active" : ""}" data-action="toggle-favorite" data-id="${prompt.id}" type="button">★</button>
        <button class="icon-btn" data-action="copy" data-id="${prompt.id}" type="button">Copy</button>
        <button class="icon-btn" data-action="share" data-id="${prompt.id}" type="button">Share</button>
      </div>
    </article>
  `;
}

function handleMainAction(event) {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.view) {
    state.view = button.dataset.view;
    render();
    return;
  }

  const action = button.dataset.action;
  const id = Number(button.dataset.id);
  const prompt = state.prompts.find((item) => item.id === id);

  if (!prompt) return;

  if (action === "toggle-favorite") {
    if (state.favorites.has(prompt.id)) {
      state.favorites.delete(prompt.id);
      showToast("Removed from favorites");
    } else {
      state.favorites.add(prompt.id);
      showToast("Added to favorites");
    }
    localStorage.setItem("promptHubFavorites", JSON.stringify([...state.favorites]));
    render();
  }

  if (action === "copy") {
    copyToClipboard(prompt.content);
  }

  if (action === "share") {
    sharePrompt(prompt);
  }

  if (action === "set-category") {
    state.category = button.dataset.category;
    state.view = "library";
    render();
  }
}

async function copyToClipboard(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast("Prompt copied to clipboard");
  } catch (error) {
    showToast("Clipboard access failed");
  }
}

async function sharePrompt(prompt) {
  const shareText = `${prompt.title}\n\n${prompt.content}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: prompt.title, text: shareText });
      showToast("Prompt shared");
    } catch {
      showToast("Share canceled");
    }
    return;
  }

  copyToClipboard(shareText);
}

function showToast(message) {
  cache.toast.textContent = message;
  cache.toast.classList.add("show");
  clearTimeout(showToast.timeout);
  showToast.timeout = setTimeout(() => cache.toast.classList.remove("show"), 1800);
}

function updateNav() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === state.view);
  });
}

function updateHash() {
  const hash = state.view === "home" ? "" : `#${state.view}`;
  if (window.location.hash !== hash) {
    history.replaceState(null, "", `${window.location.pathname}${hash}`);
  }
}

function getInitialView() {
  const hashView = window.location.hash.replace("#", "").toLowerCase();
  return validViews.includes(hashView) ? hashView : "home";
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((error) => console.error("SW registration failed", error));
  }
}

document.addEventListener("DOMContentLoaded", init);
