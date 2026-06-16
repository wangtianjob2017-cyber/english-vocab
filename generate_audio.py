#!/usr/bin/env python3
"""
Generate MP3 audio files for all English words using Youdao (有道) TTS.
Natural-sounding voice, free, no API key needed.

Usage:
  python generate_audio.py --dry-run   # list missing files
  python generate_audio.py             # download missing files
"""

import argparse
import os
import re
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
    seen_files = set()
    for match in re.finditer(r'en:\s*"([^"]+)"', content):
        word = match.group(1)
        filename = safe_filename(word)
        if filename not in seen_files:
            seen_files.add(filename)
            words.append(word)
    return words

def safe_filename(word):
    """Convert a word/phrase to a safe filename"""
    name = word.lower().strip()
    name = re.sub(r'[^a-z0-9\s-]', '', name)
    name = re.sub(r'\s+', '_', name)
    name = name.replace('-', '_')
    return name + '.mp3'

def tts_variants(word):
    """Build TTS-friendly query variants while keeping the original filename."""
    variants = []

    def add(text):
        text = re.sub(r'\s+', ' ', text).strip()
        if text and text not in variants:
            variants.append(text)

    add(word)

    cleaned = word
    cleaned = cleaned.replace('...', ' ')
    cleaned = cleaned.replace('sb/sth', 'somebody or something')
    cleaned = cleaned.replace("sb's", "somebody's")
    cleaned = re.sub(r'\bsb\b', 'somebody', cleaned)
    cleaned = re.sub(r'\bsth\b', 'something', cleaned)
    cleaned = cleaned.replace('/', ' or ')
    cleaned = re.sub(r'[()!,]', ' ', cleaned)
    add(cleaned)

    without_optional = re.sub(r'\([^)]*\)', ' ', word)
    without_optional = without_optional.replace('...', ' ')
    without_optional = without_optional.replace("sb's", "somebody's")
    without_optional = re.sub(r'\bsb\b', 'somebody', without_optional)
    without_optional = re.sub(r'\bsth\b', 'something', without_optional)
    without_optional = without_optional.replace('/', ' or ')
    without_optional = re.sub(r'[!,]', ' ', without_optional)
    add(without_optional)

    simple = word
    simple = simple.replace('...', ' ')
    simple = re.sub(r'\([^)]*\)', ' ', simple)
    simple = re.sub(r'\bsb\b|\bsth\b', 'someone', simple)
    simple = re.sub(r'[/!,]', ' ', simple)
    add(simple)

    return variants

def download_word(word, filepath):
    """Download MP3 audio from Youdao for a single word"""
    last_error = None
    for query in tts_variants(word):
        encoded = urllib.parse.quote(query)
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
                        if query != word:
                            print(f"\n  OK '{word}' via '{query}'")
                        return True
        except Exception as e:
            last_error = e

    if last_error:
        print(f"\n  ERROR '{word}': {last_error}")
    else:
        print(f"\n  ERROR '{word}': no valid audio returned")
    return False

def main():
    parser = argparse.ArgumentParser(description='Generate missing MP3 files for data.js words.')
    parser.add_argument('--dry-run', action='store_true', help='Only list missing audio files; do not download.')
    args = parser.parse_args()

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

    if args.dry_run:
        print(f"Missing {len(to_generate)} MP3 files:")
        for word, fname in to_generate:
            print(f"  {fname}  <-  {word}")
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
