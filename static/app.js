/* ==========================================================================
   KaizenReply — Full Interactive Client Application
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

let currentMode = "evolve"; // "evolve" or "reply"
let currentQuoteIndex = 0;
let lastEvolvedData = null;

const $ = (id) => document.getElementById(id);

// Initialize Page
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  populateDropdowns();
  setupEventListeners();
  updateQuoteDisplay();
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

// Populate Select Options
function populateDropdowns() {
  const toneSel = $("toneSelect");
  const platformSel = $("platformSelect");
  if (toneSel) {
    toneSel.innerHTML = TONES.map((t) => `<option value="${t}">${t}</option>`).join("");
  }
  if (platformSel) {
    platformSel.innerHTML = PLATFORMS.map((p) => `<option value="${p}">${p}</option>`).join("");
  }
}

// Event Listeners
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

  // Mode Switches
  const modeEvolve = $("modeEvolve");
  const modeReply = $("modeReply");
  if (modeEvolve) {
    modeEvolve.onclick = () => switchMode("evolve");
  }
  if (modeReply) {
    modeReply.onclick = () => switchMode("reply");
  }

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
      if (tone && $("toneSelect")) $("toneSelect").value = tone;
      if (platform && $("platformSelect")) $("platformSelect").value = platform;
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

  // Quotes Carousel Navigation
  const prevQuote = $("prevQuoteBtn");
  const nextQuote = $("nextQuoteBtn");
  const shareQuote = $("shareQuoteBtn");
  if (prevQuote) {
    prevQuote.onclick = () => {
      currentQuoteIndex = (currentQuoteIndex - 1 + QUOTES.length) % QUOTES.length;
      updateQuoteDisplay();
    };
  }
  if (nextQuote) {
    nextQuote.onclick = () => {
      currentQuoteIndex = (currentQuoteIndex + 1) % QUOTES.length;
      updateQuoteDisplay();
    };
  }
  if (shareQuote) {
    shareQuote.onclick = () => openQuoteCardModal();
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
  const toneSelect = $("toneSelect");
  const platformSelect = $("platformSelect");
  const recipientInput = $("recipientInput");
  const contextInput = $("contextInput");
  const outputContainer = $("outputContainer");

  if (!msgInput || !msgInput.value.trim()) {
    alert("Please enter a message draft first.");
    return;
  }

  const payload = {
    message: msgInput.value.trim(),
    tone: overrideTone || (toneSelect ? toneSelect.value : "Professional"),
    platform: platformSelect ? platformSelect.value : "Email",
    recipient: recipientInput ? recipientInput.value.trim() : "",
    conversationContext: contextInput ? contextInput.value.trim() : ""
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

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Request failed");

    if (currentMode === "reply") {
      renderReplyOutput(data, payload.message);
    } else {
      lastEvolvedData = { original: payload.message, ...data, tone: payload.tone, platform: payload.platform };
      renderEvolveOutput(data, payload.message, payload.tone, payload.platform);
    }
  } catch (err) {
    outputContainer.innerHTML = `
      <div class="result-state" style="color:var(--destructive);">
        <h3>The message could not evolve</h3>
        <p>${err.message || "Please check your network and try again."}</p>
      </div>
    `;
  }
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
      </div>

      <button class="btn-hero" id="evolveFurtherBtn" style="justify-content:center;margin-top:8px;">Evolve Further ↺</button>
    </div>
  `;

  // Attach Result Action Listeners
  $("copyResultBtn").onclick = () => {
    navigator.clipboard.writeText(data.improved);
    alert("Evolved message copied to clipboard!");
  };
  $("shareResultBtn").onclick = () => {
    if (navigator.share) {
      navigator.share({ text: data.improved }).catch(() => undefined);
    } else {
      navigator.clipboard.writeText(data.improved);
      alert("Evolved message copied!");
    }
  };
  $("cardResultBtn").onclick = () => openEvolveCardModal(original, data.improved, scoreAfter, tone, platform);
  $("evolveFurtherBtn").onclick = () => {
    const msgInput = $("messageInput");
    if (msgInput) {
      msgInput.value = data.improved;
      $("charCount").textContent = data.improved.length;
      msgInput.focus();
    }
  };
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

// Quotes Display Update
function updateQuoteDisplay() {
  const q = QUOTES[currentQuoteIndex];
  if (!q) return;

  const idxNum = $("quoteIndexNum");
  const cat = $("quoteCategory");
  const jp = $("quoteJp");
  const en = $("quoteEn");
  const romaji = $("quoteRomaji");
  const source = $("quoteSource");

  if (idxNum) idxNum.textContent = `0${currentQuoteIndex + 1}`;
  if (cat) cat.textContent = `Kaizen inspiration · ${q.category}`;
  if (jp) jp.textContent = q.japanese;
  if (en) en.textContent = q.translation;
  if (romaji) romaji.textContent = q.romaji;
  if (source) source.textContent = q.source;
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

  const q = QUOTES[currentQuoteIndex];
  renderCardCanvas(canvas, {
    type: "quote",
    japanese: q.japanese,
    translation: q.translation,
    romaji: q.romaji,
    source: q.source,
    category: q.category
  });

  modal.classList.remove("hidden");

  $("downloadCardBtn").onclick = () => downloadCanvasAsPng(canvas, "kaizenreply-quote.png");
  $("shareCardImageBtn").onclick = () => shareCanvasImage(canvas, "kaizenreply-quote.png");
}

function renderCardCanvas(canvas, options) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  // Background
  const isDark = document.documentElement.classList.contains("dark");
  ctx.fillStyle = isDark ? "#0d1117" : "#f7f7f3";
  ctx.fillRect(0, 0, width, height);

  // Outer Frame
  ctx.strokeStyle = isDark ? "#30363d" : "#e3e6e2";
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  // Hanko Seal Stamp
  ctx.fillStyle = "#c94a36";
  ctx.fillRect(width - 130, 50, 80, 80);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText("改善", width - 110, 102);

  // Header Title
  ctx.fillStyle = isDark ? "#e6edf3" : "#17201c";
  ctx.font = "bold 38px sans-serif";
  ctx.fillText("KaizenReply", 60, 95);

  ctx.fillStyle = "#16a66a";
  ctx.font = "bold 18px monospace";
  ctx.fillText("KAIZEN CONTINUOUS IMPROVEMENT", 60, 128);

  // Divider
  ctx.strokeStyle = isDark ? "#30363d" : "#e3e6e2";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(60, 150);
  ctx.lineTo(width - 60, 150);
  ctx.stroke();

  if (options.type === "evolve") {
    // Before Block
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

    // After Block
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

    // Footer Info
    ctx.fillStyle = "#16a66a";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText(`Kaizen Score: ${options.score}/100`, 60, 575);

    ctx.fillStyle = isDark ? "#8b949e" : "#737a75";
    ctx.font = "16px monospace";
    ctx.fillText(`${options.tone} · ${options.platform}`, width - 360, 575);
  } else {
    // Quote Type Canvas
    ctx.fillStyle = "#16a66a";
    ctx.font = "bold 18px monospace";
    ctx.fillText(`PHILOSOPHY · ${options.category.toUpperCase()}`, 60, 200);

    ctx.fillStyle = isDark ? "#ffffff" : "#17201c";
    ctx.font = "bold 52px serif";
    ctx.fillText(options.japanese, 60, 270);

    ctx.font = "italic 28px serif";
    ctx.fillStyle = isDark ? "#e6edf3" : "#087443";
    wrapCanvasText(ctx, options.translation, 60, 340, 1080, 42);

    ctx.font = "20px monospace";
    ctx.fillStyle = isDark ? "#8b949e" : "#737a75";
    ctx.fillText(`${options.romaji}  ${options.source}`, 60, 480);
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
