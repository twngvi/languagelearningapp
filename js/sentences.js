import {
  STORES,
  addRecord,
  deleteRecord,
  findRecords,
  getAllRecords,
  updateRecord,
} from './db.js';
import { cancelSpeech, populateVoiceSelect, speakText, speakTextAndWait } from './speech.js';
import { VoiceRecorder } from './recorder.js';
import { showAlert, showConfirm } from './notifications.js';
import { translateEnglishWord, translateVietnameseWord } from './vocabulary.js';

export const sentenceFields = ['english', 'vietnamese', 'topic', 'notes'];

export async function listSentences() {
  const records = await getAllRecords(STORES.sentences);
  return records.sort((first, second) => first.english.localeCompare(second.english));
}

export function filterSentences(records, { query = '', topic = '', favorite = false, unpracticed = false, due = false } = {}) {
  const normalizedQuery = String(query).trim().toLocaleLowerCase();
  return records.filter((record) => {
    const searchable = sentenceFields
      .map((field) => String(record[field] || '').toLocaleLowerCase())
      .join(' ');
    return (!normalizedQuery || searchable.includes(normalizedQuery))
      && (!topic || record.topic === topic)
      && (!favorite || record.favorite === true)
      && (!unpracticed || !record.practiceCount)
      && (!due || record.dueForPractice === true);
  });
}

export function createSentenceRecord(input) {
  const english = String(input.english || '').trim();
  const vietnamese = String(input.vietnamese || '').trim();
  if (!english || !vietnamese) {
    throw new TypeError('Câu tiếng Anh và bản dịch là bắt buộc.');
  }

  return {
    english,
    vietnamese,
    topic: String(input.topic || '').trim(),
    notes: String(input.notes || '').trim(),
    favorite: Boolean(input.favorite),
    practiceCount: Number.isFinite(Number(input.practiceCount)) ? Number(input.practiceCount) : 0,
    lastPracticedAt: input.lastPracticedAt || '',
    dueForPractice: Boolean(input.dueForPractice),
  };
}

export function parseBulkSentences(text) {
  return String(text || '').split(/\r?\n/)
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter(({ text }) => text)
    .map(({ line, text }) => {
      const separator = text.match(/\s+-\s+/) || text.match(/\t+/);
      if (!separator) return { line, error: 'Thiếu dấu phân cách “ - ” hoặc tab.' };
      const separatorIndex = separator.index;
      const english = text.slice(0, separatorIndex).trim();
      const vietnamese = text.slice(separatorIndex + separator[0].length).trim();
      if (!english || !vietnamese) return { line, error: 'Câu tiếng Anh và bản dịch không được để trống.' };
      return { line, data: { english, vietnamese } };
    });
}

export const saveSentence = (input) => addRecord(STORES.sentences, createSentenceRecord(input));
export const editSentence = (record) => updateRecord(STORES.sentences, {
  ...record,
  ...createSentenceRecord(record),
});
export const removeSentence = (id) => deleteRecord(STORES.sentences, id);

const speakingProgressKey = 'speaking-progress';

export async function loadSpeakingProgress() {
  const records = await findRecords(STORES.settings, (record) => record.key === speakingProgressKey);
  return records[0]?.value || null;
}

export async function saveSpeakingProgress(progress) {
  const existing = await findRecords(STORES.settings, (record) => record.key === speakingProgressKey);
  const record = {
    id: existing[0]?.id,
    key: speakingProgressKey,
    value: progress,
  };
  return existing.length ? updateRecord(STORES.settings, record) : addRecord(STORES.settings, record);
}

export async function clearSpeakingProgress() {
  const existing = await findRecords(STORES.settings, (record) => record.key === speakingProgressKey);
  if (existing[0]) await deleteRecord(STORES.settings, existing[0].id);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[character]));
}

