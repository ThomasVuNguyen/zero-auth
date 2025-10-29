# zero-auth
An identity system without the need for logins

## Try it out

🌐 **Live Demo**: https://zeroauthatall.web.app

## Local Run

- Prereq: Install Node.js 18+.
- Install deps: none (uses core `http`).
- Start server: `npm start`
- Open: `http://127.0.0.1:3000`

## How It Works

- `GET /me`: If no `user_id` cookie, server creates a UUID, sets cookie, and returns `{ id }`. If present, returns the same `{ id }`.
- `POST /reset`: Deletes the current ID (from local JSON store) and clears the cookie.
- Static page `public/index.html` calls `/me` and shows the ID; includes a “Reset identity” button.

## Files

- `server.js`: Minimal Node server (no frameworks).
- `public/index.html`: Tiny UI to display/reset the ID.
- `data/users.json`: Local JSON store (auto-created).

## Notes

- Identity is per-browser-profile. Clearing site data or using private windows creates a new ID.
