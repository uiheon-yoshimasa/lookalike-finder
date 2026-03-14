/* ========================================
   i18n Translations
======================================== */
const TRANSLATIONS = {
  ko: {
    appTitle:       '닮은 사람 찾기',
    loading:        'AI 모델 로딩 중...',
    tabFind:        '유사 인물 찾기',
    tabDatabase:    '데이터베이스 관리',
    uploadTitle:    '사진 업로드',
    uploadSubtitle: '얼굴이 잘 보이는 정면 사진을 업로드하세요',
    uploadDrop:     '클릭하거나 사진을 드래그하세요',
    uploadHint:     'JPG · PNG · WEBP',
    clearBtn:       '지우기',
    searchBtn:      '🔍 닮은 사람 찾기',
    resultsTitle:   '검색 결과',
    dbAddTitle:     '인물 추가',
    dbAddSubtitle:  '비교할 인물 사진을 데이터베이스에 추가하세요',
    labelName:      '이름',
    namePlaceholder:'이름을 입력하세요',
    addBtn:         '➕ 데이터베이스에 추가',
    dbListTitle:    '등록된 인물',
    dbEmpty:        '등록된 인물이 없습니다',
    dbEmptyHint:    '위에서 인물을 추가하면 닮은 사람 검색을 사용할 수 있습니다',
    clearDbBtn:     '🗑️ 전체 삭제',

    // Status messages
    statusDetecting:   '얼굴 감지 중...',
    statusComparing:   '유사도 비교 중...',
    statusDone:        '검색 완료!',
    statusNoFace:      '❌ 얼굴을 감지하지 못했습니다. 정면 얼굴 사진을 사용해주세요.',
    statusNoDb:        '⚠️ 데이터베이스가 비어있습니다. 먼저 인물을 추가하세요.',
    statusAdding:      '얼굴 분석 중...',

    // Toasts
    toastAdded:        '인물이 추가되었습니다!',
    toastNoName:       '이름을 입력해주세요.',
    toastNoImage:      '사진을 선택해주세요.',
    toastNoFaceDb:     '얼굴을 감지하지 못했습니다.',
    toastDeleted:      '삭제되었습니다.',
    toastDbCleared:    '전체 삭제되었습니다.',
    toastClearConfirm: '정말 전체 삭제하시겠습니까?',

    // Result labels
    similarity:    '유사도',
    noResult:      '유사한 인물을 찾을 수 없습니다.',
    noResultHint:  '데이터베이스에 인물을 더 추가해보세요.',
    rankLabel:     '위',
  },
  ja: {
    appTitle:       '似た人を探す',
    loading:        'AIモデルを読み込み中...',
    tabFind:        '似た人を探す',
    tabDatabase:    'データベース管理',
    uploadTitle:    '写真のアップロード',
    uploadSubtitle: '顔がよく見える正面の写真をアップロードしてください',
    uploadDrop:     'クリックまたは写真をドラッグしてください',
    uploadHint:     'JPG · PNG · WEBP',
    clearBtn:       'クリア',
    searchBtn:      '🔍 似た人を探す',
    resultsTitle:   '検索結果',
    dbAddTitle:     '人物を追加',
    dbAddSubtitle:  '比較する人物の写真をデータベースに追加してください',
    labelName:      '名前',
    namePlaceholder:'名前を入力してください',
    addBtn:         '➕ データベースに追加',
    dbListTitle:    '登録済みの人物',
    dbEmpty:        '登録されている人物がいません',
    dbEmptyHint:    '人物を追加すると似た人の検索ができます',
    clearDbBtn:     '🗑️ 全て削除',

    statusDetecting:   '顔を検出中...',
    statusComparing:   '類似度を比較中...',
    statusDone:        '検索完了！',
    statusNoFace:      '❌ 顔を検出できませんでした。正面の顔写真を使用してください。',
    statusNoDb:        '⚠️ データベースが空です。先に人物を追加してください。',
    statusAdding:      '顔を分析中...',

    toastAdded:        '人物が追加されました！',
    toastNoName:       '名前を入力してください。',
    toastNoImage:      '写真を選択してください。',
    toastNoFaceDb:     '顔を検出できませんでした。',
    toastDeleted:      '削除されました。',
    toastDbCleared:    '全て削除されました。',
    toastClearConfirm: '本当に全て削除しますか？',

    similarity:    '類似度',
    noResult:      '似た人物が見つかりませんでした。',
    noResultHint:  'データベースに人物を追加してみてください。',
    rankLabel:     '位',
  }
};

