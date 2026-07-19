const state = {
  view: 'home',
  prompts: [],
  lessons: [],
  tools: [],
  favorites: new Set(),
  search: '',
  category: 'all',
  toolSearch: '',
  toolCategory: 'all',
  selectedPromptId: null,
  theme: localStorage.getItem('promptHubTheme') || 'dark',
  loading: true,
  error: null,
};

let installPrompt = null;
let toastTimer = null;

const cache = {
  main: document.getElementById('main-content'),
  toast: document.getElementById('toast'),
  installBtn: document.getElementById('installBtn'),
  themeToggle: document.getElementById('themeToggle'),
};

const validViews = ['home', 'library', 'learn', 'tools', 'favorites', 'settings', 'detail'];

function init() {
  applyTheme();
  bindNavigation();
  bindInstall();
  bindThemeToggle();
  registerServiceWorker();
  cache.main.addEventListener('click', handleMainAction);
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    cache.installBtn.classList.remove('hidden');
  });
  window.addEventListener('hashchange', () => {
    syncViewFromHash();
    render();
  });
  loadData();
}

function bindNavigation() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.view === 'detail') return;
      state.view = button.dataset.view;
      state.selectedPromptId = null;
      updateHash();
      render();
    });
  });
}

function bindInstall() {
  cache.installBtn.addEventListener('click', async () => {
    if (!installPrompt) {
      showToast('Install is not available yet.');
      return;
    }
    installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      showToast('PromptHub AI installed successfully.');
    }
    installPrompt = null;
    cache.installBtn.classList.add('hidden');
  });
}

function bindThemeToggle() {
  cache.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('promptHubTheme', state.theme);
    applyTheme();
    showToast(state.theme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled');
  });
}

function applyTheme() {
  document.body.classList.toggle('theme-light', state.theme === 'light');
  cache.themeToggle.setAttribute('aria-pressed', String(state.theme === 'light'));
  cache.themeToggle.textContent = state.theme === 'light' ? '☀️' : '🌙';
}

function syncViewFromHash() {
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (hash.startsWith('prompt/')) {
    state.view = 'detail';
    state.selectedPromptId = Number(hash.split('/')[1]);
    return;
  }
  if (['home', 'library', 'learn', 'tools', 'favorites', 'settings'].includes(hash)) {
    state.view = hash;
    return;
  }
  state.view = 'home';
  state.selectedPromptId = null;
}

function updateHash() {
  const nextHash = state.view === 'detail' && state.selectedPromptId
    ? `#prompt/${state.selectedPromptId}`
    : state.view === 'home' ? '' : `#${state.view}`;
  if (window.location.hash !== nextHash) {
    history.replaceState(null, '', `${window.location.pathname}${nextHash}`);
  }
}

async function loadData() {
  state.loading = true;
  state.error = null;
  render();
  try {
    const [promptsResponse, lessonsResponse, toolsResponse] = await Promise.all([
      fetch('./data/prompts.json'),
      fetch('./data/lessons.json'),
      fetch('./data/tools.json'),
    ]);
    if (!promptsResponse.ok || !lessonsResponse.ok || !toolsResponse.ok) {
      throw new Error('One or more data files could not be loaded.');
    }
    const [prompts, lessons, tools] = await Promise.all([
      promptsResponse.json(),
      lessonsResponse.json(),
      toolsResponse.json(),
    ]);
    state.prompts = prompts;
    state.lessons = lessons;
    state.tools = tools;
    const saved = JSON.parse(localStorage.getItem('promptHubFavorites') || '[]');
    state.favorites = new Set(saved);
  } catch (error) {
    state.error = error.message || 'Unable to load PromptHub AI data.';
  } finally {
    state.loading = false;
    render();
  }
}

function render() {
  updateNav();
  updateHash();
  if (state.loading) {
    renderLoadingSkeleton();
    return;
  }
  if (state.error) {
    renderErrorState();
    return;
  }
  if (state.view === 'detail') {
    renderDetail();
    return;
  }
  if (state.view === 'library') {
    renderLibrary();
  } else if (state.view === 'learn') {
    renderLearn();
  } else if (state.view === 'tools') {
    renderTools();
  } else if (state.view === 'favorites') {
    renderFavorites();
  } else if (state.view === 'settings') {
    renderSettings();
  } else {
    renderHome();
  }
}

function renderLoadingSkeleton() {
  cache.main.innerHTML = `
    <section class="hero-card">
      <h2>Loading your intelligent prompt workspace…</h2>
      <p>Preparing 1,000 prompts, 100 lessons, and 200 tools for your experience.</p>
    </section>
    <section class="panel">
      <div class="skeleton-card"></div>
      <div class="skeleton-card" style="margin-top:0.8rem"></div>
      <div class="skeleton-card" style="margin-top:0.8rem"></div>
    </section>
  `;
}

