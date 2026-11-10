# Renshuu export

Exports your [Renshuu](https://www.renshuu.org) study data (vocabulary, kanji, grammar, sentences) through the Renshuu API, and lets you practise conjugating the verbs and adjectives you have studied. The export needs only Python 3, with nothing to install.

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

1. Build your word list from the export. It keeps the verbs and adjectives you have studied and writes them to `drill/verbs.json`:

   ```bash
   python scripts/build_verbs.py
   ```

2. Start the page:

   ```bash
   python -m http.server 8765 --directory drill
   ```

3. Open http://localhost:8765.

The drill's interface is in French. For each card:

1. Read the word and the form it asks for, such as Présent poli négatif 〜ません.
2. Type your answer in romaji, kana or kanji. Romaji turns into kana as you type.
3. Press Enter to check, then Enter again for the next card. Stuck? Choose **Voir la réponse**.

After you check, the card shows the right answer, its French translation and the rule. A wrong answer marks the part that differs from the closest accepted spelling and says what went wrong, for example that you wrote き instead of い. It also offers **Revoir la règle dans l'aide-mémoire**, which opens the cheatsheet at the section for that word and form, with a button to go back to the card. On Android, a miss also vibrates.

A card you miss comes back later in the round as a second try. The results screen shows your first-try score and every card to review. **Revoir mes erreurs** starts a round with only the cards you just missed.

The round is saved after every card, so reloading the page or reopening it on your phone picks up where you stopped.

#### Forms and words

| Tense | Forms |
| --- | --- |
| Present | 〜ない, 〜ます, 〜ません |
| Past | 〜た, 〜なかった, 〜ました, 〜ませんでした |
| て form | 〜て, 〜ている |

The drill covers godan, ichidan and irregular verbs, noun + する verbs, and い and な adjectives. Adjectives take the same forms with their own endings, except ている. Where several answers are correct, all of them are accepted, such as じゃない and ではない.

#### Settings

**Réglages** lets you choose:

- the forms, grouped by tense
- the word groups
- the number of cards per round
- the colours and the font
- whether a miss vibrates, with a button that tells you whether your browser allows it

Choose **Commencer une nouvelle manche** to apply the forms, groups and round length. Your settings are saved in this browser.

Under **Afficher sur les cartes**, you can show or hide the kana reading, the translation, the word group and the form's ending. These changes apply right away, and anything hidden appears after you check your answer. The small buttons above each card change the same settings without opening Settings. A crossed-out button means that detail is hidden.

#### Cheatsheet

**Aide-mémoire** is a one-page summary of the rules for each tense: a grid of how godan endings shift, the ichidan rule, the irregular verbs, and the adjective endings, with the changing part in red. Closing it brings you back to your card, with anything you had typed still there.

#### Updating the word list

To add words you have studied since, rerun the export and the word list script, then reload the page.

Renshuu only defines the noun in a noun + する verb, so 携帯 is "téléphone portable" while 携帯する means "porter sur soi". The verb meanings shown on cards come from a hand-written table, [`scripts/suru_meanings.json`](scripts/suru_meanings.json). A word missing from the table shows its own definition after `sans する :`, and the word list script names it so you can add it.

Renshuu also defines many な adjectives as nouns, so 親切 is "gentillesse". [`scripts/adjective_meanings.json`](scripts/adjective_meanings.json) gives these a meaning that reads well in the translation.

## Working on the drill

`drill/` is plain HTML, CSS and JavaScript with no framework or build step. The rules live in `conjugate.js` and the French translations in `french.js`, neither of which touches the page, and `app.js` runs the cards, settings and cheatsheet.

Run the tests with Node:

```bash
node --test
```

To add a form, add an entry to `FORMS` in `drill/conjugate.js` and rows to the table in `tests/conjugate.test.mjs`. The cheatsheet and Settings pick up the new form on their own, grouped under its tense. Returning visitors get it switched on through `seenForms` in their saved settings.

The drill is also published as a private Claude artifact. `drill/index.html` has no doctype, `<html>` or `<body>` because publishing adds its own, so the local preview runs in quirks mode.
