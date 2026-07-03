# Tasks — add-webfont-loading

## 1. Manifest

- [x] 1.1 `src/font-sources.ts`: google/css-url/system kinds, pinned URLs
      verbatim from proposal.md, weight-union css2 builder (sorted, always
      incl. 400/700)
- [x] 1.2 `collectWebfonts(doc)`: fontFamily leaf traversal → deduped
      resolved sources; unknown → comment marker (no silent skip)

## 2. Surfaces

- [x] 2.1 demo (standard + editorial) + styleguide: preconnect + stylesheet
      links in head
- [x] 2.2 CLI: `fonts.css` artifact (@import per source); tokens.css
      untouched

## 3. Goldens

- [x] 3.1 Completeness: every family in every recipe (base+locales) resolves
      to exactly one kind
- [x] 3.2 Surface inclusion: luxury(ko) demo head has SUIT-free/serif-correct
      sources; minimal-tech has Inter+JetBrains Mono google URLs with
      correct weight unions
- [x] 3.3 Unknown-family marker behavior (synthetic doc)
- [x] 3.4 Keystone hash + token documents byte-identical; skeleton demo
      byte-pins regenerated
- [x] 3.5 Full suite green + typecheck clean

## 4. Wrap

- [x] 4.1 (operator) browser render check (webfonts actually load — canvas
      measureText probe), commit + archive
