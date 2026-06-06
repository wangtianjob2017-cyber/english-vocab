#!/usr/bin/env python3
"""Rebuild sidebar and dictation features on the clean index.html base."""
import re

with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()

count = 0
def R(old, new):
    global c, count
    if old in c:
        c = c.replace(old, new, 1)
        count += 1
    else:
        print(f'  MISS: {old[:60]}...')

# === SIDEBAR: Restructure with section headers ===
R(
    '<div class="settings">\n'
    '      <div class="setting-row"><span class="setting-label">英文语音</span>',
    '<div class="settings">\n'
    '      <div class="setting-section-title">\U0001f399 朗读设置</div>\n'
    '      <div class="setting-row"><span class="setting-label">英文语音</span>'
)
R(
    '<div class="setting-row"><span class="setting-label">跳过专有名词</span><label class="toggle-switch"><input type="checkbox" id="skipProper"><span class="toggle-slider"></span></label></div>\n'
    '    </div>\n'
    '\n'
    '    <div class="prog-mini"',
    '<div class="setting-row"><span class="setting-label">跳过专有名词</span><label class="toggle-switch"><input type="checkbox" id="skipProper"><span class="toggle-slider"></span></label></div>\n'
    '    </div>\n'
    '\n'
    '    <div class="settings">\n'
    '      <div class="setting-section-title">\U0001f4da 内容设置</div>\n'
    '      <div class="setting-row"><span class="setting-label">朗读内容</span><div class="repeat-btns" id="contentModeBtns"><button data-mode="all" class="active">所有单词</button><button data-mode="words">仅限单词</button><button data-mode="phrases">仅限短语</button></div></div>\n'
    '    </div>\n'
    '\n'
    '    <div class="prog-mini"'
)

# === SIDEBAR: Add CSS for section titles ===
R(
    '.setting-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }',
    '.setting-section-title { font-size: 0.85rem; font-weight: 800; color: var(--primary); letter-spacing: 0.06em; margin: 12px 0 6px; padding-bottom: 6px; border-bottom: 1px solid var(--border-strong); }\n.setting-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; }'
)

# === TOOLBAR: Replace with full version ===
old_toolbar = '''    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-wrap">
        <span class="search-icon">\U0001f50d</span>
        <input type="text" id="searchInput" placeholder="搜索单词...">
      </div>
      <button class="tool-btn dict-btn-main" id="btnDictation" title="听写模式">✍️ 听写</button>
      <button class="tool-btn dict-btn-main" id="btnFavFilter" title="只看收藏"><span>⭐ 星标</span><span class="fav-count" id="favCountBadge" style="display:none">0</span></button>
      <button class="tool-btn dict-btn-main" id="btnWorksheet" title="默写单">\U0001f4dd 默写单</button>
      <button class="tool-btn dict-btn-main" id="btnFavPrint" title="打印星标" style="display:none">\U0001f5a8 打印</button>
    </div>'''
new_toolbar = '''    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-wrap">
        <span class="search-icon">\U0001f50d</span>
        <input type="text" id="searchInput" placeholder="搜索单词...">
      </div>
      <button class="tool-btn dict-btn-main" id="btnDictation" title="听写模式">✍️ 听写</button>
      <button class="tool-btn dict-btn-main" id="btnFavFilter" title="只看收藏"><span>⭐ 星标</span><span class="fav-count" id="favCountBadge" style="display:none">0</span></button>
      <button class="tool-btn dict-btn-main" id="btnWorksheet" title="默写单">\U0001f4dd 默写单</button>
      <div style="position:relative">
        <button class="tool-btn dict-btn-main" id="btnPrintExport" title="打印/导出">\U0001f4cb 打印</button>
        <div id="printExportMenu" style="display:none;position:absolute;top:110%;right:0;background:var(--surface);border:1px solid var(--border-strong);border-radius:12px;box-shadow:var(--shadow-lg);padding:6px;z-index:50;min-width:180px">
          <button data-action="print-current" style="display:block;width:100%;padding:8px 14px;border:none;background:none;color:var(--text);font-size:0.82rem;cursor:pointer;text-align:left;border-radius:8px">\U0001f5a8 打印当前单词表</button>
          <button data-action="print-star" style="display:block;width:100%;padding:8px 14px;border:none;background:none;color:var(--text);font-size:0.82rem;cursor:pointer;text-align:left;border-radius:8px">⭐ 打印星标单词表</button>
          <button data-action="export" style="display:block;width:100%;padding:8px 14px;border:none;background:none;color:var(--text);font-size:0.82rem;cursor:pointer;text-align:left;border-radius:8px">\U0001f4e5 导出 data.js</button>
        </div>
      </div>
    </div>'''
