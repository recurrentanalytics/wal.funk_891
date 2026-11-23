# The library

`references.yml` lists every work wal.funk_891 cites or builds on. It is the single source; the page `library.html`,
the BibTeX file and the Zotero file are generated from it. Same approach as the recurrentanalytics.com library:
the site is the source, Zotero is an export target.

## Schema (one entry)

| field | meaning |
|---|---|
| `id` | short key, unique (`ryan2025`) |
| `type` | article, inproceedings, dataset, software, webpage, book, report |
| `creators` | list, "Family, Given" |
| `year`, `title` | as Crossref/DataCite give them after `--crossref` |
| `journal` / `booktitle` / `publisher` | container |
| `doi` or `url` | at least one |
| `topics` | keys from the `topics:` table at the top |
| `cited_on` | list of `{page, how}`; pages: start, dive, whales, places, listen, results, machine, paper, handbook, game, docs |
| `verified` | written by `--crossref`: status (crossref / datacite / doi not found), date, note |

## Commands

    uv run --no-project --with pyyaml python library/library.py              # check
    uv run --no-project --with pyyaml python library/library.py --crossref   # re-read DOIs, fill title/authors/year
    uv run --no-project --with pyyaml python library/library.py --write      # data/library.json, references.bib, wal.funk_891.rdf

## Into Zotero

File › Import… › `library/wal.funk_891.rdf` (or download it from the library page). It creates a collection
"wal.funk_891" with sub-collections "By topic" and "By page"; each item's note says where the site cites it.