function renderErrorState() {
  cache.main.innerHTML = `
    <section class="empty-card">
      <h2>Something went wrong</h2>
      <p>${state.error}</p>
      <div class="card-actions">
        <button class="primary-btn" data-action="retry" type="button">Try again</button>
      </div>
    </section>
  `;
}

function renderHome() {
  const featured = state.prompts.slice(0, 6);
  cache.main.innerHTML = `
    <section class="hero-card">
      <h2>PromptHub AI is built for modern creators and operators</h2>
      <p>Explore a curated universe of high-quality prompts, learn AI concepts, discover tools, and organize your favorites with a polished offline-ready PWA.</p>
      <div class="hero-actions">
        <button class="primary-btn" data-view="library" type="button">Open prompt library</button>
        <button class="secondary-btn" data-view="learn" type="button">Start learning</button>
      </div>
    </section>

    <section class="stats-grid">
      <div class="stats-card"><strong>${state.prompts.length}</strong><span>prompts</span></div>
      <div class="stats-card"><strong>${state.lessons.length}</strong><span>lessons</span></div>
      <div class="stats-card"><strong>${state.tools.length}</strong><span>AI tools</span></div>
      <div class="stats-card"><strong>${state.favorites.size}</strong><span>favorites</span></div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3>Featured prompts</h3>
        <button class="secondary-btn" data-view="library" type="button">View all</button>
      </div>
      <div class="prompt-grid">
        ${featured.map((prompt) => createPromptCard(prompt, true)).join('')}
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <h3>Popular learning tracks</h3>
        <button class="secondary-btn" data-view="learn" type="button">Go to Learn AI</button>
      </div>
      <div class="lesson-grid">
        ${state.lessons.slice(0, 3).map((lesson) => createLessonCard(lesson)).join('')}
      </div>
    </section>
  `;
}

function renderLibrary() {
  const filteredPrompts = state.prompts.filter((prompt) => {
    const query = state.search.toLowerCase();
    const matchesSearch = !query || prompt.title.toLowerCase().includes(query) || prompt.content.toLowerCase().includes(query) || prompt.tags.some((tag) => tag.toLowerCase().includes(query));
    const matchesCategory = state.category === 'all' || prompt.category === state.category;
    return matchesSearch && matchesCategory;
  });
  const categories = ['all', ...new Set(state.prompts.map((item) => item.category))];

  cache.main.innerHTML = `
    <section class="panel">
      <div class="toolbar">
        <input id="promptSearch" type="search" placeholder="Search prompts in real time" value="${state.search}" aria-label="Search prompts" />
        <button class="secondary-btn" id="clearSearch" type="button">Clear</button>
      </div>
      <div class="chip-row">
        ${categories.map((category) => `<button class="chip-btn ${state.category === category ? 'active' : ''}" data-action="set-category" data-category="${category}" type="button">${category === 'all' ? 'All' : category}</button>`).join('')}
      </div>
      <div class="panel-header">
        <h3>${filteredPrompts.length} prompts</h3>
        <span class="meta-row">Real-time results</span>
      </div>
      <div class="prompt-grid">
        ${filteredPrompts.length ? filteredPrompts.map((prompt) => createPromptCard(prompt)).join('') : '<div class="empty-card"><p>No prompts matched your current search.</p></div>'}
      </div>
    </section>
  `;

  const searchInput = document.getElementById('promptSearch');
  searchInput?.addEventListener('input', (event) => {
    state.search = event.target.value;
    renderLibrary();
  });
  document.getElementById('clearSearch')?.addEventListener('click', () => {
    state.search = '';
    renderLibrary();
  });
}

