// Daily Philosophy (데일리 필로소피) - App Logic
// 「동적 확장형 큐레이션 엔진(Dynamic Catalog Engine)」 완벽 탑재 버전

// -------------------------------------------------------------
// [1] 전역 카탈로그 및 상태 관리
// -------------------------------------------------------------

// 활성 명언 카탈로그 (기본 150선 + 동적 자동 발굴/유입 + 사용자 등록 명언)
let ACTIVE_CATALOG = [...PHILOSOPHY_QUOTES];

const state = {
  currentFilter: 'daily25', // 'daily25', 'all', 또는 개별 철학자명
  daily25Quotes: [],        // 오늘 날짜 전용 25개 명언
  filteredQuotes: [],       // 현재 화면에 표시할 명언 배열
  currentIndex: 0,
  bookmarks: JSON.parse(localStorage.getItem('stoic_bookmarks') || '[]'),
  currentTheme: localStorage.getItem('stoic_theme') || 'parchment',
  fontSizeLevel: parseInt(localStorage.getItem('stoic_fontsize') || '1'), // 0: 작게, 1: 보통, 2: 크게
  soundEnabled: localStorage.getItem('stoic_sound') === 'true',
  currentDateKey: '',
  touchStartX: 0,
  touchEndX: 0,
  touchStartY: 0,
  touchEndY: 0
};

// 철학자 프로필 사진/상징 및 설명 맵
const PHILOSOPHER_INFO = {
  "마르쿠스 아우렐리우스": { badge: "로마의 철인 황제", icon: "🏛️", accentColor: "from-amber-600 to-amber-800" },
  "세네카": { badge: "로마의 사상가 & 정치가", icon: "📜", accentColor: "from-rose-600 to-rose-800" },
  "에픽테토스": { badge: "노예 출신의 스토아 스승", icon: "🕊️", accentColor: "from-blue-600 to-blue-800" },
  "프리드리히 니체": { badge: "위버멘쉬 & 실존의 선구자", icon: "⚡", accentColor: "from-purple-600 to-purple-800" },
  "아르투어 쇼펜하우어": { badge: "의지와 통찰의 염세주의자", icon: "🕯️", accentColor: "from-emerald-600 to-emerald-800" },
  "무소니우스 루푸스": { badge: "로마의 소크라테스", icon: "⚖️", accentColor: "from-teal-600 to-teal-800" },
  "제논": { badge: "스토아 학파 창시자", icon: "🌿", accentColor: "from-green-600 to-green-800" },
  "클레안테스": { badge: "스토아 학파 2대 수장", icon: "☀️", accentColor: "from-yellow-600 to-yellow-800" }
};

// -------------------------------------------------------------
// [2] 동적 확장형 큐레이션 엔진 (Dynamic Catalog Engine)
// -------------------------------------------------------------

// 로컬 저장소에서 동적으로 유입/등록된 명언 로드
function loadCustomCatalog() {
  try {
    const saved = localStorage.getItem('stoic_custom_quotes');
    if (saved) {
      const customQuotes = JSON.parse(saved);
      const existingIds = new Set(ACTIVE_CATALOG.map(q => q.id));
      customQuotes.forEach(q => {
        if (!existingIds.has(q.id)) {
          ACTIVE_CATALOG.push(q);
          existingIds.add(q.id);
        }
      });
    }
  } catch (e) {
    console.error("Custom catalog load error:", e);
  }
}

// 동적 카탈로그 저장
function saveCustomCatalog() {
  const customQuotes = ACTIVE_CATALOG.filter(q => q.isCustom || q.id > 150);
  localStorage.setItem('stoic_custom_quotes', JSON.stringify(customQuotes));
  updateDynamicTabCounts();
}

