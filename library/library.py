"""The library: every work wal.funk_891 cites, kept in library/references.yml (schema in library/README.md).

  uv run --no-project --with pyyaml python library/library.py              check schema, ids, topics, pages
  uv run --no-project --with pyyaml python library/library.py --crossref   re-read every DOI from Crossref; fill title,
                                                                            authors, year, journal; mark verified
  uv run --no-project --with pyyaml python library/library.py --write      data/library.json (the /library page),
                                                                            library/references.bib, library/wal.funk_891.rdf (Zotero)
Same idea as the recurrentanalytics.com library (site -> Zotero only; Zotero is an export target).
"""
import json, re, sys, time, urllib.parse, urllib.request
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape
import yaml

HERE = Path(__file__).resolve().parent; ROOT = HERE.parent; SRC = HERE / "references.yml"
PAGES = {"start", "dive", "whales", "places", "listen", "results", "machine", "paper", "handbook", "game", "docs"}
TYPES = {"article", "inproceedings", "dataset", "software", "webpage", "book", "report"}
UA = {"User-Agent": "wal.funk_891-library/1.0 (open research page; no contact data)"}

def load(): return yaml.safe_load(SRC.read_text())

def check(L):
    err, ids = [], set()
    for r in L["refs"]:
        i = r.get("id", "?")
        if i in ids: err.append(f"{i}: duplicate id")
        ids.add(i)
        for k in ("type", "title", "year", "topics", "cited_on"):
            if not r.get(k): err.append(f"{i}: missing {k}")
        if r.get("type") not in TYPES: err.append(f"{i}: unknown type {r.get('type')}")
        if not (r.get("doi") or r.get("url")): err.append(f"{i}: needs doi or url")
        for t in r.get("topics", []):
            if t not in L["topics"]: err.append(f"{i}: unknown topic {t}")
        for c in r.get("cited_on", []):
            if c.get("page") not in PAGES: err.append(f"{i}: unknown page {c.get('page')}")
    return err

def crossref(L):
    for r in L["refs"]:
        if not r.get("doi"): continue
        try:
            m = json.loads(urllib.request.urlopen(urllib.request.Request("https://api.crossref.org/works/" + urllib.parse.quote(r["doi"]), headers=UA), timeout=30).read())["message"]
        except Exception:
            # not a Crossref DOI (e.g. figshare, Zenodo): ask DataCite
            try:
                a = json.loads(urllib.request.urlopen(urllib.request.Request("https://api.datacite.org/dois/" + urllib.parse.quote(r["doi"]), headers=UA), timeout=30).read())["data"]["attributes"]
                t2 = (a.get("titles") or [{}])[0].get("title", ""); r.update({"title": t2 or r["title"], "year": a.get("publicationYear") or r.get("year"),
                    "creators": [c.get("name", "") for c in a.get("creators", [])] or r.get("creators"), "publisher": a.get("publisher") or r.get("publisher")})
                r["verified"] = {"status": "datacite", "checked": str(date.today()), "note": ""}; print("  ok", r["id"], "| (DataCite)", t2[:80])
            except Exception as e:
                r["verified"] = {"status": "doi not found", "checked": str(date.today()), "note": repr(e)[:80]}; print("  !", r["id"], "doi not found")
            continue
        title = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", (m.get("title") or [""])[0])).strip(); year = ((m.get("issued") or {}).get("date-parts") or [[None]])[0][0]
        authors = [f"{a.get('family', '')}, {a.get('given', '')}".strip(", ") for a in m.get("author", [])] or [a.get("name", "") for a in m.get("editor", [])]
        old = r.get("title", ""); same = re.sub(r"\W+", " ", old.lower())[:30] == re.sub(r"\W+", " ", title.lower())[:30]
        r.update({"title": title or old, "year": year or r.get("year"), "creators": authors or r.get("creators")})
        if m.get("container-title"): r["journal" if r["type"] == "article" else "booktitle" if r["type"] == "inproceedings" else "publisher"] = m["container-title"][0]
        r["verified"] = {"status": "crossref", "checked": str(date.today()), "note": "" if same else f"title corrected from: {old[:120]}"}
        print("  ok" if same else "  ~ ", r["id"], "|", title[:90]); time.sleep(0.3)
    SRC.write_text(yaml.safe_dump(L, sort_keys=False, allow_unicode=True, width=120))

def bib(L):
    out = []
    for r in L["refs"]:
        kind = {"article": "article", "inproceedings": "inproceedings", "book": "book", "report": "techreport"}.get(r["type"], "misc")
        f = {"title": "{" + r["title"] + "}", "year": str(r["year"]), "author": " and ".join(r.get("creators", []))}
        for k in ("journal", "booktitle", "publisher", "doi", "url"):
            if r.get(k): f[k] = r[k]
        if r["topics"]: f["keywords"] = ", ".join(L["topics"][t] for t in r["topics"])
        out.append(f"@{kind}{{{r['id']},\n" + ",\n".join(f"  {k} = {{{v}}}" for k, v in f.items()) + "\n}\n")
    return "\n".join(out)

