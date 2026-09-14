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
  const isDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
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
    openEvolveCardModal("bro send that report asap", "Could you please send the report as soon as possible?", 88, "Professional", "Email");
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
        suggestBtn.textContent = "💡 AI Suggest";
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

  // Render Loading State
  outputContainer.innerHTML = `
    <div class="result-state">
      <svg class="spin" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--primary);"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
      <h3>Evolving your words…</h3>
      <p>Preserving your voice while refining clarity and tone.</p>
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
    <div class="evolved-result">
      <div class="result-version">
        <span>✨ Kaizen Evolved Output</span>
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
          <span>💡 Kaizen Notes</span>
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
        <button class="btn-paper" id="copyResultBtn">Copy</button>
        <button class="btn-paper" id="shareResultBtn">Share</button>
        <button class="btn-paper" id="cardResultBtn">Card 🖼️</button>
        <button class="btn-paper" id="shareXBtn">Post X 🐦</button>
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
    tweetText = `Reality vs. LinkedIn with @KaizenReply 改善:\n\nREALITY:\n"${beforeText.substring(0, 70)}"\n\nLINKEDIN:\n"${afterText.substring(0, 130)}"\n\nKaizen Score: ${beforeScore} ➔ ${afterScore} 🔥\nhttps://kaizenreply.js.org`;
  } else {
    tweetText = `Evolved my message with @KaizenReply 改善:\n\n"${afterText.substring(0, 180)}"\n\nKaizen Score: ${beforeScore} ➔ ${afterScore} 🔥\nhttps://kaizenreply.js.org`;
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
        currentQuoteIndex = 0;
        updateQuoteDisplay();
      }
    } else {
      // Direct fetch from sepTN/kotowaza repo if API route is unavailable
      const directRes = await fetch("https://raw.githubusercontent.com/sepTN/kotowaza/main/data/kotowaza.json");
      if (directRes.ok) {
        const rawData = await directRes.json();
        if (Array.isArray(rawData)) {
          kotowazaList = rawData;
          currentQuoteIndex = 0;
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

  const idxNum = $("quoteIndexNum");
  const totNum = $("quoteTotalNum");
  const cat = $("quoteCategory");
  const jlpt = $("quoteJlpt");
  const jp = $("quoteJp");
  const reading = $("quoteReading");
  const en = $("quoteEn");
  const literal = $("quoteLiteral");
  const exJa = $("quoteExampleJa");
  const exEn = $("quoteExampleEn");
  const exBox = $("quoteExampleBox");
  const equiv = $("quoteEquivalent");

  if (idxNum) idxNum.textContent = String(currentQuoteIndex + 1).padStart(2, '0');
  if (totNum) totNum.textContent = String(list.length).padStart(2, '0');

  const mainTag = (q.tags && q.tags[0]) ? q.tags[0] : "wisdom";
  if (cat) cat.textContent = `Kotowaza · ${mainTag.charAt(0).toUpperCase() + mainTag.slice(1)}`;
  if (jlpt) {
    jlpt.textContent = q.jlpt ? `JLPT ${q.jlpt}` : "Kotowaza";
    jlpt.style.display = q.jlpt ? "inline-block" : "none";
  }

  if (jp) jp.textContent = q.japanese || "";
  if (reading) reading.textContent = `${q.reading || ""} · ${q.romaji || ""}`;
  if (en) en.textContent = `"${(q.meaning && q.meaning.en) ? q.meaning.en : (q.translation || "")}"`;
  if (literal) literal.textContent = q.literal ? `Literal: ${q.literal}` : "";

  if (q.examples && q.examples.length > 0) {
    const ex = q.examples[0];
    if (exJa) exJa.textContent = ex.ja || "";
    if (exEn) exEn.textContent = ex.en || ex.id || "";
    if (exBox) exBox.style.display = "block";
  } else {
    if (exBox) exBox.style.display = "none";
  }

  if (equiv) {
    const eqEn = q.equivalent && q.equivalent.en ? q.equivalent.en : "";
    equiv.textContent = eqEn ? `Equivalent: "${eqEn}"` : "";
    equiv.style.display = eqEn ? "inline" : "none";
  }
}

// Social Canvas Card Rendering Modal
function openEvolveCardModal(original, improved, score, tone, platform) {
  const modal = $("shareModal");
  const canvas = $("shareCardCanvas");
  if (!modal || !canvas) return;

  renderCardCanvas(canvas, {
    type: "evolve",
    original,
    improved,
    score: score || 88,
    tone: tone || "Professional",
    platform: platform || "Email"
  });

  modal.classList.remove("hidden");

  $("downloadCardBtn").onclick = () => downloadCanvasAsPng(canvas, "kaizenreply-evolution.png");
  $("shareCardImageBtn").onclick = () => shareCanvasImage(canvas, "kaizenreply-evolution.png");
}

function openQuoteCardModal() {
  const modal = $("shareModal");
  const canvas = $("shareCardCanvas");
  if (!modal || !canvas) return;

  const filtered = getFilteredQuotes();
  const list = filtered.length > 0 ? filtered : kotowazaList;
  const q = list[currentQuoteIndex] || kotowazaList[0];

  renderCardCanvas(canvas, {
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

  modal.classList.remove("hidden");

  $("downloadCardBtn").onclick = () => downloadCanvasAsPng(canvas, `kaizenreply-kotowaza-${q.id || 'proverb'}.png`);
  $("shareCardImageBtn").onclick = () => shareCanvasImage(canvas, `kaizenreply-kotowaza-${q.id || 'proverb'}.png`);
}

function renderCardCanvas(canvas, options) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  const isDark = document.documentElement.classList.contains("dark");
  ctx.fillStyle = isDark ? "#0d1117" : "#f7f7f3";
  ctx.fillRect(0, 0, width, height);

  // Decorative Border & Ink Lines
  ctx.strokeStyle = isDark ? "#30363d" : "#e3e6e2";
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  // Red Hanko Stamp Seal 改善印
  ctx.fillStyle = "#c94a36";
  ctx.fillRect(width - 130, 50, 80, 80);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px serif";
  ctx.fillText("改善", width - 110, 102);

  // Header Title
  ctx.fillStyle = isDark ? "#e6edf3" : "#17201c";
  ctx.font = "bold 38px sans-serif";
  ctx.fillText("KaizenReply", 60, 95);

  ctx.fillStyle = "#16a66a";
  ctx.font = "bold 16px monospace";
  ctx.fillText("改善ことわざ · JAPANESE PROVERB WISDOM", 60, 128);

  ctx.strokeStyle = isDark ? "#30363d" : "#e3e6e2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 150);
  ctx.lineTo(width - 60, 150);
  ctx.stroke();

  if (options.type === "evolve") {
    ctx.fillStyle = isDark ? "#161b22" : "#ffffff";
    ctx.fillRect(60, 180, 520, 360);
    ctx.strokeStyle = isDark ? "#30363d" : "#e3e6e2";
    ctx.lineWidth = 1;
    ctx.strokeRect(60, 180, 520, 360);

    ctx.fillStyle = isDark ? "#8b949e" : "#737a75";
    ctx.font = "bold 16px monospace";
    ctx.fillText("DRAFT · ORIGINAL", 85, 215);

    ctx.fillStyle = isDark ? "#e6edf3" : "#17201c";
    ctx.font = "20px sans-serif";
    wrapCanvasText(ctx, options.original, 85, 255, 470, 32);

    ctx.fillStyle = isDark ? "rgba(34, 197, 94, 0.08)" : "rgba(22, 166, 106, 0.05)";
    ctx.fillRect(620, 180, 520, 360);
    ctx.strokeStyle = isDark ? "rgba(34, 197, 94, 0.4)" : "rgba(22, 166, 106, 0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(620, 180, 520, 360);

    ctx.fillStyle = "#16a66a";
    ctx.font = "bold 16px monospace";
    ctx.fillText("KAIZEN · EVOLVED", 645, 215);

    ctx.fillStyle = isDark ? "#ffffff" : "#087443";
    ctx.font = "bold 22px sans-serif";
    wrapCanvasText(ctx, options.improved, 645, 255, 470, 32);

    ctx.fillStyle = "#16a66a";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText(`Kaizen Score: ${options.score}/100`, 60, 575);

    ctx.fillStyle = isDark ? "#8b949e" : "#737a75";
    ctx.font = "16px monospace";
    ctx.fillText(`${options.tone} · ${options.platform || "General"}`, width - 360, 575);
  } else {
    // Kotowaza Proverb Canvas Card
    ctx.fillStyle = "#16a66a";
    ctx.font = "bold 18px monospace";
    ctx.fillText(`KOTOWAZA · ${options.category.toUpperCase()} · ${options.jlpt}`, 60, 200);

    // Large Kanji Title
    ctx.fillStyle = isDark ? "#ffffff" : "#17201c";
    ctx.font = "bold 58px serif";
    ctx.fillText(options.japanese, 60, 275);

    // Reading & Romaji
    ctx.font = "18px monospace";
    ctx.fillStyle = isDark ? "#8b949e" : "#737a75";
    ctx.fillText(`${options.reading || ""} · ${options.romaji || ""}`, 60, 315);

    // English Meaning
    ctx.font = "bold 26px serif";
    ctx.fillStyle = isDark ? "#e6edf3" : "#087443";
    wrapCanvasText(ctx, `"${options.meaning}"`, 60, 375, 1080, 38);

    // Literal & Equivalent
    ctx.font = "italic 18px sans-serif";
    ctx.fillStyle = isDark ? "#8b949e" : "#555d58";
    if (options.literal) {
      ctx.fillText(`Literal: ${options.literal}`, 60, 480);
    }
    if (options.equivalent) {
      ctx.fillText(`Equivalent: "${options.equivalent}"`, 60, 510);
    }

    ctx.font = "14px monospace";
    ctx.fillStyle = "#16a66a";
    ctx.fillText("kaizenreply.js.org · sepTN/kotowaza proverbs dataset", 60, 575);
  }
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