function sentenceRow(record) {
  return `
    <article class="sentence-row" data-sentence-id="${escapeHtml(record.id)}">
      <div class="sentence-main">
        <button class="favorite-button ${record.favorite ? 'is-favorite' : ''}" data-sentence-action="favorite" type="button" aria-label="${record.favorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'}">${record.favorite ? '★' : '☆'}</button>
        <div><h3>${escapeHtml(record.english)}</h3><p>${escapeHtml(record.vietnamese)}</p>${record.notes ? `<small>${escapeHtml(record.notes)}</small>` : ''}</div>
      </div>
      <div class="sentence-meta"><span class="word-status">${escapeHtml(record.topic || 'Chưa phân loại')}</span>${record.practiceCount ? `<span class="word-status memorized">Đã luyện ${record.practiceCount} lần</span>` : '<span class="word-status">Chưa luyện</span>'}</div>
      <div class="row-actions"><button class="secondary-button speech-image-button" data-sentence-action="speak" type="button" aria-label="Phát âm"><img src="image/logo trên sidebar2.png" alt=""></button><button class="icon-action edit-image-button" data-sentence-action="edit" type="button" aria-label="Sửa câu"><img src="image/Shinam.png" alt=""></button><button class="icon-action delete-image-button" data-sentence-action="delete" type="button" aria-label="Xóa câu"><img src="image/nút xóa.png" alt=""></button></div>
    </article>`;
}

function populateTopicFilter(select, records) {
  const currentValue = select.value;
  select.innerHTML = '<option value="">Tất cả chủ đề</option>';
  [...new Set(records.map((record) => record.topic).filter(Boolean))]
    .sort()
    .forEach((topic) => {
      const option = document.createElement('option');
      option.value = topic;
      option.textContent = topic;
      select.append(option);
    });
  select.value = currentValue;
}

