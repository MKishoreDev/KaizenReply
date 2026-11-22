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
  tone: lsGet("kaizen_pref_tone", "Professional"),
  platform: lsGet("kaizen_pref_platform", ""),
  recipient: "",
  toneCategory: lsGet("kaizen_pref_tone_cat", "All"),
  linkedinFormat: "Auto",
  linkedinLength: "Auto"
};

if (!TONES.includes(state.tone)) state.tone = "Professional";
if (state.platform && !PLATFORMS.includes(state.platform)) state.platform = "";
if (!["All", "Viral", "Work", "Social"].includes(state.toneCategory)) state.toneCategory = "All";

let currentMode = "evolve"; // "evolve" or "reply"
let currentQuoteIndex = 0;
let lastEvolvedData = null;
let countdownInterval = null;
let deferredInstallPrompt = null;
let draftAutoSaveTimer = null;
let cooldownUntil = 0;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Safe localStorage helpers (storage can throw in private mode / when blocked)
function lsGet(key, fallback = null) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore quota / privacy errors */ }
}
function lsRemove(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

// Clipboard with fallback for non-secure contexts / older browsers
async function copyText(text, successMsg = "Copied to clipboard.") {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      if (!ok) throw new Error("copy failed");
    }
    showKaizenToast(successMsg, "success");
    return true;
  } catch {
    showKaizenToast("Couldn't access the clipboard. Select the text and copy it manually.", "error", 3500);
    return false;
  }
}

// Parse a fetch Response as JSON without crashing on HTML error pages from proxies
async function readJsonSafe(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : {}; } catch { return { detail: res.ok ? "Unexpected response from server." : `Server error (${res.status}). Please try again.` }; }
}

function lockScroll(lock) {
  document.documentElement.classList.toggle("scroll-locked", !!lock);
}

const $ = (id) => document.getElementById(id);

// Initialize Page
document.addEventListener("DOMContentLoaded", async () => {
  // Dismiss page load overlay
  const overlay = document.getElementById('pageLoadOverlay');
  if (overlay) {
    setTimeout(() => overlay.classList.add('done'), 600);
  }

  initTheme();
  populateDropdownsAndChips();
  document.querySelectorAll(".tone-cat-btn").forEach((b) => b.classList.toggle("active", b.getAttribute("data-cat") === state.toneCategory));
  initServiceWorker();
  initPwaInstallPrompts();
  initNetworkStatusListener();
  initDraftAutoRecovery();
  initGlobalKeyboardShortcuts();
  handleIncomingShareTarget();
  
  const modelsPromise = fetchAvailableModels().catch(() => {});
  const quotesPromise = fetchKotowazaProverbs().catch(() => {});
  
  setupEventListeners();
  
  await Promise.all([modelsPromise, quotesPromise]);
  
  updateQuoteDisplay();
  renderKaizenHistory();
  initHeroPreviewAnimation();
  initScrollSpy();

  // Scroll reveal (everything is shown immediately if motion is reduced or IO is unsupported)
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    document.querySelectorAll('.reveal-on-scroll').forEach(el => el.classList.add('is-visible'));
    return;
  }
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal-on-scroll').forEach(el => revealObserver.observe(el));
});

