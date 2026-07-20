const state = {
  view: 'home',
  prompts: [],
  lessons: [],
  tools: [],
  collections: [],
  dailyPrompt: null,
  dailyTip: null,
  favorites: new Set(),
  bookmarkedLessons: new Set(),
  lessonProgress: {},
  completedLessons: new Set(),
  recentlyViewed: [],
  search: '',
  category: 'all',
  lessonCategory: 'all',
  lessonDifficulty: 'all',
  toolCategory: 'all',
  selectedPromptId: null,
  selectedLessonId: null,
  theme: localStorage.getItem('promptHubTheme') || 'dark',
  loading: true,
  error: null,
};
let installPrompt = null; let toastTimer = null;
const cache = {
  main: document.getElementById('main-content'),
  toast: document.getElementById('toast'),
  installBtn: document.getElementById('installBtn'),
  themeToggle: document.getElementById('themeToggle'),
};
const validViews = ['home','library','lessons','tools','favorites','settings','detail','collections','about','contact','feedback','privacy','terms','changelog','lesson-detail'];

function init(){
  applyTheme();
  bindNavigation();
  bindInstall();
  bindThemeToggle();
  registerServiceWorker();
  cache.main.addEventListener('click', handleMainAction);
  window.addEventListener('beforeinstallprompt', (e)=>{ e.preventDefault(); installPrompt=e; cache.installBtn.classList.remove('hidden'); });
  window.addEventListener('hashchange', ()=>{ syncViewFromHash(); render(); });
  loadData();
}

function bindNavigation(){
  document.querySelectorAll('.nav-item').forEach((btn)=>{
    btn.addEventListener('click', ()=>{
      if(btn.dataset.view==='detail' || btn.dataset.view==='lesson-detail') return;
      state.view=btn.dataset.view;
      state.selectedPromptId=null;
      state.selectedLessonId=null;
      updateHash();
      render();
    });
  });
}

function bindInstall(){
  cache.installBtn.addEventListener('click', async ()=>{
    if(!installPrompt){ showToast('Install unavailable'); return; }
    installPrompt.prompt();
    const choice=await installPrompt.userChoice;
    if(choice.outcome==='accepted') showToast('Installed');
    installPrompt=null;
    cache.installBtn.classList.add('hidden');
  });
}

function bindThemeToggle(){
  cache.themeToggle.addEventListener('click', ()=>{
    state.theme = state.theme==='dark' ? 'light' : 'dark';
    localStorage.setItem('promptHubTheme', state.theme);
    applyTheme();
    showToast(state.theme==='dark' ? 'Dark mode enabled' : 'Light mode enabled');
  });
}

function applyTheme(){
  document.body.classList.toggle('theme-light', state.theme==='light');
  cache.themeToggle.setAttribute('aria-pressed', String(state.theme==='light'));
  cache.themeToggle.textContent = state.theme==='light' ? '☀️' : '🌙';
}

function syncViewFromHash(){
  const h=window.location.hash.replace('#','').toLowerCase();
  if(h.startsWith('prompt/')){
    state.view='detail';
    state.selectedPromptId=Number(h.split('/')[1]);
    return;
  }
  if(h.startsWith('lesson/')){
    state.view='lesson-detail';
    state.selectedLessonId=Number(h.split('/')[1]);
    return;
  }
  if(validViews.includes(h)){ state.view=h; return; }
  state.view='home';
}

function updateHash(){
  let hash='';
  if(state.view==='detail' && state.selectedPromptId){ hash=`#prompt/${state.selectedPromptId}`; }
  else if(state.view==='lesson-detail' && state.selectedLessonId){ hash=`#lesson/${state.selectedLessonId}`; }
  else if(state.view!=='home'){ hash=`#${state.view}`; }
  if(window.location.hash!==hash) history.replaceState(null,'', `${window.location.pathname}${hash}`);
}

