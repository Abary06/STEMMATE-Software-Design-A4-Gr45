# STEMMate v2.0 (SDN621S A4, Group 45)

Local-first vertical slice: **find an activity -> adapt to a safe, inclusive session plan -> save offline -> truthful sync to a local hub.**

## Run (3 commands, Node 22.13+, no npm install)
```
npm test        # 25 automated tests
npm start       # http://localhost:3000
```
Phones on the same Wi-Fi: open `http://HUB-IP:3000`.

## Demo accounts (synthetic, classroom only; change before any real use)
Set `COACH_PIN` and `ADMIN_PIN` environment variables. Defaults: `Mr.Coach` / `123456`, `Admin.Local` / `654321`.

## Backup and reset
Admin export: sign in as Admin.Local and GET `/api/export` with the bearer token. Or copy `stemmate.db` with the server stopped. Delete `stemmate.db` to reset demo data.

## Layout
`src/validate.js` rules | `src/service.js` logic + SQLite | `src/server.js` API | `public/index.html` app | `test/` automated tests | `architecture/` Graphviz sources + PNGs | `docs/` report generator and test output

## Troubleshooting
| Symptom | Fix |
|---|---|
| Phone cannot open the page | Same Wi-Fi? Allow port 3000 in the laptop firewall. |
| Banner "Sync failed" | Check the server is running, press Sync now. Data is safe on the phone. |
| "Needs your decision" | My plans -> Keep my version or Use server version. |
| `node:sqlite` error | Upgrade to Node 22.13 or later. |

## Known limitations
HTTP only (no TLS), no PIN lockout, sessions in memory, first sign-in needs a connection, attendance (FR-02) not integrated with the hub. See report Section 11.

## Version control (required evidence trail)
Run `git init`, commit in small steps with your own name, push to a repository set to open access. Do not rewrite or backdate history.
