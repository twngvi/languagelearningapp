import { Router } from './router.js';
import { getDatabaseHealth, openDatabase, protectDatabaseStorage } from './db.js';
import { renderHome } from '../pages/home.js';
import { renderVocabulary, renderVocabularySet } from '../pages/vocabulary-page.js';
import { renderStudy } from '../pages/study-page.js';
import { renderSpeaking } from '../pages/speaking-page.js';
import { renderProgress } from '../pages/progress-page.js';
import { renderSettings } from '../pages/settings-page.js';
import { renderStudySessionDetail } from '../pages/session-detail-page.js';
import { initializeVocabularyPage } from './vocabulary.js';
import { initializeVocabularySetPage } from './vocabulary.js';
import { initializeStudyPage } from './study.js';
import { initializeSpeakingPage } from './sentences.js';
import { initializeStudySessionDetail } from './session-detail.js';
import { getDailyWordGoal, saveDailyWordGoal } from './settings.js';
import { listDueVocabulary } from './review.js';
import { getLearningStatistics } from './statistics.js';
import { countSavedVocabularyInSet, listWordSets } from './word-sets.js';
import { initializeBackupPage } from './backup-page.js';
import { enhanceCustomSelects } from './custom-select.js';
import { cancelSpeech } from './speech.js';

const routes = {
  home: { render: renderHome },
  vocabulary: { render: renderVocabulary },
  'vocabulary-set': { render: () => renderVocabularySet(window.location.hash.slice('#vocabulary-set/'.length)) },
  'study-session': { render: () => renderStudySessionDetail(window.location.hash.slice('#study-session/'.length)) },
  study: { render: renderStudy },
  speaking: { render: renderSpeaking },
  progress: { render: renderProgress },
  settings: { render: renderSettings },
};

function initializeSidebar() {
  const shell = document.querySelector('.app-shell');
  const toggle = document.querySelector('.sidebar-toggle');
  if (!shell || !toggle) return;

  const setCollapsed = (collapsed) => {
    shell.classList.toggle('sidebar-collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', collapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng');
  };

  setCollapsed(localStorage.getItem('shin-sidebar-collapsed') === 'true');
  toggle.addEventListener('click', () => {
    const collapsed = !shell.classList.contains('sidebar-collapsed');
    setCollapsed(collapsed);
    localStorage.setItem('shin-sidebar-collapsed', String(collapsed));
  });
}

initializeSidebar();

function initializeBackToTop() {
  const view = document.querySelector('#app-view');
  const button = document.querySelector('[data-app-back-to-top]');
  const positionStorageKey = 'shin-back-to-top-horizontal-position';
  const savedPosition = localStorage.getItem(positionStorageKey);
  let positionRatio = savedPosition === null ? null : Number(savedPosition);
  let dragState = null;
  let suppressClick = false;
  let headerObserver;

  if (!Number.isFinite(positionRatio)) positionRatio = null;
  if (positionRatio !== null) positionRatio = Math.min(1, Math.max(0, positionRatio));

  const getHorizontalBounds = () => {
    const width = button.getBoundingClientRect().width || 42;
    const minLeft = 8;
    return {
      minLeft,
      maxLeft: Math.max(minLeft, window.innerWidth - width - 8),
    };
  };

  const setHorizontalPosition = (left) => {
    const { minLeft, maxLeft } = getHorizontalBounds();
    const clampedLeft = Math.min(maxLeft, Math.max(minLeft, left));
    button.style.left = `${clampedLeft}px`;
    button.style.right = 'auto';
    return clampedLeft;
  };

  const applySavedPosition = () => {
    if (positionRatio === null) return;
    const { minLeft, maxLeft } = getHorizontalBounds();
    setHorizontalPosition(minLeft + (maxLeft - minLeft) * positionRatio);
  };

  const observePageHeader = () => {
    headerObserver?.disconnect();
    const header = view.querySelector('.page-header');
    if (!header) {
      button.hidden = true;
      return;
    }

    headerObserver = new IntersectionObserver(([entry]) => {
      button.hidden = entry.isIntersecting;
    });
    headerObserver.observe(header);
  };

  new MutationObserver(observePageHeader).observe(view, { childList: true });
  button.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.isPrimary === false) return;
    suppressClick = false;
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startLeft: button.getBoundingClientRect().left,
      moved: false,
    };
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener('pointermove', (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - dragState.startX;
    if (!dragState.moved && Math.abs(deltaX) < 5) return;
    dragState.moved = true;
    button.classList.add('is-dragging');
    setHorizontalPosition(dragState.startLeft + deltaX);
    event.preventDefault();
  });
  const finishDrag = (event) => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const finishedDrag = dragState;
    dragState = null;
    button.classList.remove('is-dragging');
    if (!finishedDrag.moved && Math.abs(event.clientX - finishedDrag.startX) >= 5) {
      finishedDrag.moved = true;
      setHorizontalPosition(finishedDrag.startLeft + event.clientX - finishedDrag.startX);
    }
    if (!finishedDrag.moved) return;
    event.preventDefault();
    const { minLeft, maxLeft } = getHorizontalBounds();
    const left = setHorizontalPosition(button.getBoundingClientRect().left);
    positionRatio = (left - minLeft) / (maxLeft - minLeft || 1);
    localStorage.setItem(positionStorageKey, String(positionRatio));
    suppressClick = true;
    window.setTimeout(() => { suppressClick = false; }, 250);
  };
  button.addEventListener('pointerup', finishDrag);
  button.addEventListener('pointercancel', finishDrag);
  window.addEventListener('resize', applySavedPosition);
  button.addEventListener('click', () => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  applySavedPosition();
  observePageHeader();
}

