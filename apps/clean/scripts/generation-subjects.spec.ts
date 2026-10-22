import { describe, expect, it } from 'vitest';

import { buildPerfReport, formatPerfReport } from './generation-perf';
import {
  DATA_SUBJECT,
  FICHE_SUBJECT,
  PACK_SUBJECT,
  REUSED_FICHE_SUBJECT,
  SEGMENTS_SUBJECT,
  ZONE_MAP_SUBJECT,
} from './generation-subjects';

/**
 * The vocabulary of the subjects of the recap table (ticket #28).
 *
 * The generation scripts own the French the referent reads: the unit a
 * subject counts, and the decision it announces.
 */

describe('the segments subject', () => {
  it('should count the Parcours the run left alone, not the segments', () => {
    const report = buildPerfReport({
      script: 'generate-start-end-gpx',
      totalMs: 1_000,
      steps: [],
      tiles: { fromCache: 0, downloaded: 0 },
      subjects: [SEGMENTS_SUBJECT],
      parcours: {
        changed: [],
        unchanged: [
          {
            id: 'segments/bruz-sud/V1',
            subject: SEGMENTS_SUBJECT.id,
            zoneId: 'bruz-sud',
            label: 'V1',
            reason: 'unchanged',
          },
          {
            id: 'segments/bruz-sud/V2',
            subject: SEGMENTS_SUBJECT.id,
            zoneId: 'bruz-sud',
            label: 'V2',
            reason: 'unchanged',
          },
        ],
      },
    });

    expect(formatPerfReport(report)).toContain(
      '  Segments  2 Parcours  bruz-sud  ignorés   à jour',
    );
  });

  it('should announce the segments the run re-routed', () => {
    const report = buildPerfReport({
      script: 'generate-start-end-gpx',
      totalMs: 1_000,
      steps: [],
      tiles: { fromCache: 0, downloaded: 0 },
      subjects: [SEGMENTS_SUBJECT],
      parcours: {
        changed: [
          {
            id: 'segments/bruz-sud/V1',
            subject: SEGMENTS_SUBJECT.id,
            zoneId: 'bruz-sud',
            label: 'V1',
            reason: 'trace-changed',
          },
        ],
        unchanged: [],
      },
    });

    expect(formatPerfReport(report)).toContain('  Segments re-routés   1');
  });
});

describe('the data subject', () => {
  it('should count the Parcours the run left alone, not the data', () => {
    const report = buildPerfReport({
      script: 'generate-tours',
      totalMs: 1_000,
      steps: [],
      tiles: { fromCache: 0, downloaded: 0 },
      subjects: [DATA_SUBJECT],
      parcours: {
        changed: [],
        unchanged: [
          {
            id: 'données/bruz-sud/V1',
            subject: DATA_SUBJECT.id,
            zoneId: 'bruz-sud',
            label: 'V1',
            reason: 'up-to-date',
          },
        ],
      },
    });

    expect(formatPerfReport(report)).toContain(
      '  Données  1 Parcours  bruz-sud  inchangée  à jour',
    );
  });
});

describe('the reused Fiche subject', () => {
  it('should never claim that the pack script regenerated a Fiche', () => {
    expect(REUSED_FICHE_SUBJECT.changed).toEqual({
      singular: 'réutilisée',
      plural: 'réutilisées',
    });
  });

  it('should announce the Fiches the packs reuse', () => {
    const report = buildPerfReport({
      script: 'generate-zone-pdf',
      totalMs: 1_000,
      steps: [],
      tiles: { fromCache: 0, downloaded: 0 },
      subjects: [REUSED_FICHE_SUBJECT],
      parcours: {
        changed: [],
        unchanged: [
          {
            id: 'fiche-reutilisée/bruz-sud/V1',
            subject: REUSED_FICHE_SUBJECT.id,
            zoneId: 'bruz-sud',
            label: 'V1',
            reason: 'up-to-date',
          },
        ],
      },
    });

    expect(formatPerfReport(report)).toContain('  Fiche  1 Fiche  bruz-sud  réutilisée  à jour');
  });

  it('should announce the reused Fiches in a single row, and never as regenerated', () => {
    const report = buildPerfReport({
      script: 'generate-zone-pdf',
      totalMs: 1_000,
      steps: [],
      tiles: { fromCache: 0, downloaded: 0 },
      subjects: [PACK_SUBJECT, REUSED_FICHE_SUBJECT],
      parcours: {
        changed: [],
        unchanged: [
          {
            id: 'fiche-reutilisée/bruz-sud/V1',
            subject: REUSED_FICHE_SUBJECT.id,
            zoneId: 'bruz-sud',
            label: 'V1',
            reason: 'up-to-date',
          },
          {
            id: 'fiche-reutilisée/bruz-sud/V2',
            subject: REUSED_FICHE_SUBJECT.id,
            zoneId: 'bruz-sud',
            label: 'V2',
            reason: 'up-to-date',
          },
        ],
      },
      packs: {
        written: [
          {
            id: 'pack/bruz-sud/bruz-sud',
            subject: PACK_SUBJECT.id,
            zoneId: 'bruz-sud',
            label: 'bruz-sud',
            reason: 'pack-written',
          },
        ],
        documents: 49,
      },
    });

    const lines = formatPerfReport(report);

    expect(lines.filter((line) => line.includes('Fiches réutilisées'))).toEqual([
      '  Fiches réutilisées   2',
    ]);
    expect(lines.some((line) => line.includes('régénérée'))).toBe(false);
  });
});

describe('the subjects of the recap table', () => {
  it('should give every subject a complete vocabulary', () => {
    const subjects = [
      SEGMENTS_SUBJECT,
      DATA_SUBJECT,
      FICHE_SUBJECT,
      ZONE_MAP_SUBJECT,
      PACK_SUBJECT,
      REUSED_FICHE_SUBJECT,
    ];

    for (const subject of subjects) {
      expect(subject.id.length).toBeGreaterThan(0);
      expect(subject.label.length).toBeGreaterThan(0);
      expect(subject.plural.length).toBeGreaterThan(0);
      expect(subject.unit.singular.length).toBeGreaterThan(0);
      expect(subject.unit.plural.length).toBeGreaterThan(0);
      expect(subject.changed.singular.length).toBeGreaterThan(0);
      expect(subject.changed.plural.length).toBeGreaterThan(0);
      expect(subject.unchanged.singular.length).toBeGreaterThan(0);
      expect(subject.unchanged.plural.length).toBeGreaterThan(0);
    }
  });

  it('should give every subject its own id', () => {
    const ids = [
      SEGMENTS_SUBJECT.id,
      DATA_SUBJECT.id,
      FICHE_SUBJECT.id,
      ZONE_MAP_SUBJECT.id,
      PACK_SUBJECT.id,
      REUSED_FICHE_SUBJECT.id,
    ];

    expect(new Set(ids).size).toBe(ids.length);
  });
});
