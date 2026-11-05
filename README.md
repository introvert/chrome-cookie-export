# Cookie Export (Chrome extension)

Export the cookies of the site in your current tab with one click.

## Features

- **Formats**
  - **JSON** – the full `chrome.cookies.Cookie` objects (name, value, domain, path, secure, httpOnly, sameSite, expirationDate, partitionKey, …)
  - **Netscape `cookies.txt`** – works with `curl -b`, `wget --load-cookies`, `yt-dlp --cookies`, etc. HttpOnly cookies use the `#HttpOnly_` prefix like curl.
  - **Cookie header** – `name=value; name2=value2`, ready to paste into a `Cookie:` request header.
- **Scope**
  - Default: exactly the cookies the browser would send to the current URL (including parent-domain cookies).
  - *Include all paths and subdomains of this host*: also cookies set on other paths or on subdomains of the current host (a leading `www.` is ignored).
- Includes partitioned (CHIPS) cookies on Chrome 119+.
- Works in incognito (reads the incognito cookie store when the extension is allowed in incognito).
- **Pick which cookies to export** – every cookie is listed with its domain, path, expiry, value and flags (HttpOnly / Secure / Partitioned). Untick the ones you don't want, filter by name/domain/value, and use the header checkbox to select or clear everything shown.
- **Copy** the selected cookies to the clipboard or **Download** them as a file (`<host>_cookies_<timestamp>.json|txt`). A collapsible preview shows exactly what will be exported.
- Light/dark theme follows the system.

## Install

### From a release (easiest)

1. Download `cookie-export-<version>.zip` from the [latest release](https://github.com/introvert/chrome-cookie-export/releases/latest) and unzip it.
2. Open `chrome://extensions` and enable **Developer mode** (top right).
3. Click **Load unpacked** and select the unzipped folder.

### From source

1. Clone or download this repository.
2. Open `chrome://extensions`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select this folder.
5. Pin the extension, open any `http(s)` page, and click the icon.

## Permissions

| Permission | Why |
|---|---|
| `cookies` | Read cookies via `chrome.cookies.getAll`. |
| `<all_urls>` host permission | Chrome only returns cookies (and the tab URL) for hosts the extension has permission for. |

Nothing is sent anywhere — the extension has no network code; exports stay on your machine.

> ⚠️ Exported cookies can include session tokens. Anyone with the file can log in as you; treat it like a password.

## Development

Icons are generated with `python3 tools/make-icons.py` (stdlib only).

End-to-end test (loads the extension in Chromium with Playwright and drives the popup — selection, filter, copy, JSON/Netscape downloads, prefs, non-http tabs):

```bash
node tests/e2e.js
```

## Releasing

1. Bump `version` in `manifest.json`.
2. Commit, then tag and push: `git tag v<version> && git push origin v<version>`.

The [Release workflow](.github/workflows/release.yml) checks the tag matches the manifest, runs the e2e test, builds the zip with `tools/build-zip.sh` and publishes it as a GitHub release.