/* ========================================
   App State
======================================== */
let currentLang = 'ko';
let modelsLoaded = false;
let uploadedImageData = null;   // base64 for find tab
let dbImageData = null;         // base64 for db tab
let faceDatabase = [];          // [{ id, name, imageData, descriptor }]

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

/* ========================================
   i18n
======================================== */
function t(key) {
  return TRANSLATIONS[currentLang][key] || key;
}

function applyTranslations() {
  document.documentElement.lang = currentLang;
  document.title = t('appTitle');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
}

function setLang(lang) {
  currentLang = lang;
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });
  applyTranslations();
  // Re-render results/db if visible
  renderDatabase();
}

/* ========================================
   Toast
======================================== */
let toastTimer = null;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 2800);
}

/* ========================================
   Load Models
======================================== */
async function loadModels() {
  const overlay = document.getElementById('loadingOverlay');
  const loadingText = document.getElementById('loadingText');

  try {
    loadingText.textContent = t('loading');

    await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

    modelsLoaded = true;
    overlay.classList.add('hidden');
    setTimeout(() => { overlay.style.display = 'none'; }, 400);
  } catch (err) {
    loadingText.textContent = '❌ 모델 로드 실패: ' + err.message;
    console.error('Model load error:', err);
  }
}

/* ========================================
   Face Detection
======================================== */
async function detectFaceDescriptor(imgElement) {
  const result = await faceapi
    .detectSingleFace(imgElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();
  return result;
}

/* ========================================
   Similarity
======================================== */
function descriptorSimilarity(d1, d2) {
  // Euclidean distance → similarity %
  // face-api typical threshold for same person: ~0.6
  const d1arr = d1 instanceof Float32Array ? d1 : new Float32Array(d1);
  const d2arr = d2 instanceof Float32Array ? d2 : new Float32Array(d2);
  const dist = faceapi.euclideanDistance(d1arr, d2arr);
  // Map distance: 0 → 100%, 1.0 → 0%
  const similarity = Math.max(0, Math.round((1 - dist) * 100));
  return { dist, similarity };
}

/* ========================================
   Database (localStorage)
======================================== */
const DB_KEY = 'face_lookalike_db';

function loadDatabase() {
  try {
    const stored = localStorage.getItem(DB_KEY);
    faceDatabase = stored ? JSON.parse(stored) : [];
  } catch { faceDatabase = []; }
}

function saveDatabase() {
  localStorage.setItem(DB_KEY, JSON.stringify(faceDatabase));
}

function renderDatabase() {
  const grid = document.getElementById('dbGrid');
  const empty = document.getElementById('dbEmpty');
  const clearBtn = document.getElementById('clearDbBtn');
  const countEl = document.getElementById('dbCount');

  countEl.textContent = faceDatabase.length;
  grid.innerHTML = '';

  if (faceDatabase.length === 0) {
    empty.style.display = 'flex';
    clearBtn.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  clearBtn.style.display = 'inline-flex';

  faceDatabase.forEach(person => {
    const card = document.createElement('div');
    card.className = 'db-card';
    card.innerHTML = `
      <img src="${person.imageData}" alt="${person.name}" />
      <span class="db-name">${person.name}</span>
      <button class="db-delete-btn" title="삭제" data-id="${person.id}">✕</button>
    `;
    card.querySelector('.db-delete-btn').addEventListener('click', () => deletePerson(person.id));
    grid.appendChild(card);
  });
}

function deletePerson(id) {
  faceDatabase = faceDatabase.filter(p => p.id !== id);
  saveDatabase();
  renderDatabase();
  showToast(t('toastDeleted'));
}

/* ========================================
   Add Person
======================================== */
async function addPerson() {
  const name = document.getElementById('personName').value.trim();
  if (!name) { showToast(t('toastNoName'), 'error'); return; }
  if (!dbImageData) { showToast(t('toastNoImage'), 'error'); return; }

  const btn = document.getElementById('addPersonBtn');
  btn.disabled = true;
  btn.textContent = t('statusAdding');

  try {
    const img = new Image();
    img.src = dbImageData;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });

    const result = await detectFaceDescriptor(img);
    if (!result) {
      showToast(t('toastNoFaceDb'), 'error');
      return;
    }

    const compressed = await compressImage(dbImageData);
    const person = {
      id: Date.now().toString(),
      name,
      imageData: compressed,
      descriptor: Array.from(result.descriptor),
    };
    faceDatabase.push(person);
    try {
      saveDatabase();
    } catch (storageErr) {
      // localStorage 용량 초과 시 이미지 품질 더 낮춰서 재시도
      const smaller = await compressImage(dbImageData, 200, 0.5);
      person.imageData = smaller;
      try {
        saveDatabase();
      } catch (e2) {
        showToast(currentLang === 'ko' ? '저장 공간이 부족합니다. 일부 인물을 삭제해주세요.' : 'ストレージが不足しています。一部の人物を削除してください。', 'error');
        faceDatabase.pop();
        return;
      }
    }
    renderDatabase();

    // Reset form
    document.getElementById('personName').value = '';
    dbImageData = null;
    document.getElementById('dbPreviewArea').style.display = 'none';
    document.getElementById('dbUploadZone').style.display = 'flex';

    showToast(t('toastAdded'), 'success');
  } catch (err) {
    console.error(err);
    showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = t('addBtn');
  }
}