// Active Navigation Scroll Indicator
function initScrollSpy() {
  const sections = ["top", "desk", "how", "philosophy", "features", "quotes"];
  const navItems = document.querySelectorAll(".nav-links a");

  if (!navItems.length) return;

  function onScroll() {
    const scrollPos = window.scrollY + 140; // 140px offset for sticky header height

    let currentSection = "top";
    for (const secId of sections) {
      const el = document.getElementById(secId);
      if (el && scrollPos >= el.offsetTop - 60) {
        currentSection = secId;
      }
    }

    // Special check for bottom of page
    if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 80) {
      currentSection = "quotes";
    }

    navItems.forEach((link) => {
      const href = link.getAttribute("href");
      if (href === `#${currentSection}`) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

// Interactive Typewriter & Score Count-Up Animation Loop for Hero Mini Card
function initHeroPreviewAnimation() {
  const draftEl = $("heroDraftText");
  const evolvedEl = $("heroEvolvedText");
  const scoreValEl = $("heroScoreVal");
  const gainValEl = $("heroGainVal");
  const flowBadgeEl = $("heroFlowBadge");

  if (!draftEl || !evolvedEl || !scoreValEl) return;

  const originalText = "bro send that report asap need it for client meeting";
  const evolvedText = "Could you please send the report as soon as possible for the client meeting?";
  const targetScore = 78;
  const startScore = 60;
  const gain = targetScore - startScore;

  if (prefersReducedMotion) {
    draftEl.textContent = originalText;
    evolvedEl.textContent = evolvedText;
    evolvedEl.classList.add("mini-evolved--active");
    scoreValEl.textContent = targetScore;
    if (gainValEl) { gainValEl.textContent = `+${gain}`; gainValEl.style.opacity = "1"; gainValEl.style.transform = "scale(1)"; }
    return;
  }

  async function runAnimationCycle() {
    // Don't burn CPU while the tab is hidden
    if (document.hidden) {
      document.addEventListener("visibilitychange", runAnimationCycle, { once: true });
      return;
    }
    // 1. Reset card elements
    draftEl.innerHTML = '<span class="typewriter-text"></span><span class="typewriter-cursor">|</span>';
    evolvedEl.innerHTML = '<span style="opacity:0.35;font-size:11px;">Waiting for draft message…</span>';
    evolvedEl.classList.remove("mini-evolved--active");
    scoreValEl.textContent = "--";
    if (gainValEl) {
      gainValEl.style.opacity = "0";
      gainValEl.style.transform = "scale(0.8)";
    }
    if (flowBadgeEl) flowBadgeEl.classList.remove("mini-flow--glowing");

    const textSpan = draftEl.querySelector(".typewriter-text");

    // 2. Type original message character-by-character (~38ms per char)
    for (let i = 0; i <= originalText.length; i++) {
      if (textSpan) textSpan.textContent = originalText.substring(0, i);
      await new Promise((r) => setTimeout(r, 38));
    }

    // Pause briefly after typing draft
    await new Promise((r) => setTimeout(r, 450));

    // Hide typing cursor
    const cursor = draftEl.querySelector(".typewriter-cursor");
    if (cursor) cursor.style.display = "none";

    // 3. Show Kaizen loader state & glowing flow badge
    if (flowBadgeEl) flowBadgeEl.classList.add("mini-flow--glowing");
    evolvedEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;color:var(--primary-emphasis);font-weight:600;font-size:11px;">
        <div class="kaizen-loader__dots" style="gap:4px;">
          <div class="kaizen-loader__dot" style="height:12px;width:3px;"></div>
          <div class="kaizen-loader__dot" style="height:12px;width:3px;"></div>
          <div class="kaizen-loader__dot" style="height:12px;width:3px;"></div>
        </div>
        <span>Kaizen refining clarity &amp; tone…</span>
      </div>
    `;

    await new Promise((r) => setTimeout(r, 800));

    // 4. Reveal Evolved Message with pop-in
    evolvedEl.innerHTML = escapeHtml(evolvedText);
    evolvedEl.classList.add("mini-evolved--active");

    // 5. Kaizen Score Count-Up Animation (60 -> 78 / 100)
    const duration = 450;
    const steps = 12;
    const stepTime = Math.floor(duration / steps);
    for (let s = 0; s <= steps; s++) {
      const current = Math.round(startScore + (gain * (s / steps)));
      scoreValEl.textContent = current;
      await new Promise((r) => setTimeout(r, stepTime));
    }
    scoreValEl.textContent = targetScore;

    if (gainValEl) {
      gainValEl.textContent = `+${gain}`;
      gainValEl.style.opacity = "1";
      gainValEl.style.transform = "scale(1)";
    }

    // 6. Hold completed state for 4.5 seconds and loop again
    setTimeout(runAnimationCycle, 4500);
  }

  runAnimationCycle();
}

// Theme Management
function initTheme() {
  const saved = lsGet("kaizen-theme");
  // Follow the user's explicit choice, otherwise the OS preference (same rule as theme-init.js)
  const isDark = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(isDark, false);
}

function setTheme(dark, persist = true) {
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  if (persist) lsSet("kaizen-theme", dark ? "dark" : "light");
  const themeBtn = $("themeToggle");
  if (themeBtn) themeBtn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
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
  const savedModel = lsGet("kaizen_pref_model");
  try {
    const res = await fetch("/api/models");
    if (!res.ok) return;
    const data = await res.json();
    const modelsList = Array.isArray(data) ? data : (data.models || []);
    if (modelsList.length > 0) {
      const currentSelected = savedModel || select.value || data.current || "qwen/qwen3.8-27b";
      select.innerHTML = modelsList
        .filter((m) => typeof m === "string")
        .map((m) => `<option value="${escapeHtml(m)}" ${m === currentSelected ? 'selected' : ''}>${escapeHtml(m)}</option>`)
        .join("");
    }
  } catch (e) {
    console.warn("Could not fetch models dynamically, using static fallback models:", e);
  }
}

// Populate Select Options & Chips
function populateDropdownsAndChips() {
  const toneSel = $("toneSelect");
  const platformSel = $("platformSelect");
  if (toneSel) {
    toneSel.innerHTML = TONES.map((t) => `<option value="${t}">${t === "🔥 Roast My Draft" ? "Roast My Draft" : t}</option>`).join("");
    toneSel.value = state.tone;
    toneSel.onchange = () => {
      state.tone = toneSel.value;
      lsSet("kaizen_pref_tone", state.tone);
      renderToneChips();
    };
  }
  if (platformSel) {
    platformSel.innerHTML = `<option value="">Platform-neutral</option>` + PLATFORMS.map((p) => `<option value="${p}">${p}</option>`).join("");
    platformSel.value = state.platform;
    platformSel.onchange = () => {
      state.platform = platformSel.value;
      lsSet("kaizen_pref_platform", state.platform);
      renderPlatformChips();
    };
  }

  renderToneChips();
  renderPlatformChips();
  renderRecipientChips();
  initLinkedInBroControls();
}

// Initialize LinkedIn Bro Meme Format & Length Selectors
function initLinkedInBroControls() {
  const fmtContainer = $("linkedinFormatChips");
  const lenContainer = $("linkedinLengthChips");

  if (fmtContainer) {
    fmtContainer.querySelectorAll("button").forEach((btn) => {
      btn.onclick = () => {
        state.linkedinFormat = btn.getAttribute("data-fmt") || "Auto";
        fmtContainer.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      };
    });
  }

  if (lenContainer) {
    lenContainer.querySelectorAll("button").forEach((btn) => {
      btn.onclick = () => {
        state.linkedinLength = btn.getAttribute("data-len") || "Auto";
        lenContainer.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      };
    });
  }
}

// Render Tone Chips
function renderToneChips() {
  const container = $("toneChips");
  if (!container) return;

  const filtered = state.toneCategory === "All"
    ? TONES
    : TONES.filter((t) => (TONE_CATEGORIES[state.toneCategory] || []).includes(t));

  container.innerHTML = filtered.map((t) => `
    <button type="button" class="chip ${state.tone === t ? 'active' : ''}" data-tone="${t}">${t === "🔥 Roast My Draft" ? "Roast My Draft" : t}</button>
  `).join("");

  // Toggle LinkedIn Bro sub-controls visibility
  const lbControls = $("linkedinBroControls");
  if (lbControls) {
    if (state.tone === "LinkedIn Bro") {
      lbControls.classList.remove("hidden");
    } else {
      lbControls.classList.add("hidden");
    }
  }

  container.querySelectorAll("button").forEach((btn) => {
    btn.onclick = () => {
      state.tone = btn.getAttribute("data-tone");
      lsSet("kaizen_pref_tone", state.tone);
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
      lsSet("kaizen_pref_platform", state.platform);
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

// PWA Service Worker Registration & Offline Support
function initServiceWorker() {
  if ("serviceWorker" in navigator) {
    const registerSW = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("KaizenReply ServiceWorker active:", reg.scope);
        })
        .catch((err) => {
          console.warn("ServiceWorker registration failed:", err);
        });
    };

    if (document.readyState === "complete") {
      registerSW();
    } else {
      window.addEventListener("load", registerSW);
    }
  }
}

// Handle PWA Web Share Target incoming parameters
function handleIncomingShareTarget() {
  const params = new URLSearchParams(window.location.search);
  const sharedText = params.get("text") || params.get("title") || params.get("url");
  if (sharedText) {
    const msgInput = $("messageInput");
    if (msgInput) {
      msgInput.value = sharedText;
      updateDraftMetrics(sharedText);
      saveDraftToStorageDebounced(sharedText);
      document.getElementById("desk")?.scrollIntoView({ behavior: "smooth" });
      showKaizenToast("Shared message imported into Kaizen desk!", "success");
    }
    // Remove the params so a refresh doesn't overwrite the draft again
    try { history.replaceState(null, "", window.location.pathname + window.location.hash); } catch { /* ignore */ }
  }
}

// Everyday Draft Persistence & Auto-Recovery
function initDraftAutoRecovery() {
  const msgInput = $("messageInput");
  if (!msgInput) return;

  const saved = lsGet("kaizen_active_draft");
  if (saved && !msgInput.value.trim()) {
    msgInput.value = saved;
    updateDraftMetrics(saved);
  } else if (msgInput.value) {
    updateDraftMetrics(msgInput.value);
  }
}

function updateDraftMetrics(text) {
  const charCount = $("charCount");
  const wordCount = $("draftWordCount");
  const readTime = $("draftReadTime");

  const val = text || "";
  if (charCount) charCount.textContent = val.length;

  const words = val.trim() ? val.trim().split(/\s+/).filter(Boolean).length : 0;
  if (wordCount) wordCount.textContent = words;

  // Approx 3.3 words per second (200 wpm)
  const seconds = words === 0 ? 0 : Math.max(1, Math.round(words / 3.3));
  if (readTime) readTime.textContent = seconds < 60 ? `${seconds}s` : `${Math.ceil(seconds / 60)}m`;
}

function saveDraftToStorageDebounced(text) {
  clearTimeout(draftAutoSaveTimer);
  draftAutoSaveTimer = setTimeout(() => {
    if (text && text.trim()) {
      lsSet("kaizen_active_draft", text);
    } else {
      lsRemove("kaizen_active_draft");
    }
  }, 250);
}

// PWA Install Experience (Android, iOS & Desktop)
function initPwaInstallPrompts() {
  const pwaNavBtn = $("pwaInstallBtn");
  const pwaMobileBtn = $("pwaInstallMobileBtn");
  const pwaPopup = $("pwaInstallPopup");
  const pwaPopupInstallBtn = $("pwaPopupInstallBtn");
  const pwaPopupCloseBtn = $("pwaPopupCloseBtn");
  const pwaPopupDismissBtn = $("pwaPopupDismissBtn");
  const pwaPopupIosTip = $("pwaPopupIosTip");

  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  if (isStandalone) {
    document.body.classList.add("pwa-standalone");
    if (pwaNavBtn) pwaNavBtn.classList.add("hidden");
    if (pwaMobileBtn) pwaMobileBtn.classList.add("hidden");
    if (pwaPopup) pwaPopup.remove();
    return;
  }

  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

  function showPopupPrompt() {
    if (isStandalone) return;
    try { if (sessionStorage.getItem("kaizen_pwa_dismissed") === "true") return; } catch { /* ignore */ }
    if (pwaPopup) {
      pwaPopup.classList.add("show");
      pwaPopup.setAttribute("aria-hidden", "false");
    }
  }

  function hidePopupPrompt() {
    if (pwaPopup) {
      pwaPopup.classList.remove("show");
      pwaPopup.setAttribute("aria-hidden", "true");
    }
  }

  function dismissPopupForeverForSession() {
    hidePopupPrompt();
    try { sessionStorage.setItem("kaizen_pwa_dismissed", "true"); } catch { /* ignore */ }
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (pwaNavBtn) pwaNavBtn.classList.remove("hidden");
    if (pwaMobileBtn) pwaMobileBtn.classList.remove("hidden");
    // Show non-intrusive popup after user engagement delay (3.5s)
    setTimeout(() => {
      showPopupPrompt();
    }, 3500);
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    hidePopupPrompt();
    if (pwaNavBtn) pwaNavBtn.classList.add("hidden");
    if (pwaMobileBtn) pwaMobileBtn.classList.add("hidden");
    document.body.classList.add("pwa-standalone");
    showKaizenToast("KaizenReply installed to your device.", "success");
  });

  // Only advertise install where it can actually happen: browsers that fire
  // beforeinstallprompt (handled above) or iOS Safari (manual Add to Home Screen).
  if (isIos) {
    if (pwaNavBtn) pwaNavBtn.classList.remove("hidden");
    if (pwaMobileBtn) pwaMobileBtn.classList.remove("hidden");
    if (pwaPopupIosTip) pwaPopupIosTip.classList.remove("hidden");
    const actionText = $("pwaPopupActionText");
    if (actionText) actionText.textContent = "How to install";
    let dismissed = false;
    try { dismissed = sessionStorage.getItem("kaizen_pwa_dismissed") === "true"; } catch { /* ignore */ }
    if (!dismissed) setTimeout(showPopupPrompt, 6000);
  } else {
    if (pwaNavBtn) pwaNavBtn.classList.add("hidden");
    if (pwaMobileBtn) pwaMobileBtn.classList.add("hidden");
  }

  // Handle Install Action Trigger
  async function triggerInstallFlow() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === "accepted") {
        hidePopupPrompt();
      }
      deferredInstallPrompt = null;
    } else if (isIos) {
      if (pwaPopup) {
        pwaPopup.classList.add("show");
        if (pwaPopupIosTip) pwaPopupIosTip.classList.remove("hidden");
      }
    } else {
      showKaizenToast("Tap your browser's menu (⋮) > 'Install app' or 'Add to Home screen'", "info", 4500);
    }
  }

  if (pwaNavBtn) pwaNavBtn.onclick = () => {
    if (deferredInstallPrompt) {
      triggerInstallFlow();
    } else {
      if (pwaPopup) {
        pwaPopup.classList.add("show");
        if (isIos && pwaPopupIosTip) pwaPopupIosTip.classList.remove("hidden");
      }
    }
  };

  if (pwaMobileBtn) pwaMobileBtn.onclick = () => {
    $("mobileMenuPanel")?.classList.add("hidden");
    if (deferredInstallPrompt) {
      triggerInstallFlow();
    } else {
      if (pwaPopup) {
        pwaPopup.classList.add("show");
        if (isIos && pwaPopupIosTip) pwaPopupIosTip.classList.remove("hidden");
      }
    }
  };

  if (pwaPopupInstallBtn) {
    pwaPopupInstallBtn.onclick = () => {
      triggerInstallFlow();
    };
  }

  if (pwaPopupCloseBtn) pwaPopupCloseBtn.onclick = dismissPopupForeverForSession;
  if (pwaPopupDismissBtn) pwaPopupDismissBtn.onclick = dismissPopupForeverForSession;
}

// Connectivity & Offline Status
function initNetworkStatusListener() {
  const pill = $("offlinePill");

  function updateStatus() {
    const isOnline = navigator.onLine;
    if (pill) {
      pill.classList.toggle("hidden", isOnline);
    }
  }

  window.addEventListener("online", () => {
    updateStatus();
    showKaizenToast("Network connection restored.", "success", 2500);
  });

  window.addEventListener("offline", () => {
    updateStatus();
    showKaizenToast("Offline mode active. Cached proverbs & draft tools ready.", "info", 3500);
  });

  updateStatus();
}

// Header scroll shadow
window.addEventListener('scroll', () => {
  const header = document.querySelector('.site-header');
  if (header) header.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

// Global Keyboard Shortcuts for Everyday Usage
function initGlobalKeyboardShortcuts() {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const kbdHint = $("evolveKbdHint");
  if (kbdHint) {
    kbdHint.textContent = isMac ? "⌘ ↵" : "Ctrl ↵";
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeShareModal();
      closeMobileMenu();
      const popup = $("pwaInstallPopup");
      if (popup && popup.classList.contains("show")) {
        popup.classList.remove("show");
        popup.setAttribute("aria-hidden", "true");
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : "";
      if (activeTag !== "input" && activeTag !== "textarea") {
        e.preventDefault();
        const msgInput = $("messageInput");
        if (msgInput) {
          msgInput.scrollIntoView({ behavior: "smooth", block: "center" });
          msgInput.focus();
        }
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c") {
      if (lastEvolvedData && lastEvolvedData.improved) {
        e.preventDefault();
        copyText(lastEvolvedData.improved);
      }
    }
  });
}

// Event Listeners Setup
function setupEventListeners() {
  const mobileMenuBtn = $("mobileMenuBtn");
  const mobileMenuPanel = $("mobileMenuPanel");
  if (mobileMenuBtn && mobileMenuPanel) {
    mobileMenuBtn.onclick = (e) => {
      e.stopPropagation();
      if (mobileMenuPanel.classList.contains("hidden")) openMobileMenu();
      else closeMobileMenu();
    };
    mobileMenuPanel.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", closeMobileMenu);
    });
    document.addEventListener("click", (e) => {
      if (!mobileMenuPanel.classList.contains("hidden") && !mobileMenuPanel.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
        closeMobileMenu();
      }
    });
    window.addEventListener("resize", () => {
      if (window.innerWidth > 1024) closeMobileMenu();
    }, { passive: true });
  }

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
    const payload = generateKaizenSharePayload();
    if (navigator.share) {
      try {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          await copyText(payload.fullCopyText, "KaizenReply invite & Kotowaza quote copied to clipboard!");
        }
      }
    } else {
      await copyText(payload.fullCopyText, "KaizenReply invite & Kotowaza quote copied to clipboard!");
    }
  };
  if (shareWebBtn) shareWebBtn.onclick = handleShareWeb;
  if (heroShareBtn) heroShareBtn.onclick = handleShareWeb;


  // Studio Tabs: KaizenReply vs My History
  const studioTabDesk = $("studioTabDesk");
  const studioTabHistory = $("studioTabHistory");
  const deskWorkstation = $("deskWorkstation");
  const historyStudioView = $("historyStudioView");
  const historyWriteBtn = $("historyWriteBtn");
  const clearAllHistoryBtn = $("clearAllHistoryBtn");

  if (studioTabDesk && studioTabHistory) {
    studioTabDesk.setAttribute("aria-pressed", "true");
    studioTabHistory.setAttribute("aria-pressed", "false");
    studioTabDesk.addEventListener("click", () => {
      studioTabDesk.setAttribute("aria-pressed", "true");
      studioTabHistory.setAttribute("aria-pressed", "false");
    });
    studioTabHistory.addEventListener("click", () => {
      studioTabDesk.setAttribute("aria-pressed", "false");
      studioTabHistory.setAttribute("aria-pressed", "true");
    });
    studioTabDesk.onclick = () => {
      studioTabDesk.classList.add("selected");
      studioTabHistory.classList.remove("selected");
      if (deskWorkstation) deskWorkstation.classList.remove("hidden");
      if (historyStudioView) historyStudioView.classList.add("hidden");
    };
    studioTabHistory.onclick = () => {
      studioTabHistory.classList.add("selected");
      studioTabDesk.classList.remove("selected");
      if (deskWorkstation) deskWorkstation.classList.add("hidden");
      if (historyStudioView) historyStudioView.classList.remove("hidden");
      renderKaizenHistory();
    };
  }
  if (historyWriteBtn) {
    historyWriteBtn.onclick = () => {
      if (studioTabDesk) studioTabDesk.click();
      const msgInput = $("messageInput");
      if (msgInput) msgInput.focus();
    };
  }
  if (clearAllHistoryBtn) {
    clearAllHistoryBtn.onclick = () => {
      if (confirm("Clear your saved message history?")) {
        lsRemove("kaizen_history");
        renderKaizenHistory();
        showKaizenToast("Saved history cleared.", "info");
      }
    };
  }

  // Mode Switches
  const modeEvolve = $("modeEvolve");
  const modeReply = $("modeReply");
  if (modeEvolve) modeEvolve.onclick = () => switchMode("evolve");
  if (modeReply) modeReply.onclick = () => switchMode("reply");

  // Character Counter & Input
  const msgInput = $("messageInput");
  if (msgInput) {
    msgInput.oninput = () => {
      updateDraftMetrics(msgInput.value);
      saveDraftToStorageDebounced(msgInput.value);
    };
    msgInput.onkeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runKaizenAction();
      }
    };
  }

  // Clear Draft Button
  const clearDraftBtn = $("clearDraftBtn");
  if (clearDraftBtn && msgInput) {
    clearDraftBtn.onclick = () => {
      msgInput.value = "";
      updateDraftMetrics("");
      saveDraftToStorageDebounced("");
      msgInput.focus();
      showKaizenToast("Draft cleared", "info", 1500);
    };
  }

  // Paste Button
  const pasteBtn = $("pasteBtn");
  if (pasteBtn && msgInput) {
    pasteBtn.onclick = async () => {
      try {
        if (!navigator.clipboard || !navigator.clipboard.readText) throw new Error("unsupported");
        const text = await navigator.clipboard.readText();
        if (text) {
          const clipped = text.slice(0, 3000);
          msgInput.value = clipped;
          updateDraftMetrics(clipped);
          saveDraftToStorageDebounced(clipped);
          showKaizenToast(text.length > 3000 ? "Pasted (trimmed to 3000 characters)." : "Pasted clipboard text!", text.length > 3000 ? "info" : "success", 1800);
        }
      } catch (err) {
        showKaizenToast("Clipboard access was blocked. Long-press or Ctrl+V to paste instead.", "error", 3500);
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
      lsSet("kaizen_pref_tone_cat", state.toneCategory);
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
        updateDraftMetrics(text);
        saveDraftToStorageDebounced(text);
      }
      if (tone) {
        state.tone = tone;
        lsSet("kaizen_pref_tone", tone);
        if ($("toneSelect")) $("toneSelect").value = tone;
        renderToneChips();
      }
      if (platform) {
        state.platform = platform;
        lsSet("kaizen_pref_platform", platform);
        if ($("platformSelect")) $("platformSelect").value = platform;
        renderPlatformChips();
      }
    };
  });

  // Model Engine Preference Listener
  const modelSelectEl = $("modelSelect");
  if (modelSelectEl) {
    modelSelectEl.onchange = () => {
      lsSet("kaizen_pref_model", modelSelectEl.value);
    };
  }

  // Expandable Context Drawer
  const ctxToggle = $("contextToggle");
  const ctxDrawer = $("contextDrawer");
  const ctxSymbol = $("ctxSymbol");
  if (ctxToggle && ctxDrawer) {
    ctxToggle.onclick = () => {
      const isHidden = ctxDrawer.classList.contains("hidden");
      ctxDrawer.classList.toggle("hidden", !isHidden);
      if (ctxSymbol) ctxSymbol.textContent = isHidden ? "−" : "+";
      ctxToggle.setAttribute("aria-expanded", String(isHidden));
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
        const text = `${q.japanese} (${q.romaji}) — ${q.meaning ? q.meaning.en : (q.translation || '')}`;
        msgInput.value = text;
        updateDraftMetrics(text);
        saveDraftToStorageDebounced(text);
        msgInput.focus();
        document.getElementById("desk")?.scrollIntoView({ behavior: "smooth" });
      }
    };
  }
  if (shareQuote) {
    shareQuote.onclick = () => {
      const list = getFilteredQuotes().length ? getFilteredQuotes() : kotowazaList;
      const q = (list && list[currentQuoteIndex]) || QUOTES[0];
      const meaning = (q.meaning && q.meaning.en) ? q.meaning.en : (q.translation || "");
      const shareText = `"${q.japanese}" (${q.romaji}) — ${meaning}\n\nKaizen Kotowaza · https://kaizenreply.us.ci`;
      if (navigator.share) {
        navigator.share({ title: "Kaizen Kotowaza", text: shareText }).catch(() => undefined);
      } else {
        copyText(shareText, "Proverb copied to clipboard.");
      }
    };
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
      lsRemove("kaizen_history");
      renderKaizenHistory();
    };
  }

  // Modal Close
  const closeModalBtn = $("closeModalBtn");
  const shareModal = $("shareModal");
  if (closeModalBtn && shareModal) {
    closeModalBtn.onclick = closeShareModal;
    shareModal.addEventListener("click", (e) => {
      if (e.target === shareModal) closeShareModal();
    });
  }
}

function openMobileMenu() {
  const panel = $("mobileMenuPanel");
  const btn = $("mobileMenuBtn");
  if (!panel) return;
  panel.classList.remove("hidden");
  if (btn) { btn.setAttribute("aria-expanded", "true"); btn.setAttribute("aria-label", "Close navigation"); }
}

function closeMobileMenu() {
  const panel = $("mobileMenuPanel");
  const btn = $("mobileMenuBtn");
  if (!panel || panel.classList.contains("hidden")) return;
  panel.classList.add("hidden");
  if (btn) { btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-label", "Open navigation"); }
}

let modalReturnFocus = null;
function closeShareModal() {
  const modal = $("shareModal");
  if (!modal || modal.classList.contains("hidden")) return;
  modal.classList.add("hidden");
  lockScroll(false);
  if (modalReturnFocus && typeof modalReturnFocus.focus === "function") modalReturnFocus.focus();
  modalReturnFocus = null;
}

// Mode Switch Handler
function switchMode(mode) {
  currentMode = mode;
  const modeEvolve = $("modeEvolve");
  const modeReply = $("modeReply");
  const deskTitle = $("deskTitleText");
  const evolveBtnText = $("evolveBtnText");
  const fixGrammarBtn = $("fixGrammarBtn");
  const msgInput = $("messageInput");

  if (modeEvolve && modeReply) {
    modeEvolve.classList.toggle("active", mode === "evolve");
    modeReply.classList.toggle("active", mode === "reply");
  }
  if (deskTitle) {
    deskTitle.textContent = mode === "evolve" ? "Your Draft" : "Message you received";
  }
  if (fixGrammarBtn) {
    if (mode === "reply") {
      fixGrammarBtn.classList.add("hidden");
    } else {
      fixGrammarBtn.classList.remove("hidden");
    }
  }
  if (evolveBtnText) {
    evolveBtnText.textContent = mode === "evolve" ? "Refine Draft" : "Get Replies";
  }
  if (modeEvolve && modeReply) {
    modeEvolve.setAttribute("aria-pressed", String(mode === "evolve"));
    modeReply.setAttribute("aria-pressed", String(mode === "reply"));
  }
  if (msgInput) {
    msgInput.placeholder = mode === "evolve" ? "Paste your message here…  e.g. bro send that report asap" : "Paste the message you received…  e.g. Can you send the report by tomorrow?";
  }
}

function primaryActionLabel() {
  return currentMode === "reply" ? "Get Replies" : "Refine Draft";
}

function startRateLimitCooldown(seconds = 10) {
  cooldownUntil = Date.now() + seconds * 1000;
  const tick = () => {
    const btnText = $("evolveBtnText");
    const btn = $("evolveBtn");
    const remaining = Math.ceil((cooldownUntil - Date.now()) / 1000);
    if (remaining <= 0) {
      cooldownUntil = 0;
      if (btn) btn.disabled = false;
      if (btnText) btnText.textContent = primaryActionLabel();
      return;
    }
    if (btn) btn.disabled = true;
    if (btnText) btnText.textContent = `Wait ${remaining}s…`;
    setTimeout(tick, 250);
  };
  tick();
}

function setLoading(isLoading) {
  const btn = $("evolveBtn");
  if (!btn) return;
  const btnText = $("evolveBtnText");
  btn.classList.toggle("is-loading", isLoading);
  btn.setAttribute("aria-busy", String(isLoading));
  if (isLoading) {
    btn.disabled = true;
    if (btnText) btnText.textContent = currentMode === "reply" ? "Writing replies…" : "Refining…";
  } else if (Date.now() >= cooldownUntil) {
    btn.disabled = false;
    if (btnText) btnText.textContent = primaryActionLabel();
  }
  // during a cooldown, startRateLimitCooldown owns the label and disabled state
}

// Execute AI Action (Evolve or Reply)
async function runKaizenAction(overrideTone = null) {
  const msgInput = $("messageInput");
  const recipientInput = $("recipientInput");
  const contextInput = $("contextInput");
  const modelSelect = $("modelSelect");
  const outputContainer = $("outputContainer");
  const errorBanner = $("errorBanner");
  const evolveBtn = $("evolveBtn");
  const fixGrammarBtn = $("fixGrammarBtn");

  if (errorBanner) errorBanner.classList.add("hidden");

  if (Date.now() < cooldownUntil) {
    showKaizenToast("Please wait a few seconds before trying again.", "info", 2000);
    return;
  }
  if ($("evolveBtn")?.classList.contains("is-loading")) return;

  if (!navigator.onLine) {
    showKaizenToast("You are currently offline. Drafts, proverbs, and past history are safely cached.", "info", 4500);
    return;
  }

  if (!msgInput || !msgInput.value.trim()) {
    showKaizenToast("Please enter a message draft first.", "info");
    return;
  }

  const effectiveTone = overrideTone || state.tone || "Professional";
  const payload = {
    message: msgInput.value.trim(),
    tone: effectiveTone,
    platform: state.platform || "",
    recipient: recipientInput ? recipientInput.value.trim() : state.recipient || "",
    conversationContext: contextInput ? contextInput.value.trim() : "",
    model: modelSelect ? modelSelect.value : "",
    linkedinFormat: effectiveTone === "LinkedIn Bro" ? (state.linkedinFormat || "Auto") : "Auto",
    linkedinLength: effectiveTone === "LinkedIn Bro" ? (state.linkedinLength || "Auto") : "Auto"
  };

  // Render Kaizen Loading State (Task 2)
  const LOADING_HTML = `
<div class="kaizen-refine-loader">
  <div class="krl-mark">
    <div class="krl-ring"></div>
    <span class="krl-kanji">改</span>
  </div>
  <div class="krl-lines">
    <div class="krl-line" style="width:72%"></div>
    <div class="krl-line" style="width:55%"></div>
    <div class="krl-line" style="width:83%"></div>
  </div>
  <p class="krl-label">Refining your draft<span class="krl-ellipsis"></span></p>
  <p class="krl-sublabel">改善 · Continuous improvement</p>
</div>`;
  outputContainer.innerHTML = LOADING_HTML;

  // Reset the marginalia so notes from a previous run never sit next to a new result
  resetMarginalia();

  // On stacked (single-column) layouts, bring the result into view
  const outputCol = document.querySelector(".output-column");
  if (outputCol && outputCol.getBoundingClientRect().top > window.innerHeight * 0.6) {
    outputCol.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  }

  setLoading(true);
  if (fixGrammarBtn) fixGrammarBtn.disabled = true;

  try {
    const endpoint = currentMode === "reply" ? "/api/reply" : "/api/improve";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (res.status === 429) {
      const retry = parseInt(res.headers.get("Retry-After") || "", 10);
      startRateLimitCooldown(Number.isFinite(retry) && retry > 0 ? Math.min(retry, 60) : 10);
      throw new Error("You're refining quickly! Please wait a moment and try again.");
    }

    const data = await readJsonSafe(res);
    if (!res.ok) {
      const detail = typeof data.detail === "string" ? data.detail
        : Array.isArray(data.detail) ? "Please check your message and try again." : "Request failed. Please try again.";
      throw new Error(detail);
    }
    if (currentMode === "reply" ? !Array.isArray(data.suggestions) : typeof data.improved !== "string") {
      throw new Error("Unexpected response from the Kaizen service. Please try again.");
    }

    if (currentMode === "reply") {
      renderReplyOutput(data, payload.message);
    } else {
      lastEvolvedData = { original: payload.message, ...data, tone: payload.tone, platform: payload.platform };
      const historyId = saveToKaizenHistory(payload.message, data.improved, data.score, payload.tone);
      renderEvolveOutput(data, payload.message, payload.tone, payload.platform, historyId);
    }
  } catch (err) {
    const msg = (err && err.name === "TypeError")
      ? "Couldn't reach the Kaizen service. Check your connection — your draft is safe."
      : (err.message || "The Kaizen service is temporarily unavailable. Your draft is safe.");
    if (errorBanner) errorBanner.classList.add("hidden");
    outputContainer.innerHTML = `
      <div class="result-state result-error">
        <h3>The message could not evolve</h3>
        <p>${escapeHtml(msg)}</p>
        <button type="button" class="btn-paper" id="retryKaizenBtn">Try again</button>
      </div>
    `;
    const retryBtn = $("retryKaizenBtn");
    if (retryBtn) retryBtn.onclick = () => runKaizenAction(overrideTone);
  } finally {
    setLoading(false);
    if (fixGrammarBtn) fixGrammarBtn.disabled = false;
  }
}

// Render Editorial Proofing Desk Output
function renderEvolveOutput(data, original, tone, platform, historyId = null) {
  const outputContainer = $("outputContainer");

  const origWords = original.trim().split(/\s+/).filter(Boolean);
  const impWords = data.improved.trim().split(/\s+/).filter(Boolean);
  const wordDiff = impWords.length - origWords.length;
  const wordDiffText = wordDiff < 0 ? `${wordDiff} words (${Math.round((wordDiff / origWords.length) * 100)}%)` : wordDiff > 0 ? `+${wordDiff} words` : `Same length`;
  const statsText = `${origWords.length} → ${impWords.length} words · ${platform || "All"}`;

  outputContainer.innerHTML = `
    <div class="evolved-result evolved-result-animate result-reveal">
      <div class="proof-tab-bar">
        <div class="manuscript-tabs" id="manuscriptTabs">
          <button type="button" class="manuscript-tab active" data-tab="refined">Inline diff</button>
          <button type="button" class="manuscript-tab" data-tab="sidebyside">Side by side</button>
          <button type="button" class="manuscript-tab" data-tab="original">Clean final</button>
        </div>
        <div class="proof-tab-tools">
          <div class="proof-word-stats" id="proofWordStats">${escapeHtml(statsText)}</div>
          <button class="btn-paper" id="quickCopyTabBtn" style="padding:4px 10px;font-size:11px;gap:4px;" title="Quick copy revised message">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy
          </button>
        </div>
      </div>

      <div class="manuscript-paper" id="manuscriptBody">
        <div id="manuscriptText">
          <del class="manuscript-del">${escapeHtml(original)}</del>
          <p class="manuscript-ins">${escapeHtml(data.improved)}</p>
        </div>
      </div>

      <div class="result-actions" style="margin-top: 16px;">
        <button class="btn-paper" id="copyResultBtn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy Manuscript
        </button>
        <button class="btn-paper" id="editResultBtn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          Edit
        </button>
        <button class="btn-paper" id="shareResultBtn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          Share
        </button>
        ${tone === "LinkedIn Bro" ? `
        <button class="btn-paper" id="cardResultBtn" style="color:var(--seal);font-weight:600;" title="Generate Reality vs LinkedIn Meme Card">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Meme Card
        </button>
        ` : ""}
        <button class="btn-paper" id="shareXBtn">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l16 16M4 20L20 4"/></svg>
          Post X
        </button>
      </div>

      <div class="evolve-next-actions" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
        <button class="btn-paper" id="backToDraftBtn" style="flex:1 1 140px;justify-content:center;min-height:44px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          Edit Original Draft
        </button>
        <button class="btn-hero" id="evolveFurtherBtn" style="flex:1 1 140px;justify-content:center;min-height:44px;">Refine Further →</button>
      </div>
    </div>
  `;

  // Stagger-animate each child (Task 3)
  const children = outputContainer.querySelectorAll('.result-reveal > *');
  children.forEach((el, i) => {
    el.style.animationDelay = `${i * 80}ms`;
    el.classList.add('result-child-in');
  });

  // Kaizen Hanko Seal Stamp on Result (Task 5)
  const paper = outputContainer.querySelector('.manuscript-paper');
  if (paper) {
    const seal = document.createElement('div');
    seal.className = 'kaizen-hanko-seal';
    seal.innerHTML = '<span class="seal-kanji">改善</span><span class="seal-text">verified</span>';
    paper.appendChild(seal);
    setTimeout(() => seal.classList.add('stamp-in'), 50);
  }

  // Quick Copy Tab Button Listener
  const quickCopyBtn = $("quickCopyTabBtn");
  if (quickCopyBtn) {
    quickCopyBtn.onclick = () => copyText(data.improved);
  }

  // Manuscript Tab Switching Logic
  const tabs = outputContainer.querySelectorAll(".manuscript-tab");
  const manuscriptText = $("manuscriptText");

  function renderActiveProofTab(mode) {
    if (!manuscriptText) return;
    if (mode === "refined") {
      manuscriptText.innerHTML = '<del class="manuscript-del">' + escapeHtml(original) + '</del><p class="manuscript-ins">' + escapeHtml(data.improved) + '</p>';
    } else if (mode === "sidebyside") {
      manuscriptText.innerHTML = '<div class="proof-sidebyside"><div><div class="proof-label">Original</div><p>' + escapeHtml(original) + '</p></div><div><div class="proof-label">Revised</div><p>' + escapeHtml(data.improved) + '</p></div></div>';
    } else if (mode === "original") {
      manuscriptText.innerHTML = '<p class="manuscript-clean">' + escapeHtml(data.improved) + '</p><div style="margin-top:20px;display:flex;justify-content:flex-end;"><button class="btn-paper" id="cleanFinalCopyBtn" style="font-size:12px;padding:6px 14px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Clean Text</button></div>';
      const cleanCopy = $("cleanFinalCopyBtn");
      if (cleanCopy) {
        cleanCopy.onclick = () => copyText(data.improved);
      }
    }
  }

  tabs.forEach(tab => {
    tab.onclick = () => {
      if (isEditing) editBtn.click(); // commit any in-progress edit before switching view
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const mode = tab.getAttribute("data-tab");
      renderActiveProofTab(mode);
    };
  });

  // In-Place Manuscript Edit Listener
  let isEditing = false;
  const editBtn = $("editResultBtn");
  if (editBtn) {
    editBtn.onclick = () => {
      isEditing = !isEditing;
      if (isEditing) {
        editBtn.classList.add("active");
        editBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Done';
        manuscriptText.innerHTML = `
          <textarea class="manuscript-edit-area" id="manuscriptEditArea">${escapeHtml(data.improved)}</textarea>
        `;
        const editArea = $("manuscriptEditArea");
        if (editArea) {
          editArea.style.height = "auto";
          editArea.style.height = Math.max(160, editArea.scrollHeight + 4) + "px";
          editArea.addEventListener("input", () => {
            editArea.style.height = "auto";
            editArea.style.height = Math.max(160, editArea.scrollHeight + 4) + "px";
          });
          editArea.focus();
        }
      } else {
        const editArea = $("manuscriptEditArea");
        if (editArea && editArea.value.trim()) {
          data.improved = editArea.value.trim();
          if (lastEvolvedData) lastEvolvedData.improved = data.improved;
          updateKaizenHistoryEntry(historyId, data.improved);
        }
        editBtn.classList.remove("active");
        editBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg> Edit';
        const activeTab = outputContainer.querySelector(".manuscript-tab.active");
        renderActiveProofTab(activeTab ? activeTab.getAttribute("data-tab") : "refined");
        showKaizenToast("Refined text updated!", "success");
      }
    };
  }

  // Action Buttons Listeners
  $("copyResultBtn").onclick = () => copyText(data.improved, "Refined manuscript copied to clipboard!");
  $("shareResultBtn").onclick = () => {
    if (navigator.share) navigator.share({ text: data.improved }).catch(() => undefined);
    else copyText(data.improved, "Refined manuscript copied to clipboard!");
  };
  const cardBtn = $("cardResultBtn");
  if (cardBtn) {
    cardBtn.onclick = () => openLinkedInMemeModal(original, data.improved);
  }
  $("shareXBtn").onclick = () => shareToX(original, data.improved, data.score ? data.score.before : 60, data.score ? data.score.after : 88, tone);
  $("evolveFurtherBtn").onclick = () => {
    const msgInput = $("messageInput");
    if (msgInput) {
      msgInput.value = data.improved;
      updateDraftMetrics(data.improved);
      saveDraftToStorageDebounced(data.improved);
      msgInput.scrollIntoView({ behavior: "smooth", block: "center" });
      msgInput.focus();
    }
  };
  const backToDraftBtn = $("backToDraftBtn");
  if (backToDraftBtn) {
    backToDraftBtn.onclick = () => {
      const msgInput = $("messageInput");
      if (msgInput) {
        msgInput.scrollIntoView({ behavior: "smooth", block: "center" });
        msgInput.focus();
      }
    };
  }

  // Update Marginalia Aside Panel & Score Box
  const margPanel = $("marginaliaPanel");
  const notes = Array.isArray(data.notes) ? data.notes.filter((n) => n && n.reason) : [];
  if (margPanel) {
    let notesHtml = notes.slice(0, 3).map((n, i) => {
      const reason = String(n.reason);
      const title = reason.split(/(?<=[.!?])\s/)[0].replace(/[.!?]$/, "");
      return `
      <div class="marginalia-note-item">
        <div class="marginalia-note-num">0${i + 1}</div>
        <h4 class="marginalia-note-title">${escapeHtml(title)}</h4>
        ${title.length < reason.length - 1 ? `<p class="marginalia-item">${escapeHtml(reason)}</p>` : ""}
        ${n.original && n.replacement ? `<p class="marginalia-change"><del>${escapeHtml(n.original)}</del> → <ins>${escapeHtml(n.replacement)}</ins></p>` : ""}
      </div>`;
    }).join("");

    if (!notes.length) {
      notesHtml = `<div class="marginalia-note-item"><p class="marginalia-item">Only light touches were needed — your draft was already in good shape.</p></div>`;
    }

    if (data.score) {
      const num = (v, fb) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(30, Math.round(Number(v)))) : fb);
      const after = Math.round(Number(data.score.after) || 0);
      const before = Math.round(Number(data.score.before) || 0);
      const scoreDiff = after - before;
      const diffSign = scoreDiff > 0 ? `+${scoreDiff}` : `${scoreDiff}`;
      const b = data.score.breakdown || {};
      const metrics = [
        ["Clarity", num(b.clarity, 0)],
        ["Tone", num(b.tone, 0)],
        ["Professionalism", num(b.professionalism, 0)],
        ["Readability", num(b.readability, 0)],
      ];
      notesHtml += `
        <div class="score-box">
          <div class="score-main">
            <span class="score-number">${after}</span>
            <span class="score-label">/ 100 · Kaizen score</span>
          </div>
          <div class="score-gain">${diffSign} from original draft (${before})</div>
          <div class="score-bars" style="margin-top:12px;">
            ${metrics.map(([name, val]) => `
              <div><span>${name} <em>${val}/30</em></span><div><i style="width:${Math.round((val / 30) * 100)}%;"></i></div></div>
            `).join("")}
          </div>
        </div>
      `;
    }

    margPanel.innerHTML = notesHtml;

    // Animate score bars in
    margPanel.querySelectorAll('.score-bars i').forEach(bar => {
      const targetWidth = bar.style.width;
      bar.style.width = '0%';
      requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = targetWidth; }));
    });
  }
  const takeEl = $("takeawayPanel");
  if (takeEl) {
    // Only show a takeaway that isn't already listed above
    const extra = notes[3];
    if (extra) {
      takeEl.classList.remove("hidden");
      takeEl.innerHTML = '<div class="marginalia-title takeaway-title">Sustained takeaway</div><p class="takeaway-text">' + escapeHtml(extra.reason) + '</p>';
    } else {
      takeEl.classList.add("hidden");
      takeEl.innerHTML = "";
    }
  }
}

