#!/usr/bin/env python3
"""Build drill/verbs.json from renshuu_export.json: the verbs you have studied.

Only what the drill needs is written. Profile data and study history stay out.

Usage:  python scripts/build_verbs.py
"""
import collections
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "renshuu_export.json"
TARGET = ROOT / "drill" / "verbs.json"

# The export defines 携帯 as "téléphone portable", which is wrong for 携帯する.
# This hand-written table holds the verb's meaning, keyed by the export's spelling.
SURU_MEANINGS = json.loads((ROOT / "scripts" / "suru_meanings.json").read_text(encoding="utf-8"))
NO_VERB_MEANING = "sans する : "  # marks a definition that describes the word alone


def classify(typeofspeech):
    """Map Renshuu's part-of-speech label to a verb class, or None if not a verb.

    Never match on a bare "verb": "adverb" contains it.
    """
    label = typeofspeech or ""
    godan = re.search(r"Godan verb - (\S)", label)
    if godan:
        return f"godan-{godan.group(1)}"
    if "Ichidan" in label:
        return "ichidan"
    if "Special る verb" in label:
        return "honorific"
    if re.search(r"(^|[(/])す verb", label):
        return "godan-す"
    if re.search(r"(^|[(/])くる verb", label):
        return "kuru"
    if re.fullmatch(r"\(する verb(/[a-z,]+)?\)", label):
        return "suru"
    if "する verb" in label:
        return "suru-noun"
    return None


def is_known(term):
    data = term.get("user_data") or {}
    return (data.get("correct_count") or 0) > 0 or float(data.get("mastery_avg_perc") or 0) > 0


def to_entry(term, verb_class):
    kanji = term.get("kanji_full") or ""
    reading = term["hiragana_full"]
    defs = term["def"][:2]
    if verb_class == "suru-noun":  # the export stores the noun alone
        meaning = SURU_MEANINGS.get(kanji or reading)
        defs = [meaning] if meaning else [NO_VERB_MEANING + defs[0], *defs[1:]]
        kanji = f"{kanji}する" if kanji else ""
        reading = f"{reading}する"
    return {
        "id": term["id"],
        "kanji": kanji,
        "reading": reading,
        "class": verb_class,
        "defs": defs,
        "kanaFirst": "common-hiragana" in term.get("config", []),
    }


def main():
    if not SOURCE.exists():
        sys.exit(f"{SOURCE.name} not found. Run renshuu_export.py first.")
    export = json.loads(SOURCE.read_text(encoding="utf-8"))

    terms = {}  # the same term appears in several schedules
    for schedule in export["schedules"]:
        if schedule.get("booktype") == "vocab":
            for term in schedule["terms_list"]:
                terms.setdefault(term["id"], term)

    # 勉強 and 勉強する are separate terms but the same verb once する is appended.
    # Keep one, preferring the standalone verb's own definitions.
    by_spelling = {}
    for term in terms.values():
        verb_class = classify(term.get("typeofspeech"))
        if verb_class and is_known(term):
            entry = to_entry(term, verb_class)
            key = (entry["kanji"], entry["reading"])
            if key not in by_spelling or by_spelling[key]["class"] == "suru-noun":
                by_spelling[key] = entry
    verbs = list(by_spelling.values())

    TARGET.parent.mkdir(exist_ok=True)
    TARGET.write_text(json.dumps(verbs, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    sys.stdout.reconfigure(encoding="utf-8")
    for name, count in sorted(collections.Counter(v["class"] for v in verbs).items()):
        print(f"{name:12} {count}")
    print(f"{'total':12} {len(verbs)}  -> {TARGET.relative_to(ROOT)}")

    missing = [v["reading"] for v in verbs if v["defs"][0].startswith(NO_VERB_MEANING)]
    if missing:
        print(f"No verb meaning in scripts/suru_meanings.json yet: {', '.join(missing)}")


if __name__ == "__main__":
    main()
