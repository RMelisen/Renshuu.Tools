# Renshuu export

Exports your [Renshuu](https://www.renshuu.org) study data (vocabulary, kanji, grammar, sentences) through the Renshuu API, and lets you practise verb conjugation on the verbs you have studied. The export needs only Python 3, with nothing to install.

## Setup

1. Get your API key from Renshuu: menu > Tools > Renshuu API.
2. Copy the example config and paste your key into `.env`:

   ```bash
   cp .env.example .env
   ```

A `RENSHUU_API_KEY` environment variable takes priority over `.env`.

`.env` and all generated data files are listed in `.gitignore`, so they stay out of the repo.

## How to use

### Export your study data

Run the export from the repo folder:

```bash
python renshuu_export.py
```

It writes two files to the current folder:

| File | Contents |
| --- | --- |
| `renshuu_export.json` | Your profile and every schedule with its full term list |
| `renshuu_known.txt` | Studied terms and mastery %, grouped by schedule. Compact enough to paste into an LLM as context |

Mastery is averaged across every quiz type, including ones you haven't done, so the percentages can look low.

### Practise conjugation

1. Build your verb list from the export. It keeps the verbs you have studied and writes them to `drill/verbs.json`:

   ```bash
   python scripts/build_verbs.py
   ```

2. Start the page:

   ```bash
   python -m http.server 8765 --directory drill
   ```

3. Open http://localhost:8765.

Then, for each card:

1. Read the verb and the form it asks for, such as Polite negative 〜ません.
2. Type your answer in romaji, kana or kanji. Romaji turns into kana as you type.
3. Press Enter to check, then Enter again for the next card. Stuck? Choose **Show answer**.

A card you miss comes back later in the round as a second try. The results screen shows your first-try score and every card to review.

**Settings** lets you choose the forms, verb groups and number of cards per round. Choose **Start new round** to apply those choices. Your settings are saved in this browser.

Under **Show on cards** in Settings, you can show or hide the kana reading, the translation and the verb group (Godan, Ichidan, Irregular or Noun + する). These changes apply right away, and anything hidden appears after you check your answer.

To add verbs you have studied since, rerun the export and the verb list script, then reload the page.

Renshuu only defines the noun in a noun + する verb, so 携帯 is "téléphone portable" while 携帯する means "porter sur soi". The verb meanings shown on cards come from a hand-written table, [`scripts/suru_meanings.json`](scripts/suru_meanings.json). A word missing from the table shows its own definition after `sans する :`, and the verb list script names it so you can add it.

## Working on the drill

`drill/` is plain HTML, CSS and JavaScript with no framework or build step. Run the tests with Node:

```bash
node --test
```

To add a form, add an entry to `FORMS` in `drill/conjugate.js` and rows to the table in `tests/conjugate.test.mjs`.