async function loadData(){
  state.loading=true; state.error=null; render();
  try{
    const [promptsRes, lessonsRes, toolsRes, collectionsRes, dailyRes] = await Promise.all([
      fetch('./data/prompts.json'),
      fetch('./data/lessons.json'),
      fetch('./data/tools.json'),
      fetch('./data/collections.json'),
      fetch('./data/daily.json')
    ]);
    if(!promptsRes.ok||!lessonsRes.ok||!toolsRes.ok||!collectionsRes.ok||!dailyRes.ok) throw new Error('Some content could not be loaded.');
    const [prompts, lessons, tools, collections, daily] = await Promise.all([
      promptsRes.json(), lessonsRes.json(), toolsRes.json(), collectionsRes.json(), dailyRes.json()
    ]);
    state.prompts=prompts;
    state.lessons=lessons;
    state.tools=tools;
    state.collections=collections;
    state.dailyPrompt=daily.dailyPrompt;
    state.dailyTip=daily.dailyTip;
    const savedFavorites = JSON.parse(localStorage.getItem('promptHubFavorites')||'[]');
    state.favorites=new Set(savedFavorites);
    const savedBookmarks = JSON.parse(localStorage.getItem('promptHubBookmarkedLessons')||'[]');
    state.bookmarkedLessons = new Set(savedBookmarks);
    const savedProgress = JSON.parse(localStorage.getItem('promptHubLessonProgress')||'{}');
    state.lessonProgress = savedProgress;
    const savedCompleted = JSON.parse(localStorage.getItem('promptHubCompletedLessons')||'[]');
    state.completedLessons = new Set(savedCompleted);
    const savedRecentlyViewed = JSON.parse(localStorage.getItem('promptHubRecentlyViewed')||'[]');
    state.recentlyViewed = savedRecentlyViewed;
  } catch(e){
    state.error=e.message || 'Unable to load content.';
  } finally {
    state.loading=false;
    render();
  }
}

function render(){
  updateNav();
  updateHash();
  if(state.loading){ renderLoadingSkeleton(); return; }
  if(state.error){ renderErrorState(); return; }
  if(state.view==='lesson-detail'){ renderLessonDetail(); return; }
  if(state.view==='detail'){ renderDetail(); return; }
  if(state.view==='collections'){ renderCollections(); return; }
  if(state.view==='about'){ renderAbout(); return; }
  if(state.view==='contact'){ renderContact(); return; }
  if(state.view==='feedback'){ renderFeedback(); return; }
  if(state.view==='privacy'){ renderPrivacy(); return; }
  if(state.view==='terms'){ renderTerms(); return; }
  if(state.view==='changelog'){ renderChangelog(); return; }
  if(state.view==='lessons'){ renderLessons(); return; }
  if(state.view==='tools'){ renderTools(); return; }
  if(state.view==='favorites'){ renderFavorites(); return; }
  if(state.view==='settings'){ renderSettings(); return; }
  if(state.view==='library'){ renderLibrary(); return; }
  renderHome();
}

function renderLoadingSkeleton(){
  cache.main.innerHTML=`<section class="hero-card"><h2>Preparing your premium AI workspace…</h2><p>Loading real prompts, lessons, tools, collections, and daily guidance.</p></section><section class="panel"><div class="skeleton-card"></div><div class="skeleton-card" style="margin-top:0.8rem"></div><div class="skeleton-card" style="margin-top:0.8rem"></div></section>`;
}

function renderErrorState(){
  cache.main.innerHTML=`<section class="empty-card"><h2>Content failed to load</h2><p>${escapeHtml(state.error)}</p><div class="card-actions"><button class="primary-btn" data-action="retry" type="button">Retry</button></div></section>`;
}

function renderHome(){
  const featured=state.prompts.slice(0,6);
  cache.main.innerHTML=`<section class="hero-card"><h2>PromptHub AI is your production-ready AI workspace</h2><p>Access 1,000 prompts, 150 lessons, 250 real tools, collections, daily guidance, and practical resources designed for professionals who need results.</p><div class="hero-actions"><button class="primary-btn" data-view="library" type="button">Browse prompts</button><button class="secondary-btn" data-view="lessons" type="button">Start learning</button></div></section><section class="stats-grid"><div class="stats-card"><strong>${state.prompts.length}</strong><span>prompts</span></div><div class="stats-card"><strong>${state.lessons.length}</strong><span>lessons</span></div><div class="stats-card"><strong>${state.tools.length}</strong><span>tools</span></div><div class="stats-card"><strong>${state.favorites.size}</strong><span>favorites</span></div></section><section class="panel"><div class="panel-header"><h3>Daily prompt</h3><button class="secondary-btn" data-action="daily-prompt" type="button">Refresh</button></div>${createDailyPromptCard()}</section><section class="panel"><div class="panel-header"><h3>Featured prompts</h3><button class="secondary-btn" data-view="library" type="button">View all</button></div><div class="prompt-grid">${featured.map((p)=>createPromptCard(p,true)).join('')}</div></section><section class="panel"><div class="panel-header"><h3>Daily AI tip</h3></div><div class="info-card"><p>${state.dailyTip ? escapeHtml(state.dailyTip.tip) : 'Stay curious and validate outputs with examples.'}</p></div></section>`;
}