// 자동 발굴 엔진: 앱 방문/새로고침 시 대기 풀에서 새로운 지혜 자동 유입
function checkAutoDiscovery() {
  const existingIds = new Set(ACTIVE_CATALOG.map(q => q.id));
  const availablePool = (typeof EXTENDED_QUOTE_POOL !== 'undefined') 
    ? EXTENDED_QUOTE_POOL.filter(q => !existingIds.has(q.id))
    : [];

  const lastDiscoveryDate = localStorage.getItem('stoic_last_discovery_date');
  const todayKey = getTodayDateKey();

  // 오늘 아직 자동 발굴이 없었거나, 45% 확률로 새로운 명언이 유입됨
  if (availablePool.length > 0 && (lastDiscoveryDate !== todayKey || Math.random() > 0.55)) {
    const picked = availablePool[Math.floor(Math.random() * availablePool.length)];
    ACTIVE_CATALOG.push(picked);
    saveCustomCatalog();
    localStorage.setItem('stoic_last_discovery_date', todayKey);

    setTimeout(() => {
      showToast(`✨ 새로운 지혜 《${picked.title}》 자동 발굴 및 추가! (총 ${ACTIVE_CATALOG.length}선)`);
    }, 1200);
  }
}

// 수동 지혜 발굴: 5개씩 대기 풀에서 즉시 발굴 및 유입
function discoverMoreQuotes(count = 5) {
  const existingIds = new Set(ACTIVE_CATALOG.map(q => q.id));
  let pool = (typeof EXTENDED_QUOTE_POOL !== 'undefined') 
    ? EXTENDED_QUOTE_POOL.filter(q => !existingIds.has(q.id))
    : [];

  let addedCount = 0;
  let sampleTitle = "";

  if (pool.length > 0) {
    const toAdd = pool.slice(0, Math.min(count, pool.length));
    toAdd.forEach(q => {
      ACTIVE_CATALOG.push(q);
      sampleTitle = q.title;
    });
    addedCount = toAdd.length;
  }

  // 만약 대기 풀이 부족하거나 소진된 경우, 무한 합성 엔진으로 생성하여 충당
  while (addedCount < count) {
    const generated = generateInfiniteCuratedQuote();
    ACTIVE_CATALOG.push(generated);
    sampleTitle = generated.title;
    addedCount++;
  }

  saveCustomCatalog();
  renderCurrentView();
  showToast(`🎉 ${addedCount}개의 새로운 명언이 라이브러리에 영구 유입되었습니다! (총 ${ACTIVE_CATALOG.length}선)`);
  closeEngineModal();
}

// 대기 풀의 모든 명언을 일괄 활성화
function discoverAllPoolQuotes() {
  const existingIds = new Set(ACTIVE_CATALOG.map(q => q.id));
  const pool = (typeof EXTENDED_QUOTE_POOL !== 'undefined') 
    ? EXTENDED_QUOTE_POOL.filter(q => !existingIds.has(q.id))
    : [];

  if (pool.length === 0) {
    showToast("💡 이미 준비된 모든 대기 풀의 지혜가 활성화되어 있습니다!");
    return;
  }

  pool.forEach(q => ACTIVE_CATALOG.push(q));
  saveCustomCatalog();
  renderCurrentView();
  showToast(`🚀 준비된 예비 지혜 ${pool.length}개가 모두 활성화되었습니다! (총 ${ACTIVE_CATALOG.length}선)`);
  closeEngineModal();
}

