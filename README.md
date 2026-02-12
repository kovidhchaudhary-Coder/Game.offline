# Kovidhe Offline Arcade

Offline-first mini platform with a launcher + two games.

## Run

```bash
python server.py
```

Open `http://localhost:5000`.

## Structure

- `public/index.html` launcher shell
- `public/css/styles.css` unified styling
- `public/js/app.js` shared wallet/outfit/settings/loader/shop
- `public/js/neo_rush.js` runner module (`start/stop`)
- `public/js/battleship.js` battleship module (`start/stop`, AI helpers)
- `server.py` static server + network protocol notes

## Save format

`localStorage.kovidhe_save`:

```json
{"coins":0,"outfits":{"p1":"default","p2":"default"},"highscore":0}
```

## Design inspiration

- Platform-style launcher and shared persistent profile inspired by Roblox experiences and avatar economy design.