function renderLibrary(){
  const filtered=state.prompts.filter((p)=>{ const q=state.search.toLowerCase(); const matchesSearch=!q || p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q) || p.tags.some((t)=>t.toLowerCase().includes(q)); const matchesCategory=state.category==='all' || p.category===state.category; return matchesSearch && matchesCategory;});
  const categories=['all', ...new Set(state.prompts.map((p)=>p.category))];
  cache.main.innerHTML=`<section class="panel"><div class="toolbar"><input id="promptSearch" type="search" placeholder="Search prompts in real time" value="${escapeHtml(state.search)}" aria-label="Search prompts" /><button class="secondary-btn" id="clearSearch" type="button">Clear</button></div><div class="chip-row">${categories.map((c)=>`<button class="chip-btn ${state.category===c?'active':''}" data-action="set-category" data-category="${c}" type="button">${c==='all'?'All':c}</button>`).join('')}</div><div class="panel-header"><h3>${filtered.length} prompts</h3><span class="meta-row">Real-time search</span></div><div class="prompt-grid">${filtered.length ? filtered.map((p)=>createPromptCard(p)).join('') : '<div class="empty-card"><p>No prompts match your current query.</p></div>'}</div></section>`;
  document.getElementById('promptSearch')?.addEventListener('input',(e)=>{ state.search=e.target.value; renderLibrary(); });
  document.getElementById('clearSearch')?.addEventListener('click',()=>{ state.search=''; renderLibrary(); });
}

function renderLessons(){
  const filtered=state.lessons.filter((l)=>{
    const q=state.search.toLowerCase();
    const matchesSearch=!q || l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q) || l.course.toLowerCase().includes(q) || l.summary.toLowerCase().includes(q);
    const matchesCategory=state.lessonCategory==='all' || l.category===state.lessonCategory;
    const matchesDifficulty=state.lessonDifficulty==='all' || l.difficulty===state.lessonDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });
  const categories=['all', ...new Set(state.lessons.map((l)=>l.category))];
  const difficulties=['all', ...new Set(state.lessons.map((l)=>l.difficulty))];
  const continueLesson = getContinueLesson();
  const recentLessons = state.recentlyViewed.map((id)=>state.lessons.find((lesson)=>lesson.id===id)).filter(Boolean).slice(0,3);
  const completedLessons = state.lessons.filter((lesson)=>state.completedLessons.has(lesson.id)).slice(0,3);
  const bookmarkedLessons = state.lessons.filter((lesson)=>state.bookmarkedLessons.has(lesson.id)).slice(0,3);
  cache.main.innerHTML=`<section class="hero-card"><div class="hero-head"><div><h2>Learn AI with structured courses</h2><p>Follow a modern learning path with progress tracking, quizzes, practice exercises, and practical AI tools.</p></div><button class="primary-btn" data-action="open-lesson" data-id="${continueLesson ? continueLesson.id : ''}" type="button">Continue learning</button></div><div class="stats-grid compact"><div class="stats-card"><strong>${state.lessons.length}</strong><span>lessons</span></div><div class="stats-card"><strong>${state.completedLessons.size}</strong><span>completed</span></div><div class="stats-card"><strong>${state.bookmarkedLessons.size}</strong><span>bookmarked</span></div><div class="stats-card"><strong>${state.recentlyViewed.length}</strong><span>recently viewed</span></div></div></section><section class="panel"><div class="panel-header"><h3>Continue learning</h3></div>${continueLesson ? createContinueCard(continueLesson) : '<div class="empty-card"><p>You have completed every lesson in your current path.</p></div>'}</section><section class="panel"><div class="panel-header"><h3>Recently viewed</h3></div><div class="list-stack">${recentLessons.length ? recentLessons.map((lesson)=>createMiniLessonCard(lesson)).join('') : '<div class="empty-card"><p>Your recent lesson activity will appear here.</p></div>'}</div></section><section class="panel"><div class="panel-header"><h3>Completed lessons</h3></div><div class="list-stack">${completedLessons.length ? completedLessons.map((lesson)=>createMiniLessonCard(lesson, true)).join('') : '<div class="empty-card"><p>Mark a lesson complete when you finish it.</p></div>'}</div></section><section class="panel"><div class="toolbar"><input id="lessonSearch" type="search" placeholder="Search lessons by topic or outcome" value="${escapeHtml(state.search)}" aria-label="Search lessons" /><button class="secondary-btn" id="clearLessonSearch" type="button">Clear</button></div><div class="chip-row">${categories.map((c)=>`<button class="chip-btn ${state.lessonCategory===c?'active':''}" data-action="set-lesson-category" data-category="${c}" type="button">${c==='all'?'All':c}</button>`).join('')}</div><div class="chip-row">${difficulties.map((d)=>`<button class="chip-btn ${state.lessonDifficulty===d?'active':''}" data-action="set-lesson-difficulty" data-difficulty="${d}" type="button">${d==='all'?'All':d}</button>`).join('')}</div><div class="panel-header"><h3>${filtered.length} lessons ready</h3><span class="meta-row">Built for focused, mobile-first study</span></div><div class="lesson-grid">${filtered.length ? filtered.map((lesson)=>createLessonCard(lesson)).join('') : '<div class="empty-card"><p>No lessons match your current search.</p></div>'}</div></section><section class="panel"><div class="panel-header"><h3>Bookmarked lessons</h3></div><div class="list-stack">${bookmarkedLessons.length ? bookmarkedLessons.map((lesson)=>createMiniLessonCard(lesson)).join('') : '<div class="empty-card"><p>Bookmark the lessons you want to revisit later.</p></div>'}</div></section>`;
  document.getElementById('lessonSearch')?.addEventListener('input',(e)=>{ state.search=e.target.value; renderLessons(); });
  document.getElementById('clearLessonSearch')?.addEventListener('click',()=>{ state.search=''; renderLessons(); });
}

