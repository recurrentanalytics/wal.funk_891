/* Languages: English source, German and Chinese translations. Choice: ?lang=, then saved choice, then browser language.
   Every visible string goes through t(key, vars). tools/check_i18n.py blocks commits with missing keys. */
(function () {
  const LANGS = ['en', 'de', 'zh'];
  const V = (document.querySelector('meta[name="build"]') || {}).content || '0';
  let saved = null; try { saved = localStorage.getItem('wl-lang'); } catch (e) {}
  const q = new URLSearchParams(location.search).get('lang');
  const nav = (navigator.language || 'en').toLowerCase();
  const lang = LANGS.includes(q) ? q : LANGS.includes(saved) ? saved : nav.startsWith('de') ? 'de' : nav.startsWith('zh') ? 'zh' : 'en';
  let en = {}, dict = {};
  const t = (k, v = {}) => String(dict[k] ?? en[k] ?? k).replace(/\{(\w+)\}/g, (_, n) => (v[n] ?? `{${n}}`));
  const locale = { en: 'en-GB', de: 'de-DE', zh: 'zh-CN' }[lang];
  const num = (n, d = 0) => Number(n).toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d });
  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
    root.querySelectorAll('[data-i18n-aria]').forEach((e) => { e.setAttribute('aria-label', t(e.dataset.i18nAria)); });
    const md = document.querySelector('meta[name="description"]'); if (md) md.content = t('meta.description');
  }
  function switcher() {
    document.querySelectorAll('.lang [data-lang]').forEach((a) => a.setAttribute('aria-current', String(a.dataset.lang === lang)));
  }
  /* One delegated handler: works for links and for buttons from older cached pages alike. */
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('.lang [data-lang]');
    if (!a || !LANGS.includes(a.dataset.lang)) return;
    e.preventDefault();
    try { localStorage.setItem('wl-lang', a.dataset.lang); } catch (err) {}
    const u = new URL(location.href); u.searchParams.set('lang', a.dataset.lang); u.hash = '';
    location.assign(u.toString());
  });
  /* Build check: if this page is older than the published build, reload once so page and scripts match. */
  const BUILD = (document.querySelector('meta[name="build"]') || {}).content || '0';
  fetch('version.json', { cache: 'no-store' }).then((r) => r.json()).then((v) => {
    if (String(v.build) !== BUILD) {
      let tried = null; try { tried = sessionStorage.getItem('wl-reload'); } catch (err) {}
      if (tried !== String(v.build)) { try { sessionStorage.setItem('wl-reload', String(v.build)); } catch (err) {} location.reload(); }
    }
  }).catch(() => {});
  const get = (l) => fetch(`i18n/${l}.json?v=${V}`, { cache: "no-cache" }).then((r) => r.json());
  const ready = Promise.all([get('en'), lang === 'en' ? null : get(lang)]).then(([e, d]) => {
    en = e; dict = d || e;
    document.documentElement.lang = lang === 'zh' ? 'zh-Hans' : lang;
    document.documentElement.dataset.lang = lang;
    if (lang === 'zh') { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500&display=swap'; document.head.append(l); }
    apply(); switcher();
  });
  window.I18N = { t, lang, locale, num, ready, apply };
  window.t = t;
})();