function renderLearn() {
  cache.main.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h3>Learn AI</h3>
        <span class="meta-row">${state.lessons.length} lessons</span>
      </div>
      <div class="lesson-grid">
        ${state.lessons.map((lesson) => createLessonCard(lesson)).join('')}
      </div>
    </section>
  `;
}

function renderTools() {
  const filteredTools = state.tools.filter((tool) => {
    const query = state.toolSearch.toLowerCase();
    const matchesSearch = !query || tool.name.toLowerCase().includes(query) || tool.description.toLowerCase().includes(query) || tool.category.toLowerCase().includes(query);
    const matchesCategory = state.toolCategory === 'all' || tool.category === state.toolCategory;
    return matchesSearch && matchesCategory;
  });
  const categories = ['all', ...new Set(state.tools.map((tool) => tool.category))];

  cache.main.innerHTML = `
    <section class="panel">
      <div class="toolbar">
        <input id="toolSearch" type="search" placeholder="Search AI tools" value="${state.toolSearch}" aria-label="Search AI tools" />
        <button class="secondary-btn" id="clearToolSearch" type="button">Clear</button>
      </div>
      <div class="chip-row">
        ${categories.map((category) => `<button class="chip-btn ${state.toolCategory === category ? 'active' : ''}" data-action="set-tool-category" data-category="${category}" type="button">${category === 'all' ? 'All' : category}</button>`).join('')}
      </div>
      <div class="panel-header">
        <h3>${filteredTools.length} tools</h3>
      </div>
      <div class="tool-grid">
        ${filteredTools.length ? filteredTools.map((tool) => createToolCard(tool)).join('') : '<div class="empty-card"><p>No tools matched your search.</p></div>'}
      </div>
    </section>
  `;

  document.getElementById('toolSearch')?.addEventListener('input', (event) => {
    state.toolSearch = event.target.value;
    renderTools();
  });
  document.getElementById('clearToolSearch')?.addEventListener('click', () => {
    state.toolSearch = '';
    state.toolCategory = 'all';
    renderTools();
  });
}

function renderFavorites() {
  const favorites = state.prompts.filter((prompt) => state.favorites.has(prompt.id));
  cache.main.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <h3>Favorites</h3>
        <span class="meta-row">${favorites.length} saved</span>
      </div>
      <div class="prompt-grid">
        ${favorites.length ? favorites.map((prompt) => createPromptCard(prompt)).join('') : '<div class="empty-card"><p>Your favorite prompts appear here.</p></div>'}
      </div>
    </section>
  `;
}

function renderSettings() {
  cache.main.innerHTML = `
    <section class="panel">
      <div class="panel-header"><h3>Settings</h3></div>
      <div class="detail-card" style="margin-bottom:0.8rem;">
        <h4>Appearance</h4>
        <p>Switch between dark and light themes to fit your workspace.</p>
        <div class="card-actions">
          <button class="primary-btn" id="themeSettingToggle" type="button">${state.theme === 'light' ? 'Use dark theme' : 'Use light theme'}</button>
        </div>
      </div>
      <div class="detail-card" style="margin-bottom:0.8rem;">
        <h4>Favorites</h4>
        <p>Export or import your saved prompts for backup or transfer.</p>
        <div class="card-actions">
          <button class="secondary-btn" id="exportFavorites" type="button">Export favorites</button>
          <label class="secondary-btn" style="display:inline-flex; align-items:center; justify-content:center;" for="importFavorites">Import favorites</label>
          <input id="importFavorites" class="hidden" type="file" accept="application/json" />
        </div>
      </div>
      <div class="detail-card">
        <h4>Accessibility</h4>
        <p>Keyboard focus and screen-reader support are built in with visible focus states, semantic headings, and live status messages.</p>
      </div>
    </section>
  `;

  document.getElementById('themeSettingToggle')?.addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('promptHubTheme', state.theme);
    applyTheme();
    renderSettings();
  });
  document.getElementById('exportFavorites')?.addEventListener('click', exportFavorites);
  document.getElementById('importFavorites')?.addEventListener('change', importFavorites);
}

function renderDetail() {
  const prompt = state.prompts.find((item) => item.id === state.selectedPromptId);
  if (!prompt) {
    state.view = 'library';
    render();
    return;
  }
  const related = state.prompts.filter((item) => item.category === prompt.category && item.id !== prompt.id).slice(0, 3);
  cache.main.innerHTML = `
    <section class="detail-card">
      <div class="meta-row">
        <span>${prompt.category}</span><span>•</span><span>${prompt.subcategory}</span>
      </div>
      <h2>${prompt.title}</h2>
      <p>${prompt.content}</p>
      <div class="tag" style="margin-top:0.8rem">${prompt.tags.join(' • ')}</div>
      <div class="card-actions">
        <button class="primary-btn" data-action="toggle-favorite" data-id="${prompt.id}" type="button">${state.favorites.has(prompt.id) ? '★ Saved' : '☆ Save'}</button>
        <button class="secondary-btn" data-action="copy" data-id="${prompt.id}" type="button">Copy</button>
        <button class="secondary-btn" data-action="share" data-id="${prompt.id}" type="button">Share</button>
        <button class="secondary-btn" data-action="back" type="button">Back to library</button>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header"><h3>Related prompts</h3></div>
      <div class="prompt-grid">
        ${related.map((item) => createPromptCard(item, true)).join('')}
      </div>
    </section>
  `;
}

