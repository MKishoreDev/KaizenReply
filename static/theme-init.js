// Runs before first paint to avoid a light/dark flash. Kept external so the CSP can forbid inline scripts.
(function () {
  try {
    var saved = localStorage.getItem('kaizen-theme');
    var isDark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (isDark) document.documentElement.classList.add('dark');
  } catch (e) { /* storage blocked */ }
})();
