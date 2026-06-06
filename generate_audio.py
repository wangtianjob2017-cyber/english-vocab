#!/usr/bin/env python3
"""
Generate MP3 audio files for all English words using Youdao (有道) TTS.
Natural-sounding voice, free, no API key needed.

Usage:
  python generate_audio.py
"""

import os
import re
import sys
import time
import urllib.request
import urllib.parse

AUDIO_DIR = 'audio'
DATA_FILE = 'data.js'

# Youdao TTS: type=0 American English, type=1 British English
YOUDUO_URL = 'https://dict.youdao.com/dictvoice?audio={word}&type=0'

def extract_words():
    """Extract all English words from data.js"""
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        content = f.read()

    words = []
    for match in re.finditer(r'en:\s*"([^"]+)"', content):
        word = match.group(1)
        if word not in words:
            words.append(word)
    return words

def safe_filename(word):
    """Convert a word/phrase to a safe filename"""
    name = word.lower().strip()
    name = re.sub(r'[^a-z0-9\s-]', '', name)
    name = re.sub(r'[\s-]+', '_', name)
    name = name.strip('_')
    return name + '.mp3'

def download_word(word, filepath):
    """Download MP3 audio from Youdao for a single word"""
    encoded = urllib.parse.quote(word)
    url = YOUDUO_URL.format(word=encoded)

    try:
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0')
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status == 200:
                data = resp.read()
                if len(data) > 500:  # valid MP3 should be > 500 bytes
                    with open(filepath, 'wb') as f:
                        f.write(data)
                    return True
        return False
    except Exception as e:
        print(f"\n  ERROR '{word}': {e}")
        return False

def main():
    words = extract_words()
    print(f"Found {len(words)} unique words")

    os.makedirs(AUDIO_DIR, exist_ok=True)

    # Remove old WAV files
    for f in os.listdir(AUDIO_DIR):
        if f.endswith('.wav'):
            os.remove(os.path.join(AUDIO_DIR, f))
    print("Cleaned old WAV files")

    existing = set(os.listdir(AUDIO_DIR)) if os.path.exists(AUDIO_DIR) else set()

    to_generate = []
    for word in words:
        fname = safe_filename(word)
        if fname in existing:
            continue
        to_generate.append((word, fname))

    if not to_generate:
        print("All audio files already exist!")
        return

    print(f"Downloading {len(to_generate)} MP3s from Youdao (有道)...")
    print(f"Output: {os.path.abspath(AUDIO_DIR)}/")
    print()

    success = 0
    failed = 0

    for i, (word, fname) in enumerate(to_generate):
        filepath = os.path.join(AUDIO_DIR, fname)
        ok = download_word(word, filepath)
        if ok:
            success += 1
        else:
            failed += 1

        # Progress every 20 words
        if (i + 1) % 20 == 0:
            pct = (i + 1) / len(to_generate) * 100
            print(f"\r  {i+1}/{len(to_generate)} ({pct:.0f}%) — {success} OK, {failed} failed", end='', flush=True)

        # Small delay to avoid rate limiting
        time.sleep(0.15)

    print()
    print()
    print(f"Done! {success} files downloaded, {failed} failed.")
    print(f"Audio files in: {os.path.abspath(AUDIO_DIR)}/")

if __name__ == '__main__':
    main()
