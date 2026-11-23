// Daily Philosophy (데일리 필로소피) - App Logic
// 75개 명언 아카이브 및 '매일 25개 새로운 지혜 자동 갱신' 시스템

// 상태 관리
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
  "마르쿠스 아우렐리우스": {
    badge: "로마의 철인 황제",
    icon: "🏛️",
    accentColor: "from-amber-600 to-amber-800"
  },
  "세네카": {
    badge: "로마의 사상가 & 정치가",
    icon: "📜",
    accentColor: "from-rose-600 to-rose-800"
  },
  "에픽테토스": {
    badge: "노예 출신의 스토아 스승",
    icon: "🕊️",
    accentColor: "from-blue-600 to-blue-800"
  },
  "프리드리히 니체": {
    badge: "위버멘쉬 & 실존의 선구자",
    icon: "⚡",
    accentColor: "from-purple-600 to-purple-800"
  },
  "아르투어 쇼펜하우어": {
    badge: "의지와 통찰의 염세주의자",
    icon: "🕯️",
    accentColor: "from-emerald-600 to-emerald-800"
  }
};

// -------------------------------------------------------------
// [핵심] 날짜 기반 시드(Seed) 유사 난수 생성기 & 25개 일일 갱신 알고리즘
// -------------------------------------------------------------

// Mulberry32 알고리즘 (동일 날짜에는 항상 동일한 25개, 다음 날에는 완전히 새로운 25개 산출)
function seededRandom(seed) {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// 오늘 날짜 시드 생성 (예: 20261123)
function getTodayDateSeed(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return y * 10000 + m * 100 + day;
}

// 오늘 날짜 문자열 키 (예: "2026-11-23")
function getTodayDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 5명의 철학자에게서 각각 5개씩 균등하게 뽑아 오늘의 25개 지혜 세트 생성
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
    // 해당 철학자의 15개 명언 모음
    const authorQuotes = PHILOSOPHY_QUOTES.filter(q => q.author === author);
    
    // 시드 기반 셔플을 위한 인덱스 배열 생성
    const indices = authorQuotes.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      currentSeed += (aIdx + 1) * 31;
      const r = Math.floor(seededRandom(currentSeed) * (i + 1));
      [indices[i], indices[r]] = [indices[r], indices[i]];
    }

    // 셔플된 결과 중 상위 5개를 오늘 명언으로 선정
    for (let k = 0; k < 5; k++) {
      dailySet.push(authorQuotes[indices[k]]);
    }
  });

  // 25개의 명언을 철학자가 적절히 섞이도록 최종 셔플
  for (let i = dailySet.length - 1; i > 0; i--) {
    currentSeed += 17;
    const r = Math.floor(seededRandom(currentSeed) * (i + 1));
    [dailySet[i], dailySet[r]] = [dailySet[r], dailySet[i]];
  }

  return dailySet;
}

// 부드러운 싱잉볼/명상종 소리 (Web Audio API)
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
  } catch (e) {
    console.log("Audio waiting for user interaction");
  }
}

// 날짜 포맷팅 (예: 11월 23일 (월))
function getFormattedToday() {
  const now = new Date();
  const options = { month: 'long', day: 'numeric', weekday: 'short' };
  return now.toLocaleDateString('ko-KR', options);
}

// 폰트 크기 클래스 맵
const FONT_SIZES = [
  { quote: 'text-lg', commentary: 'text-sm', action: 'text-xs' },      // 작게
  { quote: 'text-xl', commentary: 'text-base', action: 'text-sm' },     // 기본
  { quote: 'text-2xl', commentary: 'text-lg', action: 'text-base' }     // 크게
];

// 앱 초기화
function initApp() {
  // 테마 적용
  applyTheme(state.currentTheme);
  
  // 헤더 날짜 표시
  const dateEl = document.getElementById('currentDateDisplay');
  if (dateEl) {
    dateEl.textContent = getFormattedToday();
  }

  // 오늘 날짜 전용 25개 생성
  state.daily25Quotes = generateDaily25Quotes();

  // 기본 모드는 '오늘의 25개 지혜'로 설정
  setFilter('daily25');

  // 이벤트 리스너 등록
  setupEventListeners();

  // 렌더링
  renderCard();
  updateBookmarkCount();

  // 서비스 워커 등록
  registerServiceWorker();

  // 자정 자동 갱신 타이머 시작
  startMidnightCheckTimer();
}

