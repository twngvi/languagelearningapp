import { Router } from './router.js';
import { openDatabase } from './db.js';
import { renderHome } from '../pages/home.js';
import { renderVocabulary } from '../pages/vocabulary-page.js';
import { renderStudy } from '../pages/study-page.js';
import { renderSpeaking } from '../pages/speaking-page.js';
import { renderProgress } from '../pages/progress-page.js';
import { renderSettings } from '../pages/settings-page.js';
import { initializeVocabularyPage } from './vocabulary.js';
import { initializeStudyPage } from './study.js';
import { initializeSpeakingPage } from './sentences.js';
import { listDueVocabulary } from './review.js';
import { getLearningStatistics } from './statistics.js';
import { listWordSets } from './word-sets.js';
import { initializeBackupPage } from './backup-page.js';

const routes = {
  home: { render: renderHome },
  vocabulary: { render: renderVocabulary },
  study: { render: renderStudy },
  speaking: { render: renderSpeaking },
  progress: { render: renderProgress },
  settings: { render: renderSettings },
};

function stopActiveActivities() {
  window.speechSynthesis?.cancel();
  document.dispatchEvent(new CustomEvent('app:stop-activities'));
}

const router = new Router({
  routes,
  view: document.querySelector('#app-view'),
  onLeave: stopActiveActivities,
  onEnter: (route) => {
    if (route === 'vocabulary') {
      initializeVocabularyPage();
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
      initializeBackupPage();
    }
  },
});

async function initializeProgressPage() {
  const content = document.querySelector('[data-progress-content]');
  try {
    const [due, stats] = await Promise.all([listDueVocabulary(), getLearningStatistics()]);
    content.innerHTML = `
      <div class="overview-grid"><article class="stat-card"><span class="stat-icon purple">▤</span><div><strong>${stats.vocabularyCount}</strong><span>Từ đã lưu</span></div></article><article class="stat-card"><span class="stat-icon green">✓</span><div><strong>${stats.learnedCount}</strong><span>Từ đã học</span></div></article><article class="stat-card"><span class="stat-icon orange">%</span><div><strong>${stats.correctRate}%</strong><span>Tỷ lệ trả lời đúng</span></div></article></div>
      <div class="overview-grid"><article class="stat-card"><span class="stat-icon purple">↗</span><div><strong>${stats.reviewedCount}</strong><span>Lượt đã ôn</span></div></article><article class="stat-card"><span class="stat-icon orange">◷</span><div><strong>${stats.studyMinutes} phút</strong><span>Thời gian học</span></div></article><article class="stat-card"><span class="stat-icon green">▤</span><div><strong>${stats.sentenceCount}</strong><span>Câu giao tiếp</span></div></article></div>
      <article class="progress-card"><span class="stat-icon orange">◷</span><strong>${due.length}</strong><p>Từ cần ôn hôm nay</p><a class="primary-button" href="#study">Bắt đầu ôn tập</a></article>
      <section class="review-list"><h2>Lịch sử buổi học</h2>${stats.recentSessions.length ? stats.recentSessions.map((session) => `<article class="review-item"><div><strong>${session.mode || 'Buổi học'}</strong><span>${session.totalCards || 0} thẻ · ${session.durationSeconds || 0} giây</span></div><small>${new Date(session.completedAt || session.createdAt).toLocaleString('vi-VN')}</small></article>`).join('') : '<p class="empty-state">Chưa có buổi học nào.</p>'}</section>
      <section class="review-list"><h2>Danh sách từ khó</h2>${stats.difficultWords.length ? stats.difficultWords.slice(0, 10).map((record) => `<article class="review-item"><div><strong>${record.word}</strong><span>${record.meaning}</span></div><small>${record.reviewLevel || 'Từ khó'}</small></article>`).join('') : '<p class="empty-state">Chưa có từ khó.</p>'}</section>`;
  } catch (error) {
    console.error('Không thể tải tiến độ ôn tập:', error);
    content.innerHTML = `<p class="empty-state">Không thể tải lịch ôn: ${error.message}</p>`;
  }

}