// 무한 동적 합성 엔진: 템플릿 기반으로 새로운 철학 잠언을 끝없이 창출
function generateInfiniteCuratedQuote(preferredAuthor = null) {
  if (typeof INFINITE_STOIC_TEMPLATES === 'undefined' || INFINITE_STOIC_TEMPLATES.length === 0) {
    return {
      id: Date.now(),
      author: "마르쿠스 아우렐리우스",
      authorEn: "Marcus Aurelius",
      title: "영원한 평정심",
      work: "《명상록》 미공개 사유",
      theme: "부동심",
      era: "로마 제국 황제이자 스토아 철학자",
      quote: "바깥의 풍파가 어떠하든 그대 안의 맑은 거울은 흐려지지 않는다.",
      commentary: "어떤 상황에서도 당신의 본성을 지키십시오. 세상이 혼란할수록 당신의 고요한 성채는 더욱 빛납니다.",
      dailyAction: "주변의 혼란 속에서도 중심을 잃지 말고 내면의 평화를 선언해보세요.",
      isCustom: true
    };
  }

  let template;
  if (preferredAuthor) {
    template = INFINITE_STOIC_TEMPLATES.find(t => t.author.includes(preferredAuthor)) || INFINITE_STOIC_TEMPLATES[0];
  } else {
    template = INFINITE_STOIC_TEMPLATES[Math.floor(Math.random() * INFINITE_STOIC_TEMPLATES.length)];
  }

  const qIdx = Math.floor(Math.random() * template.quotes.length);
  const theme = template.themes[Math.floor(Math.random() * template.themes.length)];
  const commentary = template.commentaries[qIdx] || template.commentaries[0];
  const action = template.actions[Math.floor(Math.random() * template.actions.length)];
  const newId = Date.now() + Math.floor(Math.random() * 1000);

  return {
    id: newId,
    author: template.author,
    authorEn: template.authorEn,
    title: `${theme}의 통찰 #${Math.floor(Math.random() * 899 + 100)}`,
    work: `${template.workPrefix}`,
    theme: theme,
    era: (PHILOSOPHER_INFO[template.author] && PHILOSOPHER_INFO[template.author].badge) || "고전 철학자",
    quote: template.quotes[qIdx],
    commentary: commentary,
    dailyAction: action,
    isCustom: true
  };
}

// 사용자 정의 명언 직접 등록 기능
function addNewUserCustomQuote(quoteData) {
  const newId = Date.now();
  const authorInfo = PHILOSOPHER_INFO[quoteData.author] || { badge: "스토아 현자", icon: "✍️" };

  const newQuote = {
    id: newId,
    author: quoteData.author || "나만의 철학자",
    authorEn: quoteData.authorEn || "Custom Sage",
    title: quoteData.title || "내 영혼의 명언",
    work: quoteData.work || "독자 큐레이션 서재",
    theme: quoteData.theme || "인생의 지혜",
    era: authorInfo.badge,
    quote: quoteData.quote,
    commentary: quoteData.commentary || "내가 마음에 깊이 새긴 소중한 인생의 나침반입니다.",
    dailyAction: quoteData.dailyAction || "오늘 하루 이 구절을 가슴에 품고 실천해봅니다.",
    isCustom: true
  };

  ACTIVE_CATALOG.unshift(newQuote);
  saveCustomCatalog();

  // 전체 아카이브 모드로 전환 후 첫 번째로 이동하여 바로 확인
  setFilter('all');
  state.currentIndex = 0;
  renderCard('fade');

  showToast(`✨ 《${newQuote.title}》 명언이 라이브러리에 성공적으로 등록되었습니다!`);
  closeAddQuoteModal();
}

// -------------------------------------------------------------
// [3] 날짜 기반 25선 일일 갱신 시스템
// -------------------------------------------------------------

