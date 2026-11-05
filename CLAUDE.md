# Renshuu.Tools

Personal tools built on a Renshuu study data export: an export script and a conjugation drill published as a private Claude artifact. The code uses Python and Node standard libraries only, plus WanaKana from a CDN in the drill. There is no framework, package manager or build step.

## Layout

- `renshuu_export.py`: calls the Renshuu API, writes `renshuu_export.json` and `renshuu_known.txt`.
- `scripts/build_verbs.py`: turns the export into `drill/verbs.json`.
- `scripts/suru_meanings.json`: hand-written French verb meanings for noun + する words, because the export only defines the noun.
- `drill/conjugate.js`: conjugation rules and cheatsheet examples, no DOM. `drill/french.js`: turns a verb's French meaning into the translation shown after an answer, no DOM. `drill/app.js`: card flow, settings and cheatsheet display.
- `tests/conjugate.test.mjs` and `tests/french.test.mjs`: tests for the rules and the generated verb list.

The drill's interface is in French, addressing the learner as "tu".

## Commands

Run all of these from the repo root.

```bash
python renshuu_export.py
```

```bash
python scripts/build_verbs.py
```

```bash
node --test
```

```bash
python -m http.server 8765 --directory drill
```

`node --test tests/` fails on Node 25; use plain `node --test`.

## Private data

- Never commit `.env`, `renshuu_export.json`, `renshuu_known.txt` or `drill/verbs.json`. All are in `.gitignore`.
- `CHEATSHEET` in `drill/conjugate.js` is committed. Keep its examples to common verbs chosen by hand, not taken from the study data.
- The exports hold profile data and study history. `drill/verbs.json` is the only derived data that leaves this machine, and only inside the private artifact. Keep it limited to the fields `build_verbs.py` writes today.
- `scripts/suru_meanings.json` is committed. Keep it to dictionary meanings, with entries that don't depend on which words have been studied.
- The API key is read from `RENSHUU_API_KEY` or `.env`. Never hardcode it.

## Conjugation rules

- Take the verb type from the data label, never from the word's ending: 帰る and 入る look ichidan but are godan.
- When matching `typeofspeech`, never match a bare "verb", because "adverb" contains it.
- Filter known verbs on `correct_count` or `mastery_avg_perc > 0`. The average includes unstudied quiz types, so it stays low and a higher cutoff removes every verb.
- Keep the tables in `drill/french.js` to general French grammar, keyed by French infinitive, not by studied Japanese verbs.
- To add a form, add one entry to `FORMS` in `drill/conjugate.js` and rows to the table in the tests. Forms outside the present tense will need more than a base and a suffix, for example the euphonic changes in て and た forms, including 行く → 行った.

## Publishing the drill

- Live page: https://claude.ai/artifact/GfiJRJxSr97rNUPKSzGdnt. Update this one so the link stays the same.
- Publish `drill/index.html`, with `style.css`, `app.js`, `conjugate.js`, `french.js` and `verbs.json` as supporting files at the page root.
- `index.html` has no doctype, `<html>` or `<body>` because publishing wraps it in its own skeleton. The local preview therefore runs in quirks mode.
- Artifact rules that affect this page: external scripts only from allowed CDNs with exact versions, fonts only from Google Fonts, and every color defined as a token for both themes.

## Git

- Leave Claude attribution out of commits and pull requests here, including `Co-Authored-By` lines.
- Commits in this repo use the author email set in the local git config. Don't change it.
