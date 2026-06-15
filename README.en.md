# Junior High English Vocabulary Master

A word reading and dictation tool for PEP (2024 New Edition) junior high school English textbooks.

## Features

- 📖 **Word Reading** — Read words from Grades 7-9, multi-unit selection
- ✍️ **Dictation Mode** — Random/sequential word dictation with star & phrase filters
- 🎯 **Random Student Picker** — Randomly select student IDs for focused testing
- 🔤 **Spelling Mode** — Letter-by-letter spelling to aid memorization
- ⭐ **Favorites** — Mark and review key vocabulary
- 🌓 **Dark Mode** — Eye-friendly for night use
- 📱 **PWA Support** — Add to home screen, full offline capability

## Usage

### Local Server (Recommended)

1. Double-click `启动服务器.bat` to start the local server
2. Open the displayed URL in your browser (e.g., `http://192.168.x.x:8888`)

### Direct Open

Open `index.html` directly in your browser — TTS uses the browser's built-in speech synthesis, fully offline-capable.

### Mobile Access

1. Start the server on your computer, ensure both devices are on the same WiFi
2. Open the computer's IP + port 8888 on your phone browser
3. Add to home screen for PWA experience

## TTS

- Uses browser-native speech synthesis — **fully offline**, no external API dependency
- Falls back to online TTS (Youdao/Baidu) only when speechSynthesis is unavailable
- Select different English voices in settings
- If local `audio/` MP3 files exist, English playback uses them first; this folder is large and ignored by Git

## Maintenance

Main files:

- `index.html` — page structure
- `styles.css` — visual styles
- `app.js` — interaction logic
- `data.js` — vocabulary data
- `syllables.js` — syllable display dictionary
- `sw.js` — PWA/offline cache

Run health checks:

```bash
python3 -B health_check.py
```

List missing audio:

```bash
python3 generate_audio.py --dry-run
```

Download missing audio:

```bash
python3 generate_audio.py
```

The `audio/` folder is not committed to Git. If you deploy the site and want local MP3 playback, upload `audio/` together with the web files. Without it, the app falls back to browser TTS or online audio.

## Author

Alison