function seededRandom(seed) {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function getTodayDateSeed(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return y * 10000 + m * 100 + day;
}

function getTodayDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 5대 핵심 철학자에서 각각 5개씩 균등 선정하여 오늘의 25선 편성 (동적 풀 전체 반영)
function generateDaily25Quotes() {
  const dateSeed = getTodayDateSeed();
  state.currentDateKey = getTodayDateKey();
  
  const authors = [
    "마르쿠스 아우렐리우스",
    "세네카",
    "에픽테토스",
    "프리드리히 니체",
    "아르투어 쇼펜하우어"
  ];

  let dailySet = [];
  let currentSeed = dateSeed;

  authors.forEach((author, aIdx) => {
    // ACTIVE_CATALOG에서 해당 저자의 모든 명언 검색 (동적 유입분 포함)
    let authorQuotes = ACTIVE_CATALOG.filter(q => q.author.includes(author));
    if (authorQuotes.length === 0) {
      authorQuotes = PHILOSOPHY_QUOTES.filter(q => q.author.includes(author));
    }

    const indices = authorQuotes.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      currentSeed += (aIdx + 1) * 31;
      const r = Math.floor(seededRandom(currentSeed) * (i + 1));
      [indices[i], indices[r]] = [indices[r], indices[i]];
    }

    for (let k = 0; k < Math.min(5, authorQuotes.length); k++) {
      dailySet.push(authorQuotes[indices[k]]);
    }
  });

  // 25개 무작위 배치 셔플
  for (let i = dailySet.length - 1; i > 0; i--) {
    currentSeed += 17;
    const r = Math.floor(seededRandom(currentSeed) * (i + 1));
    [dailySet[i], dailySet[r]] = [dailySet[r], dailySet[i]];
  }

  return dailySet;
}

// -------------------------------------------------------------
// [4] 앱 생명주기 및 렌더링
// -------------------------------------------------------------

function initApp() {
  // 테마 적용
  applyTheme(state.currentTheme);
  
  // 날짜 표시
  const dateEl = document.getElementById('currentDateDisplay');
  if (dateEl) {
    dateEl.textContent = getFormattedToday();
  }

  // 1. 커스텀 및 동적 카탈로그 로드
  loadCustomCatalog();

  // 2. 백그라운드 자동 지혜 발굴 체크
  checkAutoDiscovery();

  // 3. 오늘 날짜 전용 25선 생성
  state.daily25Quotes = generateDaily25Quotes();

  // 4. 탭별 실시간 수치 업데이트
  updateDynamicTabCounts();

  // 5. 기본 모드는 '오늘의 25선'
  setFilter('daily25');

  // 이벤트 리스너 세팅
  setupEventListeners();

  // 렌더링
  renderCard();
  updateBookmarkCount();

  // 서비스 워커 등록
  registerServiceWorker();

  // 자정 갱신 타이머
  startMidnightCheckTimer();
}

// 상단 필터 탭들의 실시간 명언 수량 동적 표기 갱신
function updateDynamicTabCounts() {
  const totalCount = ACTIVE_CATALOG.length;
  
  const totalBadge = document.getElementById('totalLibraryCountText');
  if (totalBadge) totalBadge.textContent = `총 ${totalCount}선 보관`;

  const allTabBtn = document.querySelector('button[data-filter="all"]');
  if (allTabBtn) allTabBtn.textContent = `📚 전체 아카이브 (${totalCount})`;

  const philosopherCounts = {
    "마르쿠스": ACTIVE_CATALOG.filter(q => q.author.includes("마르쿠스")).length,
    "세네카": ACTIVE_CATALOG.filter(q => q.author.includes("세네카")).length,
    "에픽테토스": ACTIVE_CATALOG.filter(q => q.author.includes("에픽테토스")).length,
    "니체": ACTIVE_CATALOG.filter(q => q.author.includes("니체")).length,
    "쇼펜하우어": ACTIVE_CATALOG.filter(q => q.author.includes("쇼펜하우어")).length
  };

  Object.entries(philosopherCounts).forEach(([name, count]) => {
    const btn = document.querySelector(`button[data-filter="${name}"]`);
    if (btn) {
      const icons = { "마르쿠스": "🏛️", "세네카": "📜", "에픽테토스": "🕊️", "니체": "⚡", "쇼펜하우어": "🕯️" };
      btn.textContent = `${icons[name] || ''} ${name} (${count})`;
    }
  });

  updateModeBadge();
}

