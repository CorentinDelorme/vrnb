## Problem Statement

The current Fiche (PDF) for each Parcours is generated as a single A4 page containing:
- Header with logo, title, QR code, contact info
- Distance table (Début, Zone de nettoyage, Fin, Total)
- Main map of the cleaning zone (~132mm tall)
- Start and End segment maps side-by-side (~70mm tall each, half-width)
- Legend and OSM credits

This layout makes the Start/End maps too small to read comfortably when printed, especially for volunteers who need to see the route from the meeting point to the start of the cleaning zone and back. The user wants an option to generate the Fiche on **2 pages** with larger maps, while keeping the ability to easily switch back to the single-page layout for printers that cannot handle double-sided printing.

## Solution

Add a `--layout=single|double` CLI flag to the PDF generation pipeline that controls the Fiche layout:

- **Single-page (default, current)**: Existing layout, backward compatible
- **Double-page (new)**: 
  - Page 1: Header + Distance table + **Enlarged main map** (~190mm tall) + Legend
  - Page 2: Header + **Start map full-width** (~110mm tall) + **End map full-width** (~110mm tall) stacked vertically + Legend

The layout choice is tracked in the **generation state** per Parcours. When the layout flag differs from what produced the current Fiche, the pipeline automatically regenerates that Fiche (reason: `layout-changed`). No manual `--force` is needed to switch layouts.

## User Stories

1. As a **VRNB referent**, I want to generate Fiches in 2-page layout with larger Start/End maps, so that volunteers can read the route details more easily when printed.

2. As a **VRNB referent**, I want to switch back to single-page layout with a simple flag, so that I can accommodate printers that don't support double-sided printing.

3. As a **VRNB referent**, I want the pipeline to automatically regenerate only the Fiches whose layout changed, so that I don't need to manually force regeneration or wait for a full rebuild.

4. As a **VRNB referent**, I want both layouts to produce PDFs at the same path (`public/pdf/<zone>/<parcours>.pdf`), so that the deployed site and Menu links work identically regardless of layout.

5. As a **VRNB referent**, I want the 2-page layout to include headers and legends on both pages, so that each page is self-contained when printed separately.

6. As a **VRNB referent**, I want the main map on page 1 to be enlarged compared to the single-page version, so that the cleaning zone route is more visible.

7. As a **VRNB referent**, I want the Start and End maps on page 2 to be full-page-width and stacked vertically, so that each gets maximum readable size.

8. As a **VRNB referent**, I want the QR code and deep link to the tour page on both pages, so that volunteers can scan from either page.

9. As a **VRNB referent**, I want the generation perf report to show `layout-changed` as the reason when Fiches are regenerated due to layout switch, so that I can verify the pipeline behavior.

10. As a **VRNB referent**, I want the default behavior (no flag) to remain single-page, so that existing workflows are unaffected.

## Implementation Decisions

### 1. Layout Flag Parsing
- New function `parseLayoutFlag(argv)` in the generation helpers module
- Returns `LayoutType = 'single' | 'double'`
- Default: `'single'` (backward compatible)
- Accepts aliases: `double`, `2page`, `two-page` → `'double'`

### 2. Generation State Tracks Layout
- Add `readonly layout: LayoutType | undefined` to `ParcoursGenerationRecord`
- The `withFicheFingerprint()` function records the layout used
- When reading state, a Fiche with no layout recorded is treated as `'single'` (legacy)

### 3. Generation Plan Detects Layout Changes
- Add `desiredLayout: LayoutType` to `PlanGenerationInput`
- In `decideFiche()`, if `record?.layout !== desiredLayout` → `regenerateFiche: true, ficheReason: 'layout-changed'`
- New `FicheReason` variant: `'layout-changed'`

### 4. Dual-Layout PDF Generation
- `generateTourPdf(tour, logo, layout)` dispatches to:
  - `generateTourPdfSinglePage(tour, logo)` — existing logic, extracted
  - `generateTourPdfTwoPage(tour, logo)` — new 2-page implementation
- Shared helpers extracted: `renderHeader()`, `renderLegend()`, `renderDistanceTable()`

### 5. Page Layout Specifications

