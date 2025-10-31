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
- `POST /reset`: Deletes the current ID (from local JSON store) and clears the cookie. This is not to be used, like ever.
- Static page `public/index.html` calls `/me` and shows the ID; includes a “Reset identity” button.

## Files

- `server.js`: Minimal Node server (no frameworks).
- `public/index.html`: Tiny UI to display/reset the ID.
- `data/users.json`: Local JSON store (auto-created).

## Notes

- Identity is per-browser-profile. Clearing site data or using private windows creates a new ID.

## Cloud Function Usage (Firestore-backed)

Deployed HTTPS function for zero-auth identity:

- URL: `https://get-or-create-user-fynpolbbma-uc.a.run.app`
- Method: `POST`
- Body: JSON `{ "browser_id": "<your-browser-id>" }`
- Response: `{ "username": string, "color": string }`

Example with curl:

```bash
curl -s \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"browser_id":"abc-123-browser"}' \
  https://get-or-create-user-fynpolbbma-uc.a.run.app
# => {"username":"swift_tiger_123","color":"#A3F5B2"}
```

Example in JavaScript:

```js
async function getOrCreateUser(browserId) {
  const res = await fetch('https://get-or-create-user-fynpolbbma-uc.a.run.app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ browser_id: browserId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json(); // { username, color }
}
```

Behavior:

- If the `browser_id` exists in Firestore (`zero-auth/{browser_id}`), returns the saved `username` and `color`.
- If it doesn't exist, creates random `username` and `color`, stores them, and returns them.

## Getting a browser_id

Generate and persist a per-browser ID using `localStorage` and `crypto.randomUUID()`:

```js
function getBrowserId() {
  const KEY = 'zero_auth_browser_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : (
      ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      )
    );
    localStorage.setItem(KEY, id);
  }
  return id;
}

// Usage with the deployed function
(async () => {
  const browserId = getBrowserId();
  const res = await fetch('https://get-or-create-user-fynpolbbma-uc.a.run.app', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ browser_id: browserId }),
  });
  const data = await res.json(); // { username, color }
  console.log(data);
})();
```