initializeBackToTop();

function stopActiveActivities() {
  cancelSpeech();
  document.dispatchEvent(new CustomEvent('app:stop-activities'));
}

const router = new Router({
  routes,
  view: document.querySelector('#app-view'),
  onLeave: stopActiveActivities,
  onRender: enhanceCustomSelects,
  onEnter: (route) => {
    if (route === 'vocabulary') {
      initializeVocabularyPage();
    }
    if (route === 'vocabulary-set') {
      initializeVocabularySetPage();
    }
    if (route === 'study-session') {
      initializeStudySessionDetail();
    }
    if (route === 'study') {
      initializeStudyPage();
    }
    if (route === 'speaking') {
      initializeSpeakingPage();
    }
    if (route === 'home') {
      initializeHomePage();
    }
    if (route === 'progress') {
      initializeProgressPage();
    }
    if (route === 'settings') {
      initializeDailyGoalSetting();
      initializeBackupPage();
    }
  },
});

async function initializeDailyGoalSetting() {
  const form = document.querySelector('[data-daily-goal-form]');
  const input = form.querySelector('[data-daily-word-goal]');
  const message = form.querySelector('[data-daily-goal-message]');

  try {
    input.value = await getDailyWordGoal();
  } catch (error) {
    console.error('Không thể tải mục tiêu học tập:', error);
    message.textContent = `Không thể tải mục tiêu: ${error.message}`;
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    message.textContent = '';
    try {
      await saveDailyWordGoal(input.value);
      message.textContent = 'Đã lưu mục tiêu học tập.';
    } catch (error) {
      console.error('Không thể lưu mục tiêu học tập:', error);
      message.textContent = `Không thể lưu mục tiêu: ${error.message}`;
    }
  });
}

async function initializeProgressPage() {
  const content = document.querySelector('[data-progress-content]');
  try {
    const [due, stats] = await Promise.all([listDueVocabulary(), getLearningStatistics()]);
    content.innerHTML = `
      <div class="overview-grid"><article class="stat-card"><span class="stat-icon purple">▤</span><div><strong>${stats.vocabularyCount}</strong><span>Từ đã lưu</span></div></article><article class="stat-card"><span class="stat-icon green">✓</span><div><strong>${stats.learnedCount}</strong><span>Từ đã học</span></div></article><article class="stat-card"><span class="stat-icon orange">%</span><div><strong>${stats.correctRate}%</strong><span>Tỷ lệ trả lời đúng</span></div></article></div>
      <div class="overview-grid"><article class="stat-card"><span class="stat-icon purple">↗</span><div><strong>${stats.reviewedCount}</strong><span>Lượt đã ôn</span></div></article><article class="stat-card"><span class="stat-icon orange">◷</span><div><strong>${stats.studyMinutes} phút</strong><span>Thời gian học</span></div></article><article class="stat-card"><span class="stat-icon green">▤</span><div><strong>${stats.sentenceCount}</strong><span>Câu giao tiếp</span></div></article></div>
      <article class="progress-card"><span class="stat-icon orange">◷</span><strong>${due.length}</strong><p>Từ cần ôn hôm nay</p><a class="primary-button" href="#study">Bắt đầu ôn tập</a></article>
      <section class="review-list"><h2>Lịch sử buổi học</h2>${stats.recentSessions.length ? stats.recentSessions.map((session) => `<a class="review-item" href="#study-session/${encodeURIComponent(session.id)}"><div><strong>${escapeHtml(session.mode || 'Buổi học')}</strong><span>${Number(session.totalCards) || 0} thẻ · ${Number(session.durationSeconds) || 0} giây</span></div><small>${new Date(session.completedAt || session.createdAt).toLocaleString('vi-VN')}</small></a>`).join('') : '<p class="empty-state">Chưa có buổi học nào.</p>'}</section>
      <section class="review-list"><h2>Danh sách từ khó</h2>${stats.difficultWords.length ? stats.difficultWords.slice(0, 10).map((record) => `<article class="review-item"><div><strong>${record.word}</strong><span>${record.meaning}</span></div><small>${record.reviewLevel || 'Từ khó'}</small></article>`).join('') : '<p class="empty-state">Chưa có từ khó.</p>'}</section>`;
  } catch (error) {
    console.error('Không thể tải tiến độ ôn tập:', error);
    content.innerHTML = `<p class="empty-state">Không thể tải lịch ôn: ${error.message}</p>`;
  }

}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
}