// 자정(00:00)이 지나면 새로운 25개로 자동 갱신
function startMidnightCheckTimer() {
  setInterval(() => {
    const todayKey = getTodayDateKey();
    if (state.currentDateKey && state.currentDateKey !== todayKey) {
      // 날짜가 바뀜!
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
  }, 30000); // 30초마다 체크
}

// PWA 서비스 워커 등록
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => console.log('PWA ServiceWorker 등록 완료:', reg.scope))
        .catch((err) => console.log('PWA ServiceWorker 등록 오류:', err));
    });
  }
}

// 필터링 적용
function setFilter(filterType) {
  state.currentFilter = filterType;

  if (filterType === 'daily25') {
    // 오늘의 25선
    state.filteredQuotes = [...state.daily25Quotes];
  } else if (filterType === 'all') {
    // 전체 75선 아카이브
    state.filteredQuotes = [...PHILOSOPHY_QUOTES];
  } else {
    // 특정 철학자 필터
    state.filteredQuotes = PHILOSOPHY_QUOTES.filter(q => q.author.includes(filterType));
  }

  state.currentIndex = 0;
  
  // 버튼 활성화 클래스 토글
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.dataset.filter === filterType) {
      btn.classList.add('active-filter');
    } else {
      btn.classList.remove('active-filter');
    }
  });

  // 상태 배지 업데이트
  updateModeBadge();

  renderCard('fade');
}

// 상단 모드 배지 갱신 (예: "오늘의 25개 지혜" / "전체 75선 아카이브")
function updateModeBadge() {
  const badgeEl = document.getElementById('modeIndicatorBadge');
  if (!badgeEl) return;

  if (state.currentFilter === 'daily25') {
    badgeEl.textContent = "📅 오늘의 25선 (매일 자정 자동 갱신)";
    badgeEl.classList.add('bg-amber-500/10', 'text-amber-700', 'dark:text-amber-300');
  } else if (state.currentFilter === 'all') {
    badgeEl.textContent = "📚 전체 지혜 아카이브 (총 150선)";
    badgeEl.classList.remove('bg-amber-500/10', 'text-amber-700', 'dark:text-amber-300');
  } else {
    badgeEl.textContent = `🏛️ ${state.currentFilter}의 지혜 (총 30선)`;
    badgeEl.classList.remove('bg-amber-500/10', 'text-amber-700', 'dark:text-amber-300');
  }
}

// 카드 렌더링
function renderCard(direction = null) {
  const quote = state.filteredQuotes[state.currentIndex];
  if (!quote) return;

  const cardContainer = document.getElementById('quoteCard');
  if (!cardContainer) return;

  // 애니메이션 효과
  cardContainer.classList.remove('slide-in-right', 'slide-in-left', 'fade-in');
  void cardContainer.offsetWidth; // 트리거 리플로우
  if (direction === 'next') cardContainer.classList.add('slide-in-right');
  else if (direction === 'prev') cardContainer.classList.add('slide-in-left');
  else cardContainer.classList.add('fade-in');

  // 철학자 메타정보
  const pInfo = PHILOSOPHER_INFO[quote.author] || {
    badge: quote.era,
    icon: "📖",
    accentColor: "from-stone-600 to-stone-800"
  };

  const fontCls = FONT_SIZES[state.fontSizeLevel];

  // DOM 주입
  document.getElementById('cardThemeBadge').textContent = quote.theme;
  document.getElementById('cardAuthorIcon').textContent = pInfo.icon;
  document.getElementById('cardAuthorName').textContent = quote.author;
  document.getElementById('cardAuthorEn').textContent = quote.authorEn;
  document.getElementById('cardWorkName').textContent = quote.work;
  
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

  // 페이지 인디케이터 (현재 인덱스 / 총 개수)
  document.getElementById('pageIndicator').textContent = `${state.currentIndex + 1} / ${state.filteredQuotes.length}`;
  
  // 북마크 상태 표시
  const isBookmarked = state.bookmarks.includes(quote.id);
  const bookmarkIcon = document.getElementById('bookmarkIcon');
  if (bookmarkIcon) {
    if (isBookmarked) {
      bookmarkIcon.classList.add('fill-current', 'text-amber-500');
    } else {
      bookmarkIcon.classList.remove('fill-current', 'text-amber-500');
    }
  }

  // 카드 내부 스크롤 상단으로 초기화
  const scrollableBody = document.getElementById('cardScrollBody');
  if (scrollableBody) scrollableBody.scrollTop = 0;
}