const MARGINALIA_EMPTY_HTML = `
  <div class="marginalia-empty-state">
    <div class="marginalia-empty-item"><span class="marginalia-empty-num">01</span><p>Clarity &amp; precision adjustments</p></div>
    <div class="marginalia-empty-item"><span class="marginalia-empty-num">02</span><p>Tone &amp; social nuance calibration</p></div>
    <div class="marginalia-empty-item"><span class="marginalia-empty-num">03</span><p>Strategic takeaways for future drafts</p></div>
  </div>`;

function resetMarginalia() {
  const margPanel = $("marginaliaPanel");
  if (margPanel) margPanel.innerHTML = MARGINALIA_EMPTY_HTML;
  const takeEl = $("takeawayPanel");
  if (takeEl) { takeEl.classList.add("hidden"); takeEl.innerHTML = ""; }
}

// Viral Share Payload Generator with Japanese Kotowaza Wisdom
function generateKaizenSharePayload() {
  let quoteLine = "七転び八起き (Nana korobi ya oki) — \"Fall down seven times, stand up eight.\"";
  if (kotowazaList && kotowazaList.length > 0) {
    const randomQ = kotowazaList[Math.floor(Math.random() * kotowazaList.length)];
    if (randomQ) {
      const meaning = (randomQ.meaning && randomQ.meaning.en) ? randomQ.meaning.en : (randomQ.translation || "");
      quoteLine = `${randomQ.japanese || ""} (${randomQ.romaji || ""}) — "${meaning}"`;
    }
  }

  const hooks = [
    "Hey! Check out KaizenReply — continuous improvement for your words & draft messages",
    "Stop sending raw, unrefined drafts! Elevate your communication with KaizenReply",
    "Found this amazing AI message-refinement tool called KaizenReply — Japanese precision for your words"
  ];
  const selectedHook = hooks[Math.floor(Math.random() * hooks.length)];

  const shareText = `${selectedHook}\n\nKotowaza Wisdom:\n${quoteLine}\n\nYour message is good. Make it better:`;
  const shareUrl = "https://kaizenreply.us.ci";

  return {
    title: "KaizenReply — Your message is good. Make it better.",
    text: shareText,
    url: shareUrl,
    fullCopyText: `${shareText}\n${shareUrl}`
  };
}