function createPromptCard(prompt, compact = false) {
  const isFavorite = state.favorites.has(prompt.id);
  return `
    <article class="prompt-card">
      <div class="meta-row">
        <span>${prompt.category}</span><span>•</span><span>${prompt.subcategory}</span>
      </div>
      <h4>${prompt.title}</h4>
      <p>${compact ? prompt.content.slice(0, 140) + (prompt.content.length > 140 ? '...' : '') : prompt.content}</p>
      <div class="card-actions">
        <button class="icon-btn ${isFavorite ? 'active' : ''}" data-action="toggle-favorite" data-id="${prompt.id}" type="button" aria-pressed="${isFavorite}">★</button>
        <button class="icon-btn" data-action="details" data-id="${prompt.id}" type="button">Details</button>
        <button class="icon-btn" data-action="copy" data-id="${prompt.id}" type="button">Copy</button>
        <button class="icon-btn" data-action="share" data-id="${prompt.id}" type="button">Share</button>
      </div>
    </article>
  `;
}

function createLessonCard(lesson) {
  return `
    <article class="lesson-card">
      <div class="meta-row"><span>${lesson.level}</span><span>•</span><span>${lesson.duration}</span></div>
      <h4>${lesson.title}</h4>
      <p>${lesson.description}</p>
      <div class="card-actions">
        <span class="tag">${lesson.topic}</span>
      </div>
    </article>
  `;
}

function createToolCard(tool) {
  return `
    <article class="tool-card">
      <div class="meta-row"><span>${tool.category}</span><span>•</span><span>${tool.pricing}</span></div>
      <h4>${tool.name}</h4>
      <p>${tool.description}</p>
      <div class="card-actions">
        <span class="tag">${tool.bestFor}</span>
      </div>
    </article>
  `;
}

function handleMainAction(event) {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.dataset.view) {
    state.view = button.dataset.view;
    state.selectedPromptId = null;
    render();
    return;
  }

  const action = button.dataset.action;
  if (action === 'retry') {
    loadData();
    return;
  }
  if (action === 'back') {
    state.view = 'library';
    state.selectedPromptId = null;
    render();
    return;
  }
  if (action === 'set-category') {
    state.category = button.dataset.category;
    state.view = 'library';
    render();
    return;
  }
  if (action === 'set-tool-category') {
    state.toolCategory = button.dataset.category;
    renderTools();
    return;
  }
  if (!button.dataset.id) return;
  const id = Number(button.dataset.id);
  const prompt = state.prompts.find((item) => item.id === id);
  if (!prompt) return;

  if (action === 'details') {
    state.view = 'detail';
    state.selectedPromptId = prompt.id;
    updateHash();
    render();
    return;
  }

  if (action === 'toggle-favorite') {
    if (state.favorites.has(prompt.id)) {
      state.favorites.delete(prompt.id);
      showToast('Removed from favorites');
    } else {
      state.favorites.add(prompt.id);
      showToast('Added to favorites');
    }
    persistFavorites();
    render();
    return;
  }

  if (action === 'copy') {
    copyToClipboard(prompt.content);
  }
  if (action === 'share') {
    sharePrompt(prompt);
  }
}

function persistFavorites() {
  localStorage.setItem('promptHubFavorites', JSON.stringify([...state.favorites]));
}

async function copyToClipboard(value) {
  try {
    await navigator.clipboard.writeText(value);
    showToast('Prompt copied to clipboard');
  } catch (error) {
    showToast('Clipboard access failed');
  }
}

async function sharePrompt(prompt) {
  const shareText = `${prompt.title}

${prompt.content}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: prompt.title, text: shareText });
      showToast('Prompt shared');
    } catch {
      showToast('Share cancelled');
    }
    return;
  }
  copyToClipboard(shareText);
}

function exportFavorites() {
  const favorites = state.prompts.filter((prompt) => state.favorites.has(prompt.id));
  const blob = new Blob([JSON.stringify(favorites, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'promptHub-favorites.json';
  link.click();
  URL.revokeObjectURL(url);
  showToast('Favorites exported');
}

function importFavorites(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      const importedIds = new Set(imported.map((item) => item.id));
      state.favorites = new Set([...state.favorites, ...importedIds]);
      persistFavorites();
      render();
      showToast('Favorites imported');
    } catch {
      showToast('The selected file could not be imported.');
    }
  };
  reader.readAsText(file);
}

function showToast(message) {
  cache.toast.textContent = message;
  cache.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => cache.toast.classList.remove('show'), 2200);
}

function updateNav() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === state.view);
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch((error) => console.error('SW registration failed', error));
  }
}

document.addEventListener('DOMContentLoaded', init);
