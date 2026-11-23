"""End-to-end check of every feature of the page (headless Chrome via Playwright, the installed Chrome).
  uv run --no-project --python 3.12 --with "playwright>=1.49,<1.56" python tools/site_test.py [base_url]
Prints one line per check (OK / FAIL / WARN) and a summary. Does not send anything anywhere (GitHub opens are caught).
"""
import json, re, sys, time
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else "https://recurrentanalytics.github.io/wal.funk_891/"
R = []
def rec(ok, name, info=""): R.append((ok, name, info)); print(("OK  " if ok is True else "WARN" if ok is None else "FAIL"), name, ("· " + str(info)[:220]) if info else "", flush=True)
def check(name, fn):
    try:
        v = fn()
        if isinstance(v, tuple): rec(v[0], name, v[1])
        else: rec(bool(v), name, "" if v is True else v)
    except Exception as e: rec(False, name, repr(e)[:220])

def page_ctx(b, mobile=False):
    ctx = b.new_context(viewport={"width": 390, "height": 844} if mobile else {"width": 1440, "height": 900}, is_mobile=mobile, has_touch=mobile, permissions=["clipboard-read", "clipboard-write"])
    pg = ctx.new_page(); pg.set_default_timeout(20000); errs = []; bad = []
    pg.on("pageerror", lambda e: errs.append(str(e)[:200]))
    pg.on("console", lambda m: errs.append("console: " + m.text[:200]) if m.type == "error" else None)
    pg.on("response", lambda r: bad.append(f"{r.status} {r.url[:120]}") if r.status >= 400 and "favicon" not in r.url else None)
    pg.add_init_script("window.__opened=[]; window.open=(u)=>{window.__opened.push(String(u)); return null;};")
    return ctx, pg, errs, bad

def raw_keys(pg):
    # visible text that looks like an untranslated i18n key (e.g. "res.v.pass", "lab.g.title")
    return pg.evaluate(r"""(() => { const out = new Set(); const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) { const s = w.currentNode.nodeValue.trim(); const p = w.currentNode.parentElement; if (!p || p.closest('script,style,code,.lat,i')) continue;
        if (/^[a-z][a-z0-9]*(\.[a-z0-9_]+){1,4}$/.test(s) && !/^(wal\.funk_891|e\.g\.|i\.e\.)/.test(s) && !/\.(json|js|md|py|html|mp3|jpg|png)$/.test(s)) out.add(s); }
      return [...out].slice(0, 12); })()""")

