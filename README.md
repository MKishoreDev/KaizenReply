<p align="center">
  <img src="static/banner.png" alt="KaizenReply Banner" width="100%" />
</p>

# KaizenReply (改善)

<p align="center">
  <strong>The open-source, sub-second editorial desk that refines your drafts without turning them into generic AI slop.</strong>
</p>

<p align="center">
  <a href="https://kaizenreply.us.ci"><img src="https://img.shields.io/badge/Live%20Demo-kaizenreply.us.ci-000000?style=for-the-badge&logo=cloudflare" alt="Live on kaizenreply.us.ci" /></a>
  <a href="https://github.com/MKishoreDev/KaizenReply/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/MKishoreDev/KaizenReply/ci.yml?branch=main&style=for-the-badge&label=CI&logo=githubactions&logoColor=white" alt="CI Status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/MKishoreDev/KaizenReply?style=for-the-badge&color=22c55e" alt="License" /></a>
  <img src="https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.13-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python Versions" />
  <a href="https://fastapi.tiangolo.com/"><img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" /></a>
  <a href="https://groq.com/"><img src="https://img.shields.io/badge/Groq-LPU%20%3C400ms-f97316?style=for-the-badge" alt="Groq LPUs" /></a>
  <a href="CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge" alt="PRs Welcome" /></a>
</p>

<p align="center">
  <em>"Don't rewrite. Refine. 小さな改善、確かな言葉。"</em>
</p>

---

## 💡 The Problem with Modern Writing Tools

Let's be completely honest about the current state of writing assistants:

1. **Rule-based checkers (LanguageTool, Harper)** are fast and privacy-respecting, but they are blind to tone, social nuance, and platform context. They can catch a comma splice, but they won't stop you from sounding passive-aggressive on Slack or overly stiff in a cold email.
2. **Commercial grammar checkers (Grammarly)** cost \$30/month, track your keystrokes, and force your writing into sanitized, beige corporate speak.
3. **General LLMs (ChatGPT, Claude)** are slow (3–5 seconds per request), suffer from tab-switching friction, and suffer from **"AI Slop Syndrome"** — you ask for a quick grammar check on a two-line message, and they give you a four-paragraph dissertation filled with *"I hope this email finds you well! Let us delve into synergy! 🚀✨"*.

**KaizenReply was built as the antidote: an open-source, artisanal editorial desk designed for the 5 seconds right before you press "Send".**

---

## 🏛️ The Philosophy of Kaizen (改善)

**改善 (Kaizen)** is the Japanese philosophy of continuous improvement through small, focused, compound refinements rather than destructive overhauls.

In craftsmanship, a master woodworker does not burn a table to fix a rough corner; they take a fine chisel and make micro-passes until the grain sings. 

KaizenReply treats prose the same way. We do not throw your sentences into a blender. We preserve your authentic voice and intent, applying the classic **5S Manufacturing Framework** directly to language:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            THE 5S EDITORIAL DESK                            │
├───────────────┬────────────┬────────────────────────────────────────────────┤
│ Principle     │ Kanji      │ Editorial Application                          │
├───────────────┼────────────┼────────────────────────────────────────────────┤
│ 1. Seiri      │ 整理 (Sort)│ Prunes conversational fluff, hedges, & filler. │
│ 2. Seiton     │ 整頓 (Set) │ Structures thoughts with clear intent and CTA. │
│ 3. Seiso      │ 清掃(Shine)│ Polishes grammar, punctuation, and cadence.    │
│ 4. Seiketsu   │ 清潔(Stnd) │ Standardizes voice for the specific platform.  │
│ 5. Shitsuke   │ 躾 (Sustain│ Gives lasting takeaway rules so YOU improve.   │
└───────────────┴────────────┴────────────────────────────────────────────────┘
```

---

## 📐 The Three-Panel Editorial Layout

Designed with tactile Washi paper textures, OKLCH color palettes, and vermilion Hanko stamps:

```
┌─────────────────────────┬───────────────────────────────┬──────────────────────────┐
│  DRAFT CONSOLE          │  WASHI MANUSCRIPT PAPER       │  MARGINALIA & SHITSUKE   │
│                         │                               │                          │
│  [Raw Draft Input]      │  Inline Diff:                 │  01. Salutation          │
│  "bro send presentation │  <del>bro</del>               │  "Replaced slang with    │
│   asap"                 │  <ins>Hi, could you please    │   professional greeting" │
│                         │   send the presentation as    │                          │
│  • 17 Curated Tones     │   soon as possible?</ins>     │  02. Urgency             │
│  • 9 Platform Budgets   │                               │  "Spelled out acronym"   │
│  • Recipient Context    │  [Inline] [Side/Side] [Clean] │  ─────────────────────── │
│  • Reply Mode Toggle    │                               │  躾 Sustained Takeaway:  │
│                         │  [ 改善 · Hanko Vermilion ]   │  "Front-load requests    │
│                         │  [       Seal Stamp       ]   │   with polite openers."  │
└─────────────────────────┴───────────────────────────────┴──────────────────────────┘
```

- **Inline Redline Diff**: Clear `<del>` strikethroughs and `<ins>` accent underlines so you can see exactly what was touched.
- **Side-by-Side View**: Dual-column inspection for long-form emails or articles.
- **Clean Final View**: One-click pristine copy ready for immediate pasting.
- **Marginalia Notes**: Numbered breakdowns explaining *why* each phrase was modified.
- **Shitsuke Takeaways**: Permanent writing rules displayed on every revision to build long-term writing mastery.

---

## ⚡ Why Groq? (The <400ms Sub-Second Engine)

When you are about to send a message on Slack, WhatsApp, or Email, **latency is everything**. If an AI tool takes 4 seconds to respond, you will close the tab and hit send with typos instead.

We chose **[Groq LPUs](https://groq.com)** (Language Processing Units) because:
1. **Insane Inference Speed**: Delivers **300–500+ tokens per second**, generating complete editorial revisions in **under 400 milliseconds**. It feels as responsive as a local desktop binary.
2. **Generous Free Tier**: Groq provides **~14,400 requests/day at 30 requests/minute with zero credit card required**. Anyone can clone this repository and run a personal production-grade writing assistant for **$0/month**.
3. **Zero Lock-In Multi-Model Failover**: KaizenReply dynamically discovers active high-performance open-weight models (`qwen/qwen3.8-27b`, `openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `allam-2-7b`, `llama-3.3-70b-versatile`) with automatic failover and intelligent blacklisting if upstream APIs change.