function renderTools(){
  const filtered=state.tools.filter((t)=>{ const q=state.search.toLowerCase(); const matchesSearch=!q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q); const matchesCategory=state.toolCategory==='all' || t.category===state.toolCategory; return matchesSearch && matchesCategory;});
  const categories=['all', ...new Set(state.tools.map((t)=>t.category))];
  cache.main.innerHTML=`<section class="panel"><div class="toolbar"><input id="toolSearch" type="search" placeholder="Search AI tools" value="${escapeHtml(state.search)}" aria-label="Search AI tools" /><button class="secondary-btn" id="clearToolSearch" type="button">Clear</button></div><div class="chip-row">${categories.map((c)=>`<button class="chip-btn ${state.toolCategory===c?'active':''}" data-action="set-tool-category" data-category="${c}" type="button">${c==='all'?'All':c}</button>`).join('')}</div><div class="panel-header"><h3>${filtered.length} real AI tools</h3></div><div class="tool-grid">${filtered.length ? filtered.map((tool)=>createToolCard(tool)).join('') : '<div class="empty-card"><p>No tools match your current search.</p></div>'}</div></section>`;
  document.getElementById('toolSearch')?.addEventListener('input',(e)=>{ state.search=e.target.value; renderTools(); });
  document.getElementById('clearToolSearch')?.addEventListener('click',()=>{ state.search=''; state.toolCategory='all'; renderTools(); });
}

function renderFavorites(){
  const favorites=state.prompts.filter((p)=>state.favorites.has(p.id));
  cache.main.innerHTML=`<section class="panel"><div class="panel-header"><h3>Favorites</h3><span class="meta-row">${favorites.length} saved</span></div><div class="prompt-grid">${favorites.length ? favorites.map((p)=>createPromptCard(p)).join('') : '<div class="empty-card"><p>Your favorite prompts appear here.</p></div>'}</div></section>`;
}

function renderCollections(){
  cache.main.innerHTML=`<section class="panel"><div class="panel-header"><h3>Collections</h3></div><div class="collection-grid">${state.collections.map((c)=>createCollectionCard(c)).join('')}</div></section>`;
}

function renderSettings(){
  cache.main.innerHTML=`<section class="panel"><div class="panel-header"><h3>Settings</h3></div><div class="info-card" style="margin-bottom:0.8rem;"><h4>Appearance</h4><p>Switch between dark and light themes for comfortable viewing.</p><div class="card-actions"><button class="primary-btn" id="themeSettingToggle" type="button">${state.theme==='light' ? 'Use dark mode' : 'Use light mode'}</button></div></div><div class="info-card" style="margin-bottom:0.8rem;"><h4>Favorites</h4><p>Export or import your saved prompts.</p><div class="card-actions"><button class="secondary-btn" id="exportFavorites" type="button">Export favorites</button><label class="secondary-btn" style="display:inline-flex;justify-content:center;align-items:center;" for="importFavorites">Import favorites</label><input id="importFavorites" class="hidden" type="file" accept="application/json" /></div></div><div class="info-card"><h4>Additional resources</h4><p>Explore the About, Contact, Feedback, Privacy, Terms, and Changelog sections to learn more about PromptHub AI.</p></div></section>`;
  document.getElementById('themeSettingToggle')?.addEventListener('click',()=>{ state.theme=state.theme==='dark'?'light':'dark'; localStorage.setItem('promptHubTheme', state.theme); applyTheme(); renderSettings(); });
  document.getElementById('exportFavorites')?.addEventListener('click', exportFavorites);
  document.getElementById('importFavorites')?.addEventListener('change', importFavorites);
}

