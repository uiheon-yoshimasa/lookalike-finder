/* Shared language toggle for static pages */
(function () {
  const LANG_KEY = 'site_lang';
  let lang = localStorage.getItem(LANG_KEY) || 'ko';

  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-ko]').forEach(el => {
      el.textContent = lang === 'ko' ? el.dataset.ko : el.dataset.ja;
    });
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });
    // Show/hide lang blocks
    document.querySelectorAll('.ko-block').forEach(el => {
      el.style.display = lang === 'ko' ? '' : 'none';
    });
    document.querySelectorAll('.ja-block').forEach(el => {
      el.style.display = lang === 'ja' ? '' : 'none';
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        lang = btn.dataset.lang;
        localStorage.setItem(LANG_KEY, lang);
        apply();
      });
    });
  });
})();
