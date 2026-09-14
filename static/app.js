/* ==========================================================================
   KaizenReply — Full Interactive Client Application with All Feature Sets
   ========================================================================== */

const TONES = [
  "Professional",
  "Friendly",
  "Concise",
  "Casual",
  "Polite",
  "Formal",
  "Persuasive",
  "Assertive",
  "Diplomatic",
  "Gen Z",
  "LinkedIn Bro",
  "🔥 Roast My Draft",
  "Cold Email Hook",
  "Dating App Opener",
  "ELI5",
  "Passive-Aggressive",
  "Tech Twitter Thread"
];

const TONE_CATEGORIES = {
  "Viral": ["LinkedIn Bro", "🔥 Roast My Draft", "Gen Z", "Dating App Opener", "Passive-Aggressive", "Tech Twitter Thread", "Cold Email Hook"],
  "Work": ["Professional", "LinkedIn Bro", "Cold Email Hook", "Formal", "Diplomatic", "Concise", "Passive-Aggressive"],
  "Social": ["Casual", "Friendly", "Dating App Opener", "ELI5", "Gen Z", "Polite"]
};

const PLATFORMS = [
  "Email",
  "LinkedIn",
  "WhatsApp",
  "X (Twitter)",
  "SMS",
  "Instagram",
  "Telegram",
  "Discord",
  "Facebook"
];

const RECIPIENTS = ["Friend", "Manager", "Client", "Teacher"];

const QUOTES = [
  {
    category: "Resilience",
    japanese: "七転び八起き",
    romaji: "Nana korobi ya oki",
    translation: "\"Fall down seven times, stand up eight.\"",
    source: "— Japanese proverb"
  },
  {
    category: "Reflection",
    japanese: "一期一会",
    romaji: "Ichi-go ichi-e",
    translation: "\"Treasure each encounter; it may never happen the same way again.\"",
    source: "— Japanese proverb"
  },
  {
    category: "Focus",
    japanese: "古池や 蛙飛び込む 水の音",
    romaji: "Furu ike ya / kawazu tobikomu / mizu no oto",
    translation: "\"An old pond — a frog jumps in — the sound of water.\"",
    source: "— Matsuo Bashō"
  },
  {
    category: "Growth",
    japanese: "温故知新",
    romaji: "Onko chishin",
    translation: "\"Review the past, and understand the new.\"",
    source: "— Confucius · Yojijukugo"
  }
];

let state = {
  tone: "Professional",
  platform: "",
  recipient: "",
  toneCategory: "All"
};

let currentMode = "evolve"; // "evolve" or "reply"
let currentQuoteIndex = 0;
let lastEvolvedData = null;
let countdownInterval = null;

const $ = (id) => document.getElementById(id);

// Initialize Page
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  populateDropdownsAndChips();
  fetchAvailableModels();
  fetchKotowazaProverbs();
  setupEventListeners();
  updateQuoteDisplay();
  renderKaizenHistory();
});

// Theme Management
function initTheme() {
  const saved = localStorage.getItem("kaizen-theme");
  // Default is light mode unless user explicitly chose dark
  const isDark = saved === "dark";
  setTheme(isDark);
}

function setTheme(dark) {
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  localStorage.setItem("kaizen-theme", dark ? "dark" : "light");
  const sun = document.querySelector(".sun-icon");
  const moon = document.querySelector(".moon-icon");
  if (sun && moon) {
    sun.classList.toggle("hidden", !dark);
    moon.classList.toggle("hidden", dark);
  }
  document.querySelectorAll(".light-logo").forEach((el) => el.classList.toggle("hidden", dark));
  document.querySelectorAll(".dark-logo").forEach((el) => el.classList.toggle("hidden", !dark));
}

// Fetch Dynamic Models from Backend API
async function fetchAvailableModels() {
  const select = $("modelSelect");
  if (!select) return;
  try {
    const res = await fetch("/api/models");
    if (!res.ok) return;
    const models = await res.json();
    if (Array.isArray(models) && models.length > 0) {
      select.innerHTML = models.map((m) => `<option value="${m}">${m}</option>`).join("");
    }
  } catch (e) {
    // Keep default static options fallback
    select.innerHTML = `<option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile</option>`;
  }
}

// Populate Select Options & Chips
function populateDropdownsAndChips() {
  const toneSel = $("toneSelect");
  const platformSel = $("platformSelect");
  if (toneSel) {
    toneSel.innerHTML = TONES.map((t) => `<option value="${t}">${t}</option>`).join("");
    toneSel.value = state.tone;
    toneSel.onchange = () => { state.tone = toneSel.value; renderToneChips(); };
  }
  if (platformSel) {
    platformSel.innerHTML = `<option value="">Platform-neutral</option>` + PLATFORMS.map((p) => `<option value="${p}">${p}</option>`).join("");
    platformSel.value = state.platform;
    platformSel.onchange = () => { state.platform = platformSel.value; renderPlatformChips(); };
  }

  renderToneChips();
  renderPlatformChips();
  renderRecipientChips();
}

