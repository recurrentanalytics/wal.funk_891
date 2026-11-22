/* Languages: English source, German and Chinese translations. Choice: ?lang=, then saved choice, then browser language.
   Every visible string goes through t(key, vars). tools/check_i18n.py blocks commits with missing keys. */
(function () {
  const LANGS = ['en', 'de', 'zh'];
  const V = '6';
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
    document.querySelectorAll('.lang button').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
      b.addEventListener('click', () => {
        try { localStorage.setItem('wl-lang', b.dataset.lang); } catch (e) {}
        const u = new URL(location.href); u.searchParams.set('lang', b.dataset.lang); location.href = u.toString();
      });
    });
  }
  const get = (l) => fetch(`i18n/${l}.json?v=${V}`).then((r) => r.json());
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