// 1-Click Viral Post to X / Twitter
function shareToX(beforeText, afterText, beforeScore, afterScore, toneName) {
  const isLinkedInMeme = toneName === "LinkedIn Bro";
  let tweetText = "";
  if (isLinkedInMeme) {
    tweetText = `Reality vs. LinkedIn with @KaizenReply:\n\nREALITY:\n"${beforeText.substring(0, 70)}"\n\nLINKEDIN:\n"${afterText.substring(0, 130)}"\n\nKaizen Score: ${beforeScore} → ${afterScore}\nhttps://kaizenreply.us.ci`;
  } else {
    tweetText = `Evolved my message with @KaizenReply:\n\n"${afterText.substring(0, 180)}"\n\nKaizen Score: ${beforeScore} → ${afterScore}\nhttps://kaizenreply.us.ci`;
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
        <span>${suggestions.length} Ready-to-Send ${suggestions.length === 1 ? "Reply" : "Replies"}</span>
      </div>
      ${suggestions.map((s, idx) => `
        <article>
          <span>Reply Option 0${idx + 1}</span>
          <p>${escapeHtml(s)}</p>
          <div>
            <button type="button" class="btn-paper reply-copy-btn" data-index="${idx}">Copy</button>
            <button type="button" class="btn-paper reply-share-btn" data-index="${idx}">Share</button>
          </div>
        </article>
      `).join("")}
      <button class="btn-paper" id="replyBackToDraftBtn" style="margin-top:10px;justify-content:center;width:100%;min-height:44px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
        Edit Original Message
      </button>
    </div>
  `;

  const replyBackBtn = $("replyBackToDraftBtn");
  if (replyBackBtn) {
    replyBackBtn.onclick = () => {
      const msgInput = $("messageInput");
      if (msgInput) {
        msgInput.scrollIntoView({ behavior: "smooth", block: "center" });
        msgInput.focus();
      }
    };
  }

  outputContainer.querySelectorAll(".reply-copy-btn").forEach((btn) => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      if (suggestions[idx]) copyReplyText(suggestions[idx]);
    };
  });

  outputContainer.querySelectorAll(".reply-share-btn").forEach((btn) => {
    btn.onclick = () => {
      const idx = parseInt(btn.getAttribute("data-index"), 10);
      if (suggestions[idx]) shareReplyText(suggestions[idx]);
    };
  });
}

window.copyReplyText = (text) => {
  copyText(text, "Reply copied to clipboard!");
};

window.shareReplyText = (text) => {
  if (navigator.share) navigator.share({ text }).catch(() => undefined);
  else copyText(text, "Reply copied to clipboard!");
};

// Recent Kaizen History Management
function saveToKaizenHistory(original, improved, score, tone) {
  try {
    const parsed = JSON.parse(lsGet("kaizen_history") || "[]");
    const list = Array.isArray(parsed) ? parsed : [];
    const id = Date.now();
    list.unshift({
      id,
      original,
      improved,
      scoreAfter: score && Number.isFinite(Number(score.after)) ? Math.round(Number(score.after)) : "–",
      tone,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
    const trimmed = list.slice(0, 10);
    lsSet("kaizen_history", JSON.stringify(trimmed));
    renderKaizenHistory();
    return id;
  } catch (err) {
    console.error("Failed to save history:", err);
    return null;
  }
}

// Update an existing entry in place (used by the in-result editor) instead of adding duplicates
function updateKaizenHistoryEntry(id, improved) {
  if (!id) return;
  try {
    const list = JSON.parse(lsGet("kaizen_history") || "[]");
    if (!Array.isArray(list)) return;
    const item = list.find((x) => x && x.id === id);
    if (item) {
      item.improved = improved;
      lsSet("kaizen_history", JSON.stringify(list));
      renderKaizenHistory();
    }
  } catch { /* ignore */ }
}

function renderKaizenHistory() {
  const sidebarSection = $("historySection");
  const sidebarList = $("historyList");
  const studioGrid = $("historyStudioGrid");
  const studioEmpty = $("historyStudioEmpty");
  const studioActions = $("historyStudioActions");
  const badge = $("studioHistoryBadge");

  try {
    const parsedList = JSON.parse(lsGet("kaizen_history") || "[]");
    const list = Array.isArray(parsedList) ? parsedList.filter((x) => x && typeof x === "object") : [];

    // Update badge count
    if (badge) {
      if (list.length > 0) {
        badge.textContent = list.length;
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    }

    // Update Sidebar List
    if (sidebarSection && sidebarList) {
      if (!list.length) {
        sidebarSection.classList.add("hidden");
      } else {
        sidebarSection.classList.remove("hidden");
        sidebarList.innerHTML = list.map((item, idx) => `
          <div class="history-item" data-index="${idx}" role="button" tabindex="0" title="Load into the draft desk">
            <span>${escapeHtml(item.tone || 'Kaizen')} · Score: <strong style="color:var(--primary);">${escapeHtml(item.scoreAfter)}</strong></span>
            <small style="color:var(--muted-foreground);">${escapeHtml(item.timestamp)}</small>
          </div>
        `).join("");

        sidebarList.querySelectorAll(".history-item").forEach((el) => {
          el.onclick = () => {
            const idx = parseInt(el.getAttribute("data-index"), 10);
            const item = list[idx];
            if (item && item.improved) loadHistoryItem(item.improved);
          };
          el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); el.click(); } };
        });
      }
    }

    // Update Dedicated Studio View
    if (studioGrid && studioEmpty && studioActions) {
      if (!list.length) {
        studioGrid.innerHTML = "";
        studioGrid.classList.add("hidden");
        studioEmpty.classList.remove("hidden");
        studioActions.classList.add("hidden");
      } else {
        studioEmpty.classList.add("hidden");
        studioGrid.classList.remove("hidden");
        studioActions.classList.remove("hidden");
        studioGrid.innerHTML = list.map((item, idx) => `
          <article class="history-card" data-index="${idx}">
            <div class="history-card-header">
              <span>${escapeHtml(item.tone || 'Kaizen')}</span>
              <span>${escapeHtml(item.timestamp)} · Score ${escapeHtml(item.scoreAfter)}</span>
            </div>
            <div class="history-card-body">${escapeHtml(item.improved)}</div>
            <div class="history-card-actions">
              <button class="btn-paper history-refine-btn" data-index="${idx}" style="font-size:11px;padding:4px 10px;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                Refine again
              </button>
              <button class="btn-paper history-copy-btn" data-index="${idx}" style="font-size:11px;padding:4px 10px;">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copy
              </button>
            </div>
          </article>
        `).join("");

        studioGrid.querySelectorAll(".history-refine-btn").forEach((btn) => {
          btn.onclick = () => {
            const idx = parseInt(btn.getAttribute("data-index"), 10);
            const item = list[idx];
            if (item && item.improved) {
              const tabDesk = $("studioTabDesk");
              if (tabDesk) tabDesk.click();
              loadHistoryItem(item.improved);
              const deskEl = $("desk");
              if (deskEl) deskEl.scrollIntoView({ behavior: "smooth" });
            }
          };
        });

        studioGrid.querySelectorAll(".history-copy-btn").forEach((btn) => {
          btn.onclick = () => {
            const idx = parseInt(btn.getAttribute("data-index"), 10);
            const item = list[idx];
            if (item && item.improved) copyText(item.improved, "Copied saved message to clipboard!");
          };
        });
      }
    }
  } catch (err) {
    console.error("History render error:", err);
  }
}

window.loadHistoryItem = (text) => {
  const msgInput = $("messageInput");
  if (msgInput) {
    msgInput.value = text;
    updateDraftMetrics(text);
    saveDraftToStorageDebounced(text);
    msgInput.focus();
    showKaizenToast("Loaded past revision into draft desk", "info", 1500);
  }
};

// Kotowaza Quotes State & Management
let kotowazaList = [];
let activeQuoteTag = "all";

async function fetchKotowazaProverbs() {
  const loadingState = $("quoteLoadingState");
  const contentState = $("quoteContentState");
  if (loadingState) loadingState.classList.remove("hidden");
  if (contentState) contentState.classList.add("hidden");

  const startTime = Date.now();

  try {
    const res = await fetch("/api/quotes?limit=100");
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.quotes) && data.quotes.length > 0) {
        kotowazaList = data.quotes;
        // Pick a random quote on every page load
        currentQuoteIndex = Math.floor(Math.random() * kotowazaList.length);
      }
    } else {
      // Direct fetch from local dataset if API route is unavailable
      const directRes = await fetch("/static/data/kotowaza.json");
      if (directRes.ok) {
        const rawData = await directRes.json();
        if (Array.isArray(rawData)) {
          kotowazaList = rawData;
          // Pick a random quote on every page load
          currentQuoteIndex = Math.floor(Math.random() * kotowazaList.length);
        }
      }
    }
  } catch (err) {
    console.warn("Kotowaza API fetch error, trying bundled data:", err);
  }
  if (!kotowazaList.length) {
    try {
      const directRes = await fetch("/static/data/kotowaza.json");
      if (directRes.ok) {
        const rawData = await directRes.json();
        if (Array.isArray(rawData) && rawData.length) {
          kotowazaList = rawData;
          currentQuoteIndex = Math.floor(Math.random() * kotowazaList.length);
        }
      }
    } catch { /* fall back to built-in QUOTES */ }
  }
  if (!kotowazaList.length) kotowazaList = QUOTES.slice();
  {
    const elapsed = Date.now() - startTime;
    const minDelay = Math.max(0, 700 - elapsed);
    setTimeout(() => {
      updateQuoteDisplay();
      if (loadingState) loadingState.classList.add("hidden");
      if (contentState) {
        contentState.classList.remove("hidden");
        contentState.classList.add("quote-content-fade-in");
      }
    }, minDelay);
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
    // Dataset examples are ja + romaji (+ Indonesian); never show the Indonesian line as "English"
    const exSub = ex.en || ex.romaji || "";
    if (exEn) {
      exEn.textContent = exSub;
      exEn.style.display = exSub ? "block" : "none";
    }
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
function loadCanvasImage(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      const fallback = new Image();
      fallback.onload = () => resolve(fallback);
      fallback.onerror = () => resolve(null);
      fallback.src = url;
    };
    img.src = url;
  });
}

function openLinkedInMemeModal(reality, linkedin) {
  const modal = $("shareModal");
  const wrapper = $("modalCanvasWrapper");
  if (!modal) return;

  const modalTitle = modal.querySelector("h3");
  if (modalTitle) modalTitle.textContent = "Reality vs LinkedIn Meme";

  if (wrapper) {
    wrapper.innerHTML = `
      <div class="kaizen-loader" style="min-height:160px;">
        <div class="kaizen-loader__circle"><div class="kaizen-loader__kanji">絵</div></div>
        <div class="kaizen-loader__dots">
          <div class="kaizen-loader__dot"></div><div class="kaizen-loader__dot"></div>
          <div class="kaizen-loader__dot"></div><div class="kaizen-loader__dot"></div>
          <div class="kaizen-loader__dot"></div>
        </div>
        <div class="kaizen-loader__text">Composing meme artwork…</div>
        <div class="kaizen-loader__sub">ミームを作成中</div>
      </div>
    `;
  }
  modalReturnFocus = document.activeElement;
  modal.classList.remove("hidden");
  lockScroll(true);
  $("closeModalBtn")?.focus();

  setTimeout(async () => {
    if (wrapper) wrapper.innerHTML = `<canvas id="shareCardCanvas" width="2048" height="1364" style="width:100%;max-width:1024px;height:auto;display:block;margin:0 auto;border-radius:var(--radius);"></canvas>`;
    const newCanvas = $("shareCardCanvas");
    if (!newCanvas) return;
    await renderLinkedInMemeCanvas(newCanvas, reality, linkedin);
    const filename = "reality-vs-linkedin-meme.png";
    $("downloadCardBtn").onclick = () => downloadCanvasAsPng(newCanvas, filename);
    $("shareCardImageBtn").onclick = () => shareCanvasImage(newCanvas, filename);
  }, 350);
}

async function renderLinkedInMemeCanvas(canvas, original, improved) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const scale = width / 1024;

  const memeImg = await loadCanvasImage("/static/linkedin-meme-template.jpg");
  if (memeImg && memeImg.naturalWidth !== 0) {
    ctx.drawImage(memeImg, 0, 0, width, height);
  } else {
    ctx.fillStyle = "#f5f3ec";
    ctx.fillRect(0, 0, width, height);
  }

  // Ensure reality is ALWAYS what the user typed (original), preserving their exact prompt
  let reality = (original || "").replace(/^Reality:\s*/i, "").replace(/\*\*/g, "").trim();
  let linkedin = (improved || "").trim();

  // Extract LinkedIn portion from improved text
  if (linkedin.includes("LinkedIn:")) {
    const parts = linkedin.split(/LinkedIn:/i);
    linkedin = (parts[1] || "").trim();
    // Only if user typed input was completely empty, fallback to the AI's reality part
    if (!reality && parts[0]) {
      reality = parts[0].replace(/^Reality:\s*/i, "").replace(/\*\*/g, "").trim();
    }
  } else {
    reality = reality || linkedin.replace(/^Reality:\s*/i, "").replace(/\*\*/g, "").trim();
    linkedin = linkedin.replace(/^LinkedIn:\s*/i, "").trim();
  }

  // Strip markdown bold markers so raw asterisks are never rendered on the canvas
  reality = reality.replace(/\*\*/g, "").trim();
  linkedin = linkedin.replace(/\*\*/g, "").trim();

  function renderMemeBox(text, boxX, maxW, boxY, boxH) {
    const fontSizes = [24, 22, 20, 18, 16];
    let bestFont = `${Math.round(20 * scale)}px 'Noto Serif JP', 'Georgia', serif`;
    let bestLines = [];
    let bestLh = Math.round(30 * scale);

    for (const size of fontSizes) {
      const scaledSize = Math.round(size * scale);
      ctx.font = `${scaledSize}px 'Noto Serif JP', 'Georgia', serif`;
      const lh = Math.round(scaledSize * 1.48);
      const words = text.split(/\s+/).filter(Boolean);
      const lines = [];
      let cur = "";
      for (const w of words) {
        const test = cur ? cur + " " + w : w;
        if (ctx.measureText(test).width <= maxW) {
          cur = test;
        } else {
          if (cur) lines.push(cur);
          cur = w;
        }
      }
      if (cur) lines.push(cur);

      const totalH = lines.length * lh;
      if (totalH <= boxH || size === 16) {
        bestFont = `${scaledSize}px 'Noto Serif JP', 'Georgia', serif`;
        bestLines = lines;
        bestLh = lh;
        break;
      }
    }

    ctx.font = bestFont;
    ctx.fillStyle = "#1b2621";
    const totalH = bestLines.length * bestLh;
    let startY = boxY + Math.max(Math.round(10 * scale), Math.floor((boxH - totalH) / 3));

    for (const line of bestLines) {
      ctx.fillText(line, boxX, startY);
      startY += bestLh;
    }
  }

  // Left Box: Reality
  renderMemeBox(reality, Math.round(92 * scale), Math.round(365 * scale), Math.round(245 * scale), Math.round(290 * scale));

  // Right Box: LinkedIn Profile
  renderMemeBox(linkedin, Math.round(565 * scale), Math.round(365 * scale), Math.round(245 * scale), Math.round(290 * scale));
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
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Kaizen Toast Notification System (Replaces Browser Alerts)
function showKaizenToast(message, type = 'success', duration = 2800) {
  let toast = document.getElementById('kaizenToastEl');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'kaizenToastEl';
    toast.className = 'kaizen-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `kaizen-toast toast-${type}`;
  // Force reflow
  void toast.offsetWidth;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}