function startMidnightCheckTimer() {
  setInterval(() => {
    const todayKey = getTodayDateKey();
    if (state.currentDateKey && state.currentDateKey !== todayKey) {
      state.daily25Quotes = generateDaily25Quotes();
      const dateEl = document.getElementById('currentDateDisplay');
      if (dateEl) dateEl.textContent = getFormattedToday();
      
      if (state.currentFilter === 'daily25') {
        state.filteredQuotes = [...state.daily25Quotes];
        state.currentIndex = 0;
        renderCard('fade');
        showToast("자정이 지나 오늘 날짜의 새로운 25개 지혜로 갱신되었습니다! ✨");
      }
    }
  }, 30000);
}

function setFilter(filterType) {
  state.currentFilter = filterType;

  if (filterType === 'daily25') {
    state.filteredQuotes = [...state.daily25Quotes];
  } else if (filterType === 'all') {
    state.filteredQuotes = [...ACTIVE_CATALOG];
  } else {
    state.filteredQuotes = ACTIVE_CATALOG.filter(q => q.author.includes(filterType));
  }

  state.currentIndex = 0;
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.dataset.filter === filterType) {
      btn.classList.add('active-filter');
    } else {
      btn.classList.remove('active-filter');
    }
  });

  updateModeBadge();
  renderCard('fade');
}

function updateModeBadge() {
  const badgeEl = document.getElementById('modeIndicatorBadge');
  if (!badgeEl) return;

  if (state.currentFilter === 'daily25') {
    badgeEl.textContent = "📅 오늘의 25선 (매일 자정 자동 갱신)";
    badgeEl.classList.add('bg-amber-500/10', 'text-amber-700', 'dark:text-amber-300');
  } else if (state.currentFilter === 'all') {
    badgeEl.textContent = `📚 전체 지혜 아카이브 (총 ${ACTIVE_CATALOG.length}선)`;
    badgeEl.classList.remove('bg-amber-500/10', 'text-amber-700', 'dark:text-amber-300');
  } else {
    const currentCount = state.filteredQuotes.length;
    badgeEl.textContent = `🏛️ ${state.currentFilter}의 지혜 (총 ${currentCount}선)`;
    badgeEl.classList.remove('bg-amber-500/10', 'text-amber-700', 'dark:text-amber-300');
  }
}

function renderCurrentView() {
  if (state.currentFilter === 'daily25') {
    state.daily25Quotes = generateDaily25Quotes();
    state.filteredQuotes = [...state.daily25Quotes];
  } else if (state.currentFilter === 'all') {
    state.filteredQuotes = [...ACTIVE_CATALOG];
  } else {
    state.filteredQuotes = ACTIVE_CATALOG.filter(q => q.author.includes(state.currentFilter));
  }
  updateDynamicTabCounts();
  renderCard();
}