---

## 💭 Why I Built This (The Creator's Note)

Honestly? I was exhausted by opening a new ChatGPT tab 20 times a day just to clean up a two-line message before sending it to a client or team member.

Every single time, the flow was painful:
- Open a tab.
- Wait for the UI to load.
- Type *"fix this email and make it polite"*.
- Wait 4 seconds.
- Receive a wall of corporate buzzwords that sounded nothing like me.
- Manually delete the emojis and the *"I hope you are having a wonderful Tuesday!"* opening.
- Copy it back.

I wanted something built like a fountain pen: quiet, immediate, focused, and respectful of the craft of writing. A desk where you paste your draft, pick your intent, see the exact diff in 300 milliseconds, read why the change mattered, and copy it out without ever feeling like an AI took over your personality.

That is KaizenReply.

---

## 🥊 How Does KaizenReply Compare?

| Feature | KaizenReply (改善) | Grammarly | LanguageTool / Harper | ChatGPT / Claude |
|---|:---:|:---:|:---:|:---:|
| **Cost** | **100% Free & Open Source** | \$30 / month | Free / Paid Tier | \$20 / month |
| **Response Latency** | **<400ms (Groq LPUs)** | ~1–2s | <50ms (Offline Rules) | 2–5s |
| **Preserves Human Voice** | **Yes (Micro-refinement)** | No (Corporate bland) | Yes (Grammar only) | No (Over-rewrites) |
| **Tone & Platform Awareness** | **17 Tones & 9 Platforms** | Basic formal/casual | None | Requires manual prompting |
| **3-Way Redline Diff** | **Yes (`<del>` + `<ins>`)** | No (Inline bubbles) | Highlight underline | No (Full text block) |
| **Marginalia Explanations** | **Yes (Explains every edit)** | Paywalled | Rule code only | Requires asking "Why?" |
| **Sustained Takeaways (躾)** | **Yes (Learning rules)** | No | No | No |
| **Reply Mode (Incoming Msg)** | **Yes (3 Ready Responses)** | No | No | Manual prompting |
| **Self-Hostable** | **Yes (Single Docker/Cmd)** | No (Cloud only) | Self-hostable | No (Cloud only) |
| **Build System / Bloat** | **Zero build (Vanilla Web)** | Browser Extension | Rust / Java binary | Web App / Desktop |

---

## ✨ Features Checklist

- 🎯 **17 Curated Tones**: *Fix Grammar Only*, *Concise*, *Diplomatic*, *Assertive*, *Persuasive*, *Professional*, *Formal*, *Cold Email Hook*, *LinkedIn Bro / Corporate Satire*, *Casual*, *Friendly*, *Gen Z*, *Dating App Opener*, *Tech Twitter Thread*, *ELI5*, *Passive-Aggressive*.
- 📱 **9 Platform Enforcements**: *WhatsApp*, *LinkedIn*, *Email*, *Telegram*, *Instagram*, *Facebook*, *SMS* (strict 160-char ceiling), *Discord*, *X / Twitter* (strict 280-char ceiling).
- 💬 **Conversation Context & Recipient Awareness**: Provide optional backstory and recipient roles for context-aware nuance.
- 🔄 **Reply Mode**: Paste an incoming message from a client or colleague to generate 3 ready-to-send reply options (Concise, Conversational, Detailed).
- 📊 **Kaizen Quality Scores**: Multi-metric before/after scores evaluating Clarity, Tone, Professionalism, and Readability.
- 📜 **Kotowaza (諺) Japanese Proverbs**: Dynamic integration with Japanese cultural proverbs, JLPT difficulty ratings, and category filters.
- 🎨 **Editorial Social Share Cards**: Export high-resolution 1200x630 Japanese Woodblock art cards with vermilion Hanko seal stamps.
- 🌗 **Washi Paper Light & Ink Dark Themes**: Built with modern CSS `oklch()` color tokens, smooth transitions, and zero layout shift.
- 🛡️ **Built-in Security & Rate Limiter**: 30 requests/minute per-IP rate limiting and in-memory caching to protect API quotas.