R(old_toolbar, new_toolbar)

# === DICTATION: Add pause button ===
R(
    '<button class="btn-primary" id="btnDictStart" style="width:auto;padding:10px 32px">开始听写</button>\n'
    '        <button class="btn-ghost" id="btnDictReveal" style="width:auto;display:none">显示答案</button>',
    '<button class="btn-primary" id="btnDictStart" style="width:auto;padding:10px 32px">开始听写</button>\n'
    '        <button class="btn-ghost" id="btnDictPause" style="width:auto;display:none">⏸ 暂停</button>\n'
    '        <button class="btn-ghost" id="btnDictReveal" style="width:auto;display:none">\U0001f4cb 显示答案</button>'
)

# === DICTATION: Replace checkboxes with range buttons ===
R(
    '<div class="dict-ctl-row">\n'
    '          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.95rem">\n'
    '            <input type="checkbox" id="dictStarOnly" style="width:18px;height:18px">\n'
    '            <span>只听取星标单词</span>\n'
    '          </label>\n'
    '          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.95rem">\n'
    '            <input type="checkbox" id="dictPhraseOnly" style="width:18px;height:18px">\n'
    '            <span>只听写短语（跳过单词和专有名词）</span>\n'
    '          </label>\n'
    '        </div>',
    '<div class="dict-ctl-row">\n'
    '          <span class="dict-ctl-label">听写范围</span>\n'
    '          <div class="dict-num-btns" id="dictRangeBtns">\n'
    '            <button data-range="all" class="active">所有单词</button>\n'
    '            <button data-range="star">星标单词</button>\n'
    '            <button data-range="phrase">仅短语</button>\n'
    '          </div>\n'
    '        </div>\n'
    '        <div class="dict-ctl-row">\n'
    '          <span class="dict-ctl-label">听写模式</span>\n'
    '          <div class="dict-num-btns" id="dictSpeakModeBtns">\n'
    '            <button data-spk="en" class="active">听英写中</button>\n'
    '            <button data-spk="cn">听中写英</button>\n'
    '          </div>\n'
    '        </div>'
)

# === DICTATION: Add "全部" quantity option ===
R(
    '<button data-n="20">20</button>\n'
    '          </div>',
    '<button data-n="20">20</button>\n'
    '            <button data-n="0">全部</button>\n'
    '          </div>'
)

# === Update dictStatus text ===
R(
    '<p style="color:var(--text-secondary);font-size:1rem;text-align:center" id="dictStatus">准备听写，随机抽取 15 个单词</p>',
    '<p style="color:var(--text-secondary);font-size:1rem;text-align:center" id="dictStatus">准备听写：随机抽取 15 个单词</p>'
)

# === CSS: Add missing styles ===
R(
    '.dict-btn-main:hover { opacity: 0.85; transform: scale(1.05); }',
    '.dict-btn-main:hover { opacity: 0.85; transform: scale(1.05); }\n'
    '.dict-ctl-label { font-size: 0.9rem; color: var(--text-secondary); }\n'
    '#printExportMenu button:hover { background: var(--primary-light) !important; color: var(--primary); }'
)

# === JS: Add missing variables and handlers ===
# dictSpeakModeBtns handler
R(
    "let dictWordCount = 15, dictSeqMode = false, dictRange = 'all';",
    "let dictWordCount = 15, dictSeqMode = false, dictRange = 'all', dictSpeakCN = false;"
)