function renderAbout(){ cache.main.innerHTML=`<section class="panel"><div class="panel-header"><h3>About PromptHub AI</h3></div><div class="info-card"><p>PromptHub AI is a professional-grade prompt library, training workspace, and AI tool directory curated for product managers, marketers, engineers, founders, educators, operators, and creative teams. Every prompt, lesson, and tool is designed to help you move from idea to execution with clarity and speed.</p></div></section>`; }
function renderContact(){ cache.main.innerHTML=`<section class="panel"><div class="panel-header"><h3>Contact</h3></div><div class="info-card"><p>For partnerships, editorial feedback, or product inquiries, contact hello@prompthub.ai.</p></div></section>`; }
function renderFeedback(){ cache.main.innerHTML=`<section class="panel"><div class="panel-header"><h3>Feedback</h3></div><div class="info-card"><p>Tell us what is working and where the experience can be stronger. We value practical, grounded feedback from professionals who use AI every day.</p></div></section>`; }
function renderPrivacy(){ cache.main.innerHTML=`<section class="panel"><div class="panel-header"><h3>Privacy Policy</h3></div><div class="info-card"><p>PromptHub AI stores favorites locally in your browser and does not share personal data without consent. We use local storage for user convenience and provide import/export controls for transparency.</p></div></section>`; }
function renderTerms(){ cache.main.innerHTML=`<section class="panel"><div class="panel-header"><h3>Terms of Service</h3></div><div class="info-card"><p>By using PromptHub AI, you agree to use the platform responsibly, respect content usage rights, and avoid unlawful or harmful activity. The platform is provided for informational and productivity purposes.</p></div></section>`; }
function renderChangelog(){ cache.main.innerHTML=`<section class="panel"><div class="panel-header"><h3>Changelog</h3></div><div class="info-card"><p>Version 2.0 introduces 1,000 professional prompts, 150 structured lessons, 250 real AI tools, daily prompt and tip cards, and an improved mobile-first experience.</p></div></section>`; }

function renderDetail(){
  const prompt = state.prompts.find((item)=>item.id===state.selectedPromptId);
  if(!prompt){ state.view='library'; state.selectedPromptId=null; render(); return; }
  const favorite = state.favorites.has(prompt.id);
  cache.main.innerHTML = `<section class="detail-card"><div class="meta-row"><span>${escapeHtml(prompt.category)}</span><span>•</span><span>${escapeHtml(prompt.subcategory)}</span></div><h2>${escapeHtml(prompt.title)}</h2><p>${escapeHtml(prompt.content)}</p><div class="card-actions"><button class="primary-btn ${favorite ? 'active' : ''}" data-action="toggle-favorite" data-id="${prompt.id}" type="button">${favorite ? '★ Saved' : '☆ Save'}</button><button class="secondary-btn" data-action="copy" data-id="${prompt.id}" type="button">Copy</button><button class="secondary-btn" data-action="share" data-id="${prompt.id}" type="button">Share</button><button class="secondary-btn" data-action="back" type="button">Back</button></div></section>`;
}

function renderLessonDetail(){
  const lesson=state.lessons.find((item)=>item.id===state.selectedLessonId);
  if(!lesson){ state.view='lessons'; state.selectedLessonId=null; render(); return; }
  recordRecentLesson(lesson.id);
  const progress=state.lessonProgress[lesson.id] || 0;
  const completed=state.completedLessons.has(lesson.id);
  const bookmarked=state.bookmarkedLessons.has(lesson.id);
  const relatedPrompts = lesson.relatedPromptIds.map((id)=>state.prompts.find((prompt)=>prompt.id===id)).filter(Boolean).slice(0,3);
  const recommendedTools = (lesson.recommendedTools || []).map((name)=>state.tools.find((tool)=>tool.name.toLowerCase().includes(name.toLowerCase()))).filter(Boolean).slice(0,3);
  const nextLesson = getNextLesson(lesson.id);
  cache.main.innerHTML=`<section class="detail-card lesson-detail"><div class="meta-row"><span class="badge ${getDifficultyClass(lesson.difficulty)}">${escapeHtml(lesson.difficulty)}</span><span>${escapeHtml(lesson.course)}</span><span>•</span><span>${escapeHtml(lesson.readingTime)}</span><span>•</span><span>${escapeHtml(lesson.module)}</span></div><h2>${escapeHtml(lesson.title)}</h2><p>${escapeHtml(lesson.summary)}</p><div class="card-actions"><button class="primary-btn" data-action="mark-complete" data-id="${lesson.id}" type="button">${completed ? 'Completed' : 'Mark complete'}</button><button class="secondary-btn" data-action="advance-progress" data-id="${lesson.id}" type="button">Advance progress</button><button class="secondary-btn" data-action="toggle-bookmark" data-id="${lesson.id}" type="button">${bookmarked ? 'Bookmarked' : 'Bookmark'}</button><button class="secondary-btn" data-action="back-to-lessons" type="button">Back</button></div><div class="progress-row"><div class="progress-track"><span style="width:${progress}%"></span></div><span>${progress}% complete</span></div><div class="section-card"><h3>Summary</h3><p>${escapeHtml(lesson.summary)}</p><div class="tag-row">${(lesson.keyTakeaways||[]).map((takeaway)=>`<span class="tag">${escapeHtml(takeaway)}</span>`).join('')}</div></div><div class="section-card"><h3>Practice exercises</h3><div class="exercise-list">${(lesson.practiceExercises||[]).map((exercise)=>`<div class="exercise-item"><strong>${escapeHtml(exercise.title)}</strong><p>${escapeHtml(exercise.prompt)}</p></div>`).join('')}</div></div><div class="section-card"><h3>Quiz</h3><p>${escapeHtml(lesson.quiz?.question || 'Review the lesson summary before testing yourself.')}</p><div class="quiz-options">${(lesson.quiz?.options || []).map((option,index)=>`<button class="secondary-btn" data-action="answer-quiz" data-id="${lesson.id}" data-choice-index="${index}" type="button">${escapeHtml(option)}</button>`).join('')}</div></div><div class="section-card"><h3>Related prompts</h3><div class="tool-grid compact">${relatedPrompts.length ? relatedPrompts.map((prompt)=>`<div class="mini-card"><strong>${escapeHtml(prompt.title)}</strong><p>${escapeHtml(prompt.content.slice(0,100))}</p><button class="secondary-btn" data-action="open-related-prompt" data-id="${prompt.id}" type="button">Open</button></div>`).join('') : '<p>No related prompts linked yet.</p>'}</div></div><div class="section-card"><h3>Recommended AI tools</h3><div class="tool-grid compact">${recommendedTools.length ? recommendedTools.map((tool)=>`<div class="mini-card"><strong>${escapeHtml(tool.name)}</strong><p>${escapeHtml(tool.description)}</p></div>`).join('') : '<p>No tool recommendations yet.</p>'}</div></div>${nextLesson ? `<div class="section-card"><h3>Continue learning</h3><p>${escapeHtml(nextLesson.title)}</p><div class="card-actions"><button class="primary-btn" data-action="open-lesson" data-id="${nextLesson.id}" type="button">Open next lesson</button></div></div>` : ''}</section>`;
}