function formatSessionMode(mode) {
  return ({ flashcard: 'Flashcard', choose: 'Listen and Choose', type: 'Listen and Type', blank: 'Fill in the Blank' }[mode] || mode || 'Buổi học');
}

async function initializeHomePage() {
  const content = document.querySelector('[data-home-content]');
  try {
    const [stats, sets] = await Promise.all([getLearningStatistics(), listWordSets()]);
    const recentSets = sets.slice(-3).reverse();
    const latest = stats.recentSessions[0];
    content.innerHTML = `
      <section class="welcome-card" aria-labelledby="welcome-title"><div><p class="eyebrow">BẮT ĐẦU NGAY</p><h2 id="welcome-title">Xây dựng thói quen học mỗi ngày</h2><p>Ghi nhớ từ mới, luyện câu và theo dõi tiến bộ của bạn ở một nơi.</p><a class="primary-button" href="#study">Bắt đầu học <span aria-hidden="true">→</span></a></div><div class="welcome-art" aria-hidden="true">Aa</div></section>
      <section class="section-block"><div class="section-heading"><div><p class="eyebrow">TỔNG QUAN</p><h2>Hôm nay của bạn</h2></div><span class="status-pill">${stats.dueCount ? `${stats.dueCount} từ cần ôn` : 'Đã sẵn sàng'}</span></div><div class="overview-grid"><article class="stat-card"><span class="stat-icon purple">▤</span><div><strong>${stats.vocabularyCount}</strong><span>Từ đã lưu</span></div></article><article class="stat-card"><span class="stat-icon orange">◷</span><div><strong>${stats.dueCount}</strong><span>Từ cần ôn hôm nay</span></div></article><article class="stat-card"><span class="stat-icon green">✓</span><div><strong>${stats.learnedCount}</strong><span>Từ đã học</span></div></article></div></section>
      <section class="home-actions"><a class="primary-button" href="#vocabulary">+ Thêm từ mới</a><a class="secondary-button" href="#study">Bắt đầu học</a><a class="secondary-button" href="#speaking">Luyện nói</a></section>
      <section class="home-columns"><section class="home-panel"><div class="section-heading"><h2>Bộ từ gần đây</h2><a class="text-link" href="#vocabulary">Quản lý →</a></div>${recentSets.length ? recentSets.map((set) => `<div class="home-list-item"><strong>${set.name}</strong><span>${set.vocabularyIds.length} từ</span></div>`).join('') : '<p class="empty-state">Chưa có bộ từ nào.</p>'}</section><section class="home-panel"><div class="section-heading"><h2>Buổi học gần nhất</h2><a class="text-link" href="#progress">Chi tiết →</a></div>${latest ? `<div class="home-list-item"><strong>${formatSessionMode(latest.mode)}</strong><span>${latest.totalCards || 0} thẻ · ${latest.durationSeconds || 0} giây</span></div>` : '<p class="empty-state">Chưa có buổi học nào.</p>'}</section></section>
      <section class="section-block"><div class="section-heading"><div><p class="eyebrow">THỐNG KÊ</p><h2>Tiến độ học tập</h2></div><a class="text-link" href="#progress">Xem đầy đủ →</a></div><div class="overview-grid"><article class="stat-card"><span class="stat-icon purple">↗</span><div><strong>${stats.reviewedCount}</strong><span>Lượt đã ôn</span></div></article><article class="stat-card"><span class="stat-icon orange">%</span><div><strong>${stats.correctRate}%</strong><span>Tỷ lệ trả lời đúng</span></div></article><article class="stat-card"><span class="stat-icon green">◷</span><div><strong>${stats.studyMinutes} phút</strong><span>Thời gian học</span></div></article></div></section>
      <section class="app-status" aria-label="Trạng thái ứng dụng"><span class="status-dot"></span><span>Ứng dụng đang hoạt động bình thường</span></section>`;
  } catch (error) {
    console.error('Không thể tải trang chủ:', error);
    content.innerHTML = `<p class="empty-state">Không thể tải dữ liệu trang chủ: ${error.message}</p>`;
  }
}

router.start();

openDatabase()
  .then(() => {
    document.documentElement.dataset.databaseStatus = 'ready';
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