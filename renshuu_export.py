#!/usr/bin/env python3
"""Export Renshuu study data to JSON + a compact text file for LLM context.

Usage:  put RENSHUU_API_KEY=xxxx in a .env file next to this script (see
.env.example) or set it as an environment variable, then run
python renshuu_export.py
"""
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://api.renshuu.org/v1"
PAGE_DELAY = 0.4  # stay well under the daily call allowance


def load_key():
    """Read the API key from the environment, falling back to a local .env file."""
    key = os.environ.get("RENSHUU_API_KEY", "").strip()
    if key:
        return key
    env_file = Path(__file__).resolve().with_name(".env")
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8-sig").splitlines():
            name, sep, value = line.partition("=")
            if sep and name.strip() == "RENSHUU_API_KEY":
                return value.strip().strip("\"'")
    return ""


KEY = load_key()


def get(path, **params):
    url = f"{BASE}{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {KEY}"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code} on {url}\n{e.read()[:300].decode(errors='replace')}",
              file=sys.stderr)
        raise


def fetch_terms(schedule_id):
    """Walk /schedule/{id}/list, which paginates via ?pg= and reports total_pg."""
    terms, page = [], 1
    while True:
        contents = get(f"/schedule/{schedule_id}/list", pg=page, group="all").get("contents", {})
        terms.extend(contents.get("terms", []))
        if page >= int(contents.get("total_pg", 1)):
            break
        page += 1
        time.sleep(PAGE_DELAY)
    return terms


def label(t):
    """Human-readable form, whatever the term type."""
    for k in ("kanji_full", "kanji", "title", "japanese", "term"):
        if t.get(k):
            return str(t[k])
    return "?"


def mastery(t):
    return int(float((t.get("user_data") or {}).get("mastery_avg_perc", 0) or 0))


def main():
    if not KEY:
        sys.exit("Set RENSHUU_API_KEY in .env or the environment "
                 "(Renshuu > menu > Tools > Renshuu API).")

    export = {"profile": get("/profile"), "schedules": []}

    for s in get("/schedule").get("schedules", []):
        terms = fetch_terms(s["id"])
        export["schedules"].append({**s, "terms_list": terms})
        print(f"{s['name']} ({s.get('booktype')}): {len(terms)} terms", file=sys.stderr)
        time.sleep(PAGE_DELAY)

    with open("renshuu_export.json", "w", encoding="utf-8") as f:
        json.dump(export, f, ensure_ascii=False, indent=2)

    # Compact version: studied terms only, grouped by schedule, cheap to paste.
    with open("renshuu_known.txt", "w", encoding="utf-8") as f:
        for s in export["schedules"]:
            known = [t for t in s["terms_list"] if mastery(t) > 0]
            f.write(f"## {s['name']} [{s.get('booktype')}] - {len(known)} studied\n")
            f.write(" ".join(f"{label(t)}({mastery(t)}%)" for t in known) + "\n\n")

    print("Wrote renshuu_export.json and renshuu_known.txt", file=sys.stderr)


if __name__ == "__main__":
    main()