function createPromptCard(prompt, compact=false){
  const favorite=state.favorites.has(prompt.id);
  return `<article class="prompt-card"><div class="meta-row"><span>${escapeHtml(prompt.category)}</span><span>•</span><span>${escapeHtml(prompt.subcategory)}</span></div><h4>${escapeHtml(prompt.title)}</h4><p>${escapeHtml(compact ? prompt.content.slice(0,140)+ (prompt.content.length>140 ? '...' : '') : prompt.content)}</p><div class="card-actions"><button class="icon-btn ${favorite ? 'active' : ''}" data-action="toggle-favorite" data-id="${prompt.id}" type="button" aria-pressed="${favorite}">★</button><button class="icon-btn" data-action="details" data-id="${prompt.id}" type="button">Details</button><button class="icon-btn" data-action="copy" data-id="${prompt.id}" type="button">Copy</button><button class="icon-btn" data-action="share" data-id="${prompt.id}" type="button">Share</button></div></article>`;
}

function createLessonCard(lesson){
  const progress = state.lessonProgress[lesson.id] || 0;
  const bookmarked = state.bookmarkedLessons.has(lesson.id);
  const completed = state.completedLessons.has(lesson.id);
  return `<article class="lesson-card"><div class="meta-row"><span class="badge ${getDifficultyClass(lesson.difficulty)}">${escapeHtml(lesson.difficulty)}</span><span>${escapeHtml(lesson.course)}</span><span>•</span><span>${escapeHtml(lesson.readingTime)}</span></div><h4>${escapeHtml(lesson.title)}</h4><p>${escapeHtml(lesson.description)}</p><div class="progress-row"><div class="progress-track"><span style="width:${progress}%"></span></div><span>${progress}%</span></div><div class="card-actions"><button class="primary-btn" data-action="open-lesson" data-id="${lesson.id}" type="button">${completed ? 'Review lesson' : 'Start lesson'}</button><button class="icon-btn ${bookmarked ? 'active' : ''}" data-action="toggle-bookmark" data-id="${lesson.id}" type="button">🔖</button><button class="icon-btn" data-action="copy-lesson" data-id="${lesson.id}" type="button">Copy</button><button class="icon-btn" data-action="share-lesson" data-id="${lesson.id}" type="button">Share</button></div></article>`;
}

function createContinueCard(lesson){
  const progress = state.lessonProgress[lesson.id] || 0;
  return `<div class="section-card"><h4>${escapeHtml(lesson.title)}</h4><p>${escapeHtml(lesson.description)}</p><div class="progress-row"><div class="progress-track"><span style="width:${progress}%"></span></div><span>${progress}%</span></div><div class="card-actions"><button class="primary-btn" data-action="open-lesson" data-id="${lesson.id}" type="button">Resume</button><button class="secondary-btn" data-action="advance-progress" data-id="${lesson.id}" type="button">Advance</button></div></div>`;
}