// 다음 명언
function nextQuote() {
  if (state.currentIndex < state.filteredQuotes.length - 1) {
    state.currentIndex++;
  } else {
    state.currentIndex = 0; // 순환
  }
  playGentleChime();
  renderCard('next');
}

// 이전 명언
function prevQuote() {
  if (state.currentIndex > 0) {
    state.currentIndex--;
  } else {
    state.currentIndex = state.filteredQuotes.length - 1; // 순환
  }
  playGentleChime();
  renderCard('prev');
}

// 랜덤 명언
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

// 오늘의 첫 번째 지혜로 이동
function goToTodayQuote() {
  setFilter('daily25');
  state.currentIndex = 0;
  playGentleChime();
  renderCard('fade');
  showToast("오늘 날짜의 25개 지혜 1번으로 이동했습니다.");
}

// 북마크 토글
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

// 보관함 모달 열기
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
    const bookmarkedQuotes = PHILOSOPHY_QUOTES.filter(q => state.bookmarks.includes(q.id));
    bookmarkedQuotes.forEach(q => {
      const item = document.createElement('div');
      item.className = "p-4 rounded-xl border border-stone-200/40 dark:border-stone-700/50 bg-white/50 dark:bg-stone-800/50 hover:bg-stone-100/50 transition cursor-pointer mb-2.5";
      item.innerHTML = `
        <div class="flex items-center justify-between mb-1.5">
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-200/70 dark:bg-stone-700/70 text-stone-700 dark:text-stone-300">${q.author}</span>
          <span class="text-xs opacity-50">${q.theme}</span>
        </div>
        <p class="font-serif text-sm font-medium line-clamp-2 mb-1.5">"${q.quote}"</p>
        <p class="text-xs opacity-70 line-clamp-1">${q.title}</p>
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

// 텍스트 복사/공유
function copyCurrentQuote() {
  const q = state.filteredQuotes[state.currentIndex];
  if (!q) return;

  const copyText = `[데일리 필로소피 - ${q.author}]\n\n"${q.quote}"\n\n📌 ${q.title}\n${q.commentary}\n\n💡 오늘의 실천: ${q.dailyAction}\n\n- 출처: ${q.work}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(copyText).then(() => {
      showToast("명언과 해설이 클립보드에 복사되었습니다!");
    }).catch(() => {
      fallbackCopy(copyText);
    });
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

// 토스트 메시지
function showToast(message) {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('opacity-0', 'pointer-events-none');
  toast.classList.add('opacity-100');
  setTimeout(() => {
    toast.classList.remove('opacity-100');
    toast.classList.add('opacity-0', 'pointer-events-none');
  }, 2200);
}

// 테마 관리
function applyTheme(themeName) {
  state.currentTheme = themeName;
  localStorage.setItem('stoic_theme', themeName);
  
  const root = document.documentElement;
  root.classList.remove('theme-parchment', 'theme-dark', 'theme-slate');
  root.classList.add(`theme-${themeName}`);

  // 다크모드 클래스 토글
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

// 폰트 크기 조절
function cycleFontSize() {
  state.fontSizeLevel = (state.fontSizeLevel + 1) % 3;
  localStorage.setItem('stoic_fontsize', state.fontSizeLevel);
  const labels = ["글자 크기: 작게", "글자 크기: 보통", "글자 크기: 크게"];
  showToast(labels[state.fontSizeLevel]);
  renderCard();
}

// 사운드 토글
function toggleSound() {
  state.soundEnabled = !state.soundEnabled;
  localStorage.setItem('stoic_sound', state.soundEnabled);
  showToast(state.soundEnabled ? "명상 차임벨 소리 켜짐 🔔" : "효과음 꺼짐 🔕");
  if (state.soundEnabled) playGentleChime();
}

// 이벤트 리스너 세팅
function setupEventListeners() {
  // 모바일 터치 제스처 (스와이프)
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

  // 키보드 방향키
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

  // 가로 스와이프 감지 (임계값 45px)
  if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 45) {
    if (diffX < 0) {
      nextQuote();
    } else {
      prevQuote();
    }
  }
}

// 앱 구동
document.addEventListener('DOMContentLoaded', initApp);