**Single-page (unchanged):**
- A4 portrait, 10mm margins
- Main map: 132mm tall × 190mm wide
- Start/End maps: 70mm tall × 93mm wide each (side-by-side)

**Double-page:**
- Page 1: Header (~30mm) + Distance table (~15mm) + Main map **~190mm tall** × 190mm wide + Legend
- Page 2: Header (~30mm) + Start map **full-width 190mm × ~110mm tall** + End map **full-width 190mm × ~110mm tall** + Legend
- Both pages: Logo, title, QR code, contact info, OSM credits

### 6. Orchestration Updates
- `generate-pdfs.ts` main(): parses `--layout`, passes to plan and rendering
- `generate-all.ts` / `generate-one.ts`: forward `--layout` flag to pdf step
- Perf report vocabulary includes `layout-changed` reason

### 7. No Version Bump Needed
- Layout is tracked per-Fiche in state, not via global version
- Switching layout only regenerates affected Fiches
- `GENERATION_STATE_VERSION` remains unchanged

## Testing Decisions

### Unit Tests (Pure Modules)
1. **`generation-helpers.spec.ts`**: Test `parseLayoutFlag()` with various inputs (absent, `single`, `double`, `2page`, `two-page`, invalid → defaults to single)

2. **`generation-state.spec.ts`**: 
   - Test `ParcoursGenerationRecord` includes layout field
   - Test `withFicheFingerprint()` records layout
   - Test reading state with missing layout defaults to `'single'`

3. **`generation-plan.spec.ts`**:
   - Test `decideFiche()` returns `layout-changed` when `record.layout !== desiredLayout`
   - Test `decideFiche()` returns `up-to-date` when layouts match and nothing else changed
   - Test `FicheReason` includes `'layout-changed'` variant

4. **`generation-subjects.spec.ts`**: Verify `FICHE_SUBJECT` vocabulary includes `layout-changed` phrasing (or verify it's handled generically)

### Integration Tests (Generation Scripts)
5. **`generate-pdfs.spec.ts`** (or script-level test):
   - Generate a Fiche with `--layout=single`, verify single-page PDF
   - Generate same Fiche with `--layout=double`, verify 2-page PDF
   - Switch back to single, verify auto-regeneration with `layout-changed` reason
   - Verify output path identical for both layouts

### E2E Tests (Not Needed)
- This is a build-time generation feature; no runtime UI changes
- PDF output verified by unit/integration tests above

### Test Principles
- Test external behavior (PDF page count, dimensions, content), not implementation details
- Use the existing pure-module test patterns (injected dependencies, fake inputs)
- Follow the codebase convention: colocated `*.spec.ts` files

## Out of Scope

- **Zone overview maps** (`Carte_parcours_a_velo.pdf`, `Carte_parcours_a_pied.pdf`) — remain single-page, unchanged
- **Fiches de suivi** (tracking sheets for organizers) — generated separately via `extract-inscriptions.ts`, unchanged
- **Global overview map** (`Carte_tous_les_parcours.pdf`) — unchanged
- **Pack generation** (`generate-zone-pdf.ts`) — merges existing PDFs, works with either layout
- **Web app UI** — no changes to the deployed site, Menu, or tour pages
- **GPX/GeoJSON generation** — unaffected
- **Inscriptions/Édition features** — unaffected

## Further Notes

### Migration Path
- Existing Fiches in repo have no layout in state → treated as `'single'`
- First run with `--layout=double` regenerates all selected Fiches with `layout-changed` reason
- Subsequent runs with same layout are up-to-date
- Switching back to `--layout=single` regenerates with `layout-changed` reason

### Performance
- 2-page PDFs are slightly larger (more map tiles fetched for larger maps)
- Tile cache and network scheduler handle this transparently
- Perf report will show increased tile downloads for first 2-page generation

### Backward Compatibility
- Default `--layout=single` preserves current behavior exactly
- No changes to `public/` paths, filenames, or web app
- CI/CD pipelines using `generate:pdfs` without flags continue working

### Future Extensibility
- Layout system can accommodate more variants (e.g., `'compact'`, `'large-print'`) by extending `LayoutType`
- Per-Fiche tracking allows mixed layouts in theory (though not exposed via CLI)