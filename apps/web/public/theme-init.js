// Applies the saved theme before first paint to avoid a flash. Kept as a file for the CSP.
(function () {
  try {
    var t = localStorage.getItem('stacks-theme') || 'system';
    var dark = t === 'dark' || (t === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