// Render Tone Chips
function renderToneChips() {
  const container = $("toneChips");
  if (!container) return;

  const filtered = state.toneCategory === "All"
    ? TONES
    : TONES.filter((t) => (TONE_CATEGORIES[state.toneCategory] || []).includes(t));

  container.innerHTML = filtered.map((t) => `
    <button type="button" class="chip ${state.tone === t ? 'active' : ''}" data-tone="${t}">${t}</button>
  `).join("");

  container.querySelectorAll("button").forEach((btn) => {
    btn.onclick = () => {
      state.tone = btn.getAttribute("data-tone");
      if ($("toneSelect")) $("toneSelect").value = state.tone;
      renderToneChips();
    };
  });
}

// Render Platform Chips
function renderPlatformChips() {
  const container = $("platformChips");
  if (!container) return;

  container.innerHTML = PLATFORMS.map((p) => `
    <button type="button" class="chip ${state.platform === p ? 'active' : ''}" data-platform="${p}">${p}</button>
  `).join("");

  container.querySelectorAll("button").forEach((btn) => {
    btn.onclick = () => {
      state.platform = state.platform === btn.getAttribute("data-platform") ? "" : btn.getAttribute("data-platform");
      if ($("platformSelect")) $("platformSelect").value = state.platform;
      renderPlatformChips();
    };
  });
}

// Render Recipient Chips
function renderRecipientChips() {
  const container = $("recipientChips");
  if (!container) return;

  container.innerHTML = RECIPIENTS.map((r) => `
    <button type="button" class="chip ${state.recipient === r ? 'active' : ''}" data-rec="${r}">${r}</button>
  `).join("");

  container.querySelectorAll("button").forEach((btn) => {
    btn.onclick = () => {
      state.recipient = state.recipient === btn.getAttribute("data-rec") ? "" : btn.getAttribute("data-rec");
      if ($("recipientInput")) $("recipientInput").value = state.recipient;
      renderRecipientChips();
    };
  });
}

