# Cookie Export (Chrome extension)

Export the cookies of the site in your current tab with one click.

## Features

- **Formats**
  - **JSON** – the full `chrome.cookies.Cookie` objects (name, value, domain, path, secure, httpOnly, sameSite, expirationDate, partitionKey, …)
  - **Netscape `cookies.txt`** – works with `curl -b`, `wget --load-cookies`, `yt-dlp --cookies`, etc. HttpOnly cookies use the `#HttpOnly_` prefix like curl.
  - **Cookie header** – `name=value; name2=value2`, ready to paste into a `Cookie:` request header.
- **Scope**
  - Default: exactly the cookies the browser would send to the current URL (including parent-domain cookies).
  - *Include all cookies for the domain*: also cookies for subdomains and other paths.
- Includes partitioned (CHIPS) cookies on Chrome 119+.
- Works in incognito (reads the incognito cookie store when the extension is allowed in incognito).
- **Copy** to clipboard or **Download** as a file (`<host>_cookies_<timestamp>.json|txt`).
- Light/dark theme follows the system.

## Install (unpacked)

1. Clone or download this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select this folder.
5. Pin the extension, open any `http(s)` page, and click the icon.

## Permissions

| Permission | Why |
|---|---|
| `cookies` | Read cookies via `chrome.cookies.getAll`. |
| `tabs` / `activeTab` | Read the URL of the current tab. |
| `<all_urls>` host permission | Chrome only returns cookies for hosts the extension has permission for. |

Nothing is sent anywhere — the extension has no network code; exports stay on your machine.

> ⚠️ Exported cookies can include session tokens. Anyone with the file can log in as you; treat it like a password.

## Development

Icons are generated with `python3 tools/make-icons.py` (stdlib only).
