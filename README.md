# Yabujin Vault

A small Undertale-inspired top-down game. Walk around a library; every book is a Yabujin song.
Songs are not hosted here — they play from existing YouTube uploads.

## Run

```sh
npm install
npm run dev
```

Open the URL Vite prints (http://localhost:5173). The game must be served — opening `index.html`
directly as a file will not work.

```sh
npm test       # unit tests for the pure modules (node --test)
npm run build  # production build into dist/
```

## Songs

Songs live in `data/songs.json`. Each entry:

| field    | meaning                                          |
|----------|--------------------------------------------------|
| `id`     | unique, stable key (also used for save data)     |
| `title`  | shown in the dialogue and the open book          |
| `year`   | number or `null`                                 |
| `source` | `"youtube"`                                      |
| `url`    | link to an existing upload                       |
| `shelf`  | which shelf the book stands on (1–3)             |
| `lore`   | text shown before the book opens; may be empty   |