function renderCard(direction = null) {
  const quote = state.filteredQuotes[state.currentIndex];
  if (!quote) return;

  const cardContainer = document.getElementById('quoteCard');
  if (!cardContainer) return;

  cardContainer.classList.remove('slide-in-right', 'slide-in-left', 'fade-in');
  void cardContainer.offsetWidth;
  if (direction === 'next') cardContainer.classList.add('slide-in-right');
  else if (direction === 'prev') cardContainer.classList.add('slide-in-left');
  else cardContainer.classList.add('fade-in');

  const pInfo = PHILOSOPHER_INFO[quote.author] || {
    badge: quote.era || "스토아 철학자",
    icon: "📖",
    accentColor: "from-stone-600 to-stone-800"
  };

  const fontCls = FONT_SIZES[state.fontSizeLevel];

  document.getElementById('cardThemeBadge').textContent = quote.theme || "지혜";
  document.getElementById('cardAuthorIcon').textContent = pInfo.icon;
  document.getElementById('cardAuthorName').textContent = quote.author;
  document.getElementById('cardAuthorEn').textContent = quote.authorEn || "";
  document.getElementById('cardWorkName').textContent = quote.work || "";
  
  const quoteTextEl = document.getElementById('cardQuoteText');
  quoteTextEl.textContent = `"${quote.quote}"`;
  quoteTextEl.className = `font-serif font-semibold leading-relaxed tracking-tight quote-text ${fontCls.quote}`;

  document.getElementById('cardTitleText').textContent = quote.title;

  const commentaryEl = document.getElementById('cardCommentaryText');
  commentaryEl.textContent = quote.commentary;
  commentaryEl.className = `leading-relaxed commentary-text ${fontCls.commentary}`;

  const actionEl = document.getElementById('cardActionText');
  actionEl.textContent = quote.dailyAction;
  actionEl.className = `italic leading-relaxed ${fontCls.action}`;

  document.getElementById('pageIndicator').textContent = `${state.currentIndex + 1} / ${state.filteredQuotes.length}`;
  
  const isBookmarked = state.bookmarks.includes(quote.id);
  const bookmarkIcon = document.getElementById('bookmarkIcon');
  if (bookmarkIcon) {
    if (isBookmarked) {
      bookmarkIcon.classList.add('fill-current', 'text-amber-500');
    } else {
      bookmarkIcon.classList.remove('fill-current', 'text-amber-500');
    }
  }

  const scrollableBody = document.getElementById('cardScrollBody');
  if (scrollableBody) scrollableBody.scrollTop = 0;
}

// -------------------------------------------------------------
// [5] 모달 및 대화상자 인터랙션
// -------------------------------------------------------------

// 동적 큐레이션 엔진 관리 모달 열기
function openEngineModal() {
  const modal = document.getElementById('engineModal');
  if (!modal) return;

  const totalEl = document.getElementById('engineTotalCount');
  if (totalEl) totalEl.textContent = ACTIVE_CATALOG.length;

  const existingIds = new Set(ACTIVE_CATALOG.map(q => q.id));
  const poolCount = (typeof EXTENDED_QUOTE_POOL !== 'undefined') 
    ? EXTENDED_QUOTE_POOL.filter(q => !existingIds.has(q.id)).length
    : 0;

  const poolEl = document.getElementById('enginePoolCount');
  if (poolEl) poolEl.textContent = poolCount;

  modal.classList.remove('hidden');
}

function closeEngineModal() {
  const modal = document.getElementById('engineModal');
  if (modal) modal.classList.add('hidden');
}

// 나만의 명언 추가 모달 열기
function openAddQuoteModal() {
  const modal = document.getElementById('addQuoteModal');
  if (modal) modal.classList.remove('hidden');
}

function closeAddQuoteModal() {
  const modal = document.getElementById('addQuoteModal');
  if (modal) modal.classList.add('hidden');
}

function handleAddQuoteSubmit(event) {
  event.preventDefault();
  const author = document.getElementById('newQuoteAuthor').value;
  const quote = document.getElementById('newQuoteText').value;
  const title = document.getElementById('newQuoteTitle').value;
  const commentary = document.getElementById('newQuoteCommentary').value;
  const work = document.getElementById('newQuoteWork').value;

  if (!quote.trim()) {
    alert("명언 내용을 입력해주세요.");
    return;
  }

  addNewUserCustomQuote({
    author: author || "마르쿠스 아우렐리우스",
    title: title || "가슴에 새긴 지혜",
    quote: quote,
    commentary: commentary || "일상 속에서 마음의 중심을 잡아주는 소중한 성찰입니다.",
    work: work || "나만의 명언록"
  });

  // 폼 초기화
  document.getElementById('addQuoteForm').reset();
}

// -------------------------------------------------------------
// [6] 네비게이션 & 제스처 & 유틸리티
// -------------------------------------------------------------

function nextQuote() {
  if (state.currentIndex < state.filteredQuotes.length - 1) {
    state.currentIndex++;
  } else {
    state.currentIndex = 0;
  }
  playGentleChime();
  renderCard('next');
}