function createMiniLessonCard(lesson, completed=false){
  return `<div class="mini-card"><strong>${escapeHtml(lesson.title)}</strong><p>${escapeHtml(lesson.description)}</p><div class="card-actions"><button class="secondary-btn" data-action="open-lesson" data-id="${lesson.id}" type="button">${completed ? 'View' : 'Open'}</button></div></div>`;
}

function createToolCard(tool){
  return `<article class="tool-card"><div class="meta-row"><span>${escapeHtml(tool.category)}</span><span>•</span><span>${escapeHtml(tool.pricing)}</span></div><h4>${escapeHtml(tool.name)}</h4><p>${escapeHtml(tool.description)}</p><div class="card-actions"><span class="tag">${escapeHtml(tool.bestFor)}</span></div></article>`;
}

function createCollectionCard(collection){ return `<article class="collection-card"><h4>${escapeHtml(collection.name)}</h4><p>${escapeHtml(collection.description)}</p><div class="card-actions"><span class="tag">${escapeHtml(collection.focus)}</span></div></article>`; }
function createDailyPromptCard(){ if(!state.dailyPrompt) return '<div class="info-card"><p>Daily prompt unavailable.</p></div>'; return `<div class="info-card"><h4>${escapeHtml(state.dailyPrompt.title)}</h4><p>${escapeHtml(state.dailyPrompt.prompt)}</p></div>`; }

function handleMainAction(event){
  const button=event.target.closest('button');
  if(!button) return;
  if(button.dataset.view){ state.view=button.dataset.view; state.selectedPromptId=null; state.selectedLessonId=null; render(); return; }
  const action=button.dataset.action;
  if(action==='retry'){ loadData(); return; }
  if(action==='back'){ state.view='library'; state.selectedPromptId=null; render(); return; }
  if(action==='back-to-lessons'){ state.view='lessons'; state.selectedLessonId=null; render(); return; }
  if(action==='set-category'){ state.category=button.dataset.category; state.view='library'; render(); return; }
  if(action==='set-lesson-category'){ state.lessonCategory=button.dataset.category; renderLessons(); return; }
  if(action==='set-lesson-difficulty'){ state.lessonDifficulty=button.dataset.difficulty; renderLessons(); return; }
  if(action==='set-tool-category'){ state.toolCategory=button.dataset.category; renderTools(); return; }
  if(action==='daily-prompt'){ state.dailyPrompt={title:'Daily prompt refreshed', prompt:'Create a one-page strategy brief for your current initiative using evidence, constraints, assumptions, and next steps.'}; renderHome(); return; }
  if(action==='open-lesson'){ if(button.dataset.id){ state.selectedLessonId=Number(button.dataset.id); state.view='lesson-detail'; render(); } return; }
  if(action==='open-related-prompt'){ if(button.dataset.id){ state.selectedPromptId=Number(button.dataset.id); state.view='detail'; render(); } return; }
  if(action==='toggle-bookmark'){ const lesson=state.lessons.find((item)=>item.id===Number(button.dataset.id)); if(!lesson) return; if(state.bookmarkedLessons.has(lesson.id)){ state.bookmarkedLessons.delete(lesson.id); showToast('Lesson removed from bookmarks'); } else { state.bookmarkedLessons.add(lesson.id); showToast('Lesson bookmarked'); } persistLessonState(); if(state.view==='lesson-detail') renderLessonDetail(); else renderLessons(); return; }
  if(action==='copy-lesson'){ const lesson=state.lessons.find((item)=>item.id===Number(button.dataset.id)); if(!lesson) return; copyToClipboard(`${lesson.title}\n\n${lesson.summary}`); return; }
  if(action==='share-lesson'){ const lesson=state.lessons.find((item)=>item.id===Number(button.dataset.id)); if(!lesson) return; shareLesson(lesson); return; }
  if(action==='advance-progress'){ const lesson=state.lessons.find((item)=>item.id===Number(button.dataset.id)); if(!lesson) return; const nextValue=Math.min(100, (state.lessonProgress[lesson.id]||0)+25); state.lessonProgress[lesson.id]=nextValue; if(nextValue>=100) state.completedLessons.add(lesson.id); persistLessonState(); if(state.view==='lesson-detail') renderLessonDetail(); else renderLessons(); showToast('Progress updated'); return; }
  if(action==='mark-complete'){ const lesson=state.lessons.find((item)=>item.id===Number(button.dataset.id)); if(!lesson) return; state.lessonProgress[lesson.id]=100; state.completedLessons.add(lesson.id); persistLessonState(); if(state.view==='lesson-detail') renderLessonDetail(); else renderLessons(); showToast('Lesson completed'); return; }
  if(action==='answer-quiz'){ const lesson=state.lessons.find((item)=>item.id===Number(button.dataset.id)); if(!lesson||!lesson.quiz) return; const chosen=Number(button.dataset.choiceIndex); const correct = chosen===lesson.quiz.correctIndex; state.lessonProgress[lesson.id]=Math.max(state.lessonProgress[lesson.id]||0, 35); if(correct){ showToast('Correct answer — nice work.'); } else { showToast('Review the explanation and try again.'); } if(state.view==='lesson-detail') renderLessonDetail(); return; }
  if(!button.dataset.id) return;
  const id=Number(button.dataset.id);
  const prompt=state.prompts.find((p)=>p.id===id);
  if(!prompt) return;
  if(action==='details'){ state.view='detail'; state.selectedPromptId=prompt.id; updateHash(); render(); return; }
  if(action==='toggle-favorite'){ if(state.favorites.has(prompt.id)){ state.favorites.delete(prompt.id); showToast('Removed from favorites'); } else { state.favorites.add(prompt.id); showToast('Added to favorites'); } persistFavorites(); render(); return; }
  if(action==='copy'){ copyToClipboard(prompt.content); }
  if(action==='share'){ sharePrompt(prompt); }
}