/* ========================================
   Search (Find Similar)
======================================== */
async function searchSimilar() {
  if (!modelsLoaded) return;
  if (faceDatabase.length === 0) {
    setStatus(t('statusNoDb'), true);
    return;
  }

  const btn = document.getElementById('searchBtn');
  btn.disabled = true;

  const statusBar = document.getElementById('statusBar');
  statusBar.style.display = 'block';

  const resultsSection = document.getElementById('resultsSection');
  resultsSection.style.display = 'none';

  try {
    // 1. Detect face in uploaded image
    setStatus(t('statusDetecting'));
    const img = document.getElementById('previewImg');
    const result = await detectFaceDescriptor(img);

    if (!result) {
      setStatus(t('statusNoFace'), true);
      drawFaceBox(null);
      return;
    }

    // Draw face box
    drawFaceBox(result);

    // 2. Compare with database
    setStatus(t('statusComparing'));

    const scores = faceDatabase.map(person => {
      const { dist, similarity } = descriptorSimilarity(
        result.descriptor,
        person.descriptor
      );
      return { person, dist, similarity };
    });

    // Sort by similarity descending
    scores.sort((a, b) => b.similarity - a.similarity);

    // Show top results (all matches, sorted)
    setStatus(t('statusDone'));
    renderResults(scores);

  } catch (err) {
    console.error(err);
    setStatus('❌ ' + err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = t('searchBtn');
  }
}

function setStatus(msg) {
  document.getElementById('statusText').textContent = msg;
}

function drawFaceBox(result) {
  const img = document.getElementById('previewImg');
  const canvas = document.getElementById('faceCanvas');

  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  if (!result) return;

  const box = result.detection.box;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw box
  ctx.strokeStyle = '#6c63ff';
  ctx.lineWidth = Math.max(2, canvas.width * 0.006);
  ctx.strokeRect(box.x, box.y, box.width, box.height);

  // Corner accents
  const cs = Math.min(box.width, box.height) * 0.18;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(3, canvas.width * 0.009);
  const corners = [
    [box.x, box.y, cs, 0, 0, cs],
    [box.x + box.width, box.y, -cs, 0, 0, cs],
    [box.x, box.y + box.height, cs, 0, 0, -cs],
    [box.x + box.width, box.y + box.height, -cs, 0, 0, -cs],
  ];
  corners.forEach(([sx, sy, ex, ey, ex2, ey2]) => {
    ctx.beginPath();
    ctx.moveTo(sx + ex, sy + ey);
    ctx.lineTo(sx, sy);
    ctx.lineTo(sx + ex2, sy + ey2);
    ctx.stroke();
  });
}

function renderResults(scores) {
  const section = document.getElementById('resultsSection');
  const grid = document.getElementById('resultsGrid');
  grid.innerHTML = '';
  section.style.display = 'block';

  if (scores.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:2rem;">
      <p>${t('noResult')}</p><p style="font-size:0.85rem;">${t('noResultHint')}</p>
    </div>`;
    return;
  }

  scores.forEach((item, idx) => {
    const scoreClass = item.similarity >= 70 ? 'score-high'
                     : item.similarity >= 45 ? 'score-mid'
                     : 'score-low';

    const card = document.createElement('div');
    card.className = 'result-card';
    card.innerHTML = `
      <div class="result-card-inner">
        <span class="result-rank">${idx + 1}${t('rankLabel')}</span>
        <img src="${item.person.imageData}" alt="${item.person.name}" />
      </div>
      <div class="result-info">
        <span class="result-name">${item.person.name}</span>
        <span class="result-score ${scoreClass}">${t('similarity')} ${item.similarity}%</span>
      </div>
    `;
    // Animate in
    card.style.opacity = '0';
    card.style.transform = 'translateY(16px)';
    grid.appendChild(card);
    setTimeout(() => {
      card.style.transition = 'opacity 0.35s, transform 0.35s';
      card.style.opacity = '1';
      card.style.transform = 'none';
    }, idx * 80);
  });
}

/* ========================================
   Image Upload Helpers
======================================== */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 이미지를 최대 400x400으로 리사이즈 & JPEG 압축 (localStorage 용량 절약)
function compressImage(dataURL, maxSize = 400, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > h) { if (w > maxSize) { h = Math.round(h * maxSize / w); w = maxSize; } }
      else        { if (h > maxSize) { w = Math.round(w * maxSize / h); h = maxSize; } }
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = dataURL;
  });
}

function setupUploadZone(zoneId, inputId, onFile) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);

  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files[0]) onFile(input.files[0]);
    input.value = '';
  });
  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) onFile(file);
  });
}

/* ========================================
   Tab Switching
======================================== */
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-content').forEach(sec => {
    sec.classList.toggle('active', sec.id === 'tab-' + tabId);
  });
}

/* ========================================
   Init
======================================== */
window.addEventListener('DOMContentLoaded', async () => {
  loadDatabase();
  renderDatabase();
  applyTranslations();

  // Language buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setLang(btn.dataset.lang));
  });

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // ---- FIND TAB ----
  setupUploadZone('uploadZone', 'fileInput', async file => {
    uploadedImageData = await fileToBase64(file);
    const img = document.getElementById('previewImg');
    img.src = uploadedImageData;

    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('previewArea').style.display = 'flex';
    document.getElementById('searchBtn').disabled = false;

    // Clear canvas
    const canvas = document.getElementById('faceCanvas');
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

    // Hide previous results
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('statusBar').style.display = 'none';
  });

  document.getElementById('clearBtn').addEventListener('click', () => {
    uploadedImageData = null;
    document.getElementById('previewImg').src = '';
    document.getElementById('uploadZone').style.display = 'flex';
    document.getElementById('previewArea').style.display = 'none';
    document.getElementById('searchBtn').disabled = true;
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('statusBar').style.display = 'none';
  });

  document.getElementById('searchBtn').addEventListener('click', searchSimilar);

  // ---- DATABASE TAB ----
  setupUploadZone('dbUploadZone', 'dbFileInput', async file => {
    const raw = await fileToBase64(file);
    dbImageData = await compressImage(raw);
    const img = document.getElementById('dbPreviewImg');
    img.src = dbImageData;
    document.getElementById('dbUploadZone').style.display = 'none';
    document.getElementById('dbPreviewArea').style.display = 'flex';
  });

  document.getElementById('dbClearBtn').addEventListener('click', () => {
    dbImageData = null;
    document.getElementById('dbPreviewImg').src = '';
    document.getElementById('dbUploadZone').style.display = 'flex';
    document.getElementById('dbPreviewArea').style.display = 'none';
  });

  document.getElementById('addPersonBtn').addEventListener('click', addPerson);

  document.getElementById('clearDbBtn').addEventListener('click', () => {
    if (!confirm(t('toastClearConfirm'))) return;
    faceDatabase = [];
    saveDatabase();
    renderDatabase();
    showToast(t('toastDbCleared'));
  });

  // Load AI models
  await loadModels();
});
