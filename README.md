# Renshuu export

Exports your [Renshuu](https://www.renshuu.org) study data (vocabulary, kanji, grammar, sentences) through the Renshuu API. Python 3 standard library only, nothing to install.

It writes two files to the current folder:

| File | Contents |
| --- | --- |
| `renshuu_export.json` | Your profile and every schedule with its full term list |
| `renshuu_known.txt` | Studied terms and mastery %, grouped by schedule. Compact enough to paste into an LLM as context |

## Setup

1. Get your API key from Renshuu: menu > Tools > Renshuu API.
2. Copy the example config and paste your key into `.env`:

   ```bash
   cp .env.example .env
   ```

3. Run the script:

   ```bash
   python renshuu_export.py
   ```

A `RENSHUU_API_KEY` environment variable takes priority over `.env`.

`.env` and the generated exports are listed in `.gitignore`, so they stay out of the repo.