function prevQuote() {
  if (state.currentIndex > 0) {
    state.currentIndex--;
  } else {
    state.currentIndex = state.filteredQuotes.length - 1;
  }
  playGentleChime();
  renderCard('prev');
}

function randomQuote() {
  if (state.filteredQuotes.length <= 1) return;
  let newIdx;
  do {
    newIdx = Math.floor(Math.random() * state.filteredQuotes.length);
  } while (newIdx === state.currentIndex);
  state.currentIndex = newIdx;
  playGentleChime();
  renderCard('fade');
  showToast("랜덤 철학 명언으로 이동했습니다.");
}

function goToTodayQuote() {
  setFilter('daily25');
  state.currentIndex = 0;
  playGentleChime();
  renderCard('fade');
  showToast("오늘 날짜의 25개 지혜 1번으로 이동했습니다.");
}

function toggleBookmark() {
  const currentQuote = state.filteredQuotes[state.currentIndex];
  if (!currentQuote) return;

  const idx = state.bookmarks.indexOf(currentQuote.id);
  if (idx > -1) {
    state.bookmarks.splice(idx, 1);
    showToast("보관함에서 제거되었습니다.");
  } else {
    state.bookmarks.push(currentQuote.id);
    showToast("명언을 보관함에 담았습니다.");
  }

  localStorage.setItem('stoic_bookmarks', JSON.stringify(state.bookmarks));
  updateBookmarkCount();
  renderCard();
}

function updateBookmarkCount() {
  const countEl = document.getElementById('bookmarkCountBadge');
  if (countEl) {
    countEl.textContent = state.bookmarks.length;
    countEl.style.display = state.bookmarks.length > 0 ? 'inline-flex' : 'none';
  }
}

function openBookmarksModal() {
  const modal = document.getElementById('bookmarkModal');
  const listEl = document.getElementById('bookmarkListContainer');
  if (!modal || !listEl) return;

  listEl.innerHTML = '';
  
  if (state.bookmarks.length === 0) {
    listEl.innerHTML = `
      <div class="text-center py-12 opacity-60">
        <span class="text-4xl block mb-2">⭐</span>
        <p>아직 보관된 명언이 없습니다.</p>
        <p class="text-xs mt-1">마음에 드는 명언의 별표를 눌러 간직해보세요.</p>
      </div>
    `;
  } else {
    const bookmarkedQuotes = ACTIVE_CATALOG.filter(q => state.bookmarks.includes(q.id));
    bookmarkedQuotes.forEach(q => {
      const item = document.createElement('div');
      item.className = "p-3.5 rounded-xl border border-stone-200/40 dark:border-stone-700/50 bg-white/50 dark:bg-stone-800/50 hover:bg-stone-100/50 transition cursor-pointer mb-2";
      item.innerHTML = `
        <div class="flex items-center justify-between mb-1">
          <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-stone-200/70 dark:bg-stone-700/70 text-stone-700 dark:text-stone-300">${q.author}</span>
          <span class="text-[10px] opacity-50">${q.theme || ''}</span>
        </div>
        <p class="font-serif text-xs sm:text-sm font-medium line-clamp-2 mb-1">"${q.quote}"</p>
        <p class="text-[10px] opacity-70 line-clamp-1">${q.title}</p>
      `;
      item.onclick = () => {
        setFilter('all');
        const targetIdx = state.filteredQuotes.findIndex(item => item.id === q.id);
        if (targetIdx !== -1) state.currentIndex = targetIdx;
        closeBookmarksModal();
        renderCard();
      };
      listEl.appendChild(item);
    });
  }

  modal.classList.remove('hidden');
}

function closeBookmarksModal() {
  const modal = document.getElementById('bookmarkModal');
  if (modal) modal.classList.add('hidden');
}

