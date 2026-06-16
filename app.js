(function() {
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);

  const gradeBtns = $('#gradeBtns'), unitList = $('#unitList');
  const btnStart = $('#btnStart'), btnPlay = $('#btnPlay'), btnPrev = $('#btnPrev'), btnNext = $('#btnNext');
  const wordCard = $('#wordCard'), wordZh = $('#wordZh'), wordPhonetic = $('#wordPhonetic'), wordPos = $('#wordPos'), cardStar = $('#cardStar');
  const unitInfo = $('#unitInfo');
  const wordCountBadge = $('#wordCountBadge'), progressText = $('#progressText'), progressBar = $('#progressBar');
  const wordListPanel = $('#wordListPanel');
  const speedSlider = $('#speedSlider'), speedLabel = $('#speedLabel');
  const speakChineseCb = $('#speakChinese'), spellModeCb = $('#spellMode'), voiceSelect = $('#voiceSelect');
  const shuffleModeCb = $('#shuffleMode'), autoLoopCb = $('#autoLoop');
  const searchInput = $('#searchInput'), btnDictation = $('#btnDictation'), btnFavFilter = $('#btnFavFilter');
  const btnClassroom = $('#btnClassroom'), btnClassroomExit = $('#btnClassroomExit'), audioSourceBadge = $('#audioSourceBadge');
  const dictationPanel = $('#dictationPanel'), dictStatus = $('#dictStatus'), dictGrid = $('#dictGrid'), dictAnswers = $('#dictAnswers');
  const dictReviewActions = $('#dictReviewActions'), btnDictReplay = $('#btnDictReplay'), btnDictStarAll = $('#btnDictStarAll');
  const studentMaxId = $('#studentMaxId'), studentGrid = $('#studentGrid'), btnPickStudents = $('#btnPickStudents');
  const btnDictStart = $('#btnDictStart'), btnDictPause = $('#btnDictPause'), btnDictReveal = $('#btnDictReveal');
  const btnWorksheet = $('#btnWorksheet'), worksheetModalOverlay = $('#worksheetModalOverlay'), worksheetPreview = $('#worksheetPreview');
  const updateBanner = $('#updateBanner'), btnUpdateNow = $('#btnUpdateNow');
  let wsMode = 'cn2en', wsSource = 'current';
  const progMiniText = $('#progMiniText');
  const favCountBadge = $('#favCountBadge');
  const sidebar = $('#sidebar'), overlay = $('#overlay'), hamburger = $('#hamburger'), toastEl = $('#toast');
  const importModalOverlay = $('#importModalOverlay'), importUnitSelect = $('#importUnitSelect'), importTextarea = $('#importTextarea'), importPreview = $('#importPreview');

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[ch]));
  }

  function showEl(el, display = '') {
    if (!el) return;
    el.classList.remove('hidden', 'hidden-menu');
    el.style.display = display;
  }

  function hideEl(el, menu = false) {
    if (!el) return;
    el.classList.add(menu ? 'hidden-menu' : 'hidden');
    el.style.display = 'none';
  }

  // State
  let currentGrade = null, selectedUnits = new Set(), playlist = [], orderedPlaylist = [];
  let currentIndex = -1, isPlaying = false, repeatCount = 1, currentRepeat = 0;
  let speed = 1, darkMode = false, speakChinese = true, spellMode = false;
  let shuffleMode = false, autoLoop = false, contentMode = 'all', dictationMode = false, favFilter = false;
  let favorites = new Set();
  let speechPending = false;
  let speakGeneration = 0;
  let selectedVoiceName = null;
  let todayWords = new Set();

  function init() {
    try {
      const s = JSON.parse(localStorage.getItem('vocab-prefs') || '{}');
      if (s.darkMode) darkMode = s.darkMode;
      if (s.speed) { speed = s.speed; speedSlider.value = speed; }
      if (s.repeat) repeatCount = s.repeat;
      if (s.speakChinese !== undefined) speakChinese = s.speakChinese;
      if (s.spellMode !== undefined) spellMode = s.spellMode;
      if (s.shuffleMode !== undefined) shuffleMode = s.shuffleMode;
      if (s.autoLoop !== undefined) autoLoop = s.autoLoop;
      if (s.dictWordCount !== undefined) dictWordCount = s.dictWordCount;
      if (s.dictSeqMode !== undefined) dictSeqMode = s.dictSeqMode;
      if (s.dictRange) dictRange = s.dictRange;
      if (s.dictSpeakCN !== undefined) dictSpeakCN = s.dictSpeakCN;
      if (s.wsMode) wsMode = s.wsMode;
      if (s.wsSource) wsSource = s.wsSource;
      // contentMode always defaults to 'all' on page load
      if (s.favorites) favorites = new Set(JSON.parse(s.favorites));
      if (s.voiceName) selectedVoiceName = s.voiceName;
    } catch(e) {}
    loadTodayProgress();

    applyTheme(); updateSpeedLabel(); updateRepeatBtns();
    speakChineseCb.checked = speakChinese;
    spellModeCb.checked = spellMode;
    shuffleModeCb.checked = shuffleMode;
    autoLoopCb.checked = autoLoop;
    // Restore content mode button state
    $$('#contentModeBtns button').forEach(b => b.classList.toggle('active', b.dataset.mode === contentMode));
    populateGrades();

    $('#btnSelectAll').addEventListener('click', () => { toggleAllUnits(true); closeSidebar(); });
    $('#btnDeselectAll').addEventListener('click', () => { toggleAllUnits(false); closeSidebar(); });
    btnStart.addEventListener('click', () => { onStartStop(); closeSidebar(); });
    btnPlay.addEventListener('click', onPlayPause);
    btnPrev.addEventListener('click', () => navigate(-1));
    btnNext.addEventListener('click', () => navigate(1));
    speedSlider.addEventListener('input', onSpeedChange);
    speakChineseCb.addEventListener('change', () => { speakChinese = speakChineseCb.checked; savePrefs(); });
    spellModeCb.addEventListener('change', () => { spellMode = spellModeCb.checked; savePrefs(); });
    voiceSelect.addEventListener('change', () => { selectedVoiceName = voiceSelect.value || null; savePrefs(); });
    shuffleModeCb.addEventListener('change', () => { shuffleMode = shuffleModeCb.checked; rebuildPlaylist(); savePrefs(); });
    autoLoopCb.addEventListener('change', () => { autoLoop = autoLoopCb.checked; savePrefs(); });
    // Content mode buttons (mutually exclusive)
    $$('#contentModeBtns button').forEach(b => b.addEventListener('click', () => {
      contentMode = b.dataset.mode;
      $$('#contentModeBtns button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      rebuildPlaylist(); updateUI();
    }));
    $$('.repeat-btns button[data-r]').forEach(b => b.addEventListener('click', onRepeatChange));
    $('#themeBtn').addEventListener('click', toggleTheme);
    $('#themeBtnM').addEventListener('click', toggleTheme);
    hamburger.addEventListener('click', openSidebar);
    overlay.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', onKeyDown);
    btnClassroom.addEventListener('click', enterClassroomMode);
    btnClassroomExit.addEventListener('click', exitClassroomMode);
    btnUpdateNow.addEventListener('click', () => location.reload());
    $('#btnImport').addEventListener('click', openImportModal);
    $('#btnImportCancel').addEventListener('click', closeImportModal);
    $('#btnImportSave').addEventListener('click', saveImport);
    $('#btnImportClear').addEventListener('click', clearImportUnit);
    $('#btnImportExport').addEventListener('click', exportDataFile);
    $('#btnExport').addEventListener('click', exportDataFile);
    importModalOverlay.addEventListener('click', e => { if (e.target === importModalOverlay) closeImportModal(); });
    importTextarea.addEventListener('input', updateImportPreview);
    btnFavFilter.addEventListener('click', toggleFavFilter);
    btnDictation.addEventListener('click', startDictation);
    btnDictStart.addEventListener('click', runDictation);
    btnDictPause.addEventListener('click', toggleDictPause);
    btnDictReveal.addEventListener('click', revealDictation);
    btnDictReplay.addEventListener('click', () => runDictation(dictationWords));
    btnDictStarAll.addEventListener('click', starDictationWords);
    btnPickStudents.addEventListener('click', pickStudents);
    $('#btnDictClose').addEventListener('click', () => { dictationActive = false; dictationPanel.classList.remove('show'); });
    // Worksheet
    btnWorksheet.addEventListener('click', openWorksheet);
    $('#btnWorksheetClose').addEventListener('click', () => worksheetModalOverlay.classList.remove('show'));
    let wsPrintCleanup = null;
    $('#btnWorksheetPrint').addEventListener('click', () => {
      generateWorksheet();
      const hideSel = ['.app','.sidebar','.main .controls','.main .toolbar','.word-list-panel','.dictation-panel','.badge','.toast','.mobile-top','.app-footer','.word-card','.prog-mini','.print-hint'];
      const hiddenEls = [];
      hideSel.forEach(sel => { const el = document.querySelector(sel); if (el) { hiddenEls.push({el, orig: el.style.display}); el.style.display = 'none'; } });
      // Also hide worksheet modal header/controls (title, close, mode, source buttons)
      const wsHeaderEls = document.querySelectorAll('.worksheet-modal > div:first-child, .worksheet-modal .dict-ctl-row, .worksheet-modal .dict-actions');
      wsHeaderEls.forEach(el => { hiddenEls.push({el, orig: el.style.display}); el.style.display = 'none'; });
      const wm = document.querySelector('.worksheet-modal');
      worksheetModalOverlay.style.display = 'block';
      worksheetModalOverlay.style.position = 'static';
      worksheetModalOverlay.style.background = '#fff';
      worksheetModalOverlay.style.zIndex = '9999';
      if (wm) { wm.style.boxShadow = 'none'; wm.style.maxWidth = '100%'; wm.style.maxHeight = 'none'; wm.style.overflow = 'visible'; wm.style.padding = '0'; }
      const wp = document.querySelector('.worksheet-preview');
      if (wp) wp.style.margin = '0';
      // Inject minimal page margin style
      const styleEl = document.createElement('style');
      styleEl.id = 'ws-print-style';
      styleEl.textContent = '@page { size: A4; margin: 8mm 8mm 12mm 8mm; }';
      document.head.appendChild(styleEl);
      document.body.style.background = '#fff';
      wsPrintCleanup = () => {
        hiddenEls.forEach(h => h.el.style.display = h.orig);
        worksheetModalOverlay.style.display = '';
        worksheetModalOverlay.style.position = '';
        worksheetModalOverlay.style.background = '';
        worksheetModalOverlay.style.zIndex = '';
        if (wm) { wm.style.boxShadow = ''; wm.style.maxWidth = ''; wm.style.maxHeight = ''; wm.style.overflow = ''; wm.style.padding = ''; }
        if (wp) wp.style.margin = '';
        const s = document.getElementById('ws-print-style');
        if (s) s.remove();
        document.body.style.background = '';
        wsPrintCleanup = null;
      };
      setTimeout(() => { window.print(); setTimeout(() => { if (wsPrintCleanup) wsPrintCleanup(); }, 300); }, 150);
    });
    window.addEventListener('afterprint', () => { if (wsPrintCleanup) { wsPrintCleanup(); } });
    worksheetModalOverlay.addEventListener('click', e => { if (e.target === worksheetModalOverlay) worksheetModalOverlay.classList.remove('show'); });
    initWorksheetControls();
    initGame();
    // Student pick count buttons (mutually exclusive)
    $$('#studentPickCountBtns button').forEach(b => b.addEventListener('click', () => {
      $$('#studentPickCountBtns button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
    }));
    // Restore saved student picker config
    try {
      const sc = JSON.parse(localStorage.getItem('vocab-student-cfg') || '{}');
      if (sc.maxId) studentMaxId.value = sc.maxId;
      if (sc.count) {
        $$('#studentPickCountBtns button').forEach(b => {
          b.classList.toggle('active', parseInt(b.dataset.pick) === sc.count);
        });
      }
    } catch(e) {}
    initDictControls();
    // Print/Export dropdown menu
    const printMenu = $('#printExportMenu');
    $('#btnPrintExport').addEventListener('click', (e) => {
      e.stopPropagation();
      const hidden = getComputedStyle(printMenu).display === 'none';
      hidden ? showEl(printMenu, 'block') : hideEl(printMenu, true);
    });
    document.addEventListener('click', () => { hideEl(printMenu, true); });
    printMenu.addEventListener('click', (e) => {
      e.stopPropagation(); const act = e.target.closest('button')?.dataset.action;
      if (!act) return; hideEl(printMenu, true);
      if (act === 'print-current') { window.print(); }
      else if (act === 'print-star') { const wf = favFilter; if (!wf) { favFilter = true; renderWordList(); } setTimeout(() => { window.print(); if (!wf) { favFilter = false; setTimeout(renderWordList, 300); } }, 200); }
      else if (act === 'export') { exportDataFile(); }
    });
    searchInput.addEventListener('input', () => { renderWordList(); });
    searchInput.addEventListener('focus', () => { if (playlist.length > 0) renderWordList(); });
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { searchInput.value = ''; renderWordList(); searchInput.blur(); } });
    cardStar.addEventListener('click', () => toggleFavorite(currentIndex));
    wordZh.addEventListener('click', () => { if (dictationMode && currentIndex >= 0) revealCurrentWord(); });

    if (window.innerWidth <= 900) { hamburger.style.display = 'flex'; }
    window.addEventListener('resize', () => { hamburger.style.display = window.innerWidth <= 900 ? 'flex' : 'none'; });
    speechSynthesis.getVoices();
    speechSynthesis.onvoiceschanged = () => { speechSynthesis.getVoices(); loadVoices(); };
    loadVoices();
    updateFavBadge();
  }

  function applyTheme() {
    document.body.classList.toggle('dark', darkMode);
    const icon = darkMode ? '浅' : '深';
    ['themeBtn','themeBtnM'].forEach(id => { const e = $('#'+id); if(e) e.textContent = icon; });
  }
  function toggleTheme() { darkMode = !darkMode; applyTheme(); savePrefs(); }

  function enterClassroomMode() {
    document.body.classList.add('classroom-mode');
    showEl(btnClassroomExit);
    closeSidebar();
  }

  function exitClassroomMode() {
    document.body.classList.remove('classroom-mode');
    hideEl(btnClassroomExit);
  }

  function populateGrades() {
    gradeBtns.innerHTML = '';
    Object.keys(VOCAB_DATA).forEach(g => {
      const btn = document.createElement('button');
      btn.textContent = g.replace('上','上').replace('下','下');
      btn.dataset.grade = g;
      btn.addEventListener('click', () => {
        currentGrade = g;
        selectedUnits.clear(); playlist = []; orderedPlaylist = [];
        stopReading(); renderUnits(); updateUI();
        updateGradeBtns();
      });
      gradeBtns.appendChild(btn);
    });
  }
  function updateGradeBtns() {
    $$('#gradeBtns button').forEach(b => b.classList.toggle('active', b.dataset.grade === currentGrade));
  }

  function renderUnits() {
    unitList.innerHTML = '';
    if (!currentGrade) return;
    const gd = getMergedGradeData();
    Object.keys(gd).forEach(un => {
      const wc = gd[un].words ? gd[un].words.length : 0;
      const title = gd[un].title || un;
      const row = document.createElement('div');
      row.className = 'unit-row'; row.dataset.unit = un;
      row.innerHTML = `<span class="unit-check">${selectedUnits.has(un) ? '✓' : ''}</span><span class="unit-title">${escapeHTML(title)}</span><span class="unit-word-count">${wc}词</span>`;
      row.addEventListener('click', () => {
        if (selectedUnits.has(un)) { selectedUnits.delete(un); row.classList.remove('selected'); row.querySelector('.unit-check').textContent = ''; }
        else { selectedUnits.add(un); row.classList.add('selected'); row.querySelector('.unit-check').textContent = '✓'; }
        rebuildPlaylist(); updateUI();
      });
      if (selectedUnits.has(un)) row.classList.add('selected');
      unitList.appendChild(row);
    });
  }

  function toggleAllUnits(sel) {
    if (!currentGrade) return;
    $$('.unit-row').forEach(r => {
      const u = r.dataset.unit;
      if (sel) { selectedUnits.add(u); r.classList.add('selected'); r.querySelector('.unit-check').textContent = '✓'; }
      else { selectedUnits.delete(u); r.classList.remove('selected'); r.querySelector('.unit-check').textContent = ''; }
    });
    rebuildPlaylist(); updateUI();
  }

  // ===== Data merge =====
  function getImportedData() { try { return JSON.parse(localStorage.getItem('vocab-imports')||'{}'); } catch(e) { return {}; } }
  function setImportedData(d) { localStorage.setItem('vocab-imports', JSON.stringify(d)); }

  function favoriteKey(word) {
    return [word.grade || currentGrade || '', word.unit || '', String(word.en || '').toLowerCase()].join('::');
  }

  function legacyFavoriteKey(word) {
    return String(word.en || '').toLowerCase();
  }

  function isFavorite(word) {
    return favorites.has(favoriteKey(word)) || favorites.has(legacyFavoriteKey(word));
  }

  function getMergedGradeData() {
    const base = VOCAB_DATA[currentGrade] || {};
    const imp = getImportedData();
    const gi = imp[currentGrade] || {};
    const merged = {};
    Object.keys(base).forEach(u => { merged[u] = { title: base[u].title, words: [...(base[u].words||[])] }; });
    Object.keys(gi).forEach(u => {
      if (merged[u]) {
        const ens = new Set(merged[u].words.map(w => w.en.toLowerCase()));
        gi[u].words.forEach(w => { if (!ens.has(w.en.toLowerCase())) merged[u].words.push(w); });
      } else { merged[u] = { title: gi[u].title || u, words: [...gi[u].words] }; }
    });
    return merged;
  }

  function rebuildPlaylist() {
    orderedPlaylist = [];
    if (!currentGrade) return;
    const gd = getMergedGradeData();
    const orderedUnits = Object.keys(gd).filter(u => selectedUnits.has(u));
    let totalWords = 0, phraseWords = 0;
    orderedUnits.forEach(un => {
      const ud = gd[un];
      if (ud.words && ud.words.length > 0) {
        ud.words.forEach(w => {
          totalWords++;
          const isPhrase = (typeof w.en === 'string') && /\s/.test(w.en);
          if (isPhrase) phraseWords++;
          // contentMode filter:
          if (contentMode === 'phrases' && (!isPhrase || w.isProper || isProperPhrase(w.en))) return;
          if (contentMode === 'words' && w.isProper) return;
          orderedPlaylist.push({ en: w.en, zh: w.zh, unit: un, grade: currentGrade, phonetic: w.phonetic, isProper: w.isProper, pos: w.pos });
        });
      }
    });
    applyPlaylist();
    if (orderedUnits.length > 0 && playlist.length === 0) {
      if (contentMode === 'phrases') showToast(`当前${orderedUnits.length}个单元共${totalWords}词，其中${phraseWords}个短语，无符合结果`);
      else if (contentMode === 'words') showToast('所选单元中没有符合的单词');
    }
  }

  function isProperPhrase(en) {
    if (typeof en !== 'string') return false;
    const words = en.split(/\s+/);
    return words.length >= 2 && words.every(w => /^[A-Z]/.test(w));
  }

  function applyPlaylist() {
    if (shuffleMode) {
      playlist = [...orderedPlaylist];
      // Fisher-Yates shuffle
      for (let i = playlist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playlist[i], playlist[j]] = [playlist[j], playlist[i]];
      }
    } else {
      playlist = [...orderedPlaylist];
    }
    currentIndex = -1;
  }

  // ===== Syllable display =====
  function splitSyllablesArray(word) {
    if (word.length < 5 || word.includes(' ') || word.includes('-')) return null;
    if (typeof SYLLABLE_DICT !== 'undefined' && SYLLABLE_DICT[word]) {
      return SYLLABLE_DICT[word].split('\u00b7');
    }
    return null;
  }
  function renderSyllablesHTML(word) {
    const parts = splitSyllablesArray(word);
    if (!parts) return escapeHTML(word);
    return parts.map(escapeHTML).join('<span class="sy-dot">\u00b7</span>');
  }

  // ===== Speech =====
  function getEnglishVoice() {
    const voices = speechSynthesis.getVoices();
    if (selectedVoiceName) {
      const v = voices.find(v => v.name === selectedVoiceName);
      if (v) return v;
    }
    // Prefer natural-sounding voices
    let v = voices.find(v => v.lang === 'en-US' && v.name.includes('Google'));
    if (!v) v = voices.find(v => v.lang === 'en-US' && v.name.includes('Natural'));
    if (!v) v = voices.find(v => v.lang === 'en-US' && v.name.includes('Premium'));
    if (!v) v = voices.find(v => v.lang === 'en-US' && v.name.includes('Enhanced'));
    if (!v) v = voices.find(v => v.lang === 'en-US' && v.name.includes('Karen'));
    if (!v) v = voices.find(v => v.lang === 'en-US' && v.name.includes('Samantha'));
    if (!v) v = voices.find(v => v.lang === 'en-US' && !v.name.includes('Zira'));
    if (!v) v = voices.find(v => v.lang === 'en-US');
    if (!v) v = voices.find(v => v.lang.startsWith('en-'));
    return v || voices[0];
  }

  function loadVoices() {
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) return;
    const enVoices = voices.filter(v => v.lang.startsWith('en-'));
    voiceSelect.innerHTML = '<option value="">默认（自动选择最佳）</option>';
    enVoices.forEach(v => {
      const o = document.createElement('option');
      o.value = v.name;
      o.textContent = v.name + ' (' + v.lang + ')';
      if (v.name === selectedVoiceName) o.selected = true;
      voiceSelect.appendChild(o);
    });
  }

  function getChineseVoice() {
    const voices = speechSynthesis.getVoices();
    return voices.find(v => v.lang === 'zh-CN' && v.name.includes('Google'))
      || voices.find(v => v.lang === 'zh-CN')
      || voices.find(v => v.lang.startsWith('zh-'))
      || voices[0];
  }

  function setAudioSource(label) {
    if (!audioSourceBadge) return;
    audioSourceBadge.textContent = '语音来源：' + label;
    showEl(audioSourceBadge);
  }
  // ===== Audio helpers =====
  const AUDIO_BASE = 'audio/';
  let audioCacheOk = new Set();

  function audioFileName(en) {
    return en.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '_').replace(/-/g, '_');
  }

  function englishSpeechText(text) {
    return text
      .replace(/\.\.\./g, ' ')
      .replace(/\bsb\/sth\b/gi, 'somebody or something')
      .replace(/\bsb's\b/gi, "somebody's")
      .replace(/\bsb\b/gi, 'somebody')
      .replace(/\bsth\b/gi, 'something')
      .replace(/\//g, ' or ')
      .replace(/[()!,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tryPlayAudio(en) {
    return new Promise((resolve, reject) => {
      const baseName = audioFileName(en);
      let tryExt = '.mp3';
      const a = new Audio();
      a.volume = 1; a.playbackRate = speed;
      let resolved = false;
      const finish = (ok) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(t);
        a.pause(); a.removeAttribute('src'); a.load();
        if (ok) { audioCacheOk.add(en.toLowerCase()); setAudioSource('本地音频'); resolve(); }
        else reject();
      };
      let t = setTimeout(() => finish(false), 12000);
      a.onended = () => finish(true);
      a.onerror = () => {
        if (tryExt === '.mp3') { tryExt = '.wav'; a.src = AUDIO_BASE + baseName + tryExt; return; }
        finish(false);
      };
      a.oncanplaythrough = () => { a.play().catch(() => finish(false)); };
      a.src = AUDIO_BASE + baseName + tryExt;
    });
  }

  function speak(text, lang) {
    return new Promise(resolve => {
      // Tier 1: local audio files (most stable, works offline)
      if (lang === 'en-US') {
        tryPlayAudio(text).then(resolve).catch(() => {
          // Tier 2: speechSynthesis
          speakWithTTS(englishSpeechText(text), lang, resolve);
        });
        return;
      }
      // Tier 2: speechSynthesis for Chinese
      speakWithTTS(text, lang, resolve);
    });
  }

  function speakWithTTS(text, lang, resolve) {
    if (!window.speechSynthesis) {
      speakFallback(text, lang).then(resolve);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    setAudioSource(lang === 'en-US' ? '浏览器英文语音' : '浏览器中文语音');
    u.lang = lang;
    u.rate = speed;
    u.volume = 1;
    if (lang === 'en-US') { const v = getEnglishVoice(); if (v) u.voice = v; }
    else { const v = getChineseVoice(); if (v) u.voice = v; }
    let resolved = false;
    const done = () => { if (!resolved) { resolved = true; clearTimeout(t); resolve(); } };
    let t = setTimeout(() => { speechSynthesis.cancel(); done(); }, 12000);
    u.onend = done;
    u.onerror = () => { if (!resolved) { resolved = true; clearTimeout(t); speechSynthesis.cancel(); speakFallback(text, lang).then(resolve); } };
    speechSynthesis.speak(u);
    if (speechSynthesis.paused) speechSynthesis.resume();
  }

  function speakFallback(text, lang) {
    return new Promise(resolve => {
      let url;
      if (lang === 'en-US') {
        url = 'https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent(englishSpeechText(text)) + '&type=0';
        setAudioSource('在线英文音频');
      } else {
        url = 'https://fanyi.baidu.com/gettts?lan=zh&text=' + encodeURIComponent(text) + '&spd=3&source=web';
        setAudioSource('在线中文音频');
      }
      const a = new Audio(url);
      a.volume = 1; a.playbackRate = speed;
      let t = setTimeout(() => { a.pause(); resolve(); }, 10000);
      a.onended = () => { clearTimeout(t); resolve(); };
      a.onerror = () => { clearTimeout(t); resolve(); };
      a.play().catch(() => { clearTimeout(t); resolve(); });
    });
  }

  async function speakCurrentWord(gen) {
    if (!isPlaying || currentIndex >= playlist.length || currentIndex < 0) return;
    if (speechPending) return;
    if (gen !== speakGeneration) return;
    speechPending = true;

    const word = playlist[currentIndex];
    updateWordDisplay();
    updateUI(false);
    highlightCurrentRow();
    scrollToCurrent();
    updateCardStar();

    try {
      markWordSeen(word.en);
      if (spellMode) {
        const letters = word.en.replace(/\s+/g, '').split('');
        for (let i = 0; i < letters.length; i++) {
          if (!isPlaying || gen !== speakGeneration) { speechPending = false; return; }
          await speak(letters[i], 'en-US');
          await delay(180);
        }
        await delay(350);
      }

      if (!isPlaying || gen !== speakGeneration) { speechPending = false; return; }
      await speak(word.en, 'en-US');
      if (!isPlaying || gen !== speakGeneration) { speechPending = false; return; }

      if (speakChinese) {
        await delay(700);
        if (!isPlaying || gen !== speakGeneration) { speechPending = false; return; }
        await speak(word.zh, 'zh-CN');
        if (!isPlaying || gen !== speakGeneration) { speechPending = false; return; }
      }

      const row = wordListPanel.querySelector(`.word-row[data-index="${currentIndex}"]`);
      if (row) row.classList.add('played');
    } catch(e) {}

    speechPending = false;
    if (!isPlaying || gen !== speakGeneration) return;

    currentRepeat++;
    if (currentRepeat < repeatCount) {
      await delay(speakChinese ? 500 : 800);
      if (gen !== speakGeneration) return;
      speakCurrentWord(gen);
    } else {
      currentRepeat = 0;
      await delay(speakChinese ? 1000 : 1200);
      if (!isPlaying || gen !== speakGeneration) return;
      currentIndex++;
      if (currentIndex >= playlist.length) {
        if (autoLoop) {
          currentIndex = 0;
          if (shuffleMode) applyPlaylist();
          currentRepeat = 0;
          showToast('已自动循环重新开始');
          speakCurrentWord(gen);
        } else {
          stopReading();
          showToast('本单元播放完毕');
        }
        return;
      }
      speakCurrentWord(gen);
    }
  }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ===== Playback =====
  function startReading() {
    if (playlist.length === 0) return;
    if (currentIndex < 0) currentIndex = 0;
    if (currentIndex >= playlist.length) currentIndex = 0;
    currentRepeat = 0;
    isPlaying = true; speechPending = false;
    btnStart.textContent = '停止'; btnStart.classList.add('stop');
    btnPlay.innerHTML = '&#10074;&#10074;'; btnPlay.classList.add('pause');
    btnPrev.disabled = false; btnNext.disabled = false;
    wordCard.classList.add('active');
    speakGeneration++;
    updateWordDisplay(); updateCardStar(); updateUI(); highlightCurrentRow(); scrollToCurrent();
    speakCurrentWord(speakGeneration);
  }
  function pauseReading() {
    isPlaying = false; speechSynthesis.cancel(); speechPending = false;
    btnPlay.innerHTML = '▶'; btnPlay.classList.remove('pause');
    wordCard.classList.remove('active'); updateUI();
  }
  function resumeReading() {
    if (playlist.length === 0) return;
    if (currentIndex < 0) currentIndex = 0;
    currentRepeat = 0;
    isPlaying = true; speechPending = false;
    btnPlay.innerHTML = '&#10074;&#10074;'; btnPlay.classList.add('pause');
    speakGeneration++;
    wordCard.classList.add('active'); updateUI(false); highlightCurrentRow(); scrollToCurrent();
    speakCurrentWord(speakGeneration);
  }
  function stopReading() {
    isPlaying = false; speechSynthesis.cancel(); speechPending = false;
    currentIndex = -1; currentRepeat = 0;
    btnStart.textContent = '开始早读'; btnStart.classList.remove('stop');
    btnPlay.innerHTML = '▶'; btnPlay.classList.remove('pause');
    btnPlay.disabled = playlist.length === 0;
    btnPrev.disabled = true; btnNext.disabled = true;
    wordCard.classList.remove('active');
    updateWordDisplay(); updateCardStar(); updateUI();
  }
  function onStartStop() { if (dictationActive) return; isPlaying ? stopReading() : startReading(); }
  function onPlayPause() { if (dictationActive) return; isPlaying ? pauseReading() : resumeReading(); }

  function navigate(dir) {
    speechSynthesis.cancel(); speechPending = false;
    speakGeneration++;
    const wp = isPlaying; isPlaying = false;
    currentIndex += dir;
    if (currentIndex < 0) currentIndex = 0;
    if (currentIndex >= playlist.length) currentIndex = playlist.length - 1;
    currentRepeat = 0;
    updateWordDisplay(); updateCardStar(); updateUI(); highlightCurrentRow(); scrollToCurrent();
    if (wp) { isPlaying = true; speakCurrentWord(speakGeneration); }
  }
  function jumpTo(index) {
    speechSynthesis.cancel(); speechPending = false;
    speakGeneration++;
    const wp = isPlaying; isPlaying = false;
    currentIndex = index; currentRepeat = 0;
    updateWordDisplay(); updateCardStar(); updateUI(); highlightCurrentRow(); scrollToCurrent();
    if (wp) { isPlaying = true; speakCurrentWord(speakGeneration); }
  }

  // ===== Dictation Mode =====
  function toggleDictation() {
    dictationMode = !dictationMode;
    btnDictation.classList.toggle('active', dictationMode);
    btnDictation.title = dictationMode ? '默写模式：点击显示中文' : '默写模式：隐藏中文';
    updateWordDisplay();
    renderWordList();
  }

  // ===== Dictation Mode =====
  let dictWordCount = 15, dictSeqMode = false, dictRange = 'all', dictSpeakCN = false;
  let dictationWords = [], dictationActive = false, dictPaused = false, dictGridEls = [];
  let dictPauseResolve = null;
  const DICT_CN_GAP_MS = 1000;
  const DICT_EN_GAP_MS = 1500;

  function getDictCounts() {
    try { return JSON.parse(localStorage.getItem('vocab-dict-counts') || '{}'); } catch(e) { return {}; }
  }

  function initDictControls() {
    // Word count buttons
    $$('.dict-num-btns button[data-n]').forEach(b => {
      const n = parseInt(b.dataset.n);
      b.classList.toggle('active', n === dictWordCount || (n === 0 && dictWordCount === 0));
      b.addEventListener('click', () => {
        dictWordCount = n;
        $$('.dict-num-btns button[data-n]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        updateDictStatus(); savePrefs();
      });
    });
    // Mode buttons
    $$('.dict-num-btns button[data-mode]').forEach(b => {
      b.classList.toggle('active', (b.dataset.mode === 'random') === !dictSeqMode);
      b.addEventListener('click', () => {
        dictSeqMode = b.dataset.mode === 'seq';
        $$('.dict-num-btns button[data-mode]').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        updateDictStatus(); savePrefs();
      });
    });
    // Range buttons (all/star/phrase)
    $$('#dictRangeBtns button').forEach(b => {
      b.classList.toggle('active', b.dataset.range === dictRange);
      b.addEventListener('click', () => {
        dictRange = b.dataset.range;
        $$('#dictRangeBtns button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        updateDictStatus(); savePrefs();
      });
    });
    // Speak mode buttons (听英写中/听中写英)
    $$('#dictSpeakModeBtns button').forEach(b => {
      b.classList.toggle('active', (b.dataset.spk === 'cn') === dictSpeakCN);
      b.addEventListener('click', () => {
        dictSpeakCN = b.dataset.spk === 'cn';
        $$('#dictSpeakModeBtns button').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        updateDictStatus(); savePrefs();
      });
    });
    // Close button
    $('#btnDictClose').addEventListener('click', () => {
      dictationActive = false;
      dictationPanel.classList.remove('show');
    });
  }

  function updateDictStatus() {
    const pool = getDictPool();
    const counts = getDictCounts();
    const total = Object.values(counts).reduce((s, c) => s + c, 0);
    const label = dictSeqMode ? '按顺序' : '随机';
    const range = dictRange === 'star' ? '星标 · ' : (dictRange === 'phrase' ? '短语 · ' : '');
    const countLabel = dictWordCount === 0 ? '全部' : dictWordCount + ' 个';
    const modeLabel = dictSpeakCN ? '听中写英' : '听英写中';
    dictStatus.textContent = `准备听写[${modeLabel}]：${range}${label}，${countLabel}单词（累计 ${total} 次）`;
  }

  function getDictPool() {
    let pool = playlist.filter(w => !w.isProper);
    if (dictRange === 'phrase') pool = pool.filter(w => (typeof w.en === 'string') && /\s/.test(w.en));
    if (dictRange === 'star') pool = pool.filter(isFavorite);
    return pool.length > 0 ? pool : playlist;
  }

  function startDictation() {
    if (playlist.length === 0) { showToast('请先选择单元'); return; }
    if (isPlaying) stopReading();
    dictationPanel.classList.add('show');
    updateDictStatus();
    dictGrid.innerHTML = '';
    hideEl(dictAnswers);
    hideEl(dictReviewActions);
    showEl(btnDictStart);
    hideEl(btnDictPause);
    hideEl(btnDictReveal);
    dictationActive = false;
    dictPaused = false;
    pickStudents(); // auto-pick on open
    setTimeout(() => dictationPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
  }

  function toggleDictPause() {
    if (!dictationActive) return;
    dictPaused = !dictPaused;
    btnDictPause.textContent = dictPaused ? '\u25b6 \u7ee7\u7eed' : '\u23f8 \u6682\u505c';
    if (!dictPaused && dictPauseResolve) {
      dictPauseResolve();
      dictPauseResolve = null;
    }
  }

  async function runDictation(replayWords = null) {
    const pool = getDictPool();
    if (!replayWords && pool.length === 0) { showToast('没有可听写的单词'); return; }
    const counts = getDictCounts();

    let selected;
    const targetCount = dictWordCount === 0 ? pool.length : dictWordCount;
    if (replayWords && replayWords.length > 0) {
      selected = [...replayWords];
    } else if (dictSeqMode) {
      const startIdx = parseInt(localStorage.getItem('vocab-dict-seq-pos') || '0');
      selected = [];
      for (let i = 0; i < targetCount; i++) {
        const idx = (startIdx + i) % pool.length;
        selected.push(pool[idx]);
      }
      localStorage.setItem('vocab-dict-seq-pos', String((startIdx + targetCount) % pool.length));
    } else {
      const withCounts = pool.map(w => ({ word: w, count: counts[w.en.toLowerCase()] || 0 }));
      withCounts.sort((a, b) => a.count - b.count);
      const minCount = withCounts[0].count;
      let candidates = withCounts.filter(w => w.count === minCount);
      if (candidates.length < targetCount) {
        candidates = [...candidates, ...withCounts.filter(w => w.count > minCount)];
      }
      candidates.sort(() => Math.random() - 0.5);
      selected = candidates.slice(0, Math.min(targetCount, candidates.length)).map(w => w.word);
    }

    dictationWords = selected;
    dictationActive = true;
    dictPaused = false;
    const total = dictationWords.length;

    // Render number grid
    dictGrid.innerHTML = dictationWords.map((_, i) =>
      `<div class="dict-num" id="dictNum${i}">${String(i+1).padStart(2,'0')}</div>`
    ).join('');
    dictGridEls = dictationWords.map((_, i) => document.getElementById('dictNum' + i));
    hideEl(dictAnswers);
    hideEl(dictReviewActions);
    hideEl(btnDictStart);
    showEl(btnDictPause);
    btnDictPause.textContent = '\u23f8 \u6682\u505c';
    hideEl(btnDictReveal);
    dictStatus.textContent = `听写中... ${total} 个单词`;

    // Play each word
    for (let i = 0; i < dictationWords.length; i++) {
      while (dictPaused && dictationActive) {
        await new Promise(resolve => { dictPauseResolve = resolve; });
      }
      if (!dictationActive) return;
      dictStatus.textContent = `听写中... 第 ${i + 1} / ${total} 个`;
      if (dictGridEls[i]) dictGridEls[i].classList.add('playing');

      const w = dictationWords[i];
      wordCard.querySelector('.word-en').textContent = 'Listen';
      wordPhonetic.textContent = '';
      wordPos.textContent = '';
      wordZh.textContent = String(i + 1).padStart(2, '0');
      unitInfo.textContent = '';
      wordCard.classList.add('active');

      if (dictSpeakCN) {
        await speak(w.zh, 'zh-CN');
        await delay(DICT_CN_GAP_MS);
        await speak(w.zh, 'zh-CN');
        await delay(DICT_CN_GAP_MS);
      } else {
        await speak(w.en, 'en-US');
        await delay(DICT_EN_GAP_MS);
        await speak(w.en, 'en-US');
        await delay(DICT_EN_GAP_MS);
      }

      if (dictGridEls[i]) { dictGridEls[i].classList.remove('playing'); dictGridEls[i].classList.add('done'); }
    }

    // Done
    dictationActive = false;
    dictPaused = false;
    hideEl(btnDictPause);
    wordCard.classList.remove('active');
    wordCard.querySelector('.word-en').textContent = 'Done';
    wordPos.textContent = '';
    wordZh.textContent = '听写完毕';
    dictStatus.textContent = `听写完毕！共 ${total} 个单词`;
    showEl(btnDictReveal);

    // Increment counts
    dictationWords.forEach(w => {
      const k = w.en.toLowerCase();
      counts[k] = (counts[k] || 0) + 1;
    });
    localStorage.setItem('vocab-dict-counts', JSON.stringify(counts));
  }

  function pickStudents() {
    const maxId = parseInt(studentMaxId.value) || 50;
    const activeBtn = document.querySelector('#studentPickCountBtns button.active');
    const count = activeBtn ? parseInt(activeBtn.dataset.pick) : 3;
    const clampedCount = Math.min(count, maxId);
    const nums = [];
    const pool = Array.from({ length: maxId }, (_, i) => i + 1);
    for (let i = 0; i < clampedCount; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      nums.push(pool.splice(idx, 1)[0]);
    }
    nums.sort((a, b) => a - b);
    studentGrid.innerHTML = nums.map(n =>
      `<div class="student-number">${n}</div>`
    ).join('');
    localStorage.setItem('vocab-student-cfg', JSON.stringify({ maxId, count }));
  }

  function revealDictation() {
    const counts = getDictCounts();
    dictAnswers.innerHTML = '<h4>听写答案</h4>' +
      dictationWords.map((w, i) =>
        `<div class="dict-answer-row"><span class="num">${String(i+1).padStart(2,'0')}</span><span class="en">${escapeHTML(w.en)}</span><span class="pos">${escapeHTML(w.pos || '')}</span><span class="zh">${escapeHTML(w.zh)}</span><span class="cnt">${counts[w.en.toLowerCase()]||0}次</span></div>`
      ).join('');
    showEl(dictAnswers, 'block');
    showEl(dictReviewActions, 'flex');
    hideEl(btnDictReveal);
  }

  function starDictationWords() {
    if (!dictationWords.length) return;
    dictationWords.forEach(w => favorites.add(favoriteKey(w)));
    updateFavBadge();
    updateCardStar();
    renderWordList();
    savePrefs();
    showToast(`已星标本次 ${dictationWords.length} 个单词`);
  }

  // ===== Worksheet =====
  function initWorksheetControls() {
    $$('#worksheetModeBtns button').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === wsMode);
      b.addEventListener('click', () => { wsMode = b.dataset.mode; $$('#worksheetModeBtns button').forEach(x => x.classList.remove('active')); b.classList.add('active'); generateWorksheet(); savePrefs(); });
    });
    $$('#worksheetSourceBtns button').forEach(b => {
      b.classList.toggle('active', b.dataset.src === wsSource);
      b.addEventListener('click', () => { wsSource = b.dataset.src; $$('#worksheetSourceBtns button').forEach(x => x.classList.remove('active')); b.classList.add('active'); generateWorksheet(); savePrefs(); });
    });
  }

  function getWorksheetWords() {
    if (wsSource === 'star') {
      return collectStarredWords();
    }
    if (wsSource === 'phrase') {
      if (playlist.length === 0) return [];
      return playlist.filter(w => (typeof w.en === 'string') && /\s/.test(w.en) && !w.isProper && !isProperPhrase(w.en)).map(w => ({ en: w.en, zh: w.zh, pos: w.pos, unit: w.unit }));
    }
    if (playlist.length === 0) return [];
    return playlist.map(w => ({ en: w.en, zh: w.zh, pos: w.pos, unit: w.unit }));
  }

  function openWorksheet() {
    if (playlist.length === 0 && wsSource !== 'star') { showToast('请先选择单元'); return; }
    worksheetModalOverlay.classList.add('show');
    generateWorksheet();
  }

  function generateWorksheet() {
    const words = getWorksheetWords();
    if (words.length === 0) { worksheetPreview.innerHTML = '<div class="worksheet-empty">没有可生成的单词</div>'; return; }
    const modeLabel = wsMode === 'cn2en' ? '汉译英' : '英译汉';
    const labelCol1 = wsMode === 'cn2en' ? '中文释义' : '英语单词';
    const srcLabel = wsSource === 'star' ? '星标' : (wsSource === 'phrase' ? '短语' : (currentGrade || ''));
    const gd = getMergedGradeData();
    const th = (label) => `<tr><th>#</th><th>${label}</th><th>词性</th><th>第三次</th><th>第二次</th><th>第一次</th></tr>`;
    let html = '', idx = 0, lastUnit = null, tableOpen = false;
    words.forEach(w => {
      const unitKey = w.unit;
      if (unitKey !== lastUnit) {
        if (tableOpen) { html += '</tbody></table>'; tableOpen = false; }
        lastUnit = unitKey;
        const ud = gd[unitKey];
        if (ud) html += `<div class="ws-unit-title">${escapeHTML(ud.title||unitKey)}</div>`;
        html += `<table class="ws-table"><thead>${th(labelCol1)}</thead><tbody>`;
        tableOpen = true;
      }
      idx++;
      html += `<tr><td class="ws-index">${idx}</td><td class="ws-word">${escapeHTML(wsMode==='cn2en'?w.zh:w.en)}</td><td class="ws-pos">${escapeHTML(wsMode==='cn2en'?(w.pos||''):'')}</td><td class="ws-blank"></td><td class="ws-blank"></td><td class="ws-blank"></td></tr>`;
    });
    if (tableOpen) html += '</tbody></table>';
    worksheetPreview.innerHTML = `<div class="ws-page"><div class="ws-title">单词默写单（${modeLabel}）</div><div class="ws-info"><span>姓名：__________</span><span>班级：__________</span><span>日期：__________</span><span>范围：${escapeHTML(srcLabel)}</span></div>${html}</div>`;
  }

  function collectStarredWords() {
    const results = [];
    const allData = buildMergedDataObj();
    Object.keys(allData).forEach(grade => {
      Object.keys(allData[grade]).forEach(unit => {
        const ud = allData[grade][unit];
        if (ud.words) ud.words.forEach(w => {
          const word = { en: w.en, zh: w.zh, pos: w.pos, unit, grade };
          if (isFavorite(word)) results.push({ ...word, title: ud.title||unit });
        });
      });
    });
    return results;
  }

  // ===== Progress Tracking =====
  function loadTodayProgress() {
    const today = new Date().toDateString();
    try {
      const data = JSON.parse(localStorage.getItem('vocab-progress') || '{}');
      todayWords = (data.date === today) ? new Set(data.words || []) : new Set();
    } catch(e) { todayWords = new Set(); }
    updateTodayUI();
  }

  function markWordSeen(en) {
    const today = new Date().toDateString();
    todayWords.add(en.toLowerCase());
    localStorage.setItem('vocab-progress', JSON.stringify({ date: today, words: [...todayWords] }));
    updateTodayUI();
  }

  function updateTodayUI() {
    progMiniText.textContent = `今日已学 ${todayWords.size} 词`;
  }

  function revealCurrentWord() {
    if (!dictationMode) return;
    // Show Chinese temporarily for current word
    wordZh.classList.remove('hidden-zh');
    wordZh.style.color = '';
    wordZh.style.background = '';
    wordZh.style.cursor = '';
    wordZh.style.minWidth = '';
    setTimeout(() => {
      if (dictationMode) {
        wordZh.classList.add('hidden-zh');
        wordZh.style.color = '';
        wordZh.style.background = '';
        wordZh.style.cursor = 'pointer';
        wordZh.style.minWidth = '3em';
      }
    }, 2000);
  }

  // ===== Favorites =====
  function toggleFavorite(index) {
    if (index < 0 || index >= playlist.length) return;
    const word = playlist[index];
    const key = favoriteKey(word);
    const legacyKey = legacyFavoriteKey(word);
    if (isFavorite(word)) { favorites.delete(key); favorites.delete(legacyKey); }
    else favorites.add(key);
    updateCardStar();
    renderWordList();
    updateFavBadge();
    savePrefs();
  }

  function updateCardStar() {
    if (currentIndex < 0 || currentIndex >= playlist.length) {
      cardStar.classList.remove('faved');
      hideEl(cardStar);
    } else {
      showEl(cardStar);
      cardStar.classList.toggle('faved', isFavorite(playlist[currentIndex]));
    }
  }

  function toggleFavFilter() {
    favFilter = !favFilter;
    btnFavFilter.classList.toggle('active', favFilter);
    renderWordList();
    if (favFilter) {
      const cnt = playlist.filter(isFavorite).length;
      showToast(`已筛选 ${cnt} 个收藏单词`);
    }
  }

  function updateFavBadge() {
    const cnt = favorites.size;
    if (cnt > 0) {
      showEl(favCountBadge, 'flex');
      favCountBadge.textContent = cnt > 99 ? '99+' : cnt;
    } else {
      hideEl(favCountBadge);
    }
  }

  // ===== Settings =====
  function onSpeedChange() {
    speed = parseFloat(speedSlider.value); updateSpeedLabel(); savePrefs();
    if (isPlaying) { speechSynthesis.cancel(); speechPending = false; speakGeneration++; setTimeout(() => { if (isPlaying) speakCurrentWord(speakGeneration); }, 100); }
  }
  function updateSpeedLabel() { speedLabel.textContent = speed.toFixed(1) + 'x'; }
  function onRepeatChange(e) { repeatCount = parseInt(e.currentTarget.dataset.r); updateRepeatBtns(); savePrefs(); }
  function updateRepeatBtns() {
    $$('.repeat-btns button[data-r]').forEach(b => b.classList.toggle('active', parseInt(b.dataset.r) === repeatCount));
  }

  // ===== UI =====
  function updateUI(renderList = true) {
    const total = playlist.length;
    const hasWords = total > 0;
    btnStart.disabled = !hasWords;
    if (!isPlaying) btnPlay.disabled = !hasWords;
    btnPrev.disabled = !hasWords || currentIndex <= 0;
    btnNext.disabled = !hasWords || currentIndex >= total - 1;
    wordCountBadge.innerHTML = hasWords ? `<span class="dot"></span> 共 ${total} 个单词` : '<span class="dot muted-dot"></span> 请先选择单元';
    const cur = currentIndex >= 0 ? currentIndex + 1 : '--';
    progressText.textContent = `${cur} / ${total}`;
    progressBar.style.width = hasWords && currentIndex >= 0 ? ((currentIndex + 1) / total * 100).toFixed(1) + '%' : '0%';
    wordListPanel.classList.toggle('cols-2', total > 45);
    if (renderList) renderWordList();
  }

  function updateWordDisplay() {
    if (currentIndex < 0 || currentIndex >= playlist.length) {
      wordCard.querySelector('.word-en').textContent = 'Ready';
      wordPhonetic.textContent = '';
      wordPos.textContent = '';
      wordZh.textContent = '选择单元后开始早读';
      wordZh.classList.remove('hidden-zh');
      wordZh.style.color = ''; wordZh.style.background = ''; wordZh.style.cursor = ''; wordZh.style.minWidth = '';
      wordCard.classList.remove('active');
      unitInfo.textContent = '';
    } else {
      const word = playlist[currentIndex];
      wordCard.querySelector('.word-en').innerHTML = (typeof renderSyllablesHTML === 'function') ? renderSyllablesHTML(word.en) : escapeHTML(word.en);
      // Show phonetic if available
      wordPhonetic.textContent = word.phonetic || '';
      wordPos.textContent = word.pos || '';
      // Show unit info
      const gradeData = getMergedGradeData();
      const unitData = gradeData[word.unit];
      unitInfo.textContent = (currentGrade || '') + ' · ' + (unitData ? unitData.title : word.unit);
      if (dictationMode) {
        wordZh.classList.add('hidden-zh');
        wordZh.style.color = 'transparent';
        wordZh.style.background = '';
        wordZh.style.cursor = 'pointer';
        wordZh.textContent = word.zh;
      } else {
        wordZh.classList.remove('hidden-zh');
        wordZh.style.color = ''; wordZh.style.background = ''; wordZh.style.cursor = ''; wordZh.style.minWidth = '';
        wordZh.textContent = word.zh;
      }
    }
  }

  function renderWordList() {
    wordListPanel.innerHTML = '';
    if (playlist.length === 0) {
      const q = searchInput.value.trim();
      wordListPanel.innerHTML = q ? '<div class="empty-state">请先选择单元，再搜索单词</div>' : '<div class="empty-state">单词列表在此显示</div>';
      return;
    }

    const query = searchInput.value.trim().toLowerCase();
    const gd = getMergedGradeData();
    let rowsRendered = 0;
    let lastUnit = null;

    playlist.forEach((word, i) => {
      // Fav filter
      if (favFilter && !isFavorite(word)) return;
      // Search filter
      if (query && !word.en.toLowerCase().includes(query) && !word.zh.includes(query)) return;

      // Unit header
      const unitKey = word.unit;
      if (unitKey !== lastUnit) {
        lastUnit = unitKey;
        const ud = gd[unitKey];
        const header = document.createElement('div');
        header.className = 'unit-section-header';
        header.textContent = (ud && ud.title) ? ud.title : unitKey;
        wordListPanel.appendChild(header);
      }

      rowsRendered++;

      const row = document.createElement('div');
      row.className = 'word-row';
      row.dataset.index = String(i);
      if (/\s/.test(word.en)) row.classList.add('is-phrase');
      if (i === currentIndex) row.classList.add('current');
      if (i < currentIndex) row.classList.add('played');

      const isFaved = isFavorite(word);
      row.innerHTML = `
        <span class="idx">${i + 1}</span>
        <span class="word-body">
          <span class="wen">${escapeHTML(word.en)}</span>
          <span class="wpos">${escapeHTML(word.pos || '')}</span>
          <span class="wzh${dictationMode ? ' zh-hidden' : ''}">${escapeHTML(word.zh)}</span>
        </span>
        <button class="row-star${isFaved ? ' faved' : ''}">&#9733;</button>
      `;

      row.addEventListener('click', (e) => {
        if (e.target.closest('.row-star')) {
          toggleFavorite(i);
          return;
        }
        jumpTo(i);
      });

      // Star click
      const starBtn = row.querySelector('.row-star');
      starBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(i);
      });

      // Click to reveal in dictation mode
      const wzhEl = row.querySelector('.wzh');
      if (dictationMode) {
        wzhEl.addEventListener('click', (e) => {
          e.stopPropagation();
          wzhEl.classList.remove('zh-hidden');
          setTimeout(() => { if (dictationMode) wzhEl.classList.add('zh-hidden'); }, 2000);
        });
      }

      wordListPanel.appendChild(row);
    });

    if (rowsRendered === 0) {
      wordListPanel.innerHTML = '<div class="empty-state">没有匹配的单词</div>';
    }
  }

  function highlightCurrentRow() {
    $$('.word-row').forEach(row => row.classList.toggle('current', Number(row.dataset.index) === currentIndex));
  }
  function scrollToCurrent() {
    const row = wordListPanel.querySelector(`.word-row[data-index="${currentIndex}"]`);
    if (!row) return;

    const rows = Array.from(wordListPanel.querySelectorAll('.word-row'));
    const rowIndex = rows.indexOf(row);
    if (rowIndex < 0) return;

    const anchorRow = rows[Math.max(0, rowIndex - 2)];
    const panelTop = wordListPanel.getBoundingClientRect().top;
    const anchorTop = anchorRow.getBoundingClientRect().top;
    const targetTop = Math.max(0, wordListPanel.scrollTop + anchorTop - panelTop - 6);

    wordListPanel.scrollTo({ top: targetTop, behavior: 'auto' });
  }

  // ===== Import / Export =====
  function openImportModal() {
    if (!currentGrade) { showToast('请先选择年级'); return; }
    const gd = getMergedGradeData();
    importUnitSelect.innerHTML = '<option value="">-- 选择单元 --</option>';
    Object.keys(gd).forEach(un => { const o = document.createElement('option'); o.value = un; o.textContent = un + ' — ' + gd[un].title; importUnitSelect.appendChild(o); });
    const oN = document.createElement('option'); oN.value = '__new__'; oN.textContent = '+ 新建单元...'; importUnitSelect.appendChild(oN);
    importTextarea.value = '';
    updateImportPreview();
    importUnitSelect.onchange = () => {
      if (importUnitSelect.value === '__new__' || !importUnitSelect.value) { importTextarea.value = ''; updateImportPreview(); return; }
      const ud = gd[importUnitSelect.value];
      importTextarea.value = ud && ud.words ? ud.words.map(w => w.en + ' | ' + w.zh + (w.pos ? ' | ' + w.pos : '')).join('\n') : '';
      updateImportPreview();
    };
    importModalOverlay.classList.add('show');
  }
  function closeImportModal() { importModalOverlay.classList.remove('show'); }
  function parseImportText(text) {
    const words = [];
    text.split(/\n/).filter(l => l.trim()).forEach(line => {
      let parts = line.split('|');
      if (parts.length < 2) parts = line.split('\t');
      if (parts.length < 2) { const m = line.match(/^(.+?)\s{2,}(.+)$/); if (m) parts = [m[1], m[2]]; }
      if (parts.length >= 2) {
        const en = parts[0].trim();
        let zh = '', pos = '';
        if (parts.length >= 3) {
          const p1 = parts[1].trim(); const p2 = parts[2].trim();
          const pp = /^(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|interj\.|art\.|aux\.|num\.|det\.|abbr\.|phr\.)(;\s*(n\.|v\.|adj\.|adv\.|prep\.|conj\.|pron\.|interj\.|art\.|aux\.|num\.|det\.|abbr\.|phr\.))*$/;
          if (pp.test(p1)) { pos = p1; zh = parts.slice(2).join('|').trim(); }
          else if (pp.test(p2)) { zh = p1; pos = p2; }
          else { zh = parts.slice(1).join('|').trim(); }
        } else { zh = parts.slice(1).join('|').trim(); }
        if (en && zh) { const w = { en, zh }; if (pos) w.pos = pos; words.push(w); }
      }
    });
    return words;
  }

  function updateImportPreview() {
    const lines = importTextarea.value.split(/\n/).filter(l => l.trim()).length;
    const words = parseImportText(importTextarea.value.trim());
    const failed = Math.max(0, lines - words.length);
    importPreview.textContent = lines === 0
      ? '尚未解析'
      : `已解析 ${words.length} 条${failed ? `，${failed} 行未识别` : ''}`;
  }
  function saveImport() {
    const un = importUnitSelect.value;
    if (!un) { showToast('请选择目标单元'); return; }
    const words = parseImportText(importTextarea.value.trim());
    if (words.length === 0) { showToast('未解析到有效单词'); return; }
    const imported = getImportedData();
    if (!imported[currentGrade]) imported[currentGrade] = {};
    let target = un;
    if (un === '__new__') { target = prompt('请输入新单元名称（如：Unit 5）：'); if (!target) return; }
    imported[currentGrade][target] = { title: VOCAB_DATA[currentGrade]?.[target]?.title || target, words };
    setImportedData(imported);
    closeImportModal(); renderUnits(); rebuildPlaylist(); updateUI();
    showToast(`已保存「${target}」${words.length} 个单词`);
  }
  function clearImportUnit() {
    const un = importUnitSelect.value;
    if (!un || un === '__new__') { showToast('请先选择单元'); return; }
    if (!confirm(`确定清空「${un}」中导入的全部单词吗？\n（教材原始数据不受影响）`)) return;
    const imported = getImportedData();
    if (imported[currentGrade]?.[un]) { delete imported[currentGrade][un]; setImportedData(imported); }
    importTextarea.value = ''; renderUnits(); rebuildPlaylist(); updateUI();
    showToast(`已清空「${un}」`);
  }
  function buildMergedDataObj() {
    const imported = getImportedData();
    const merged = {};
    Object.keys(VOCAB_DATA).forEach(g => {
      merged[g] = {};
      Object.keys(VOCAB_DATA[g]).forEach(u => { merged[g][u] = { title: VOCAB_DATA[g][u].title, words: [...(VOCAB_DATA[g][u].words||[])] }; });
    });
    Object.keys(imported).forEach(g => {
      if (!merged[g]) merged[g] = {};
      Object.keys(imported[g]).forEach(u => {
        const iw = imported[g][u].words || [];
        if (merged[g][u]) {
          const ens = new Set(merged[g][u].words.map(w => w.en.toLowerCase()));
          iw.forEach(w => { if (!ens.has(w.en.toLowerCase())) merged[g][u].words.push(w); });
        } else { merged[g][u] = { title: imported[g][u].title || u, words: [...iw] }; }
      });
    });
    return merged;
  }
  function exportDataFile() {
    const merged = buildMergedDataObj();
    const lines = ['const VOCAB_DATA = {'];
    const grades = Object.keys(merged);
    grades.forEach((g, gi) => {
      lines.push('  ' + JSON.stringify(g) + ': {');
      const units = Object.keys(merged[g]);
      units.forEach((u, ui) => {
        const ud = merged[g][u];
        lines.push('    ' + JSON.stringify(u) + ': {');
        lines.push('      title: ' + JSON.stringify(ud.title) + ',');
        lines.push('      words: [');
        ud.words.forEach((w, wi) => {
          let wordLine = '        { en: ' + JSON.stringify(w.en) + ', zh: ' + JSON.stringify(w.zh);
          if (w.pos) wordLine += ', pos: ' + JSON.stringify(w.pos);
          if (w.phonetic) wordLine += ', phonetic: ' + JSON.stringify(w.phonetic);
          if (w.isProper) wordLine += ', isProper: true';
          wordLine += ' }' + (wi < ud.words.length - 1 ? ',' : '');
          lines.push(wordLine);
        });
        lines.push('      ]');
        lines.push('    }' + (ui < units.length - 1 ? ',' : ''));
      });
      lines.push('  }' + (gi < grades.length - 1 ? ',' : ''));
    });
    lines.push('};');
    const blob = new Blob([lines.join('\n')], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'data.js'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast('已导出 data.js，请替换文件夹中的原文件');
  }

  // ===== Keyboard =====
  function onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    switch(e.code) {
      case 'Space': e.preventDefault(); isPlaying ? pauseReading() : (playlist.length > 0 && resumeReading()); break;
      case 'ArrowLeft': e.preventDefault(); if (playlist.length > 0 && currentIndex > 0) navigate(-1); break;
      case 'ArrowRight': e.preventDefault(); if (playlist.length > 0 && currentIndex < playlist.length - 1) navigate(1); break;
      case 'KeyF': e.ctrlKey && e.preventDefault() && searchInput.focus(); break;
    }
  }

  // ===== Mobile =====
  function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('show'); }
  function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('show'); }

  // ===== Toast =====
  function showToast(msg) { toastEl.textContent = msg; toastEl.classList.add('show'); setTimeout(() => toastEl.classList.remove('show'), 2000); }

  // ===== Persist =====
  // ===== Word Matching Game =====
  let gState = {}, gAudioCtx = null;

  function gBeep(freq, dur, vol=0.3) {
    try {
      if (!gAudioCtx) gAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const o = gAudioCtx.createOscillator(), g = gAudioCtx.createGain();
      o.type='sine'; o.frequency.value=freq; g.gain.value=vol;
      o.connect(g); g.connect(gAudioCtx.destination);
      o.start(); g.gain.exponentialRampToValueAtTime(0.01,gAudioCtx.currentTime+dur);
      o.stop(gAudioCtx.currentTime+dur);
    } catch(e) {}
  }

  function gSound(ok) {
    if (ok) { gBeep(880,0.12); setTimeout(()=>gBeep(1100,0.15),120); }
    else gBeep(200,0.25);
  }

  function gApplause() {
    [0,100,200,300,400].forEach((d,i)=>setTimeout(()=>gBeep(400+i*100+Math.random()*200,0.2,0.2),d));
  }

  function gConfetti() {
    const el = $('#gameCelebrate');
    if (!el) return;
    showEl(el);
    setTimeout(() => { hideEl(el); }, 1400);
  }

  function initGame() {
    const gmo=$('#gameModalOverlay');
    const closeGame=()=>{clearInterval(gState.timer);gmo.classList.remove('show');hideEl($('#gameCelebrate'));};
    $('#btnGame').addEventListener('click',()=>{if(playlist.length<10){showToast('请先选择至少10个单词的单元');return;} clearInterval(gState.timer); gState={}; hideEl($('#gameTimer')); $('#gameInfo').textContent=''; hideEl($('#gameCelebrate')); $('#gameBoard').innerHTML='<div class="game-empty-state">选择一种模式开始本轮匹配练习</div>'; gmo.classList.add('show');});
    $('#btnGameClose').addEventListener('click',closeGame);
    gmo.addEventListener('click',e=>{if(e.target===gmo)closeGame();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&gmo.classList.contains('show'))closeGame();});
    $('#btnGameStart').addEventListener('click',()=>buildGameBoard(false));
    $('#btnGamePK').addEventListener('click',()=>buildGameBoard(true));
  }

  function pickWords(n){const p=[...playlist];for(let i=p.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[p[i],p[j]]=[p[j],p[i]];} return p.slice(0,n);}
  function shuf(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b;}

  function renderPlayerBoard(words,pid,label,cnOrder){
    const L=words.map((w,i)=>`<div class="game-item" data-pid="${pid}" data-idx="${i}" data-side="en">${escapeHTML(w.en)} <small class="game-pos">${escapeHTML(w.pos||'')}</small></div>`).join('');
    const R=cnOrder.map(zh=>`<div class="game-item" data-pid="${pid}" data-zh="${escapeHTML(zh)}" data-side="zh">${escapeHTML(zh)}</div>`).join('');
    const scoreClass = pid===0?'s1':'s2';
    const timeHtml = `<span class="game-time-inline" id="gameTime${pid}"></span>`;
    return `<div class="game-player-zone" id="playerZone${pid}"><div class="game-col-title">${pid===0?timeHtml+' '+label:label+' '+timeHtml}<br><span class="game-col-score ${scoreClass}" id="gameScore${pid}">0 / 10</span></div><div class="game-board-row"><div>${L}</div><div></div><div>${R}</div></div><div id="playerCelebrate${pid}" class="game-player-celebrate">完成</div></div>`;
  }

  function buildGameBoard(pk){
    clearInterval(gState.timer);hideEl($('#gameCelebrate'));
    gState={pk,timer:null,elapsed:0,selected:{},words:[],matched:[0,0],done:[false,false],finishTime:[0,0]};
    const baseWords=pickWords(10);
    if(pk){
      const cn1=shuf(baseWords.map(w=>w.zh)),cn2=shuf(baseWords.map(w=>w.zh));
      gState.words=[baseWords,baseWords];
      $('#gameBoard').innerHTML=`<div class="game-board-pk">${renderPlayerBoard(baseWords,0,'玩家一',cn1)}<div class="game-player-divider"></div>${renderPlayerBoard(baseWords,1,'玩家二',cn2)}</div>`;
      showEl($('#gameTimer'));$('#gameTimer').textContent='';
      const startTime=Date.now();
      gState.timer=setInterval(()=>{
        gState.elapsed=(Date.now()-startTime)/1000;
        const ts=gState.elapsed.toFixed(1)+'s';
        $('#gameTimer').textContent=ts;
        [0,1].forEach(pid=>{if(!gState.done[pid])$(`#gameTime${pid}`).textContent=ts;});
      },100);
    }else{
      gState.words=[baseWords];gState.matched=[0];
      const cnS=shuf(baseWords.map(w=>w.zh));
      $('#gameBoard').innerHTML=`<div class="game-board-solo"><div class="game-board-solo-inner">${renderPlayerBoard(baseWords,0,'连连看',cnS)}</div></div>`;
      // Single player: start timer
      showEl($('#gameTimer'));$('#gameTimer').textContent='0.0s';
      const soloStart=Date.now();
      gState.timer=setInterval(()=>{
        gState.elapsed=(Date.now()-soloStart)/1000;
        $('#gameTimer').textContent=gState.elapsed.toFixed(1)+'s';
      },100);
    }
    $('#gameInfo').textContent=pk?'同一组单词，各自匹配，先完成者胜！':'点击英文单词 → 再点对应中文释义';
    $('#gameBoard').onclick=function(e){
      const el=e.target.closest('.game-item');
      if(!el||el.classList.contains('matched'))return;
      const pid=parseInt(el.dataset.pid),side=el.dataset.side;
      if(gState.done[pid])return; // player already finished
      if(!gState.selected[pid])gState.selected[pid]=null;
      const sel=gState.selected[pid];
      if(sel&&sel!==el&&sel.dataset.side===side&&sel.dataset.pid===String(pid)){sel.classList.remove('selected');gState.selected[pid]=el;el.classList.add('selected');return;}
      if(!sel||sel.dataset.pid!==String(pid)){if(sel)sel.classList.remove('selected');gState.selected[pid]=el;el.classList.add('selected');return;}
      const enEl=side==='en'?el:sel,zhEl=side==='zh'?el:sel;
      if(enEl.dataset.side===zhEl.dataset.side){sel.classList.remove('selected');gState.selected[pid]=el;el.classList.add('selected');return;}
      const enIdx=parseInt(enEl.dataset.idx),correctZh=gState.words[pid][enIdx].zh;
      sel.classList.remove('selected');gState.selected[pid]=null;
      if(correctZh===zhEl.dataset.zh){
        enEl.classList.add('matched');zhEl.classList.add('matched');gState.matched[pid]++;gSound(true);
        $(`#gameScore${pid}`).textContent=`${gState.matched[pid]} / 10`;
        if(gState.matched[pid]>=10)playerFinished(pid);
      }else{enEl.classList.add('wrong');zhEl.classList.add('wrong');gSound(false);setTimeout(()=>{enEl.classList.remove('wrong');zhEl.classList.remove('wrong');},400);}
    };
  }

  function playerFinished(pid){
    gState.done[pid]=true;gState.finishTime[pid]=gState.elapsed;
    $(`#gameTime${pid}`).textContent=gState.elapsed.toFixed(1)+'s';
    $(`#gameTime${pid}`).style.color='var(--success)';
    // Show celebration on player's side
    showEl($(`#playerCelebrate${pid}`), 'block');gConfetti();gApplause();
    if(!gState.pk){clearInterval(gState.timer);$('#gameInfo').textContent='全部匹配完成 · '+gState.elapsed.toFixed(1)+'s';$('#gameTimer').textContent=gState.elapsed.toFixed(1)+'s';return;}
    // Check if both done
    const otherPid=pid===0?1:0;
    if(gState.done[otherPid]){
      // Both done — declare winner
      clearInterval(gState.timer);
      const t0=gState.finishTime[0],t1=gState.finishTime[1];
      let msg=`玩家一 ${t0.toFixed(1)}s  vs  玩家二 ${t1.toFixed(1)}s · `;
      msg+=t0<t1?'玩家一获胜':t1<t0?'玩家二获胜':'平局';
      $('#gameInfo').textContent=msg;
      hideEl($('#gameTimer'));
    }else{
      $('#gameInfo').textContent=`玩家${pid===0?'一':'二'}已完成 · ${gState.elapsed.toFixed(1)}s，等待另一位...`;
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem('vocab-prefs', JSON.stringify({
        darkMode, speed, repeat: repeatCount, speakChinese, spellMode, shuffleMode, autoLoop,
        dictWordCount, dictSeqMode, dictRange, dictSpeakCN, wsMode, wsSource,
        voiceName: selectedVoiceName,
        favorites: JSON.stringify([...favorites])
      }));
    } catch(e) {}
  }

  // ===== PWA Registration =====
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            showEl(updateBanner, 'flex');
          }
        });
      });
    }).catch(err => console.warn('Service worker registration failed:', err));
  }

  init();
})();
