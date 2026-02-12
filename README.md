# Kovidhe Offline Arcade

Offline-first mini platform with a launcher + two games.

## Run

```bash
python server.py
```

Open `http://localhost:5000`.

## Port

- **Port name:** `KOVIDHE_PORT`
- **Default value:** `5000`
- **Valid range:** `1..65535`
- If invalid/non-numeric, server prints a warning and falls back to `5000`.
- Example:

```bash
KOVIDHE_PORT=5050 python server.py
```

## Structure

- `public/index.html` launcher shell
- `public/css/styles.css` unified styling
- `public/js/app.js` shared wallet/outfit/settings/loader/shop/loading lifecycle
- `public/js/neo_rush.js` runner module (`start/stop`)
- `public/js/battleship.js` battleship module (`start/stop`, AI helpers)
- `public/shared/currency.js` shared save helpers
- `server.py` static server + network protocol notes

## Save format

`localStorage.kovidhe_save`:

```json
{"coins":0,"outfits":{"p1":"default","p2":"default"},"highscore":0}
```

## Notes

- App includes a soothing loading overlay before game module lock-in.
- Launcher and persistent profile follow a modular offline experience model.