def main_page(b, lang, mobile=False):
    tag = f"[{lang}{' phone' if mobile else ''}]"
    ctx, pg, errs, bad = page_ctx(b, mobile)
    pg.goto(f"{BASE}?lang={lang}", wait_until="domcontentloaded", timeout=60000); pg.wait_for_timeout(6000)
    check(f"{tag} page loads, title", lambda: ("wal.funk_891" in pg.title(), pg.title()))
    check(f"{tag} no raw i18n keys on screen", lambda: (not raw_keys(pg), raw_keys(pg)))
    check(f"{tag} no horizontal scroll", lambda: (pg.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")))
    check(f"{tag} chapters in top bar", lambda: (pg.evaluate("document.querySelectorAll('.toc .wrap a[data-view]').length") == 7, pg.evaluate("document.querySelectorAll('.toc .wrap a[data-view]').length")))
    check(f"{tag} chapter cards + fold buttons", lambda: (pg.evaluate("document.querySelectorAll('.chapter').length") >= 6, pg.evaluate("[document.querySelectorAll('.chapter').length, document.querySelectorAll('.ch-fold').length]")))
    check(f"{tag} content folds open, reference folds closed", lambda: pg.evaluate("[...document.querySelectorAll('details.sec-fold')].every(d=>d.open) && [...document.querySelectorAll('details.fold')].every(d=>!d.open)"))
    def fold_toggle():
        return pg.evaluate("""(() => { const b = document.querySelector('#ch-places .ch-fold'); if (!b) return 'no button'; b.click(); const c = [...document.querySelectorAll('#places details.sec-fold')].every(d=>!d.open); b.click(); const o = [...document.querySelectorAll('#places details.sec-fold')].every(d=>d.open); return c && o ? true : 'closed '+c+' reopened '+o; })()""")
    check(f"{tag} fold / unfold a chapter", fold_toggle)
    if not mobile:
        def submenu():
            pg.evaluate("document.querySelectorAll('.toc .sub-c')[2].click()"); pg.wait_for_timeout(300)
            items = pg.evaluate("[...document.querySelectorAll('.subnav .sn-i')].map(b=>b.textContent)")
            if not items: return False, "empty"
            pg.evaluate("document.querySelectorAll('.subnav .sn-i')[2].click()"); pg.wait_for_timeout(1500)
            return pg.evaluate("document.querySelector('.subnav').hidden"), items[:4]
        check(f"{tag} chapter ▾ menu lists sections and jumps", submenu)
    # whales: lineup, select, sound, player
    def lineup():
        n = pg.evaluate("document.querySelectorAll('#lineup button:not([disabled])').length")
        pg.evaluate("document.querySelectorAll('#lineup button:not([disabled])')[0].click()"); pg.wait_for_timeout(2500)
        h = pg.evaluate("(document.querySelector('#detail h3')||{}).textContent")
        return (n >= 15 and bool(h)), f"{n} whales, detail: {h}"
    check(f"{tag} whale lineup → detail", lineup)
    def sound():
        btn = pg.evaluate("(() => { const b = [...document.querySelectorAll('#detail button')].find(x => /▶|❚❚/.test(x.textContent)); if (b) { b.click(); return true; } return false; })()")
        pg.wait_for_timeout(3000)
        gp = pg.evaluate("[document.querySelector('.gp').className, document.querySelector('.gp-t').textContent, document.querySelector('.gp-time').textContent]")
        return (btn and 'idle' not in gp[0]), gp
    check(f"{tag} species sound plays and shows in player", sound)
    def player_stop():
        pg.evaluate("document.querySelector('.gp-stop').click()"); pg.wait_for_timeout(400)
        return pg.evaluate("document.querySelector('.gp').className")
    check(f"{tag} player stop folds back", lambda: (lambda c: ('idle' in c or 'amb' in c, c))(player_stop()))
    # catalogue
    def catalogue():
        r = pg.evaluate("""(() => { const cat = document.getElementById('catalog'); if (!cat) return 'missing';
          const n0 = cat.querySelectorAll('.sp-card').length; const chip = cat.querySelectorAll('.cat-chips .chip')[0]; chip.click(); const c1 = cat.querySelector('.cat-count').textContent;
          cat.querySelector('.cat-reset').click(); const q = cat.querySelector('.cat-q'); q.value = 'orca'; q.dispatchEvent(new Event('input')); const c2 = cat.querySelector('.cat-count').textContent;
          q.value = ''; q.dispatchEvent(new Event('input')); const sa = cat.querySelector('.more-sp'); sa.click(); const n1 = cat.querySelectorAll('.sp-card').length;
          const s = cat.querySelectorAll('.cat-sel')[1]; s.value = 'risk'; s.dispatchEvent(new Event('change')); const first = cat.querySelector('.sp-card b').textContent;
          return [n0, c1, c2, n1, first]; })()""")
        return (isinstance(r, list) and r[0] == 12 and r[3] == 93), r
    check(f"{tag} catalogue: 12 → filter → search → all 93 → sort", catalogue)
    check(f"{tag} catalogue card opens detail", lambda: pg.evaluate("(() => { const c = [...document.querySelectorAll('#catalog .sp-card')].pop(); c.click(); return !!document.querySelector('#detail h3'); })()"))
    # routes map
    def routes():
        pg.evaluate("document.getElementById('routes').scrollIntoView()"); pg.wait_for_timeout(2500)
        return pg.evaluate("(() => { const s = document.querySelector('#routes-ctl select'); if (!s) return 'no select'; const n = s.options.length; s.selectedIndex = 3; s.dispatchEvent(new Event('change')); const r = document.querySelector('#routes-ctl input[type=range]'); r.value = 10; r.dispatchEvent(new Event('input')); return [n, document.querySelector('.rt-month').textContent, !!document.querySelector('#routes-map canvas')]; })()")
    check(f"{tag} distribution map: species + month", lambda: (lambda r: (isinstance(r, list) and r[0] > 50 and r[2], r))(routes()))
    # places: map, photos, canyon, live
    def canyon():
        pg.evaluate("document.getElementById('bathy3d').scrollIntoView()"); pg.wait_for_timeout(8000)
        return pg.evaluate("[!!document.querySelector('#bathy3d canvas'), !!window.wlDive, document.querySelectorAll('#bathy3d .spot, #bathy3d [class*=pin]').length]")
    check(f"{tag} 3D canyon loads", lambda: (lambda r: (r[0] and r[1], r))(canyon()))
    check(f"{tag} canyon dive starts and scrubs", lambda: pg.evaluate("(() => { wlDive.to(0.5); return Math.abs(wlDive.get() - 0.5) < 0.01; })()"))
    check(f"{tag} place photos", lambda: (lambda n: (n >= 3, n))(pg.evaluate("document.querySelectorAll('#place-photos img').length")))
    def live():
        pg.evaluate("(() => { const c = document.getElementById('live-card'); wlReveal(c); c.scrollIntoView(); })()"); pg.wait_for_timeout(500)
        pg.evaluate("document.getElementById('live-play').click()"); pg.wait_for_timeout(9000)
        st = pg.evaluate("[document.getElementById('live-state').textContent, document.querySelector('.gp-t').textContent]")
        pg.evaluate("document.getElementById('live-play').click()")
        return (bool(st[0]) and 'Live' in st[1] or '直播' in st[1]), st
    check(f"{tag} live hydrophone plays (network)", live)
    def worldmap():
        pg.evaluate("document.getElementById('world').scrollIntoView()"); pg.wait_for_timeout(3000)
        return pg.evaluate("!!document.querySelector('#world canvas, #world svg')")
    check(f"{tag} world map renders", worldmap)
    # listen & try
    check(f"{tag} spectrogram player", lambda: pg.evaluate("(() => { document.getElementById('listen').scrollIntoView(); document.getElementById('play').click(); return true; })()"))
    check(f"{tag} game link on the page", lambda: pg.evaluate("!!document.querySelector('a.hb-game-cta[href*=label]')"))
    # results
    def results():
        return pg.evaluate("[document.querySelectorAll('.rb-row').length, document.querySelectorAll('.rb-group').length, [...document.querySelectorAll('.rb-paper')].map(a=>a.getAttribute('href'))]")
    check(f"{tag} results board", lambda: (lambda r: (r[0] >= 25 and r[1] >= 5, r))(results()))
    # glossary tips, anchors
    check(f"{tag} glossary terms underlined", lambda: (lambda n: (n >= 5, n))(pg.evaluate("document.querySelectorAll('abbr.gl').length")))
    check(f"{tag} glossary tip opens", lambda: pg.evaluate("(() => { const a = document.querySelector('abbr.gl'); a.scrollIntoView({block:'center'}); a.focus(); const t = document.querySelector('.gl-tip'); return !t.hidden && t.textContent.length > 20; })()"))
    check(f"{tag} section links (🔗)", lambda: (lambda n: (n >= 20, n))(pg.evaluate("document.querySelectorAll('.anchor-b').length")))
    # top tools: search, share, tour, settings, ambient
    def search():
        pg.evaluate("window.scrollTo(0,0)"); pg.keyboard.press("Control+K") if not mobile else pg.evaluate("document.querySelector('.bb-b:last-child').click()")
        pg.wait_for_timeout(2500); pg.keyboard.type("buckel" if lang == 'de' else "humpback" if lang == 'en' else "座头")
        pg.wait_for_timeout(400); n = pg.evaluate("document.querySelectorAll('.srch-list li').length"); pg.keyboard.press("Enter"); pg.wait_for_timeout(1500)
        return n > 0 and pg.evaluate("document.querySelector('.srch').hidden"), n
    check(f"{tag} search finds and jumps", search)
    if not mobile:
        def share():
            pg.evaluate("[...document.querySelectorAll('.tool-b')][1].click()"); pg.wait_for_timeout(600)
            r = pg.evaluate("[!document.querySelector('.share-pop').hidden, document.querySelector('.sp-url').value]"); pg.keyboard.press("Escape"); return r[0] and r[1].startswith('http'), r[1]
        check(f"{tag} share link panel", share)
        def tour():
            pg.evaluate("window.wlTour()"); pg.wait_for_timeout(800); a = pg.evaluate("document.querySelector('.tour-t').textContent")
            pg.evaluate("document.querySelectorAll('.tour-ctl button')[2].click()"); pg.wait_for_timeout(600); b2 = pg.evaluate("document.querySelector('.tour-t').textContent")
            pg.evaluate("document.querySelector('.tour-end').click()"); return a != b2 and len(a) > 20, [a[:40], b2[:40]]
        check(f"{tag} guided tour steps", tour)
    def settings():
        pg.evaluate("document.querySelector('.tool-b .ic-gear').closest('button').click()"); pg.wait_for_timeout(300)
        rows = pg.evaluate("document.querySelectorAll('.set-pop .set-row').length")
        pg.evaluate("[...document.querySelectorAll('.set-pop .chip')].find(b=>b.textContent==='A+').click()"); s1 = pg.evaluate("document.documentElement.dataset.size")
        pg.evaluate("[...document.querySelectorAll('.set-pop .chip')].find(b=>b.textContent==='A').click()"); pg.keyboard.press("Escape")
        return rows >= 3 and s1 == 'l', [rows, s1]
    check(f"{tag} settings menu (text size)", settings)
    def ambient():
        pg.evaluate("document.querySelector('.amb-btn').click()"); pg.wait_for_timeout(1500)
        n = pg.evaluate("document.querySelectorAll('.amb-menu button').length"); pg.keyboard.press("Escape"); return n >= 5, n
    check(f"{tag} background sound station menu", ambient)
    if not mobile:
        def keys():
            pg.evaluate("window.scrollTo(0,0)"); pg.mouse.click(5, 400); pg.keyboard.press("?"); a = pg.evaluate("!document.querySelector('.kbd-pop').hidden"); pg.keyboard.press("Escape")
            y0 = pg.evaluate("scrollY"); pg.keyboard.press("j"); pg.wait_for_timeout(1500); y1 = pg.evaluate("scrollY"); pg.keyboard.press("t"); pg.wait_for_timeout(1500)
            return a and y1 > y0, [a, y0, y1]
        check(f"{tag} keyboard: ? and J", keys)
    else:
        def bottombar():
            pg.evaluate("window.scrollTo(0,0)"); pg.wait_for_timeout(300); pg.evaluate("document.querySelectorAll('.bb-b')[1].click()"); pg.wait_for_timeout(1500)
            y = pg.evaluate("scrollY"); pg.evaluate("document.querySelector('.bb-m').click()"); n = pg.evaluate("document.querySelectorAll('.bb-sheet .sn-i').length")
            return y > 0 and n == 7, [y, n]
        check(f"{tag} phone bottom bar: next + chapter list", bottombar)
    # lightbox
    check(f"{tag} photo lightbox", lambda: pg.evaluate("(() => { const im = document.querySelector('#place-photos img'); im.click(); const ok = !document.querySelector('.lbx').hidden; document.querySelector('.lbx-x').click(); return ok; })()"))
    # broken images
    check(f"{tag} images load", lambda: (lambda r: (len(r) == 0, r))(pg.evaluate("[...document.images].filter(i=>i.complete && i.naturalWidth===0 && i.getAttribute('src') && !i.closest('.lbx')).map(i=>i.src.slice(-70)).slice(0,8)")))
    pg.wait_for_timeout(1000)
    rec(not errs, f"{tag} no JS errors", errs[:6])
    rec(not bad or None, f"{tag} no failed requests", bad[:8])
    ctx.close()

def sub_pages(b, lang):
    for path, sel, min_n in (("handbook.html", "#hb section", 9), ("paper.html", "#hb section", 6)):
        ctx, pg, errs, bad = page_ctx(b); pg.goto(f"{BASE}{path}?lang={lang}"); pg.wait_for_timeout(4000)
        check(f"[{lang}] {path} sections", lambda: (lambda n: (n >= min_n, n))(pg.evaluate(f"document.querySelectorAll('{sel}').length")))
        check(f"[{lang}] {path} no raw keys", lambda: (not raw_keys(pg), raw_keys(pg)))
        if path == "handbook.html": check(f"[{lang}] handbook screenshots", lambda: (lambda n: (n == 7, n))(pg.evaluate("document.querySelectorAll('.shot img').length")))
        rec(not errs, f"[{lang}] {path} no JS errors", errs[:5]); rec(not bad or None, f"[{lang}] {path} failed requests", bad[:5]); ctx.close()
    # game
    ctx, pg, errs, bad = page_ctx(b); pg.goto(f"{BASE}label.html?lang={lang}"); pg.wait_for_timeout(5000)
    def game():
        pg.evaluate("document.querySelector('.ans .no').click()"); pg.wait_for_timeout(800)
        r = pg.evaluate("[!document.getElementById('lb-reveal').hidden, document.getElementById('lb-tally').textContent, document.getElementById('lb-send').textContent]")
        pg.evaluate("document.getElementById('lb-send').click()"); pg.wait_for_timeout(300); op = pg.evaluate("window.__opened")
        return r[0] and op and 'github.com' in op[0], [r, (op or [''])[0][:80]]
    check(f"[{lang}] game: answer → reveal → send opens GitHub (caught, not sent)", game)
    check(f"[{lang}] game no raw keys", lambda: (not raw_keys(pg), raw_keys(pg)))
    rec(not errs, f"[{lang}] game no JS errors", errs[:5]); ctx.close()
    ctx, pg, errs, bad = page_ctx(b); pg.goto(f"{BASE}label.html?mode=owner&lang={lang}"); pg.wait_for_timeout(4000)
    check(f"[{lang}] owner test page loads 300 clips", lambda: (lambda n: (n == 300, n))(pg.evaluate("document.querySelectorAll('#lb-grid a').length")))
    rec(not errs, f"[{lang}] owner page no JS errors", errs[:5]); ctx.close()

PART = sys.argv[2] if len(sys.argv) > 2 else "all"
with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", args=["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required", "--mute-audio"])
    if PART == "all":
        for lang in ("de", "en", "zh"): main_page(b, lang)
        main_page(b, "de", mobile=True)
        for lang in ("de", "en", "zh"): sub_pages(b, lang)
    else:
        kind, lang, *rest = PART.split(":")
        main_page(b, lang, mobile=bool(rest)) if kind == "main" else sub_pages(b, lang)
    b.close()
fails = [r for r in R if r[0] is False]; warns = [r for r in R if r[0] is None]
print(f"\n{len(R)} checks: {len(R) - len(fails) - len(warns)} OK, {len(warns)} WARN, {len(fails)} FAIL")