function persistFavorites(){ localStorage.setItem('promptHubFavorites', JSON.stringify([...state.favorites])); }
function persistLessonState(){
  localStorage.setItem('promptHubBookmarkedLessons', JSON.stringify([...state.bookmarkedLessons]));
  localStorage.setItem('promptHubLessonProgress', JSON.stringify(state.lessonProgress));
  localStorage.setItem('promptHubCompletedLessons', JSON.stringify([...state.completedLessons]));
  localStorage.setItem('promptHubRecentlyViewed', JSON.stringify(state.recentlyViewed));
}

function recordRecentLesson(id){
  const next = [id, ...state.recentlyViewed.filter((item)=>item!==id)].slice(0,5);
  state.recentlyViewed = next;
  persistLessonState();
}

function getContinueLesson(){
  const started = state.lessons.find((lesson)=>state.lessonProgress[lesson.id] > 0 && !state.completedLessons.has(lesson.id));
  if(started) return started;
  return state.lessons.find((lesson)=>!state.completedLessons.has(lesson.id));
}

function getNextLesson(currentId){
  const currentIndex = state.lessons.findIndex((lesson)=>lesson.id===currentId);
  if(currentIndex<0) return null;
  return state.lessons.slice(currentIndex+1).find((lesson)=>!state.completedLessons.has(lesson.id)) || null;
}

function getDifficultyClass(difficulty='Beginner'){ return difficulty==='Advanced' ? 'badge-advanced' : difficulty==='Intermediate' ? 'badge-intermediate' : 'badge-beginner'; }

async function copyToClipboard(value){
  try{ await navigator.clipboard.writeText(value); showToast('Copied'); } catch{ showToast('Copy unavailable'); }
}

async function sharePrompt(prompt){
  const shareText = `${prompt.title}\n\n${prompt.content}`;
  if(navigator.share){ try{ await navigator.share({title:prompt.title, text:shareText}); showToast('Prompt shared'); } catch{ showToast('Share canceled'); } return; }
  copyToClipboard(shareText);
}

async function shareLesson(lesson){
  const shareText = `${lesson.title}\n\n${lesson.summary}`;
  if(navigator.share){ try{ await navigator.share({title:lesson.title, text:shareText}); showToast('Lesson shared'); } catch{ showToast('Share canceled'); } return; }
  copyToClipboard(shareText);
}

function exportFavorites(){ const favorites = state.prompts.filter((p)=>state.favorites.has(p.id)); const blob=new Blob([JSON.stringify(favorites,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='promptHub-favorites.json'; a.click(); URL.revokeObjectURL(url); showToast('Favorites exported'); }
function importFavorites(event){ const file=event.target.files?.[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try{ const imported=JSON.parse(reader.result); const ids=new Set(imported.map((item)=>item.id)); state.favorites=new Set([...state.favorites, ...ids]); persistFavorites(); render(); showToast('Favorites imported'); } catch{ showToast('Import failed'); } }; reader.readAsText(file); }
function showToast(message){ cache.toast.textContent=message; cache.toast.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>cache.toast.classList.remove('show'),2200); }
function updateNav(){ document.querySelectorAll('.nav-item').forEach((btn)=>btn.classList.toggle('active', btn.dataset.view===state.view)); }
function escapeHtml(value=''){ return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function registerServiceWorker(){ if('serviceWorker' in navigator){ navigator.serviceWorker.register('./sw.js').catch((error)=>console.error('SW registration failed', error)); } }
window.addEventListener('DOMContentLoaded', init);