# Add dictSpeakModeBtns handler
old_range = "$('#dictRangeBtns button').forEach(b => {"
new_range = (
    "$('#dictSpeakModeBtns button').forEach(b => {\n"
    "      b.classList.toggle('active', (b.dataset.spk === 'cn') === dictSpeakCN);\n"
    "      b.addEventListener('click', () => {\n"
    "        dictSpeakCN = b.dataset.spk === 'cn';\n"
    "        $$('#dictSpeakModeBtns button').forEach(x => x.classList.remove('active'));\n"
    "        b.classList.add('active');\n"
    "        updateDictStatus();\n"
    "      });\n"
    "    });\n"
    "    $('#dictRangeBtns button').forEach(b => {"
)
R(old_range, new_range)

# Update dictStatus message
R(
    "dictStatus.textContent = `准备听写：随机抽取 ${dictWordCount} 个单词`;",
    "const range = dictRange === 'star' ? '星标 \\u00b7 ' : (dictRange === 'phrase' ? '短语 \\u00b7 ' : '');\n"
    "    const countLabel = dictWordCount === 0 ? '全部' : dictWordCount + ' 个';\n"
    "    const modeLabel = dictSpeakCN ? '听中写英' : '听英写中';\n"
    "    dictStatus.textContent = `准备听写[${modeLabel}]：${range}${countLabel}单词`;"
)

# Handle dictWordCount = 0 as "all"
R("const targetCount = dictWordCount === 0 ? pool.length : dictWordCount;", "// placeholder")

# Content mode handlers
R(
    "const shuffleModeCb = $('#shuffleMode'), autoLoopCb = $('#autoLoop'), contentModeBtns = $('#contentModeBtns');",
    "const shuffleModeCb = $('#shuffleMode'), autoLoopCb = $('#autoLoop');\n"
    "  const contentModeBtns = $('#contentModeBtns');"
)

# Print/export menu handler
old_print = "$('#btnImport').addEventListener('click', openImportModal);"
new_print = (
    "$('#btnImport').addEventListener('click', openImportModal);\n"
    "    const printMenu = $('#printExportMenu');\n"
    "    $('#btnPrintExport').addEventListener('click', (e) => {\n"
    "      e.stopPropagation(); printMenu.style.display = printMenu.style.display === 'none' ? 'block' : 'none';\n"
    "    });\n"
    "    document.addEventListener('click', () => { printMenu.style.display = 'none'; });\n"
    "    printMenu.addEventListener('click', (e) => {\n"
    "      e.stopPropagation(); const act = e.target.closest('button')?.dataset.action;\n"
    "      if (!act) return; printMenu.style.display = 'none';\n"
    "      if (act === 'print-current') { window.print(); }\n"
    "      else if (act === 'print-star') {\n"
    "        const wasFav = favFilter; if (!wasFav) { favFilter = true; renderWordList(); }\n"
    "        setTimeout(() => { window.print(); if (!wasFav) { favFilter = false; setTimeout(renderWordList, 300); } }, 200);\n"
    "      } else if (act === 'export') { exportDataFile(); }\n"
    "    });"
)
R(old_print, new_print)

# Remove old btnFavPrint reference
R(
    "$('#btnFavPrint').addEventListener('click', () => window.print());\n    $('#btnWorksheet')",
    "$('#btnWorksheet')"
)

# Print columns toggle
R(
    "$('#printHint').style.display = hasWords ? '' : 'none';\n    renderWordList();",
    "$('#printHint').style.display = hasWords ? '' : 'none';\n    wordListPanel.classList.toggle('cols-2', total > 45);\n    renderWordList();"
)

# toggleFavFilter - remove btnFavPrint reference
R(
    "$('#btnFavPrint').style.display = favFilter && cnt > 0 ? '' : 'none';\n    renderWordList();",
    "renderWordList();"
)

