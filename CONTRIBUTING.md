# Contributing to KaizenReply

Thank you for your interest in contributing to **KaizenReply** (改善)! 

Kaizen is the philosophy of continuous, iterative improvement. Whether you're fixing a typo, optimizing CSS performance, adding a Japanese Kotowaza proverb, or implementing a new LLM provider, every improvement matters.

---

## 🛠️ Development Setup

### 1. Prerequisites
- Python 3.10+
- A free [Groq Cloud API key](https://console.groq.com/keys)

### 2. Local Installation
```bash
# Clone your fork
git clone https://github.com/<your-username>/KaizenReply.git
cd KaizenReply

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate       # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
pip install pytest httpx
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your Groq API key:
```env
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=qwen/qwen3.8-27b
```

### 4. Run Development Server
```bash
python -m uvicorn app.main:app --reload --port 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## 🧪 Running Tests

Ensure all tests pass before submitting a pull request:
```bash
python -m pytest tests/ -v
```

---

## 🎨 Architectural & Design Principles

When contributing to KaizenReply, please follow these principles:

1. **Restrained Washi Paper Aesthetic**:
   - Palette based on OKLCH design tokens (`--background`, `--foreground`, `--seal`, `--proof`, `--ink-soft`).
   - Authentic Hanko vermilion seal accents (`#C94A36` / `--seal`).
   - Clean editorial typography (`Work Sans`, `Instrument Serif`, `IBM Plex Mono`, `Noto Serif JP`).
2. **Zero-Build Vanilla Frontend**:
   - The frontend uses pure HTML5, vanilla CSS, and standard ES6 JavaScript. No bundlers (Webpack/Vite), no npm dependencies, no framework bloat.
   - Fast, resilient, and instantly viewable.
3. **The 5S Methodology in Code**:
   - **Seiri (整理 / Sort)**: Keep code organized; eliminate unused dependencies.
   - **Seiton (整頓 / Straighten)**: Maintain predictable file structure (`app/` for backend, `static/` for UI).
   - **Seiso (清掃 / Shine)**: Keep server logs clean; avoid noisy error spam.
   - **Seiketsu (清潔 / Standardize)**: Respect Pydantic schemas and API contracts.
   - **Shitsuke (躾 / Sustain)**: Maintain tests and documentation integrity.

---

## 🤝 Submitting Changes

1. Create a feature branch: `git checkout -b feat/your-improvement`
2. Keep your commit messages clear and conventional:
   - `feat(...)`: New user-facing feature
   - `fix(...)`: Bug fix
   - `style(...)`: CSS/UI adjustments
   - `docs(...)`: Documentation updates
   - `refactor(...)`: Code cleanup with no functional change
3. Push to your fork: `git push origin feat/your-improvement`
4. Open a Pull Request against `main`. Fill in the PR template details.

---

## 💬 Community & Questions

Feel free to open an Issue for questions, feature ideas, or discussions.
Thank you for helping continuously improve KaizenReply! 改善.