// Event Listeners Setup
function setupEventListeners() {
  // Theme Toggle
  const themeBtn = $("themeToggle");
  if (themeBtn) {
    themeBtn.onclick = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(!isDark);
    };
  }

  // Web Share Button
  const shareWebBtn = $("shareWebBtn");
  const heroShareBtn = $("heroShareBtn");
  const handleShareWeb = async () => {
    if (navigator.share) {
      await navigator.share({ title: "KaizenReply", text: "Your message is good. Make it better.", url: window.location.href }).catch(() => undefined);
    } else {
      await navigator.clipboard.writeText(window.location.href);
      alert("KaizenReply link copied to clipboard!");
    }
  };
  if (shareWebBtn) shareWebBtn.onclick = handleShareWeb;
  if (heroShareBtn) heroShareBtn.onclick = handleShareWeb;

  // Showcase Card Preview
  const showcaseCardBtn = $("showcaseCardBtn");
  const showcaseImgCard = $("showcaseImgCard");
  const handleShowcase = () => {
    if (lastEvolvedData) {
      openEvolveCardModal(
        lastEvolvedData.original,
        lastEvolvedData.improved,
        lastEvolvedData.score ? lastEvolvedData.score.after : 88,
        lastEvolvedData.tone || state.tone,
        lastEvolvedData.platform || state.platform
      );
    } else {
      openEvolveCardModal(
        "bro send that report asap need it for client meeting",
        "Could you please send the report as soon as possible for the client meeting?",
        88,
        "Professional",
        "Email"
      );
    }
  };
  if (showcaseCardBtn) showcaseCardBtn.onclick = handleShowcase;
  if (showcaseImgCard) showcaseImgCard.onclick = handleShowcase;


  // Mode Switches
  const modeEvolve = $("modeEvolve");
  const modeReply = $("modeReply");
  if (modeEvolve) modeEvolve.onclick = () => switchMode("evolve");
  if (modeReply) modeReply.onclick = () => switchMode("reply");

  // Character Counter & Input
  const msgInput = $("messageInput");
  const charCount = $("charCount");
  if (msgInput && charCount) {
    msgInput.oninput = () => {
      charCount.textContent = msgInput.value.length;
    };
    msgInput.onkeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runKaizenAction();
      }
    };
  }

  // Paste Button
  const pasteBtn = $("pasteBtn");
  if (pasteBtn && msgInput) {
    pasteBtn.onclick = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          msgInput.value = text;
          if (charCount) charCount.textContent = text.length;
        }
      } catch (err) {
        alert("Clipboard access permission required.");
      }
    };
  }

  // AI Suggest Tone Button
  const suggestBtn = $("suggestBtn");
  if (suggestBtn) {
    suggestBtn.onclick = async () => {
      if (!msgInput || !msgInput.value.trim()) {
        alert("Paste a draft message first for AI to analyze.");
        return;
      }
      suggestBtn.disabled = true;
      suggestBtn.textContent = "Analyzing…";
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: msgInput.value.trim() })
        });
        const data = await res.json();
        if (res.ok && data.tone) {
          const recBanner = $("recBanner");
          const recText = $("recText");
          const applyRecBtn = $("applyRecBtn");
          if (recBanner && recText) {
            recText.innerHTML = `We recommend <strong>${data.tone}</strong> tone (${data.reason || "best fit"}).`;
            recBanner.classList.remove("hidden");
            if (applyRecBtn) {
              applyRecBtn.onclick = () => {
                state.tone = data.tone;
                if ($("toneSelect")) $("toneSelect").value = data.tone;
                renderToneChips();
                recBanner.classList.add("hidden");
              };
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
      suggestBtn.disabled = false;
        suggestBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          AI Suggest
        `;
      }
    };
  }

  // Tone Category Filter Buttons
  const catBtns = document.querySelectorAll(".tone-cat-btn");
  catBtns.forEach((btn) => {
    btn.onclick = () => {
      catBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.toneCategory = btn.getAttribute("data-cat") || "All";
      renderToneChips();
    };
  });

  // Demo Buttons
  document.querySelectorAll(".demo-btn").forEach((btn) => {
    btn.onclick = () => {
      const text = btn.getAttribute("data-text");
      const tone = btn.getAttribute("data-tone");
      const platform = btn.getAttribute("data-platform");
      if (text && msgInput) {
        msgInput.value = text;
        if (charCount) charCount.textContent = text.length;
      }
      if (tone) {
        state.tone = tone;
        if ($("toneSelect")) $("toneSelect").value = tone;
        renderToneChips();
      }
      if (platform) {
        state.platform = platform;
        if ($("platformSelect")) $("platformSelect").value = platform;
        renderPlatformChips();
      }
    };
  });

  // Expandable Context Drawer
  const ctxToggle = $("contextToggle");
  const ctxDrawer = $("contextDrawer");
  const ctxSymbol = $("ctxSymbol");
  if (ctxToggle && ctxDrawer) {
    ctxToggle.onclick = () => {
      const isHidden = ctxDrawer.classList.contains("hidden");
      ctxDrawer.classList.toggle("hidden", !isHidden);
      if (ctxSymbol) ctxSymbol.textContent = isHidden ? "−" : "+";
    };
  }

  // Action Buttons
  const evolveBtn = $("evolveBtn");
  const fixGrammarBtn = $("fixGrammarBtn");
  if (evolveBtn) evolveBtn.onclick = () => runKaizenAction();
  if (fixGrammarBtn) fixGrammarBtn.onclick = () => runKaizenAction("Fix Grammar Only");

  // Quotes Carousel & Kotowaza Tag Navigation
  const prevQuote = $("prevQuoteBtn");
  const nextQuote = $("nextQuoteBtn");
  const randomQuote = $("randomQuoteBtn");
  const tryQuoteInDesk = $("tryQuoteInDeskBtn");
  const shareQuote = $("shareQuoteBtn");

  if (prevQuote) {
    prevQuote.onclick = () => {
      const list = getFilteredQuotes();
      currentQuoteIndex = (currentQuoteIndex - 1 + list.length) % list.length;
      updateQuoteDisplay();
    };
  }
  if (nextQuote) {
    nextQuote.onclick = () => {
      const list = getFilteredQuotes();
      currentQuoteIndex = (currentQuoteIndex + 1) % list.length;
      updateQuoteDisplay();
    };
  }
  if (randomQuote) {
    randomQuote.onclick = () => {
      const list = getFilteredQuotes();
      currentQuoteIndex = Math.floor(Math.random() * list.length);
      updateQuoteDisplay();
    };
  }
  if (tryQuoteInDesk) {
    tryQuoteInDesk.onclick = () => {
      const list = getFilteredQuotes();
      const q = list[currentQuoteIndex] || list[0];
      if (q && msgInput) {
        msgInput.value = `${q.japanese} (${q.romaji}) — ${q.meaning ? q.meaning.en : (q.translation || '')}`;
        if (charCount) charCount.textContent = msgInput.value.length;
        msgInput.focus();
        document.getElementById("desk")?.scrollIntoView({ behavior: "smooth" });
      }
    };
  }
  if (shareQuote) {
    shareQuote.onclick = () => openQuoteCardModal();
  }

  // Kotowaza Tag Filters
  document.querySelectorAll(".tag-btn").forEach((btn) => {
    btn.onclick = () => {
      document.querySelectorAll(".tag-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeQuoteTag = btn.getAttribute("data-tag") || "all";
      currentQuoteIndex = 0;
      updateQuoteDisplay();
    };
  });


  // Clear History
  const clearHistoryBtn = $("clearHistoryBtn");
  if (clearHistoryBtn) {
    clearHistoryBtn.onclick = () => {
      localStorage.removeItem("kaizen_history");
      renderKaizenHistory();
    };
  }

  // Modal Close
  const closeModalBtn = $("closeModalBtn");
  const shareModal = $("shareModal");
  if (closeModalBtn && shareModal) {
    closeModalBtn.onclick = () => shareModal.classList.add("hidden");
  }
}

// Mode Switch Handler
function switchMode(mode) {
  currentMode = mode;
  const modeEvolve = $("modeEvolve");
  const modeReply = $("modeReply");
  const deskTitle = $("deskTitleText");
  const evolveBtnText = $("evolveBtnText");
  const msgInput = $("messageInput");

  if (modeEvolve && modeReply) {
    modeEvolve.classList.toggle("active", mode === "evolve");
    modeReply.classList.toggle("active", mode === "reply");
  }
  if (deskTitle) {
    deskTitle.textContent = mode === "evolve" ? "Your Draft" : "Message you received";
  }
  if (evolveBtnText) {
    evolveBtnText.textContent = mode === "evolve" ? "Evolve Message →" : "Create Replies →";
  }
  if (msgInput) {
    msgInput.placeholder = mode === "evolve" ? "Paste your message here…  e.g. bro send that report asap" : "Paste the message you received…  e.g. Can you send the report by tomorrow?";
  }
}

// Execute AI Action (Evolve or Reply)
async function runKaizenAction(overrideTone = null) {
  const msgInput = $("messageInput");
  const recipientInput = $("recipientInput");
  const contextInput = $("contextInput");
  const modelSelect = $("modelSelect");
  const outputContainer = $("outputContainer");
  const errorBanner = $("errorBanner");

  if (errorBanner) errorBanner.classList.add("hidden");

  if (!msgInput || !msgInput.value.trim()) {
    alert("Please enter a message draft first.");
    return;
  }

  const payload = {
    message: msgInput.value.trim(),
    tone: overrideTone || state.tone || "Professional",
    platform: state.platform || "",
    recipient: recipientInput ? recipientInput.value.trim() : state.recipient || "",
    conversationContext: contextInput ? contextInput.value.trim() : "",
    model: modelSelect ? modelSelect.value : ""
  };

  // Render Kaizen Loading State
  const loadingKanji = currentMode === "reply" ? "返" : "善";
  const loadingText = currentMode === "reply" ? "Crafting replies…" : "Evolving your words…";
  const loadingSub = currentMode === "reply" ? "思慮深い返答を作成中" : "改善の力で言葉を洗練中";
  outputContainer.innerHTML = `
    <div class="kaizen-loader">
      <div class="kaizen-loader__circle">
        <div class="kaizen-loader__kanji">${loadingKanji}</div>
      </div>
      <div class="kaizen-loader__dots">
        <div class="kaizen-loader__dot"></div>
        <div class="kaizen-loader__dot"></div>
        <div class="kaizen-loader__dot"></div>
        <div class="kaizen-loader__dot"></div>
        <div class="kaizen-loader__dot"></div>
      </div>
      <div class="kaizen-loader__text">${loadingText}</div>
      <div class="kaizen-loader__sub">${loadingSub}</div>
    </div>
  `;

  try {
    const endpoint = currentMode === "reply" ? "/api/reply" : "/api/improve";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.status === 429) {
      startRateLimitCooldown(5);
      throw new Error("Rate limit reached. Please wait a moment.");
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Request failed");

    if (currentMode === "reply") {
      renderReplyOutput(data, payload.message);
    } else {
      lastEvolvedData = { original: payload.message, ...data, tone: payload.tone, platform: payload.platform };
      saveToKaizenHistory(payload.message, data.improved, data.score, payload.tone);
      renderEvolveOutput(data, payload.message, payload.tone, payload.platform);
    }
  } catch (err) {
    if (errorBanner) {
      errorBanner.textContent = err.message || "The Kaizen service is temporarily unavailable. Your draft is safe.";
      errorBanner.classList.remove("hidden");
    }
    outputContainer.innerHTML = `
      <div class="result-state" style="color:var(--hanko);">
        <h3>The message could not evolve</h3>
        <p>${escapeHtml(err.message || "Please check your network and try again.")}</p>
      </div>
    `;
  }
}

// Rate Limiting Cooldown Countdown
function startRateLimitCooldown(seconds) {
  const errorBanner = $("errorBanner");
  const evolveBtn = $("evolveBtn");
  if (!errorBanner || !evolveBtn) return;

  evolveBtn.disabled = true;
  let timeLeft = seconds;

  const update = () => {
    errorBanner.textContent = `Rate limit reached. Please wait ${timeLeft}s before trying again.`;
    errorBanner.classList.remove("hidden");
  };
  update();

  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      errorBanner.classList.add("hidden");
      evolveBtn.disabled = false;
    } else {
      update();
    }
  }, 1000);
}

// Render Evolve Output
function renderEvolveOutput(data, original, tone, platform) {
  const outputContainer = $("outputContainer");
  const notesHtml = data.notes && data.notes.length
    ? data.notes.map(n => `
        <div class="note-row">
          <span>改</span>
          <div>
            <b>“${escapeHtml(n.original)}” → “${escapeHtml(n.replacement)}”</b>
            <small>${escapeHtml(n.reason)}</small>
          </div>
        </div>
      `).join("")
    : `<p style="font-size:12px;color:var(--muted-foreground);">No micro-notes generated for this evolution.</p>`;

  const scoreBefore = data.score ? data.score.before : 60;
  const scoreAfter = data.score ? data.score.after : 88;
  const gain = Math.max(0, scoreAfter - scoreBefore);
  const bd = data.score ? data.score.breakdown : { clarity: 24, tone: 22, professionalism: 20, readability: 22 };

  outputContainer.innerHTML = `
    <div class="evolved-result evolved-result-animate">
      <div class="result-version">
        <span style="display:flex;align-items:center;gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          Kaizen Evolved Output
        </span>
        <small>v01 → v02</small>
      </div>

      <div class="comparison">
        <article>
          <span>Draft · Original</span>
          <p>${escapeHtml(original)}</p>
        </article>
        <article class="after">
          <span>Kaizen · Evolved</span>
          <p>${escapeHtml(data.improved)}</p>
        </article>
      </div>

      <div class="notes-panel">
        <div class="notes-head">
          <span style="display:flex;align-items:center;gap:6px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Kaizen Notes
          </span>
          <small style="color:var(--muted-foreground);">Why changes were made</small>
        </div>
        ${notesHtml}
      </div>

      <div class="score-panel">
        <div class="score-total">
          <span>Kaizen Score</span>
          <div>
            <b>${scoreAfter}</b>/100 <em>+${gain}</em>
          </div>
        </div>
        <div class="score-bars">
          <div><span>Clarity</span><div><i style="width:${(bd.clarity/30)*100}%"></i></div></div>
          <div><span>Tone</span><div><i style="width:${(bd.tone/30)*100}%"></i></div></div>
          <div><span>Professionalism</span><div><i style="width:${(bd.professionalism/30)*100}%"></i></div></div>
          <div><span>Readability</span><div><i style="width:${(bd.readability/30)*100}%"></i></div></div>
        </div>
      </div>

      <div class="result-actions">
        <button class="btn-paper" id="copyResultBtn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>
        <button class="btn-paper" id="shareResultBtn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Share
        </button>
        <button class="btn-paper" id="cardResultBtn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Card
        </button>
        <button class="btn-paper" id="shareXBtn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l16 16M4 20L20 4"/></svg>
          Post X
        </button>
      </div>

      <button class="btn-hero" id="evolveFurtherBtn" style="justify-content:center;margin-top:8px;">Evolve Further ↺</button>
    </div>
  `;

  // Action Buttons Listeners
  $("copyResultBtn").onclick = () => {
    navigator.clipboard.writeText(data.improved);
    alert("Evolved message copied to clipboard!");
  };
  $("shareResultBtn").onclick = () => {
    if (navigator.share) navigator.share({ text: data.improved }).catch(() => undefined);
    else { navigator.clipboard.writeText(data.improved); alert("Evolved message copied!"); }
  };
  $("cardResultBtn").onclick = () => openEvolveCardModal(original, data.improved, scoreAfter, tone, platform);
  $("shareXBtn").onclick = () => shareToX(original, data.improved, scoreBefore, scoreAfter, tone);
  $("evolveFurtherBtn").onclick = () => {
    const msgInput = $("messageInput");
    if (msgInput) {
      msgInput.value = data.improved;
      $("charCount").textContent = data.improved.length;
      msgInput.focus();
    }
  };
}

// 1-Click Viral Post to X / Twitter
function shareToX(beforeText, afterText, beforeScore, afterScore, toneName) {
  const isLinkedInMeme = toneName === "LinkedIn Bro";
  let tweetText = "";
  if (isLinkedInMeme) {
    tweetText = `Reality vs. LinkedIn with @KaizenReply 改善:\n\nREALITY:\n"${beforeText.substring(0, 70)}"\n\nLINKEDIN:\n"${afterText.substring(0, 130)}"\n\nKaizen Score: ${beforeScore} ➔ ${afterScore} 🔥\nhttps://kaizenreply.vercel.app`;
  } else {
    tweetText = `Evolved my message with @KaizenReply 改善:\n\n"${afterText.substring(0, 180)}"\n\nKaizen Score: ${beforeScore} ➔ ${afterScore} 🔥\nhttps://kaizenreply.vercel.app`;
  }
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`, "_blank", "noopener,noreferrer");
}

// Render Reply Mode Output
function renderReplyOutput(data, incomingMsg) {
  const outputContainer = $("outputContainer");
  const suggestions = data.suggestions || ["Option 1", "Option 2", "Option 3"];

  outputContainer.innerHTML = `
    <div class="reply-results">
      <div class="result-version">
        <span>💬 3 Ready-to-Send Replies</span>
      </div>
      ${suggestions.map((s, idx) => `
        <article>
          <span>Reply Option 0${idx + 1}</span>
          <p>${escapeHtml(s)}</p>
          <div>
            <button class="btn-paper" onclick="copyReplyText('${escapeJsString(s)}')">Copy</button>
            <button class="btn-paper" onclick="shareReplyText('${escapeJsString(s)}')">Share</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

window.copyReplyText = (text) => {
  navigator.clipboard.writeText(text);
  alert("Reply copied to clipboard!");
};

window.shareReplyText = (text) => {
  if (navigator.share) navigator.share({ text }).catch(() => undefined);
  else { navigator.clipboard.writeText(text); alert("Reply copied!"); }
};

// Recent Kaizen History Management
function saveToKaizenHistory(original, improved, score, tone) {
  try {
    const list = JSON.parse(localStorage.getItem("kaizen_history") || "[]");
    list.unshift({
      id: Date.now(),
      original,
      improved,
      scoreAfter: score ? score.after : 88,
      tone,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    const trimmed = list.slice(0, 10);
    localStorage.setItem("kaizen_history", JSON.stringify(trimmed));
    renderKaizenHistory();
  } catch (err) {
    console.error("Failed to save history:", err);
  }
}

function renderKaizenHistory() {
  const section = $("historySection");
  const listContainer = $("historyList");
  if (!section || !listContainer) return;

  try {
    const list = JSON.parse(localStorage.getItem("kaizen_history") || "[]");
    if (!list.length) {
      section.classList.add("hidden");
      return;
    }

    section.classList.remove("hidden");
    listContainer.innerHTML = list.map((item) => `
      <div class="history-item" onclick="loadHistoryItem('${escapeJsString(item.improved)}')">
        <span>${escapeHtml(item.tone || 'Kaizen')} · Score: <strong style="color:var(--primary);">${item.scoreAfter}</strong></span>
        <small style="color:var(--muted-foreground);">${item.timestamp}</small>
      </div>
    `).join("");
  } catch (err) {
    console.error("History render error:", err);
  }
}

window.loadHistoryItem = (text) => {
  const msgInput = $("messageInput");
  if (msgInput) {
    msgInput.value = text;
    if ($("charCount")) $("charCount").textContent = text.length;
    msgInput.focus();
  }
};

// Kotowaza Quotes State & Management
let kotowazaList = [];
let activeQuoteTag = "all";

async function fetchKotowazaProverbs() {
  try {
    const res = await fetch("/api/quotes?limit=100");
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.quotes) && data.quotes.length > 0) {
        kotowazaList = data.quotes;
        // Pick a random quote on every page load
        currentQuoteIndex = Math.floor(Math.random() * kotowazaList.length);
        updateQuoteDisplay();
      }
    } else {
      // Direct fetch from sepTN/kotowaza repo if API route is unavailable
      const directRes = await fetch("https://raw.githubusercontent.com/sepTN/kotowaza/main/data/kotowaza.json");
      if (directRes.ok) {
        const rawData = await directRes.json();
        if (Array.isArray(rawData)) {
          kotowazaList = rawData;
          // Pick a random quote on every page load
          currentQuoteIndex = Math.floor(Math.random() * kotowazaList.length);
          updateQuoteDisplay();
        }
      }
    }
  } catch (err) {
    console.error("Kotowaza API fetch error:", err);
  }
}

function getFilteredQuotes() {
  if (activeQuoteTag === "all") return kotowazaList;
  const tag = activeQuoteTag.toLowerCase();
  return kotowazaList.filter((q) => {
    const tags = (q.tags || []).map((t) => String(t).toLowerCase());
    const tagsId = (q.tags_id || []).map((t) => String(t).toLowerCase());
    return tags.includes(tag) || tagsId.includes(tag);
  });
}

function updateQuoteDisplay() {
  const filtered = getFilteredQuotes();
  const list = filtered.length > 0 ? filtered : kotowazaList;
  if (currentQuoteIndex >= list.length) currentQuoteIndex = 0;
  if (currentQuoteIndex < 0) currentQuoteIndex = list.length - 1;

  const q = list[currentQuoteIndex];
  if (!q) return;

  // Populate new CSS-class-based elements
  const cat = $("quoteCategory");
  const jlpt = $("quoteJlpt");
  const jp = $("quoteJp");
  const reading = $("quoteReading");
  const en = $("quoteEn");
  const literal = $("quoteLiteral");
  const equiv = $("quoteEquivalent");
  const exJa = $("quoteExampleJa");
  const exEn = $("quoteExampleEn");
  const exBox = $("quoteExampleBox");
  const card = $("quoteCard");

  const mainTag = (q.tags && q.tags[0]) ? q.tags[0] : "wisdom";
  if (cat) cat.textContent = `Kotowaza · ${mainTag.charAt(0).toUpperCase() + mainTag.slice(1)}`;

  if (jlpt) {
    jlpt.textContent = q.jlpt ? `JLPT ${q.jlpt}` : "Kotowaza";
  }

  if (jp) jp.textContent = q.japanese || "";
  // Set the data-kanji attribute on the card for the watermark pseudo-element
  if (card && q.japanese) card.setAttribute("data-kanji", (q.japanese || "").charAt(0));

  if (reading) reading.textContent = `${q.reading || ""} · ${q.romaji || ""}`;

  const meaningText = (q.meaning && q.meaning.en) ? q.meaning.en : (q.translation || "");
  if (en) en.textContent = meaningText;

  if (literal) {
    literal.textContent = q.literal ? `Literal: ${q.literal}` : "";
    literal.style.display = q.literal ? "block" : "none";
  }

  if (equiv) {
    const eqEn = q.equivalent && q.equivalent.en ? q.equivalent.en : "";
    equiv.textContent = eqEn ? `Equivalent: "${eqEn}"` : "";
    equiv.style.display = eqEn ? "block" : "none";
  }

  if (q.examples && q.examples.length > 0) {
    const ex = q.examples[0];
    if (exJa) exJa.textContent = ex.ja || "";
    if (exEn) exEn.textContent = ex.en || ex.id || "";
    if (exBox) exBox.style.display = "block";
  } else {
    if (exBox) exBox.style.display = "none";
  }

  // Animate the card on change
  if (card) {
    card.style.animation = "none";
    requestAnimationFrame(() => {
      card.style.animation = "fadeUp 0.5s cubic-bezier(0.25,0.46,0.45,0.94) both";
    });
  }
}

// Social Canvas Card Rendering Modal
function openEvolveCardModal(original, improved, score, tone, platform) {
  const modal = $("shareModal");
  const canvas = $("shareCardCanvas");
  const wrapper = $("modalCanvasWrapper");
  if (!modal || !canvas) return;

  // Show generating animation
  if (wrapper) {
    wrapper.innerHTML = `
      <div class="kaizen-loader" style="min-height:160px;">
        <div class="kaizen-loader__circle"><div class="kaizen-loader__kanji">絵</div></div>
        <div class="kaizen-loader__dots">
          <div class="kaizen-loader__dot"></div><div class="kaizen-loader__dot"></div>
          <div class="kaizen-loader__dot"></div><div class="kaizen-loader__dot"></div>
          <div class="kaizen-loader__dot"></div>
        </div>
        <div class="kaizen-loader__text">Composing your card…</div>
        <div class="kaizen-loader__sub">カードを作成中</div>
      </div>
    `;
  }
  modal.classList.remove("hidden");

  // Restore canvas and render after short animation delay
  setTimeout(() => {
    if (wrapper) wrapper.innerHTML = `<canvas id="shareCardCanvas" width="1200" height="630" style="width:100%;height:auto;display:block;"></canvas>`;
    const newCanvas = $("shareCardCanvas");
    if (!newCanvas) return;
    renderCardCanvas(newCanvas, {
      type: "evolve",
      original,
      improved,
      score: score || 88,
      tone: tone || "Professional",
      platform: platform || "Email"
    });
    $("downloadCardBtn").onclick = () => downloadCanvasAsPng(newCanvas, "kaizenreply-evolution.png");
    $("shareCardImageBtn").onclick = () => shareCanvasImage(newCanvas, "kaizenreply-evolution.png");
  }, 600);
}

function openQuoteCardModal() {
  const modal = $("shareModal");
  const wrapper = $("modalCanvasWrapper");
  if (!modal) return;

  const filtered = getFilteredQuotes();
  const list = filtered.length > 0 ? filtered : kotowazaList;
  const q = list[currentQuoteIndex] || kotowazaList[0];

  // Show generating animation
  if (wrapper) {
    wrapper.innerHTML = `
      <div class="kaizen-loader" style="min-height:160px;">
        <div class="kaizen-loader__circle"><div class="kaizen-loader__kanji">絵</div></div>
        <div class="kaizen-loader__dots">
          <div class="kaizen-loader__dot"></div><div class="kaizen-loader__dot"></div>
          <div class="kaizen-loader__dot"></div><div class="kaizen-loader__dot"></div>
          <div class="kaizen-loader__dot"></div>
        </div>
        <div class="kaizen-loader__text">Composing your card…</div>
        <div class="kaizen-loader__sub">カードを作成中</div>
      </div>
    `;
  }
  modal.classList.remove("hidden");

  setTimeout(() => {
    if (wrapper) wrapper.innerHTML = `<canvas id="shareCardCanvas" width="1200" height="630" style="width:100%;height:auto;display:block;"></canvas>`;
    const newCanvas = $("shareCardCanvas");
    if (!newCanvas) return;
    renderCardCanvas(newCanvas, {
      type: "quote",
      japanese: q.japanese,
      reading: q.reading,
      romaji: q.romaji,
      meaning: (q.meaning && q.meaning.en) ? q.meaning.en : (q.translation || ""),
      literal: q.literal,
      equivalent: q.equivalent && q.equivalent.en ? q.equivalent.en : "",
      category: (q.tags && q.tags[0]) ? q.tags[0] : "Wisdom",
      jlpt: q.jlpt || "Kotowaza"
    });
    $("downloadCardBtn").onclick = () => downloadCanvasAsPng(newCanvas, `kaizenreply-kotowaza-${q.id || 'proverb'}.png`);
    $("shareCardImageBtn").onclick = () => shareCanvasImage(newCanvas, `kaizenreply-kotowaza-${q.id || 'proverb'}.png`);
  }, 600);
}

function renderCardCanvas(canvas, options) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  const bgImg = new Image();
  bgImg.crossOrigin = "anonymous";
  bgImg.src = options.type === "quote" ? "/static/assets/kaizen-quote.jpg" : "/static/assets/kaizen-share.jpg";

  const drawAll = () => {
    // 1. Draw Japanese Landscape Artwork Background Image
    if (bgImg.complete && bgImg.naturalWidth !== 0) {
      ctx.drawImage(bgImg, 0, 0, width, height);
      ctx.fillStyle = options.type === "quote" ? "rgba(13, 17, 23, 0.65)" : "rgba(13, 17, 23, 0.55)";
      ctx.fillRect(0, 0, width, height);
    } else {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, "#0d1117");
      grad.addColorStop(1, "#161b22");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }

    // 2. Outer Border Frame
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, width - 48, height - 48);

    // 3. Red Hanko Seal (Top Right)
    ctx.fillStyle = "#c94a36";
    drawRoundRect(ctx, width - 120, 42, 66, 66, 4);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px 'Noto Serif JP', serif";
    ctx.fillText("改善", width - 104, 84);

    // Brand Mark Header (Top Left)
    ctx.fillStyle = "#c94a36";
    drawRoundRect(ctx, 50, 45, 30, 32, 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px 'Noto Serif JP', serif";
    ctx.fillText("改", 58, 67);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 32px 'Manrope', sans-serif";
    ctx.fillText("KaizenReply", 92, 70);

    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 14px monospace";
    const subTitle = options.type === "quote" ? "KAIZEN WISDOM · KOTOWAZA" : "KAIZEN · V01 → V02";
    ctx.fillText(subTitle, 92, 95);

    // Divider Line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 115);
    ctx.lineTo(width - 50, 115);
    ctx.stroke();

    // 4. Content Cards
    if (options.type === "evolve") {
      // BEFORE Card (Frosted Glass Dark Box)
      ctx.fillStyle = "rgba(13, 17, 23, 0.82)";
      drawRoundRect(ctx, 50, 140, 520, 390, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#8b949e";
      ctx.font = "bold 14px monospace";
      ctx.fillText("BEFORE · ORIGINAL DRAFT", 75, 175);

      ctx.fillStyle = "#f0f6fc";
      ctx.font = "20px 'Manrope', sans-serif";
      wrapCanvasText(ctx, options.original || "Original draft message...", 75, 215, 470, 32);

      // Center Arrow
      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 32px sans-serif";
      ctx.fillText("→", 584, 335);

      // AFTER Card (Kaizen Evolved Green Frosted Box)
      ctx.fillStyle = "rgba(22, 166, 106, 0.22)";
      drawRoundRect(ctx, 630, 140, 520, 390, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(34, 197, 94, 0.6)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 14px monospace";
      ctx.fillText("AFTER · KAIZEN EVOLVED", 655, 175);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 22px 'Manrope', sans-serif";
      wrapCanvasText(ctx, options.improved || "Evolved message...", 655, 215, 470, 34);

      // Footer Info
      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 24px 'Manrope', sans-serif";
      ctx.fillText(`Kaizen Score: ${options.score || 88}/100`, 50, 575);

      ctx.fillStyle = "#e6edf3";
      ctx.font = "16px monospace";
      const infoText = [options.tone, options.platform].filter(Boolean).join(" · ") || "Continuous Improvement";
      ctx.fillText(infoText, width - 360, 575);

    } else {
      // Quote Card
      ctx.fillStyle = "rgba(13, 17, 23, 0.85)";
      drawRoundRect(ctx, 50, 140, 1100, 390, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 14px monospace";
      ctx.fillText(`KOTOWAZA · ${(options.category || "Wisdom").toUpperCase()} · ${options.jlpt || "N4"}`, 80, 180);

      // Kanji
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 58px 'Noto Serif JP', serif";
      ctx.fillText(options.japanese || "", 80, 255);

      // Reading
      ctx.font = "18px monospace";
      ctx.fillStyle = "#8b949e";
      ctx.fillText(`${options.reading || ""} · ${options.romaji || ""}`, 80, 295);

      // Meaning
      ctx.font = "bold 26px 'Instrument Serif', serif";
      ctx.fillStyle = "#ffffff";
      wrapCanvasText(ctx, `"${options.meaning || ""}"`, 80, 355, 1040, 38);

      // Literal & Equivalent
      ctx.font = "italic 18px sans-serif";
      ctx.fillStyle = "#8b949e";
      if (options.literal) {
        ctx.fillText(`Literal: ${options.literal}`, 80, 455);
      }
      if (options.equivalent) {
        ctx.fillText(`Equivalent: "${options.equivalent}"`, 80, 485);
      }

      ctx.font = "14px monospace";
      ctx.fillStyle = "#22c55e";
      ctx.fillText("kaizenreply.vercel.app · Japanese Kotowaza Wisdom", 50, 575);
    }
  };

  bgImg.onload = drawAll;
  if (bgImg.complete) drawAll();
}

function drawRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}


function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = (text || "").split(" ");
  let line = "";
  let currentY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n] + " ";
      currentY += lineHeight;
      if (currentY > y + 260) {
        ctx.fillText("...", x, currentY);
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

function downloadCanvasAsPng(canvas, filename) {
  const a = document.createElement("a");
  a.download = filename;
  a.href = canvas.toDataURL("image/png");
  a.click();
}

async function shareCanvasImage(canvas, filename) {
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], filename, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: "KaizenReply" }).catch(() => undefined);
    } else {
      downloadCanvasAsPng(canvas, filename);
    }
  });
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeJsString(str) {
  return String(str || "").replace(/'/g, "\\'").replace(/"/g, '\\"');
}
