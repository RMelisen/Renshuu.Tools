# Renshuu.Tools

Personal tools built on a Renshuu study data export: an export script and a conjugation drill published as a private Claude artifact. The code uses Python and Node standard libraries only, plus WanaKana from a CDN in the drill. There is no framework, package manager or build step.

## Layout

- `renshuu_export.py`: calls the Renshuu API, writes `renshuu_export.json` and `renshuu_known.txt`.
- `scripts/build_verbs.py`: turns the export into `drill/verbs.json`.
- `scripts/suru_meanings.json`: hand-written French verb meanings for noun + する words, because the export only defines the noun.
- `scripts/adjective_meanings.json`: hand-written French meanings for adjectives the export defines as nouns or that read badly after "c'est". A meaning starting with a verb like "être" is conjugated.
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
- `scripts/suru_meanings.json` and `scripts/adjective_meanings.json` are committed. Keep them to dictionary meanings, with entries that don't depend on which words have been studied.
- The API key is read from `RENSHUU_API_KEY` or `.env`. Never hardcode it.

## Conjugation rules

- Take the verb type from the data label, never from the word's ending: 帰る and 入る look ichidan but are godan.
- When matching `typeofspeech`, never match a bare "verb", because "adverb" contains it.
- Filter known verbs on `correct_count` or `mastery_avg_perc > 0`. The average includes unstudied quiz types, so it stays low and a higher cutoff removes every verb.
- Keep the tables in `drill/french.js` to general French grammar, keyed by French infinitive, not by studied Japanese verbs.
- To add a form, add one entry to `FORMS` in `drill/conjugate.js` and rows to the table in the tests. The た and て forms use the `ta` base in `GODAN_ROWS`, with their voiced ending in `voiced` and the 行く exception handled in `godan()`.
- Use `hasForm` for a word that doesn't take a form: ある, いる and adjectives have no ている, and 無い has no negative. Cards skip it and the cheatsheet shows a dash.
- Adjectives share the form ids in `FORMS`, with their endings in `I_ADJECTIVE` and `NA_ADJECTIVE`. `also` lists other correct answers, like では for じゃ.
- Cards come in the kinds listed in `KINDS` in `drill/app.js`: conjugate, find the dictionary form, and name the form. The reverse kinds show the conjugated form. A name-the-form card has `choices` and is answered with buttons, and needs at least two forms switched on. A reverse card accepts every word whose form is spelled like the one shown, and every form that spells it, so check `formsWithSpelling` when adding a form.
- A new form is switched on for returning visitors through `seenForms` in saved settings, and a new card kind through `seenKinds`. Settings and the cheatsheet group forms by their `tense`, so check them at phone width after adding one.

## Publishing the drill

- Live page: https://claude.ai/artifact/GfiJRJxSr97rNUPKSzGdnt. Update this one so the link stays the same.
- Publish `drill/index.html`, with `style.css`, `app.js`, `conjugate.js`, `french.js` and `verbs.json` as supporting files at the page root.
- `index.html` has no doctype, `<html>` or `<body>` because publishing wraps it in its own skeleton. The local preview therefore runs in quirks mode.
- Artifact rules that affect this page: external scripts only from allowed CDNs with exact versions, fonts only from Google Fonts, and every color defined as a token for both themes.

## Git

- Leave Claude attribution out of commits and pull requests here, including `Co-Authored-By` lines.
- Commits in this repo use the author email set in the local git config. Don't change it.