def rdf(L):
    """Zotero RDF: one item per reference, collections 'By topic' and 'By page' (imported with File > Import in Zotero)."""
    ns = 'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:z="http://www.zotero.org/namespaces/export#" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:bib="http://purl.org/net/biblio#" xmlns:foaf="http://xmlns.com/foaf/0.1/" xmlns:link="http://purl.org/rss/1.0/modules/link/" xmlns:prism="http://prismstandard.org/namespaces/1.2/basic/"'
    zt = {"article": ("journalArticle", "bib:Article"), "inproceedings": ("conferencePaper", "rdf:Description"), "dataset": ("dataset", "rdf:Description"), "software": ("computerProgram", "rdf:Description"), "webpage": ("webpage", "rdf:Description"), "book": ("book", "bib:Book"), "report": ("report", "bib:Report")}
    items = []
    for r in L["refs"]:
        t, el = zt[r["type"]]; about = f"#item_{r['id']}"
        authors = "".join(f"<rdf:li><foaf:Person><foaf:surname>{escape(a.split(',')[0].strip())}</foaf:surname><foaf:givenName>{escape(a.split(',', 1)[1].strip() if ',' in a else '')}</foaf:givenName></foaf:Person></rdf:li>" for a in r.get("creators", []))
        tags = "".join(f"<dc:subject>{escape(L['topics'][x])}</dc:subject>" for x in r["topics"])
        extra = escape("Cited on: " + "; ".join(f"{c['page']} ({c.get('how', '')})" for c in r["cited_on"]))
        items.append(f'<{el} rdf:about="{about}"><z:itemType>{t}</z:itemType><dc:title>{escape(r["title"])}</dc:title><dc:date>{r["year"]}</dc:date>'
                     + (f"<bib:authors><rdf:Seq>{authors}</rdf:Seq></bib:authors>" if authors else "")
                     + (f"<dc:identifier>DOI {escape(r['doi'])}</dc:identifier>" if r.get("doi") else "")
                     + (f"<dc:identifier><dcterms:URI><rdf:value>{escape(r.get('url') or 'https://doi.org/' + r['doi'])}</rdf:value></dcterms:URI></dc:identifier>")
                     + (f"<dcterms:isPartOf><bib:Journal><dc:title>{escape(r['journal'])}</dc:title></bib:Journal></dcterms:isPartOf>" if r.get("journal") else "")
                     + f"{tags}<dc:description>{extra}</dc:description></{el}>")
    def coll(cid, title, members, subs=""):
        return f'<z:Collection rdf:about="#{cid}"><dc:title>{escape(title)}</dc:title>' + "".join(f'<dcterms:hasPart rdf:resource="{m}"/>' for m in members) + subs + "</z:Collection>"
    topic_c = [coll(f"c_topic_{k}", v, [f"#item_{r['id']}" for r in L["refs"] if k in r["topics"]]) for k, v in L["topics"].items()]
    pages = sorted({c["page"] for r in L["refs"] for c in r["cited_on"]})
    page_c = [coll(f"c_page_{p}", p, [f"#item_{r['id']}" for r in L["refs"] if any(c['page'] == p for c in r['cited_on'])]) for p in pages]
    top = coll("c_root", "wal.funk_891", [], "".join(f'<dcterms:hasPart rdf:resource="#{x}"/>' for x in ("c_bytopic", "c_bypage")))
    by_t = coll("c_bytopic", "By topic", [f"#c_topic_{k}" for k in L["topics"]]); by_p = coll("c_bypage", "By page", [f"#c_page_{p}" for p in pages])
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<rdf:RDF {ns}>\n' + "\n".join(items + [top, by_t, by_p] + topic_c + page_c) + "\n</rdf:RDF>\n"

def write(L):
    (ROOT / "data" / "library.json").write_text(json.dumps({"topics": L["topics"], "refs": L["refs"], "built": str(date.today())}, ensure_ascii=False, indent=0, default=str))
    (HERE / "references.bib").write_text(bib(L)); (HERE / "wal.funk_891.rdf").write_text(rdf(L))
    print(f"wrote data/library.json, library/references.bib, library/wal.funk_891.rdf ({len(L['refs'])} works)")

if __name__ == "__main__":
    L = load(); e = check(L)
    if e: print("library check FAILED:"); [print("  -", x) for x in e]; sys.exit(1)
    print(f"library check passed: {len(L['refs'])} works, {len(L['topics'])} topics")
    if "--crossref" in sys.argv: crossref(L); L = load()
    if "--write" in sys.argv: write(L)
