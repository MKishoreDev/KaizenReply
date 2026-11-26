# KaizenReply v2.0 — Security, Stability & UI Pass

## Security
- **Rate-limit bypass:** the client IP was taken from `X-Forwarded-For`, which anyone can fake. It now prefers headers set by the platform. Behind the Cloudflare proxy it trusts `X-Real-IP` only when it comes with a matching `PROXY_SHARED_SECRET`. Set the same secret on Cloudflare Pages and on the backend.
- **Memory exhaustion:** the per-IP rate-limit table is now swept, and the response cache is capped at 500 entries.
- **CPU denial of service:** `/api/meme/generate` (2048px Pillow render) is now rate-limited, and `/api/meme/demo` is rendered once and cached.
- **Arbitrary model use:** clients can only choose models from the offered list. Previously any model ID could be run on the server key.
- **Model blacklist poisoning:** a single bad AI response (any 400 containing "model" or "invalid") used to blacklist a model for every user. Now only genuine "model gone" errors do, and never when a request uses its own API key.
- **Error leakage:** raw exception and Groq error text is no longer returned to clients. It goes to the server logs.
- **Prompt-field injection:** tone, platform, recipient and model are forced onto one line. LinkedIn format and length are checked against an allow-list. Control characters are stripped.
- **Security headers** (CSP, nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, HSTS) are set in both FastAPI and Cloudflare `_headers`. The inline theme script moved to `static/theme-init.js` so the CSP can block inline scripts.
- **CORS:** `allow_credentials` is off and allowed headers are narrowed. The Cloudflare proxy no longer forwards browser cookies or adds a wildcard `Access-Control-Allow-Origin`.
- **Frontend XSS hardening:** model names, history timestamps and scores are now escaped. `escapeHtml` also escapes `'`.
- `/api/quotes?limit=` is clamped to 1–200.

## Bugs
- The response cache ignored the LinkedIn format and length, so changing them returned the old result.
- The score breakdown showed made-up "Conciseness 26/30" and "Impact 25/30" values because the backend sends `professionalism` and `readability`. It now shows the real four scores.
- The rate-limit countdown was cancelled straight away and the button re-enabled. The button label also lost its arrow after every request.
- Notes from the previous result stayed in the marginalia when a new result had none. "Sustained takeaway" repeated note #1.
- "Refine Further" didn't update the word count or save the draft.
- Editing a result added a duplicate history entry. It now updates the existing one.
- A proxy returning HTML on an error crashed with "Unexpected token <". Errors now show a clear message and a **Try again** button.
- Refreshing after a share-target import overwrote the draft again.
- Proverb examples showed the Indonesian translation as if it were English.
- The page script picked light mode while the head script picked the OS theme, which caused a flash.
- The install prompt nagged browsers that can't install apps. It now appears only where installing works (Chromium-based browsers or iOS).
- Copy and paste now fall back cleanly when clipboard access is blocked. localStorage access can no longer crash the app (private mode).

## UI & responsiveness
- **Mobile header:** the hamburger menu was pushed off-screen below about 500px. It is now always reachable. The menu closes on an outside tap, on Escape, or when the window is resized.
- **Hero:** the content was pinned to the screen edges on desktop (`width:100%` overrode the page container). The vertical 改善 rendered sideways. Mobile had a large empty gap. The text now sits on a readable wash, and the live preview card shows on mobile too.
- Added highlight pills (17 tones · 9 platforms · 3 replies · open source), a skip link, visible keyboard focus, and Features and GitHub links in the nav and footer.
- **Studio:** the draft header no longer squeezes at three columns. The result tabs don't wrap, and the result buttons and side-by-side view stack on phones. At tablet width the marginalia lays out in a row. The history "Clear" button is no longer clipped.
- The modal closes on a backdrop click, locks page scroll and returns focus. The quote card and footer stack properly on phones.
- `prefers-reduced-motion` is respected, and the hero animation pauses while the tab is hidden.
- Fonts load through `<link>` with preconnect instead of a render-blocking CSS `@import`.
