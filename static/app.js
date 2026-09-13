const TONES = ["Casual","Professional","Polite","Formal","Friendly","Gen Z","Persuasive","Assertive","Diplomatic","Concise"];
const PLATFORMS = ["WhatsApp","Instagram","Facebook","Telegram","LinkedIn","Email","SMS","Discord","X (Twitter)"];
const RECIPIENTS = ["Friend","Manager","Client","Teacher"];

const state = { tone: "Casual", platform: "", recipient: "" };
let mode = "evolve"; // "evolve" or "reply"
let userInteracted = false;
let activeRec = null;
let lastRequest = {
  message: "",
  tone: "",
  platform: "",
  recipient: "",
  conversationContext: "",
  mode: ""
};

const $ = (id) => document.getElementById(id);

let countdownInterval = null;

function startRateLimitCooldown(seconds) {
  if (countdownInterval) clearInterval(countdownInterval);
  
  const improveBtn = $("improve");
  const fixGrammarBtn = $("fixGrammar");
  const suggestBtn = $("suggestBtn");
  const errorDiv = $("error");
  
  improveBtn.disabled = true;
  fixGrammarBtn.disabled = true;
  suggestBtn.disabled = true;
  
  let timeLeft = seconds;
  
  const updateBanner = () => {
    errorDiv.innerHTML = `<svg class="warn-ic" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px; vertical-align:middle;"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Rate limit reached. Please wait <strong>${timeLeft}s</strong> before trying again.`;
    errorDiv.classList.remove("hidden");
  };
  
  updateBanner();
  
  countdownInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      errorDiv.classList.add("hidden");
      
      improveBtn.disabled = false;
      fixGrammarBtn.disabled = false;
      suggestBtn.disabled = false;
      
      switchMode(mode); // resets text
    } else {
      updateBanner();
    }
  }, 1000);
}


