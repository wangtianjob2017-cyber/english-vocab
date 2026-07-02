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
import shutil
import subprocess
import time
import urllib.request
import urllib.parse

AUDIO_DIR = 'audio'
DATA_FILE = 'data.js'

# Youdao TTS: type=0 American English, type=1 British English
YOUDUO_URL = 'https://dict.youdao.com/dictvoice?audio={word}&type=0'

MANUAL_TTS_VARIANTS = {
    'Malee': ['Mali', 'Molly'],
    'fight against sb/sth': ['fight against somebody', 'fight against something'],
    'be connected with/to': ['be connected with', 'be connected to'],
    'be home to sb/sth': ['be home to somebody', 'be home to something'],
    'cut sth in/into sth': ['cut something in two', 'cut something into something'],
    'along with sb/sth': ['along with somebody', 'along with something'],
    'have (...) to do with sb/sth': ['have to do with somebody', 'have to do with something'],
    'mini-goal': ['mini goal'],
    'depend on/upon': ['depend on', 'depend upon'],
    'shut sb/sth away': ['shut somebody away', 'shut something away'],
    'be/get used to': ['be used to', 'get used to'],
    'Ji-Hoon': ['Ji Hoon'],
    'Isambard Brunel': ['Isambard Kingdom Brunel', 'Isambard Brunel'],
    'I.M. Pei': ['I M Pei', 'Ieoh Ming Pei'],
    'Irène': ['Irene'],
    "in sb's case": ["in somebody's case"],
    'divide sth into': ['divide something into'],
    'be supposed to do/be sth': ['be supposed to do something', 'be supposed to be something'],
    'responsible for sth': ['responsible for something'],
    'be looking to do sth': ['be looking to do something'],
    'Alexander Bell': ['Alexander Graham Bell', 'Alexander Bell'],
    'Spencer Silver': ['Spencer Silver'],
    'dance to': ['dance to music'],
    'make up ground on sb/sth': ['make up ground on somebody', 'make up ground on something'],
    'Eric Moussambani': ['Eric Moussambani'],
    'Sham El-Nessim': ['Sham el Nessim'],
    'skilled in': ['skilled in something'],
    'Great Pyramid': ['the Great Pyramid'],
    'Hong Kong SAR, China': ['Hong Kong S A R China', 'Hong Kong China'],
    'Astor Garden Court': ['Astor Garden Court'],
    'worth doing sth': ['worth doing something'],
    'Hauptschule': ['Haupt Schule', 'Hauptschule'],
}

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
    """Convert a word/phrase to a safe MP3 filename"""
    return safe_stem(word) + '.mp3'

def safe_stem(word):
    """Convert a word/phrase to a safe filename"""
    name = word.lower().strip()
    name = re.sub(r'[^a-z0-9\s-]', '', name)
    name = re.sub(r'\s+', '_', name)
    name = name.replace('-', '_')
    return name

def wav_filename(word):
    """Convert a word/phrase to a safe WAV filename"""
    return safe_stem(word) + '.wav'

def m4a_filename(word):
    """Convert a word/phrase to a safe M4A filename"""
    return safe_stem(word) + '.m4a'

def tts_variants(word):
    """Build TTS-friendly query variants while keeping the original filename."""
    variants = []

    def add(text):
        text = re.sub(r'\s+', ' ', text).strip()
        if text and text not in variants:
            variants.append(text)

    add(word)

    for variant in MANUAL_TTS_VARIANTS.get(word, []):
        add(variant)

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

def macos_say_text(word):
    """Choose the most natural local TTS text for macOS say."""
    for variant in tts_variants(word):
        if variant != word:
            return variant
    return word

def generate_word_with_macos_say(word, filepath):
    """Generate a local audio fallback with macOS say + afconvert."""
    if not shutil.which('say') or not shutil.which('afconvert'):
        return False

    text = macos_say_text(word)
    tmp_aiff = filepath + '.aiff'
    say_attempts = [
        ['say', '-v', 'Samantha', '-o', tmp_aiff, text],
        ['say', '-o', tmp_aiff, text],
    ]

    try:
        for cmd in say_attempts:
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
            if result.returncode == 0 and os.path.exists(tmp_aiff):
                break
        else:
            return False

        if filepath.endswith('.m4a'):
            convert_cmd = ['afconvert', '-f', 'm4af', '-d', 'aac', tmp_aiff, filepath]
        else:
            convert_cmd = ['afconvert', '-f', 'WAVE', '-d', 'LEI16', tmp_aiff, filepath]
        result = subprocess.run(convert_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30)
        if result.returncode == 0 and os.path.exists(filepath) and os.path.getsize(filepath) > 500:
            print(f"\n  OK '{word}' via macOS say: '{text}'")
            return True
        return False
    except Exception as e:
        print(f"\n  ERROR macOS say '{word}': {e}")
        return False
    finally:
        if os.path.exists(tmp_aiff):
            os.remove(tmp_aiff)

def main():
    parser = argparse.ArgumentParser(description='Generate missing MP3 files for data.js words.')
    parser.add_argument('--dry-run', action='store_true', help='Only list missing audio files; do not download.')
    args = parser.parse_args()

    words = extract_words()
    print(f"Found {len(words)} unique words")

    os.makedirs(AUDIO_DIR, exist_ok=True)

    existing = set(os.listdir(AUDIO_DIR)) if os.path.exists(AUDIO_DIR) else set()

    to_generate = []
    for word in words:
        mp3_name = safe_filename(word)
        m4a_name = m4a_filename(word)
        wav_name = wav_filename(word)
        if mp3_name in existing or m4a_name in existing or wav_name in existing:
            continue
        to_generate.append((word, mp3_name, m4a_name, wav_name))

    if not to_generate:
        print("All audio files already exist!")
        return

    if args.dry_run:
        print(f"Missing {len(to_generate)} local audio files:")
        for word, mp3_name, m4a_name, wav_name in to_generate:
            print(f"  {mp3_name} or {m4a_name} or {wav_name}  <-  {word}")
        return

    print(f"Downloading {len(to_generate)} MP3s from Youdao (有道), then using macOS say for failures...")
    print(f"Output: {os.path.abspath(AUDIO_DIR)}/")
    print()

    success = 0
    failed = 0
    fallback_success = 0

    for i, (word, mp3_name, m4a_name, wav_name) in enumerate(to_generate):
        filepath = os.path.join(AUDIO_DIR, mp3_name)
        ok = download_word(word, filepath)
        if not ok:
            fallback_path = os.path.join(AUDIO_DIR, m4a_name)
            ok = generate_word_with_macos_say(word, fallback_path)
            if ok:
                fallback_success += 1
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
    print(f"Done! {success} local audio files created ({fallback_success} local fallback), {failed} failed.")
    print(f"Audio files in: {os.path.abspath(AUDIO_DIR)}/")

if __name__ == '__main__':
    main()
