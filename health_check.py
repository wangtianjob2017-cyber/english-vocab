#!/usr/bin/env python3
"""Lightweight project health checks for the vocabulary app."""

from collections import Counter
import argparse
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent
INDEX = ROOT / "index.html"
DATA = ROOT / "data.js"
SYLLABLES = ROOT / "syllables.js"
MANIFEST = ROOT / "manifest.json"
SERVICE_WORKER = ROOT / "sw.js"
AUDIO_DIR = ROOT / "audio"
REPORT = ROOT / "reports" / "health-report.md"


def audio_name(word):
    name = word.lower().strip()
    name = re.sub(r"[^a-z0-9\s-]", "", name)
    name = re.sub(r"[\s-]+", "_", name)
    return name


def extract_entries(data_text):
    entries = []
    current_grade = ""
    current_unit = ""
    for line_no, line in enumerate(data_text.splitlines(), 1):
        key_match = re.match(r'\s*"([^"]+)":\s*\{\s*$', line)
        if key_match:
            key = key_match.group(1)
            if key.startswith(("七年级", "八年级", "九年级")):
                current_grade = key
                current_unit = ""
            else:
                current_unit = key

        word_match = re.search(r'\{\s*en:\s*"([^"]+)"\s*,\s*zh:\s*"([^"]*)"(.*?)\}', line)
        if word_match:
            entries.append({
                "line": line_no,
                "grade": current_grade,
                "unit": current_unit,
                "en": word_match.group(1),
                "zh": word_match.group(2),
                "rest": word_match.group(3),
            })
    return entries


def main():
    parser = argparse.ArgumentParser(description="Run project health checks.")
    parser.add_argument("--report", action="store_true", help="Write reports/health-report.md")
    args = parser.parse_args()

    errors = []
    warnings = []
    report_lines = ["# Health Report", ""]

    for path in [INDEX, DATA, SYLLABLES, MANIFEST]:
      if not path.exists():
          errors.append(f"Missing required file: {path.name}")

    if not errors:
        index_text = INDEX.read_text(encoding="utf-8")
        data_text = DATA.read_text(encoding="utf-8")
        referenced_assets = re.findall(r'<(?:script src|link rel="stylesheet" href)="([^"]+)"', index_text)
        app_text = ""

        for asset in referenced_assets:
            asset_path = ROOT / asset
            if not asset_path.exists():
                errors.append(f"index.html references missing asset: {asset}")
            elif asset.endswith(".js") and asset not in {"data.js", "syllables.js"}:
                app_text += asset_path.read_text(encoding="utf-8") + "\n"

        if "navigator.serviceWorker.register('sw.js')" in index_text and not SERVICE_WORKER.exists():
            errors.append("index.html registers sw.js, but sw.js is missing")

        if re.search(r"(?<![\w$])dailyGoal\s*=", index_text + "\n" + app_text):
            errors.append("index.html writes dailyGoal, but the app no longer defines that setting")

        entries = extract_entries(data_text)
        if not entries:
            errors.append("No vocabulary entries found in data.js")

        words = [entry["en"] for entry in entries]
        normalized = [word.lower() for word in words]
        unit_words = Counter((entry["grade"], entry["unit"], entry["en"].lower()) for entry in entries)
        unit_duplicates = [(grade, unit, word, count) for (grade, unit, word), count in unit_words.items() if count > 1]
        if unit_duplicates:
            sample = ", ".join(f"{grade}/{unit}/{word} x{count}" for grade, unit, word, count in unit_duplicates[:8])
            warnings.append(f"Duplicate English entries in the same unit: {len(unit_duplicates)} groups ({sample})")

        missing_phonetic = [entry["en"] for entry in entries if "phonetic:" not in entry["rest"]]
        if missing_phonetic:
            warnings.append(f"Entries missing phonetic: {len(missing_phonetic)} ({', '.join(missing_phonetic[:12])})")
            report_lines += ["## Missing Phonetic", ""]
            report_lines += [f"- {word}" for word in missing_phonetic]
            report_lines.append("")

        missing_pos = [entry["en"] for entry in entries if "pos:" not in entry["rest"]]
        if missing_pos:
            warnings.append(f"Entries missing part of speech: {len(missing_pos)} ({', '.join(missing_pos[:12])})")

        if AUDIO_DIR.exists():
            audio_files = {path.stem for path in AUDIO_DIR.glob("*.mp3")}
            audio_files.update(path.stem for path in AUDIO_DIR.glob("*.m4a"))
            audio_files.update(path.stem for path in AUDIO_DIR.glob("*.wav"))
            missing_audio = [word for word in words if audio_name(word) not in audio_files]
            if missing_audio:
                warnings.append(f"Entries missing local audio: {len(missing_audio)} ({', '.join(missing_audio[:12])})")
                report_lines += ["## Missing Local Audio", ""]
                report_lines += [f"- `{audio_name(word)}.mp3` or `{audio_name(word)}.m4a` or `{audio_name(word)}.wav` <- {word}" for word in missing_audio]
                report_lines.append("")
        else:
            warnings.append("audio/ directory is absent; English playback will use TTS/fallback audio")

        print(f"Vocabulary entries: {len(entries)}")
        print(f"Unique English entries: {len(set(normalized))}")
        report_lines[1:1] = [
            "",
            f"- Vocabulary entries: {len(entries)}",
            f"- Unique English entries: {len(set(normalized))}",
            f"- Warnings: {len(warnings)}",
            f"- Errors: {len(errors)}",
            "",
        ]

    if warnings:
        print("\nWarnings:")
        for warning in warnings:
            print(f"  - {warning}")

    if errors:
        print("\nErrors:")
        for error in errors:
            print(f"  - {error}")
        return 1

    if args.report:
        REPORT.parent.mkdir(exist_ok=True)
        if len(report_lines) <= 8:
            report_lines += ["No outstanding data warnings.", ""]
        REPORT.write_text("\n".join(report_lines), encoding="utf-8")
        print(f"\nReport written: {REPORT.relative_to(ROOT)}")

    print("\nHealth check passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