---

## 🧱 Technical Architecture

KaizenReply follows a zero-dependency frontend architecture paired with an asynchronous Python ASGI backend:

```
KaizenReply/
├── app/
│   ├── main.py              # FastAPI application, Groq LPU engine, caching & rate limits
│   └── models.py            # Pydantic validation schemas
├── static/
│   ├── index.html           # Accessible, semantic 3-panel editorial desk
│   ├── styles.css           # OKLCH design system, Washi textures, Hanko keyframe animations
│   ├── app.js               # Reactive desk controller, HTML diff engine, Canvas card generator
│   └── assets/              # Woodblock landscapes, Hanko seals, and icons
├── tests/
│   ├── __init__.py
│   └── test_api.py          # Complete pytest suite (9 tests, 100% pass)
├── .github/
│   ├── workflows/ci.yml     # Multi-version Python CI
│   └── ISSUE_TEMPLATE/      # Community issue & PR templates
├── Dockerfile               # Production container image
├── requirements.txt         # Core dependencies
├── requirements-dev.txt     # Test & linting tooling
├── SECURITY.md              # Security & responsible disclosure policy
└── CONTRIBUTING.md          # Developer onboarding guide
```

---

## 🚀 Quick Start (Under 60 Seconds)

### Option A: Local Python Setup

```bash
# 1. Clone the repository
git clone https://github.com/MKishoreDev/KaizenReply.git
cd KaizenReply

# 2. Set up virtual environment
python -m venv .venv

# On Linux/macOS:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# 4. Create your .env file
# Get a free key at https://console.groq.com/keys
echo GROQ_API_KEY=your_groq_api_key_here > .env

# 5. Launch the desk!
python -m uvicorn app.main:app --reload --port 8000
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

---

### Option B: Docker

```bash
docker run -d -p 8000:8000 -e GROQ_API_KEY="your_groq_api_key_here" --name kaizenreply ghcr.io/mkishoredev/kaizenreply:latest
```

---

## 🧪 Testing & Verification

Run the automated test suite locally to verify endpoints, validation rules, rate limiting, and proverbs:

```bash
pytest tests/ -v
```

All 9 test suites validate:
- `/health` status and dynamic model detection
- `/api/models` discovery
- Static asset serving
- `/api/quotes` and `/api/quotes/random`
- Schema validation and 422 error handling
- `/api/improve`, `/api/analyze`, and `/api/reply` logic
- Rate limit enforcement (HTTP 429)

---

## 🔌 API Reference

### `POST /api/improve`
Refines a draft message and returns before/after scores, breakdown, and marginalia notes.

```bash
curl -X POST "http://localhost:8000/api/improve" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "bro send that report asap",
    "tone": "Professional",
    "platform": "Email"
  }'
```

**Response:**
```json
{
  "improved": "Hi, could you please send the report as soon as possible? Best regards.",
  "score": {
    "before": 15,
    "after": 85,
    "breakdown": {
      "clarity": 25,
      "tone": 25,
      "professionalism": 25,
      "readability": 25
    }
  },
  "notes": [
    {
      "original": "bro",
      "replacement": "Hi,",
      "reason": "Replaced informal slang with a standard professional greeting."
    },
    {
      "original": "asap",
      "replacement": "as soon as possible",
      "reason": "Spelled out acronym to maintain polite email etiquette."
    }
  ]
}
```

---

### `POST /api/reply`
Generates 3 distinct, ready-to-send responses to an incoming message.

```bash
curl -X POST "http://localhost:8000/api/reply" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Are you free for a sync tomorrow morning?",
    "tone": "Casual",
    "platform": "Slack"
  }'
```

---

## 🌟 Show Your Support

If KaizenReply helped you craft a better message or saved you from an awkward email, give us a star on GitHub! It helps more writers discover the project.

[![Star History Chart](https://api.star-history.com/svg?repos=MKishoreDev/KaizenReply&type=Date)](https://star-history.com/#MKishoreDev/KaizenReply&Date)

---

## 🤝 Contributing

We love contributions! Whether you want to add new platform presets, improve the diff engine, add language localizations, or suggest new Kotowaza proverbs:

1. Read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).
2. Check existing [GitHub Issues](https://github.com/MKishoreDev/KaizenReply/issues) or submit a [Feature Request](.github/ISSUE_TEMPLATE/feature_request.md).
3. Submit a Pull Request following our [PR Template](.github/pull_request_template.md).

---

## 🔒 Security

For security vulnerability disclosures, please review our [Security Policy](SECURITY.md) or reach out privately to [kishoredxd@gmail.com](mailto:kishoredxd@gmail.com).

---

## 📄 License

KaizenReply is free and open-source software distributed under the [MIT License](LICENSE).