function renderChips(container, options, key, { allowCustom = false } = {}) {
  container.innerHTML = "";
  const opts = allowCustom ? [...options, "Custom"] : options;
  opts.forEach((label) => {
    const btn = document.createElement("button");
    btn.className = "chip" + (state[key] === label ? " active" : "");

    if (label === "Custom") {
      btn.className += " chip-custom";
      btn.innerHTML = `Custom <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
    } else {
      btn.textContent = label;
    }

    btn.onclick = () => {
      userInteracted = true;
      state[key] = state[key] === label ? (key === "tone" ? "Casual" : "") : label;
      renderChips(container, options, key, { allowCustom });
      if (key === "platform") {
        $("customPlatform").classList.toggle("hidden", state.platform !== "Custom");
      }
      if (key === "tone") {
        $("customTone").classList.toggle("hidden", state.tone !== "Custom");
      }
      if (key === "recipient" && state.recipient !== "" && state.recipient !== label) {
        $("recipient").value = "";
      }
    };
    container.appendChild(btn);
  });
}

// Initial chip render
renderChips($("tones"), TONES, "tone", { allowCustom: true });
renderChips($("platforms"), PLATFORMS, "platform", { allowCustom: true });
renderChips($("recipients"), RECIPIENTS, "recipient");

// Character Counter
$("message").addEventListener("input", (e) => {
  $("count").textContent = e.target.value.length;
});

// Clipboard Paste
$("pasteBtn").onclick = async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      $("message").value = text;
      $("count").textContent = text.length;
      userInteracted = true;
    }
  } catch (err) {
    console.error("Failed to read clipboard:", err);
  }
};

// Suggest Options (Explicit AI Call)
$("suggestBtn").onclick = () => {
  const text = $("message").value.trim();
  if (text) {
    handleRecommendation(text);
  }
};

// Context panel toggle
$("ctxToggle").addEventListener("click", () => {
  const panel = $("ctxPanel");
  panel.classList.toggle("hidden");
  $("ctxArrow").textContent = panel.classList.contains("hidden") ? "▾" : "▴";
});

// Mode Switching (Segmented Control)
const evolveTab = $("modeEvolve");
const replyTab = $("modeReply");

evolveTab.onclick = () => switchMode("evolve");
replyTab.onclick = () => switchMode("reply");

function switchMode(newMode) {
  mode = newMode;

  evolveTab.classList.toggle("active", mode === "evolve");
  replyTab.classList.toggle("active", mode === "reply");

  const label = $("textareaLabel");
  const textarea = $("message");
  const fixGrammarBtn = $("fixGrammar");
  const evolveBtn = $("improve");

  // Clear previous outputs
  $("output").innerHTML = "";
  $("empty").classList.remove("hidden");
  $("recommendation").classList.add("hidden");

  if (mode === "evolve") {
    label.textContent = "Your message";
    textarea.placeholder = "Paste your message here…  e.g. bro send that file asap";
    fixGrammarBtn.classList.remove("hidden");
    evolveBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-ic"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg> Evolve Message`;
  } else {
    label.textContent = "Message you received";
    textarea.placeholder = "Paste the message you received here…  e.g. Hey, are you free for a call at 3 PM?";
    fixGrammarBtn.classList.add("hidden");
    evolveBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-ic"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> Suggest Replies`;
  }
}

// Custom inputs mark user interaction
$("customTone").addEventListener("input", () => { userInteracted = true; });
$("customPlatform").addEventListener("input", () => { userInteracted = true; });
$("recipient").addEventListener("input", () => { userInteracted = true; });
$("conversationContext").addEventListener("input", () => { userInteracted = true; });

$("improve").addEventListener("click", () => improve("evolve"));
$("fixGrammar").addEventListener("click", () => improve("grammar"));

async function improve(modeArg = "evolve") {
  const message = $("message").value.trim();
  if (!message) return;
  $("error").classList.add("hidden");
  $("infoMessage").classList.add("hidden");

  const tone = modeArg === "grammar" ? "Fix Grammar Only" : (state.tone === "Custom" ? $("customTone").value.trim() : state.tone);
  const platform = state.platform === "Custom" ? $("customPlatform").value.trim() : state.platform;
  const recipient = RECIPIENTS.includes(state.recipient) ? state.recipient : $("recipient").value.trim();
  
  const context = $("ctxPanel").classList.contains("hidden") ? "" : $("conversationContext").value.trim();
  const finalRecipient = $("ctxPanel").classList.contains("hidden") ? "" : recipient;

  if (
    lastRequest.message === message &&
    lastRequest.tone === tone &&
    lastRequest.platform === platform &&
    lastRequest.recipient === finalRecipient &&
    lastRequest.conversationContext === context &&
    lastRequest.mode === mode
  ) {
    $("infoMessage").innerHTML = `<svg class="info-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> Draft and options haven't changed. Showing previous result.`;
    $("infoMessage").classList.remove("hidden");
    if ($("output").innerHTML) {
      $("output").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    return;
  }

  const btn = modeArg === "grammar" ? $("fixGrammar") : $("improve");
  const originalText = btn.innerHTML;
  const textarea = $("message");
  btn.disabled = true;
  btn.textContent = "Evolving…";
  textarea.classList.add("loading-pulse");

  try {
    const apiBase = (window.location.protocol === "file:" || window.location.hostname === "")
      ? "http://localhost:8000"
      : "";
    const endpoint = mode === "reply" ? "/api/reply" : "/api/improve";
    const selectedModel = $("modelSelect") ? $("modelSelect").value : "";
    const res = await fetch(apiBase + endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        tone: tone || "Casual",
        platform,
        conversationContext: context,
        recipient: finalRecipient,
        model: selectedModel,
      }),
    });
    

    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      if (retryAfter) {
        startRateLimitCooldown(parseInt(retryAfter));
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Too many requests.");
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Could not process the message right now.");
    }
    const data = await res.json();
    
    // Update lastRequest cache state
    lastRequest = {
      message,
      tone,
      platform,
      recipient: finalRecipient,
      conversationContext: context,
      mode
    };

    if (mode === "reply") {
      renderReplyOutput(data);
    } else {
      renderOutput(data);
    }
  } catch (e) {
    if (!countdownInterval) {
      $("error").textContent = e.message;
      $("error").classList.remove("hidden");
    }
  } finally {
    if (!countdownInterval) {
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }, 1500);
      textarea.classList.remove("loading-pulse");
    } else {
      textarea.classList.remove("loading-pulse");
    }
  }
}