function formatSessionMode(mode) {
  return ({ flashcard: 'Flashcard', choose: 'Listen and Choose', type: 'Listen and Type', blank: 'Fill in the Blank' }[mode] || mode || 'Buổi học');
}

async function initializeHomePage() {
  const content = document.querySelector('[data-home-content]');
  try {
    const [stats, sets] = await Promise.all([getLearningStatistics(), listWordSets()]);
    const recentSets = sets.slice(-3).reverse();
    const vocabularyIds = new Set(stats.vocabulary.map((record) => record.id));
    const latest = stats.recentSessions[0];
    content.innerHTML = `
      <section class="welcome-card" aria-label="Không gian học tập"><div class="welcome-copy"><div class="welcome-heading"><h1>Xin chào, bạn!</h1></div></div><div class="welcome-art" aria-hidden="true"><img src="image/logo trên sidebar.png" alt=""></div></section>
      <section class="section-block"><div class="section-heading"><div><p class="eyebrow">TỔNG QUAN</p><h2>Hôm nay của bạn</h2></div><span class="status-pill">${stats.dailyWordGoalRemaining ? `Còn ${stats.dailyWordGoalRemaining} từ cần học` : 'Đã hoàn thành mục tiêu'}</span></div><div class="overview-grid"><article class="stat-card"><span class="stat-icon purple" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3v-12Z"/><path d="M5 16.5a3 3 0 0 1 3-3h11M9 8h6M9 11h6"/></svg></span><div><strong>${stats.vocabularyCount}</strong><span>Từ đã lưu</span></div></article><article class="stat-card"><span class="stat-icon orange" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg></span><div><strong>${stats.dailyWordGoalRemaining}</strong><span>Từ cần ôn hôm nay</span></div></article><article class="stat-card"><span class="stat-icon green" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg></span><div><strong>${stats.learnedCount}</strong><span>Từ đã học</span></div></article></div></section>
      <section class="home-columns"><section class="home-panel"><div class="section-heading"><h2>Bộ từ gần đây</h2><a class="text-link" href="#vocabulary">Quản lý →</a></div>${recentSets.length ? recentSets.map((set) => `<a class="home-list-item" href="#vocabulary-set/${encodeURIComponent(set.id)}"><strong>${escapeHtml(set.name)}</strong><span>${countSavedVocabularyInSet(set, vocabularyIds)} từ</span></a>`).join('') : '<p class="empty-state">Chưa có bộ từ nào.</p>'}</section><section class="home-panel"><div class="section-heading"><h2>Buổi học gần nhất</h2><a class="text-link" href="#progress">Chi tiết →</a></div>${latest ? `<a class="home-list-item" href="#study-session/${encodeURIComponent(latest.id)}"><strong>${escapeHtml(formatSessionMode(latest.mode))}</strong><span>${Number(latest.totalCards) || 0} thẻ · ${Number(latest.durationSeconds) || 0} giây</span></a>` : '<p class="empty-state">Chưa có buổi học nào.</p>'}</section></section>
      <section class="section-block"><div class="section-heading"><div><p class="eyebrow">THỐNG KÊ</p><h2>Tiến độ học tập</h2></div><a class="text-link" href="#progress">Xem đầy đủ →</a></div><div class="overview-grid"><article class="stat-card"><span class="stat-icon purple">↗</span><div><strong>${stats.reviewedCount}</strong><span>Lượt đã ôn</span></div></article><article class="stat-card"><span class="stat-icon orange">%</span><div><strong>${stats.correctRate}%</strong><span>Tỷ lệ trả lời đúng</span></div></article><article class="stat-card"><span class="stat-icon green">◷</span><div><strong>${stats.studyMinutes} phút</strong><span>Thời gian học</span></div></article></div></section>
      <section class="app-status" aria-label="Trạng thái ứng dụng"><span class="status-dot"></span><span>Ứng dụng đang hoạt động bình thường</span></section>`;
  } catch (error) {
    console.error('Không thể tải trang chủ:', error);
    content.innerHTML = `<p class="empty-state">Không thể tải dữ liệu trang chủ: ${error.message}</p>`;
  }
}

router.start();

openDatabase()
  .then(async () => {
    document.documentElement.dataset.databaseStatus = 'ready';
    const storage = await protectDatabaseStorage();
    document.documentElement.dataset.databasePersistence = storage.persisted ? 'protected' : 'browser-managed';
    if (!storage.persisted) {
      console.info('IndexedDB is available, but browser-managed storage protection is active.');
    }
  })
  .catch((error) => {
    document.documentElement.dataset.databaseStatus = 'error';
    console.error('Không thể khởi tạo cơ sở dữ liệu IndexedDB:', error);
  });

if ('serviceWorker' in navigator && (window.isSecureContext || window.location.hostname === 'localhost')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(() => {
        document.documentElement.dataset.serviceWorkerStatus = 'ready';
      })
      .catch((error) => {
        document.documentElement.dataset.serviceWorkerStatus = 'error';
        console.error('Không thể đăng ký Service Worker:', error);
      });
  });
}