# Dictation speak twice for both modes
old_speak = "if (dictSpeakCN) {\n        await speak(w.zh, 'zh-CN');\n        await delay(2000);\n      } else {\n        await speak(w.en, 'en-US');\n        await delay(1500);\n        await speak(w.en, 'en-US');\n        await delay(1500);\n      }"
new_speak = "if (dictSpeakCN) {\n        await speak(w.zh, 'zh-CN');\n        await delay(1800);\n        await speak(w.zh, 'zh-CN');\n        await delay(1800);\n      } else {\n        await speak(w.en, 'en-US');\n        await delay(1500);\n        await speak(w.en, 'en-US');\n        await delay(1500);\n      }"
R(old_speak, new_speak)

# Pause/resume btnStart sync
R(
    "function pauseReading() {\n    isPlaying = false; speechSynthesis.cancel(); speechPending = false;\n    btnPlay.innerHTML = '▶'; btnPlay.classList.remove('pause');\n    wordCard.classList.remove('active'); updateUI();\n  }",
    "function pauseReading() {\n    isPlaying = false; speechSynthesis.cancel(); speechPending = false;\n    btnStart.textContent = '继续朗读'; btnStart.classList.remove('stop');\n    btnPlay.innerHTML = '▶'; btnPlay.classList.remove('pause');\n    wordCard.classList.remove('active'); updateUI();\n  }"
)
R(
    "function resumeReading() {\n    if (playlist.length === 0) return;\n    if (currentIndex < 0) currentIndex = 0;\n    currentRepeat = 0;\n    isPlaying = true; speechPending = false;\n    btnPlay.innerHTML = '❚❚'; btnPlay.classList.add('pause');\n    wordCard.classList.add('active'); updateUI();\n    speakCurrentWord();\n  }",
    "function resumeReading() {\n    if (playlist.length === 0) return;\n    if (currentIndex < 0) currentIndex = 0;\n    currentRepeat = 0;\n    isPlaying = true; speechPending = false;\n    btnStart.textContent = '停止'; btnStart.classList.add('stop');\n    btnPlay.innerHTML = '❚❚'; btnPlay.classList.add('pause');\n    wordCard.classList.add('active'); updateUI();\n    speakCurrentWord();\n  }"
)

# JS: Add wordPos clear in updateWordDisplay empty state
R(
    "wordCard.querySelector('.word-en').textContent = '\U0001f44b';\n      wordPhonetic.textContent = '';\n      wordZh.textContent = '选择单元后开始早读';",
    "wordCard.querySelector('.word-en').textContent = '\U0001f44b';\n      wordPhonetic.textContent = '';\n      wordPos.textContent = '';\n      wordZh.textContent = '选择单元后开始早读';"
)

# JS: wordPos clear in dictation
R(
    "wordCard.querySelector('.word-en').textContent = '\U0001f50a';\n      wordPhonetic.textContent = '';\n      wordZh.textContent = String(i + 1).padStart(2, '0');",
    "wordCard.querySelector('.word-en').textContent = '\U0001f50a';\n      wordPhonetic.textContent = '';\n      wordPos.textContent = '';\n      wordZh.textContent = String(i + 1).padStart(2, '0');"
)
R(
    "wordCard.classList.remove('active');\n    wordCard.querySelector('.word-en').textContent = '✅';\n    wordZh.textContent = '听写完毕';",
    "wordCard.classList.remove('active');\n    wordCard.querySelector('.word-en').textContent = '✅';\n    wordPos.textContent = '';\n    wordZh.textContent = '听写完毕';"
)

# dictWordCount "全部" button handling
old_n = "b.classList.toggle('active', parseInt(b.dataset.n) === dictWordCount);"
new_n = "const n = parseInt(b.dataset.n); b.classList.toggle('active', n === dictWordCount || (n === 0 && dictWordCount === 0));"
R(old_n, new_n)
R(
    "dictWordCount = parseInt(b.dataset.n);",
    "dictWordCount = n;"
)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)
print(f'Applied {count} changes')