export async function initializeSpeakingPage() {
  const view = document.querySelector('#app-view');
  const list = view.querySelector('[data-sentence-list]');
  const form = view.querySelector('[data-sentence-form]');
  const bulkForm = view.querySelector('[data-sentence-bulk-form]');
  const message = view.querySelector('[data-sentence-message]');
  let records = [];
  let editingId = null;
  let practice = null;
  let recorder;
  let translationDirection = 'en-vi';
  let translationController;
  let translationTimer;
  let lastAutoTranslation = '';
  const auto = {
    enabled: false,
    repeat: 1,
    rest: 1,
    wait: 2,
    advance: false,
    running: false,
    token: 0,
    timer: null,
  };

  const showMessage = (text, type = 'success') => {
    if (message) {
      message.textContent = text;
      message.className = `notice ${type}`;
      return;
    }
    showAlert(text, { type, title: type === 'error' ? 'Không thể thực hiện' : 'Thông báo' });
  };

  const renderList = () => {
    const visibleRecords = filterSentences(records, {
      query: view.querySelector('[data-sentence-search]').value,
      topic: view.querySelector('[data-sentence-filter="topic"]').value,
      favorite: view.querySelector('[data-sentence-filter="favorite"]').checked,
      unpracticed: view.querySelector('[data-sentence-filter="unpracticed"]').checked,
      due: view.querySelector('[data-sentence-filter="due"]').checked,
    });
    view.querySelector('[data-sentence-count]').textContent = visibleRecords.length;
    list.innerHTML = visibleRecords.length
      ? visibleRecords.map(sentenceRow).join('')
      : '<p class="empty-state">Chưa có câu phù hợp. Hãy thêm một câu mới để bắt đầu.</p>';
  };

  const load = async () => {
    records = await listSentences();
    populateTopicFilter(view.querySelector('[data-sentence-filter="topic"]'), records);
    populateTopicFilter(view.querySelector('[data-speaking-topic]'), records);
    renderList();
    const saved = await loadSpeakingProgress();
    view.querySelector('[data-sentence-action="resume"]').hidden = !saved?.sentenceIds?.length;
  };

  const savePractice = async () => {
    if (!practice) return;
    await saveSpeakingProgress({
      sentenceIds: practice.cards.map((card) => card.id),
      currentIndex: practice.index,
      hiddenEnglish: practice.hiddenEnglish,
      topic: practice.topic,
      mode: practice.mode,
      startedAt: practice.startedAt,
    });
  };

  const renderPractice = () => {
    if (!practice) return;
    const card = practice.cards[practice.index];
    if (!card) return;
    const practiceView = view.querySelector('[data-speaking-practice]');
    practiceView.innerHTML = `
      <div class="practice-header"><div><p class="eyebrow">BUỔI LUYỆN NÓI</p><h2>Câu ${practice.index + 1} / ${practice.cards.length}</h2></div><button class="secondary-button" data-sentence-action="exit-speaking" type="button">Thoát buổi luyện</button></div>
      <div class="practice-progress"><span style="width:${((practice.index + 1) / practice.cards.length) * 100}%"></span></div>
      <article class="speaking-card">
        <span class="word-status">${escapeHtml(card.topic || practice.topic || 'Câu giao tiếp')}</span>
        <p class="speaking-english ${practice.hiddenEnglish ? 'is-hidden' : ''}">${practice.hiddenEnglish ? '••••••••••••' : escapeHtml(card.english)}</p>
        <p class="speaking-vietnamese">${escapeHtml(card.vietnamese)}</p>
        ${card.notes ? `<small>${escapeHtml(card.notes)}</small>` : ''}
        <p class="practice-mode-label">${practice.mode === 'shadowing' ? 'Shadowing: nói gần như ngay sau giọng mẫu.' : practice.mode === 'recall' ? 'Recall: nói câu tiếng Anh từ bản dịch, rồi kiểm tra đáp án.' : 'Listen and Repeat: nghe mẫu rồi nói theo.'}</p>
        <div class="speaking-controls"><button class="secondary-button speech-image-button" data-sentence-action="listen" type="button" aria-label="Nghe mẫu"><img src="image/logo trên sidebar2.png" alt=""></button><button class="secondary-button speech-image-button" data-sentence-action="slow-listen" type="button" aria-label="Phát chậm"><img src="image/logo trên sidebar2.png" alt=""></button><button class="secondary-button" data-sentence-action="toggle-english" type="button">${practice.hiddenEnglish ? 'Hiện câu tiếng Anh' : 'Ẩn câu tiếng Anh'}</button>${practice.mode === 'recall' && practice.hiddenEnglish ? '<button class="primary-button" data-sentence-action="reveal-recall" type="button">Hiện câu mẫu</button>' : ''}</div>
        <div class="recording-panel"><div class="recording-status" data-recording-status>${recorder?.state === 'recording' ? 'Đang ghi âm...' : recorder?.blob ? 'Đã có bản ghi tạm' : 'Chưa ghi âm'}</div><div class="speaking-controls"><button class="primary-button" data-sentence-action="record" type="button">${recorder?.state === 'recording' ? 'Dừng ghi' : '● Ghi âm'}</button>${recorder?.url ? `<audio controls src="${recorder.url}" aria-label="Bản ghi của bạn"></audio><button class="secondary-button" data-sentence-action="save-recording" type="button">Lưu bản ghi</button><button class="icon-action delete-image-button" data-sentence-action="discard-recording" type="button" aria-label="Xóa bản ghi"><img src="image/nút xóa.png" alt=""></button>` : ''}</div></div>
      </article>
      <div class="practice-navigation"><button class="secondary-button" data-sentence-action="previous-speaking" type="button" ${practice.index === 0 ? 'disabled' : ''}>← Câu trước</button><button class="secondary-button" data-sentence-action="next-speaking" type="button" ${practice.index === practice.cards.length - 1 ? 'disabled' : ''}>Câu tiếp theo →</button></div>
      <div class="audio-automation">
        <div class="section-heading"><div><h3>Âm thanh tự động</h3><p class="form-help">Tự phát, lặp câu và chờ bạn nói theo.</p></div><button class="secondary-button" data-sentence-action="${auto.running ? 'stop-auto' : 'start-auto'}" type="button">${auto.running ? 'Dừng tự động' : 'Chạy tự động'}</button></div>
        <div class="automation-options"><label><input data-auto-enabled type="checkbox" ${auto.enabled ? 'checked' : ''}> Bật tự phát khi mở câu</label><label>Số lần lặp<select data-auto-repeat><option value="1" ${auto.repeat === 1 ? 'selected' : ''}>1</option><option value="2" ${auto.repeat === 2 ? 'selected' : ''}>2</option><option value="3" ${auto.repeat === 3 ? 'selected' : ''}>3</option></select></label><label>Nghỉ giữa lần (giây)<input data-auto-rest type="number" min="0" max="30" step="0.5" value="${auto.rest}"></label><label>Chờ nói (giây)<input data-auto-wait type="number" min="0" max="60" step="0.5" value="${auto.wait}"></label><label><input data-auto-advance type="checkbox" ${auto.advance ? 'checked' : ''}> Tự chuyển câu</label></div>
      </div>
      <div class="practice-status"><button class="secondary-button" data-sentence-action="mark-repeat" type="button">Cần luyện lại</button><button class="primary-button" data-sentence-action="mark-complete" type="button">Đã hoàn thành</button></div>`;
  };

  const delay = (seconds, token) => new Promise((resolve) => {
    auto.timer = window.setTimeout(() => {
      auto.timer = null;
      resolve(token === auto.token);
    }, Math.max(0, Number(seconds) || 0) * 1000);
  });

  const stopAutomaticAudio = () => {
    auto.token += 1;
    auto.running = false;
    if (auto.timer) window.clearTimeout(auto.timer);
    auto.timer = null;
    cancelSpeech();
  };

  const runAutomaticAudio = async () => {
    if (!practice || auto.running) return;
    auto.running = true;
    let handedOff = false;
    const token = auto.token;
    renderPractice();
    try {
      for (let repeat = 0; repeat < auto.repeat; repeat += 1) {
        if (!practice || token !== auto.token) return;
        await speakTextAndWait(practice.cards[practice.index].english, { lang: 'en-US', rate: practice.mode === 'shadowing' ? 0.9 : 1 });
        if (repeat < auto.repeat - 1 && !(await delay(auto.rest, token))) return;
      }
      if (!(await delay(auto.wait, token))) return;
      while (recorder?.state === 'recording') {
        if (!(await delay(0.25, token))) return;
      }
      if (auto.advance && practice && practice.index < practice.cards.length - 1 && token === auto.token) {
        practice.index += 1;
        practice.hiddenEnglish = false;
        await savePractice();
        renderPractice();
        auto.running = false;
        handedOff = true;
        return runAutomaticAudio();
      }
    } catch (error) {
      if (token === auto.token) showMessage(error.message, 'error');
    } finally {
      if (token === auto.token && !handedOff) {
        auto.running = false;
        renderPractice();
      }
    }
  };

  const beginPractice = async (resume = false) => {
    const saved = resume ? await loadSpeakingProgress() : null;
    const topic = saved?.topic || view.querySelector('[data-speaking-topic]').value;
    const mode = saved?.mode || view.querySelector('[data-speaking-mode]').value;
    const selected = saved?.sentenceIds
      ? saved.sentenceIds.map((id) => records.find((record) => record.id === id)).filter(Boolean)
      : records.filter((record) => !topic || record.topic === topic)
        .slice(0, view.querySelector('[data-speaking-amount]').value === 'all'
          ? undefined
          : Number(view.querySelector('[data-speaking-amount]').value));
    if (!selected.length) throw new Error('Chưa có câu phù hợp để luyện. Hãy thêm câu hoặc đổi chủ đề.');
    practice = {
      cards: selected,
      index: saved?.currentIndex || 0,
      hiddenEnglish: saved ? Boolean(saved.hiddenEnglish) : mode === 'recall',
      topic,
      mode,
      startedAt: saved?.startedAt || new Date().toISOString(),
    };
    stopAutomaticAudio();
    recorder?.discard();
    recorder = new VoiceRecorder({
      onStateChange: () => renderPractice(),
      onError: (error) => showMessage(error.message, 'error'),
    });
    view.querySelector('[data-speaking-library]').hidden = true;
    view.querySelector('[data-speaking-setup]').hidden = true;
    view.querySelector('[data-speaking-practice]').hidden = false;
    renderPractice();
    await savePractice();
    if (auto.enabled) runAutomaticAudio();
  };

  const updatePracticeStatus = async (needsPractice) => {
    const card = practice.cards[practice.index];
    const updated = await editSentence({
      ...card,
      practiceCount: (card.practiceCount || 0) + 1,
      lastPracticedAt: new Date().toISOString(),
      dueForPractice: needsPractice,
    });
    practice.cards[practice.index] = updated;
    if (practice.index === practice.cards.length - 1) {
      await clearSpeakingProgress();
      practice = null;
      view.querySelector('[data-speaking-practice]').hidden = true;
      view.querySelector('[data-speaking-setup]').hidden = false;
      view.querySelector('[data-speaking-library]').hidden = false;
      showMessage('Đã hoàn thành buổi luyện nói.');
      await load();
      return;
    }
    practice.index += 1;
    practice.hiddenEnglish = false;
    await savePractice();
    renderPractice();
  };

  const showForm = (record) => {
    editingId = record?.id || null;
    translationDirection = 'en-vi';
    lastAutoTranslation = '';
    form.hidden = false;
    form.querySelector('[data-english-label]').textContent = 'Câu tiếng Anh *';
    form.querySelector('[data-vietnamese-label]').textContent = 'Bản dịch tiếng Việt *';
    form.querySelector('[data-sentence-form-title]').textContent = editingId ? 'Chỉnh sửa câu' : 'Thêm câu mới';
    [...form.elements].forEach((element) => {
      if (!element.name) return;
      if (element.type === 'checkbox') element.checked = Boolean(record?.[element.name]);
      else element.value = record?.[element.name] || '';
    });
    form.querySelector('[name="english"]').focus();
  };

  const hideForm = () => {
    editingId = null;
    translationDirection = 'en-vi';
    translationController?.abort();
    clearTimeout(translationTimer);
    lastAutoTranslation = '';
    form.hidden = true;
    form.reset();
    form.querySelector('[data-english-label]').textContent = 'Câu tiếng Anh *';
    form.querySelector('[data-vietnamese-label]').textContent = 'Bản dịch tiếng Việt *';
    form.querySelector('[data-sentence-form-title]').textContent = 'Thêm câu mới';
  };

  form.querySelector('[data-sentence-action="swap-language"]').addEventListener('click', () => {
    const englishInput = form.querySelector('[name="english"]');
    const vietnameseInput = form.querySelector('[name="vietnamese"]');
    [englishInput.value, vietnameseInput.value] = [vietnameseInput.value, ''];
    translationDirection = translationDirection === 'en-vi' ? 'vi-en' : 'en-vi';
    lastAutoTranslation = '';
    form.querySelector('[data-english-label]').textContent = translationDirection === 'en-vi'
      ? 'Câu tiếng Anh *' : 'Câu tiếng Việt *';
    form.querySelector('[data-vietnamese-label]').textContent = translationDirection === 'en-vi'
      ? 'Bản dịch tiếng Việt *' : 'Câu tiếng Anh *';
    englishInput.dispatchEvent(new Event('input', { bubbles: true }));
  });
  form.querySelector('[name="english"]').addEventListener('input', () => {
    const englishInput = form.querySelector('[name="english"]');
    const vietnameseInput = form.querySelector('[name="vietnamese"]');
    const result = form.querySelector('[data-sentence-translation-result]');
    const english = englishInput.value.trim();

    clearTimeout(translationTimer);
    translationController?.abort();
    if (!english) {
      if (vietnameseInput.value === lastAutoTranslation) vietnameseInput.value = '';
      lastAutoTranslation = '';
      result.textContent = '';
      result.className = 'lookup-result';
      return;
    }
    if (vietnameseInput.value && vietnameseInput.value !== lastAutoTranslation) return;

    translationTimer = setTimeout(async () => {
      translationController = new AbortController();
      result.className = 'lookup-result is-loading';
      result.textContent = 'Đang gợi ý bản dịch tiếng Việt...';
      try {
        const translation = translationDirection === 'en-vi'
          ? await translateEnglishWord(english, translationController.signal)
          : await translateVietnameseWord(english, translationController.signal);
        if (englishInput.value.trim() !== english) return;
        const canApplyTranslation = !vietnameseInput.value
          || vietnameseInput.value === lastAutoTranslation;
        if (canApplyTranslation) {
          vietnameseInput.value = translation;
          lastAutoTranslation = translation;
        }
        result.className = 'lookup-result is-success';
        result.textContent = canApplyTranslation
          ? `Đã tự động điền bản dịch: ${translation}`
          : `Gợi ý bản dịch tham khảo: ${translation}`;
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('Không thể tự động dịch câu:', error);
        result.className = 'lookup-result is-error';
        result.textContent = `Chưa thể tự động gợi ý bản dịch: ${error.message}`;
      }
    }, 500);
  });
  form.querySelector('[name="vietnamese"]').addEventListener('input', (event) => {
    if (event.target.value !== lastAutoTranslation) lastAutoTranslation = '';
  });

  view.addEventListener('input', (event) => {
    if (event.target.matches('[data-sentence-search]')) renderList();
  });
  view.addEventListener('change', (event) => {
    if (event.target.matches('[data-sentence-filter]')) renderList();
    if (event.target.matches('[data-auto-enabled]')) {
      auto.enabled = event.target.checked;
      if (auto.enabled && practice && !auto.running) runAutomaticAudio();
      if (!auto.enabled && auto.running) {
        stopAutomaticAudio();
        renderPractice();
      }
    }
    if (event.target.matches('[data-auto-repeat], [data-auto-rest], [data-auto-wait], [data-auto-advance]')) {
      auto.repeat = Number(view.querySelector('[data-auto-repeat]').value);
      auto.rest = Number(view.querySelector('[data-auto-rest]').value);
      auto.wait = Number(view.querySelector('[data-auto-wait]').value);
      auto.advance = view.querySelector('[data-auto-advance]').checked;
    }
  });
  view.addEventListener('click', async (event) => {
    const actionElement = event.target.closest('[data-sentence-action]');
    if (!actionElement) return;
    const action = actionElement.dataset.sentenceAction;
    const row = actionElement.closest('[data-sentence-id]');
    const record = row ? records.find((item) => item.id === row.dataset.sentenceId) : null;

    try {
      if (action === 'start-speaking') {
        await beginPractice();
        return;
      }
      if (action === 'resume') {
        await beginPractice(true);
        return;
      }
      if (action === 'exit-speaking') {
        stopAutomaticAudio();
        recorder?.discard();
        await savePractice();
        practice = null;
        view.querySelector('[data-speaking-practice]').hidden = true;
        view.querySelector('[data-speaking-setup]').hidden = false;
        view.querySelector('[data-speaking-library]').hidden = false;
        showMessage('Đã lưu tiến độ. Bạn có thể tiếp tục buổi luyện sau.');
        await load();
        return;
      }
      if (action === 'listen' && practice) {
        stopAutomaticAudio();
        speakText(practice.cards[practice.index].english, { lang: 'en-US', rate: 1 });
      }
      if (action === 'slow-listen' && practice) {
        stopAutomaticAudio();
        speakText(practice.cards[practice.index].english, { lang: 'en-US', rate: 0.65 });
      }
      if (action === 'reveal-recall' && practice?.mode === 'recall') {
        practice.hiddenEnglish = false;
        await savePractice();
        renderPractice();
        speakText(practice.cards[practice.index].english, { lang: 'en-US' });
        return;
      }
      if (action === 'start-auto' && practice) {
        auto.enabled = view.querySelector('[data-auto-enabled]').checked;
        auto.repeat = Number(view.querySelector('[data-auto-repeat]').value);
        auto.rest = Number(view.querySelector('[data-auto-rest]').value);
        auto.wait = Number(view.querySelector('[data-auto-wait]').value);
        auto.advance = view.querySelector('[data-auto-advance]').checked;
        runAutomaticAudio();
        return;
      }
      if (action === 'stop-auto') {
        stopAutomaticAudio();
        renderPractice();
        return;
      }
      if (action === 'record' && practice) {
        if (recorder.state === 'recording') recorder.stop();
        else {
          try {
            await recorder.start();
          } catch (error) {
            showMessage(error.message, 'error');
          }
        }
        return;
      }
      if (action === 'save-recording' && practice && recorder?.blob) {
        await addRecord(STORES.recordings, {
          sentenceId: practice.cards[practice.index].id,
          mimeType: recorder.blob.type,
          blob: recorder.blob,
          recordedAt: new Date().toISOString(),
        });
        showMessage('Đã lưu bản ghi của câu này.');
        return;
      }
      if (action === 'discard-recording' && recorder) {
        recorder.discard();
        renderPractice();
        return;
      }
      if (action === 'toggle-english' && practice) {
        practice.hiddenEnglish = !practice.hiddenEnglish;
        await savePractice();
        renderPractice();
        return;
      }
      if (action === 'previous-speaking' && practice && practice.index > 0) {
        stopAutomaticAudio();
        practice.index -= 1;
        practice.hiddenEnglish = false;
        await savePractice();
        renderPractice();
        return;
      }
      if (action === 'next-speaking' && practice && practice.index < practice.cards.length - 1) {
        stopAutomaticAudio();
        practice.index += 1;
        practice.hiddenEnglish = false;
        await savePractice();
        renderPractice();
        return;
      }
      if (action === 'mark-repeat' && practice) {
        stopAutomaticAudio();
        await updatePracticeStatus(true);
        return;
      }
      if (action === 'mark-complete' && practice) {
        stopAutomaticAudio();
        await updatePracticeStatus(false);
        return;
      }
      if (action === 'new') showForm();
      if (action === 'cancel') hideForm();
      if (action === 'bulk') bulkForm.hidden = false;
      if (action === 'cancel-bulk') {
        bulkForm.reset();
        bulkForm.hidden = true;
      }
      if (action === 'speak' && record) speakText(record.english, { lang: 'en-US' });
      if (action === 'favorite' && record) {
        await editSentence({ ...record, favorite: !record.favorite });
        await load();
      }
      if (action === 'edit' && record) showForm(record);
      if (action === 'delete' && record && await showConfirm(`Xóa câu "${record.english}"? Câu này sẽ bị xóa khỏi danh sách luyện nói.`, {
        title: 'Xóa câu giao tiếp?',
        confirmLabel: 'Xóa câu',
      })) {
        await removeSentence(record.id);
        await load();
        showMessage('Đã xóa câu.');
      }
    } catch (error) {
      console.error('Không thể cập nhật kho câu:', error);
      showMessage(error.message, 'error');
    }
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(form));
      data.favorite = form.elements.favorite.checked;
      if (translationDirection === 'vi-en') {
        [data.english, data.vietnamese] = [data.vietnamese, data.english];
      }
      const wasEditing = Boolean(editingId);
      if (wasEditing) await editSentence({ ...records.find((item) => item.id === editingId), ...data, id: editingId });
      else await saveSentence(data);
      hideForm();
      await load();
      showMessage(wasEditing ? 'Đã cập nhật câu.' : 'Đã thêm câu.');
    } catch (error) {
      console.error('Không thể lưu câu:', error);
      showMessage(error.message, 'error');
    }
  });

  bulkForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const preview = parseBulkSentences(new FormData(bulkForm).get('bulkText'));
    const valid = preview.filter((item) => item.data);
    const invalid = preview.filter((item) => item.error);
    const duplicates = valid.filter((item) => records.some((record) => (
      record.english.toLocaleLowerCase() === item.data.english.toLocaleLowerCase()
    )));

    if (!valid.length) {
      showMessage('Chưa có câu hợp lệ để nhập. Hãy kiểm tra lại nội dung.', 'error');
      return;
    }
    if (invalid.length) {
      showMessage(`Dòng không hợp lệ: ${invalid.map((item) => item.line).join(', ')}. Hãy dùng dạng “câu tiếng Anh - bản dịch”.`, 'error');
      return;
    }

    const previewText = valid.map((item) => `${item.data.english} - ${item.data.vietnamese}`).join('\n');
    const duplicateMessage = duplicates.length
      ? `\n\nCó ${duplicates.length} câu có thể đã tồn tại.`
      : '';
    if (!await showConfirm(`Xem trước ${valid.length} câu:\n\n${previewText}${duplicateMessage}\n\nLưu các câu này vào kho luyện nói?`, {
      title: 'Xác nhận nhập câu',
      confirmLabel: 'Lưu câu',
    })) return;

    for (const item of valid) await saveSentence(item.data);
    bulkForm.reset();
    bulkForm.hidden = true;
    await load();
    showMessage(`Đã thêm ${valid.length} câu vào kho luyện nói.`);
  });

  populateVoiceSelect(form.elements.voice);
  document.addEventListener('app:stop-activities', () => {
    stopAutomaticAudio();
    recorder?.discard();
    if (practice) savePractice().catch((error) => console.error('Không thể lưu tiến độ luyện nói:', error));
  });
  view.addEventListener('click', (event) => {
    const actionElement = event.target.closest('[data-sentence-action="speak-form"]');
    if (!actionElement) return;
    const text = (translationDirection === 'en-vi'
      ? form.elements.english.value
      : form.elements.vietnamese.value).trim();
    if (text) speakText(text, { lang: 'en-US', voiceName: form.elements.voice.value, rate: form.elements.rate.value });
  });
  await load();
}
