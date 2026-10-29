# Intelligenz-Welt private dashboard

This independent dashboard uses the live magazine's blue palette (#1d6bc0), logo, white masthead, quiet editorial typography and footer. Assets are served locally; no external scripts, fonts, analytics or cookies are loaded by the dashboard.

## Privacy and authentication

The existing encrypted `data/analytics.json.enc` payload, GA4 job, repository secrets and password are unchanged. Decryption remains PBKDF2 SHA-256 (600,000 iterations) and AES-GCM entirely in the browser. The password input is cleared after successful unlock. No decrypted data is saved to browser storage. Lock reloads the document, discarding in-memory state. No plaintext fixture is committed.

## UI and metric semantics

The daily `activeUsers` sum is named **Nutzer-Tage**, not unique 30-day users: returning readers can be counted on multiple days. Sessions and page views retain existing aggregation. The collection window remains `30daysAgo..today`, inclusive; the current day is incomplete. Snapshot timestamp is displayed in Europe/Berlin. The chart switches between the existing three daily metrics, uses real date spacing, and supports empty or single-point series. Pages can be filtered locally. Source and page strings are rendered with textContent, never interpolated into HTML.

The dashboard explains consent coverage, delays, top-page shares and direct/unknown traffic. It makes no growth or live-realtime claims. Responsive layouts cover 390px mobile and desktop; native controls, focus rings, labels and reduced-motion support are included.