function copyCurrentQuote() {
  const q = state.filteredQuotes[state.currentIndex];
  if (!q) return;

  const copyText = `[데일리 필로소피 - ${q.author}]\n\n"${q.quote}"\n\n📌 ${q.title}\n${q.commentary}\n\n💡 오늘의 실천: ${q.dailyAction}\n\n- 출처: ${q.work}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(copyText).then(() => {
      showToast("명언과 해설이 클립보드에 복사되었습니다!");
    }).catch(() => fallbackCopy(copyText));
  } else {
    fallbackCopy(copyText);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  showToast("명언과 해설이 복사되었습니다!");
}

function showToast(message) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('opacity-0', 'pointer-events-none');
  toast.classList.add('opacity-100');
  setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0', 'pointer-events-none');
  }, 2600);
}

function applyTheme(themeName) {
  state.currentTheme = themeName;
  localStorage.setItem('stoic_theme', themeName);
  
  const root = document.documentElement;
  root.classList.remove('theme-parchment', 'theme-dark', 'theme-slate');
  root.classList.add(`theme-${themeName}`);

  if (themeName === 'dark') {
    document.body.classList.add('dark');
  } else {
    document.body.classList.remove('dark');
  }
}

function cycleTheme() {
  const themes = ['parchment', 'dark', 'slate'];
  const nextIdx = (themes.indexOf(state.currentTheme) + 1) % themes.length;
  applyTheme(themes[nextIdx]);
  const themeNames = { parchment: "양장본 파피루스 테마", dark: "미드나잇 다크 테마", slate: "새벽 미니멀 테마" };
  showToast(`${themeNames[themes[nextIdx]]} 적용`);
}

function cycleFontSize() {
  state.fontSizeLevel = (state.fontSizeLevel + 1) % 3;
  localStorage.setItem('stoic_fontsize', state.fontSizeLevel);
  const labels = ["글자 크기: 작게", "글자 크기: 보통", "글자 크기: 크게"];
  showToast(labels[state.fontSizeLevel]);
  renderCard();
}

function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  localStorage.setItem('stoic_sound', state.soundEnabled);
  showToast(state.soundEnabled ? "명상 차임벨 소리 켜짐 🔔" : "효과음 꺼짐 🔕");
  if (state.soundEnabled) playGentleChime();
}

function playGentleChime() {
  if (!state.soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const freqs = [369.99, 739.99, 1109.98];
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);
    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.8);

    freqs.forEach(f => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, ctx.currentTime);
      osc.connect(gainNode);
      osc.start();
      osc.stop(ctx.currentTime + 1.8);
    });
  } catch (e) {}
}

const FONT_SIZES = [
  { quote: 'text-base sm:text-lg', commentary: 'text-xs', action: 'text-[11px]' },
  { quote: 'text-lg sm:text-xl', commentary: 'text-sm', action: 'text-xs' },
  { quote: 'text-xl sm:text-2xl', commentary: 'text-base', action: 'text-sm' }
];

function getFormattedToday() {
  const now = new Date();
  const options = { month: 'long', day: 'numeric', weekday: 'short' };
  return now.toLocaleDateString('ko-KR', options);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('SW Registered:', reg.scope))
        .catch((err) => console.log('SW Error:', err));
    });
  }
}

function setupEventListeners() {
  const cardArea = document.getElementById('swipeArea');
  if (cardArea) {
    cardArea.addEventListener('touchstart', (e) => {
      state.touchStartX = e.changedTouches[0].screenX;
      state.touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    cardArea.addEventListener('touchend', (e) => {
      state.touchEndX = e.changedTouches[0].screenX;
      state.touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    }, { passive: true });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'Space') {
      nextQuote();
    } else if (e.key === 'ArrowLeft') {
      prevQuote();
    }
  });
}

function handleSwipe() {
  const diffX = state.touchEndX - state.touchStartX;
  const diffY = state.touchEndY - state.touchStartY;

  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 45) {
    if (diffX < 0) {
      nextQuote();
    } else {
      prevQuote();
    }
  }
}

document.addEventListener('DOMContentLoaded', initApp);