function renderOutput(data) {
  $("empty").classList.add("hidden");
  const { improved, score } = data;
  const original = $("message").value.trim() || "Original Draft";
  const rows = [
    ["Clarity", score.breakdown.clarity],
    ["Tone", score.breakdown.tone],
    ["Professionalism", score.breakdown.professionalism],
    ["Readability", score.breakdown.readability],
  ];
  const max = Math.max(...rows.map((r) => r[1]), 30);

  $("output").innerHTML = `
    <div class="out-wrap">
      <div class="out-card">
        <span class="badge"><img src="/static/logo.png" alt="Logo" class="logo-img-badge" /> Evolved Output</span>
        
        <div class="comparison-container">
          <div class="comparison-block before-block">
            <span class="comparison-badge before-badge">Before</span>
            <p class="comparison-text" id="beforeText"></p>
          </div>
          <div class="comparison-arrow">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>
          <div class="comparison-block after-block">
            <span class="comparison-badge after-badge">After</span>
            <p class="comparison-text" id="improvedText" style="cursor: pointer; padding: 10px; border-radius: 8px; transition: background-color 0.2s;" title="Click to copy easily"></p>
          </div>
        </div>

        <div class="out-actions">
          <button id="copyBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-ic"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</button>
          <button id="shareBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-ic"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Share</button>
          <button id="retryBtn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-ic"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Regenerate variations</button>
        </div>
      </div>
      <div class="evolution">
        <span class="step">Draft</span> → <span class="step">Improved</span> → <span class="step final">Refined</span>
      </div>
      <div class="score">
        <div class="score-head">
          <div><p class="lbl" style="margin:0">Kaizen Score</p><p class="muted sm">Your message evolved</p></div>
          <p class="score-num"><span class="muted">${score.before}</span> → <span class="grad-text">${score.after}</span></p>
        </div>
        ${rows.map(([label, v]) => `
          <div class="bar-row">
            <div class="bar-top"><span>${label}</span><span class="plus">+${v}</span></div>
            <div class="bar"><div class="bar-fill" style="width:${Math.round((v / max) * 100)}%"></div></div>
          </div>`).join("")}
      </div>
    </div>`;

  $("beforeText").textContent = original;
  $("improvedText").textContent = improved;

  // Set event handlers
  $("improvedText").onclick = () => copyTextDirectly(improved, $("improvedText"));
  $("copyBtn").onclick = () => copyTextDirectly(improved, $("copyBtn"), true);
  $("shareBtn").onclick = () => shareText(improved);
  $("retryBtn").onclick = () => improve();
  $("output").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderReplyOutput(data) {
  $("empty").classList.add("hidden");
  const suggestions = data.suggestions || [];

  $("output").innerHTML = `
    <div class="out-wrap">
      <div class="score">
        <p class="lbl" style="margin:0 0 16px;">Suggested Replies</p>
        <div class="reply-cards">
          ${suggestions.map((replyText, idx) => `
            <div class="out-card" style="margin-bottom: 12px; border-color: var(--border); background: var(--card);">
              <span class="badge" style="margin-bottom: 10px;"><img src="/static/logo.png" alt="Logo" class="logo-img-badge" /> Option ${idx + 1}</span>
              <p class="out-text" id="replyText_${idx}" style="cursor: pointer; padding: 10px; border-radius: 8px; transition: background-color 0.2s;" title="Click to copy easily"></p>
              <div class="out-actions" style="margin-top: 14px;">
                <button id="copyBtn_${idx}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-ic"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>Copy</button>
                <button id="shareBtn_${idx}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-ic"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Share</button>
              </div>
            </div>
          `).join("")}
        </div>
        <button id="retryBtn" class="btn btn-secondary btn-block mt" style="border-radius:12px; padding:12px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-ic"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>Regenerate variations</button>
      </div>
    </div>`;

  suggestions.forEach((replyText, idx) => {
    $(`replyText_${idx}`).textContent = replyText;
    $(`replyText_${idx}`).onclick = () => copyTextDirectly(replyText, $(`replyText_${idx}`));
    $(`copyBtn_${idx}`).onclick = () => copyTextDirectly(replyText, $(`copyBtn_${idx}`), true);
    $(`shareBtn_${idx}`).onclick = () => shareText(replyText);
  });

  $("retryBtn").onclick = () => improve();
  $("output").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Copy to Clipboard Helpers
async function copyTextDirectly(text, element, isButton = false) {
  try {
    await navigator.clipboard.writeText(text);
    if (isButton) {
      const originalHTML = element.innerHTML;
      element.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="btn-ic"><polyline points="20 6 9 17 4 12"/></svg>Copied`;
      setTimeout(() => { element.innerHTML = originalHTML; }, 1800);
    } else {
      const originalBg = element.style.backgroundColor;
      element.style.backgroundColor = "rgba(34, 197, 94, 0.15)";
      setTimeout(() => { element.style.backgroundColor = originalBg; }, 400);
    }
  } catch (err) {
    console.error("Failed to copy:", err);
  }
}


// Web Share API sharing
async function shareText(text) {
  if (navigator.share) {
    try {
      await navigator.share({ text: text });
    } catch (err) {
      await navigator.clipboard.writeText(text);
    }
  } else {
    await navigator.clipboard.writeText(text);
    alert("Copied to clipboard (native sharing not supported by browser).");
  }
}

// Theme toggling and persistence
(function initTheme() {
  const toggleBtn = $("themeToggle");
  const storedTheme = localStorage.getItem("theme");
  const initialTheme = storedTheme || "light";

  document.documentElement.setAttribute("data-theme", initialTheme);

  if (toggleBtn) {
    toggleBtn.onclick = () => {
      const currentTheme = document.documentElement.getAttribute("data-theme");
      const targetTheme = currentTheme === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", targetTheme);
      localStorage.setItem("theme", targetTheme);
    };
  }
})();

// Heuristic Recommendation Engine
function analyzeDraft(text) {
  const t = text.toLowerCase();
  const indicators = {
    professional: ["dear", "sincerely", "regards", "meeting", "project", "schedule", "attached", "invoice", "discuss", "update", "team", "client", "quarterly", "report", "review", "opportunity", "request", "resume", "position", "contract", "proposal"],
    casual: ["bro", "dude", "hey", "wanna", "gonna", "lol", "lmao", "btw", "asap", "yeah", "chill", "party", "tonight", "weekend", "hangout", "yo", "sup", "thanks man", "heyy"],
    polite: ["please", "thank you", "kindly", "could you", "would you", "appreciate", "sorry", "apologize", "excuse me", "grateful", "obligation", "pardon", "sorry for"],
    persuasive: ["buy", "discount", "offer", "deal", "limited", "sale", "save", "free", "guarantee", "try", "join", "best", "exclusive", "promotion", "checkout", "subscribe", "upgrade"]
  };

  let scores = { professional: 0, casual: 0, polite: 0, persuasive: 0 };
  
  for (const [key, words] of Object.entries(indicators)) {
    words.forEach(w => {
      const regex = new RegExp("\\b" + w + "\\b", "g");
      const matches = t.match(regex);
      if (matches) {
        scores[key] += matches.length;
      }
    });
  }

  if (Object.values(scores).reduce((a, b) => a + b, 0) === 0 && t.length > 0) {
    if (t.length > 200) {
      scores.professional = 1;
    } else {
      scores.casual = 1;
    }
  }

  let maxCat = "";
  let maxScore = 0;
  for (const [cat, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxCat = cat;
    }
  }

  if (!maxCat) return null;

  if (maxCat === "professional") {
    return { tone: "Professional", platform: "Email", reason: "business/work phrasing" };
  } else if (maxCat === "casual") {
    return { tone: "Casual", platform: "WhatsApp", reason: "informal terms" };
  } else if (maxCat === "polite") {
    return { tone: "Polite", platform: "Email", reason: "courteous request language" };
  } else if (maxCat === "persuasive") {
    return { tone: "Persuasive", platform: "LinkedIn", reason: "promotional indicators" };
  }
  return null;
}

let lastRecommendationText = "";

async function handleRecommendation(text) {
  if (lastRecommendationText === text && activeRec) {
    updateRecUI(activeRec);
    $("recommendation").classList.remove("hidden");
    return;
  }
  const banner = $("recommendation");
  const suggestBtn = $("suggestBtn");
  const originalText = suggestBtn.innerHTML;
  const textarea = $("message");

  suggestBtn.disabled = true;
  suggestBtn.textContent = "Analyzing…";
  textarea.classList.add("loading-pulse");
  
  try {
    const apiBase = (window.location.protocol === "file:" || window.location.hostname === "")
      ? "http://localhost:8000"
      : "";
    const res = await fetch(apiBase + "/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });
    


    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      if (retryAfter) {
        startRateLimitCooldown(parseInt(retryAfter));
      }
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Too many requests.");
    }

    if (res.ok) {
      const rec = await res.json();
      activeRec = rec;
      lastRecommendationText = text;
      updateRecUI(rec);
    } else {
      useLocalFallback(text);
    }
  } catch (e) {
    useLocalFallback(text);
  } finally {
    if (!countdownInterval) {
      setTimeout(() => {
        suggestBtn.disabled = false;
        suggestBtn.innerHTML = originalText;
      }, 1500);
      textarea.classList.remove("loading-pulse");
    } else {
      textarea.classList.remove("loading-pulse");
    }
  }
}

function useLocalFallback(text) {
  const rec = analyzeDraft(text);
  if (!rec) {
    $("recommendation").classList.add("hidden");
    activeRec = null;
    return;
  }
  activeRec = rec;
  lastRecommendationText = text;
  updateRecUI(rec);
}

function updateRecUI(rec) {
  const banner = $("recommendation");
  if (!userInteracted) {
    state.tone = rec.tone;
    renderChips($("tones"), TONES, "tone", { allowCustom: true });
    $("customTone").classList.add("hidden");
    
    $("recText").innerHTML = `Auto-selected <strong>${rec.tone}</strong> tone based on AI suggestion.`;
    $("applyRecBtn").classList.add("hidden");
  } else {
    const currentTone = state.tone === "Custom" ? $("customTone").value.trim() : state.tone;
    
    if (currentTone !== rec.tone) {
      $("recText").innerHTML = `AI recommends <strong>${rec.tone}</strong> tone: <em>"${rec.reason}"</em>.`;
      $("applyRecBtn").classList.remove("hidden");
    } else {
      $("recText").innerHTML = `AI recommended <strong>${rec.tone}</strong> tone is active.`;
      $("applyRecBtn").classList.add("hidden");
    }
  }
  banner.classList.remove("hidden");
}

$("applyRecBtn").onclick = () => {
  if (activeRec) {
    userInteracted = true;
    state.tone = activeRec.tone;
    renderChips($("tones"), TONES, "tone", { allowCustom: true });
    $("customTone").classList.add("hidden");
    $("applyRecBtn").classList.add("hidden");
    $("recText").innerHTML = `Applied <strong>${activeRec.tone}</strong> tone.`;
  }
};

// cleanTextTypos function removed as typo handling is now fully delegated to system prompts

// Share Website functionality
async function shareWebsite() {
  const title = "KaizenReply — Improve every message. One Kaizen at a time.";
  const text = "Check out KaizenReply — Evolve your drafts into clear, confident messages step-by-step!";
  const url = window.location.origin;

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch (err) {
      await navigator.clipboard.writeText(url);
      alert("Website link copied to clipboard!");
    }
  } else {
    await navigator.clipboard.writeText(url);
    alert("Website link copied to clipboard!");
  }
}

async function loadDynamicModels() {
  try {
    const apiBase = (window.location.protocol === "file:" || window.location.hostname === "")
      ? "http://localhost:8000"
      : "";
    const res = await fetch(apiBase + "/api/models");
    if (res.ok) {
      const data = await res.json();
      const select = $("modelSelect");
      const row = $("modelSelectRow");
      if (select && data.models && data.models.length) {
        select.innerHTML = data.models.map(m =>
          `<option value="${m}" ${m === data.current ? 'selected' : ''}>${m}</option>`
        ).join("");
        if (row) row.classList.remove("hidden");
      }
    }
  } catch (e) {
    console.log("Could not load dynamic models list:", e);
  }
}

let deferredPwaPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPwaPrompt = e;
  const btn = $("pwaInstallBtn");
  if (btn) btn.classList.remove("hidden");
});

document.addEventListener("DOMContentLoaded", () => {
  const shareWebsiteBtn = $("shareWebsiteBtn");
  const heroShareBtn = $("heroShareBtn");
  const pwaInstallBtn = $("pwaInstallBtn");

  if (shareWebsiteBtn) {
    shareWebsiteBtn.onclick = shareWebsite;
  }
  if (heroShareBtn) {
    heroShareBtn.onclick = shareWebsite;
  }
  if (pwaInstallBtn) {
    pwaInstallBtn.onclick = async () => {
      if (deferredPwaPrompt) {
        deferredPwaPrompt.prompt();
        const { outcome } = await deferredPwaPrompt.userChoice;
        if (outcome === "accepted") {
          pwaInstallBtn.classList.add("hidden");
        }
        deferredPwaPrompt = null;
      }
    };
  }

  // Register Service Worker for PWA
  if ("serviceWorker" in navigator && window.location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.log("Service Worker registration failed:", err);
    });
  }

  // Sample pills handler
  document.querySelectorAll(".sample-pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      const text = pill.getAttribute("data-text");
      if (text) {
        $("message").value = text;
        $("count").textContent = text.length;
        userInteracted = true;
        improve(mode === "reply" ? "reply" : "evolve");
      }
    });
  });

  // Keyboard shortcut Ctrl+Enter / Cmd+Enter
  const textarea = $("message");
  if (textarea) {
    textarea.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        improve(mode === "reply" ? "reply" : "evolve");
      }
    });
  }

  // Auto-fill from URL params (Share Target / Bookmarklet)
  try {
    const params = new URLSearchParams(window.location.search);
    const sharedText = params.get("text") || params.get("title") || params.get("message");
    if (sharedText) {
      textarea.value = sharedText;
      $("count").textContent = sharedText.length;
      userInteracted = true;
      setTimeout(() => improve(mode === "reply" ? "reply" : "evolve"), 300);
    }
  } catch (err) {
    console.log("Error parsing URL params:", err);
  }

  loadDynamicModels();
});
