import { describe, expect, it } from 'vitest';

import type { PerfSubject } from './generation-perf';
import {
  aggregatePerfReports,
  buildPerfReport,
  countersFromDecisions,
  countersFromIds,
  countersFromZoneDecisions,
  createPerfRecorder,
  formatDuration,
  formatPerfReport,
} from './generation-perf';

/**
 * The `[perf]` block of a generation run (ticket #28): the recap of the
 * run, in French, as the referent reads it.
 *
 * The module is pure: it builds the block from the durations and the
 * counters it is given, so the block is checked here with fake numbers.
 */

/** The Fiches, as the Fiche script declares them. */
const FICHE_SUBJECT: PerfSubject = {
  id: 'fiche',
  label: 'Fiche',
  plural: 'Fiches',
  unit: { singular: 'Fiche', plural: 'Fiches' },
  changed: { singular: 'regénérée', plural: 'regénérées' },
  unchanged: { singular: 'ignorée', plural: 'ignorées' },
};

/** The zone maps, as the Fiche script declares them. */
const ZONE_MAP_SUBJECT: PerfSubject = {
  id: 'carte de zone',
  label: 'Carte de zone',
  plural: 'cartes de zone',
  unit: { singular: 'carte', plural: 'cartes' },
  changed: { singular: 'regénérée', plural: 'regénérées' },
  unchanged: { singular: 'ignorée', plural: 'ignorées' },
};

/** The segments, as the routing script declares them. */
const SEGMENTS_SUBJECT: PerfSubject = {
  id: 'segments',
  label: 'Segments',
  plural: 'segments',
  unit: { singular: 'segment', plural: 'segments' },
  changed: { singular: 're-routé', plural: 're-routés' },
  unchanged: { singular: 'ignoré', plural: 'ignorés' },
};

/**
 * The Fiches the packs reuse: the subject announces the same decision
 * whatever the case.
 */
const REUSED_FICHE_SUBJECT: PerfSubject = {
  id: 'fiche-reutilisée',
  label: 'Fiche',
  plural: 'Fiches',
  unit: { singular: 'Fiche', plural: 'Fiches' },
  changed: { singular: 'réutilisée', plural: 'réutilisées' },
  unchanged: { singular: 'réutilisée', plural: 'réutilisées' },
};

describe('formatDuration', () => {
  it('should show a duration under a second in milliseconds', () => {
    expect(formatDuration(950)).toBe('950 ms');
  });

  it('should show a duration under a minute in seconds', () => {
    expect(formatDuration(12_300)).toBe('12.3 s');
  });

  it('should show a duration over a minute in minutes and seconds', () => {
    expect(formatDuration(72_000)).toBe('1 m 12 s');
  });
});

describe('formatPerfReport', () => {
  it('should show the total duration and the metrics of the run in a table', () => {
    const report = buildPerfReport({
      script: 'generate-pdfs',
      totalMs: 72_000,
      steps: [
        { name: 'Fiches', durationMs: 65_000 },
        { name: 'Cartes de zone', durationMs: 7_000 },
      ],
      tiles: { fromCache: 120, downloaded: 8 },
      subjects: [],
      parcours: { changed: [], unchanged: [] },
    });

    expect(formatPerfReport(report)).toEqual([
      '[perf] generate-pdfs — durée totale : 1 m 12 s',
      '',
      '  Métrique                  Valeur',
      '  ──────────────────────────────────',
      '  Étape « Fiches »          1 m 05 s',
      '  Étape « Cartes de zone »  7.0 s',
      '  Tuiles en cache           120',
      '  Tuiles téléchargées       8',
    ]);
  });

  it('should show one row per subject, with the number of elements it changed', () => {
    const report = buildPerfReport({
      script: 'generate-pdfs',
      totalMs: 72_000,
      steps: [],
      tiles: { fromCache: 0, downloaded: 0 },
      subjects: [FICHE_SUBJECT],
      parcours: {
        changed: [
          {
            id: 'fiche/bruz-sud/V1',
            subject: 'fiche',
            zoneId: 'bruz-sud',
            label: 'V1',
            reason: 'parcours-changed',
          },
          {
            id: 'fiche/bruz-sud/V2',
            subject: 'fiche',
            zoneId: 'bruz-sud',
            label: 'V2',
            reason: 'fiche-changed',
          },
        ],
        unchanged: [
          {
            id: 'fiche/bruz-sud/V3',
            subject: 'fiche',
            zoneId: 'bruz-sud',
            label: 'V3',
            reason: 'up-to-date',
          },
          {
            id: 'fiche/bruz-sud/V4',
            subject: 'fiche',
            zoneId: 'bruz-sud',
            label: 'V4',
            reason: 'up-to-date',
          },
          {
            id: 'fiche/bruz-ker-lann/V1',
            subject: 'fiche',
            zoneId: 'bruz-ker-lann',
            label: 'V1',
            reason: 'up-to-date',
          },
        ],
      },
    });

    expect(formatPerfReport(report)).toEqual([
      '[perf] generate-pdfs — durée totale : 1 m 12 s',
      '',
      '  Métrique             Valeur',
      '  ───────────────────────────',
      '  Tuiles en cache      0',
      '  Tuiles téléchargées  0',
      '  Fiches regénérées    2',
      '  Fiches ignorées      3',
      '',
      '  Sujet  Élément   Zone           Décision   Raison',
      '  ───────────────────────────────────────────────────────────',
      '  Fiche  V1        bruz-sud       regénérée  parcours modifié',
      '  Fiche  V2        bruz-sud       regénérée  fiche modifiée',
      '  Fiche  2 Fiches  bruz-sud       ignorées   à jour',
      '  Fiche  1 Fiche   bruz-ker-lann  ignorée    à jour',
    ]);
  });

  it('should show one row per element the run changed, with its reason', () => {
    const report = buildPerfReport({
      script: 'generate-pdfs',
      totalMs: 72_000,
      steps: [],
      tiles: { fromCache: 0, downloaded: 0 },
      subjects: [FICHE_SUBJECT, ZONE_MAP_SUBJECT],
      parcours: {
        changed: [
          {
            id: 'fiche/bruz-sud/V1',
            subject: 'fiche',
            zoneId: 'bruz-sud',
            label: 'V1',
            reason: 'parcours-changed',
          },
        ],
        unchanged: [],
      },
      zoneMaps: {
        changed: [
          {
            id: 'carte de zone/bruz-sud/vélo',
            subject: 'carte de zone',
            zoneId: 'bruz-sud',
            label: 'vélo',
            reason: 'parcours-changed',
          },
        ],
        unchanged: [],
      },
    });

    expect(formatPerfReport(report)).toEqual([
      '[perf] generate-pdfs — durée totale : 1 m 12 s',
      '',
      '  Métrique                   Valeur',
      '  ─────────────────────────────────',
      '  Tuiles en cache            0',
      '  Tuiles téléchargées        0',
      '  Fiches regénérées          1',
      '  Fiches ignorées            0',
      '  Cartes de zone regénérées  1',
      '  Cartes de zone ignorées    0',
      '',
      '  Sujet          Élément  Zone      Décision   Raison',
      '  ─────────────────────────────────────────────────────────────',
      '  Fiche          V1       bruz-sud  regénérée  parcours modifié',
      '  Carte de zone  vélo     bruz-sud  regénérée  parcours modifié',
    ]);
  });

  it('should group the elements the run left alone, by subject, Zone and reason', () => {
    const report = buildPerfReport({
      script: 'generate-pdfs',
      totalMs: 72_000,
      steps: [],
      tiles: { fromCache: 0, downloaded: 0 },
      subjects: [FICHE_SUBJECT, ZONE_MAP_SUBJECT],
      parcours: {
        changed: [],
        unchanged: [
          {
            id: 'fiche/bruz-sud/V2',
            subject: 'fiche',
            zoneId: 'bruz-sud',
            label: 'V2',
            reason: 'up-to-date',
          },
          {
            id: 'fiche/bruz-sud/V3',
            subject: 'fiche',
            zoneId: 'bruz-sud',
            label: 'V3',
            reason: 'up-to-date',
          },
          {
            id: 'fiche/bruz-ker-lann/V1',
            subject: 'fiche',
            zoneId: 'bruz-ker-lann',
            label: 'V1',
            reason: 'up-to-date',
          },
        ],
      },
      zoneMaps: {
        changed: [],
        unchanged: [
          {
            id: 'carte de zone/bruz-sud/pied',
            subject: 'carte de zone',
            zoneId: 'bruz-sud',
            label: 'pied',
            reason: 'up-to-date',
          },
          {
            id: 'carte de zone/bruz-ker-lann/vélo',
            subject: 'carte de zone',
            zoneId: 'bruz-ker-lann',
            label: 'vélo',
            reason: 'up-to-date',
          },
        ],
      },
    });

    expect(formatPerfReport(report)).toEqual([
      '[perf] generate-pdfs — durée totale : 1 m 12 s',
      '',
      '  Métrique                   Valeur',
      '  ─────────────────────────────────',
      '  Tuiles en cache            0',
      '  Tuiles téléchargées        0',
      '  Fiches regénérées          0',
      '  Fiches ignorées            3',
      '  Cartes de zone regénérées  0',
      '  Cartes de zone ignorées    2',
      '',
      '  Sujet          Élément   Zone           Décision  Raison',
      '  ────────────────────────────────────────────────────────',
      '  Fiche          2 Fiches  bruz-sud       ignorées  à jour',
      '  Fiche          1 Fiche   bruz-ker-lann  ignorée   à jour',
      '  Carte de zone  1 carte   bruz-sud       ignorée   à jour',
      '  Carte de zone  1 carte   bruz-ker-lann  ignorée   à jour',
      '',
      "  rien n'a changé : aucun Parcours ni aucune carte de zone régénérés",
    ]);
  });

  it('should group the elements of a run by subject, whatever the order they came in', () => {
    const report = buildPerfReport({
      script: 'generate-pdfs',
      totalMs: 72_000,
      steps: [],
      tiles: { fromCache: 0, downloaded: 0 },
      subjects: [FICHE_SUBJECT, ZONE_MAP_SUBJECT],
      parcours: {
        changed: [],
        unchanged: [
          {
            id: 'fiche/bruz-sud/V2',
            subject: 'fiche',
            zoneId: 'bruz-sud',
            label: 'V2',
            reason: 'up-to-date',
          },
        ],
      },
      zoneMaps: {
        changed: [],
        unchanged: [
          {
            id: 'carte de zone/bruz-sud/pied',
            subject: 'carte de zone',
            zoneId: 'bruz-sud',
            label: 'pied',
            reason: 'up-to-date',
          },
        ],
      },
    });

    const rows = formatPerfReport(report);

    expect(rows).toEqual([
      '[perf] generate-pdfs — durée totale : 1 m 12 s',
      '',
      '  Métrique                   Valeur',
      '  ─────────────────────────────────',
      '  Tuiles en cache            0',
      '  Tuiles téléchargées        0',
      '  Fiches regénérées          0',
      '  Fiches ignorées            1',
      '  Cartes de zone regénérées  0',
      '  Cartes de zone ignorées    1',
      '',
      '  Sujet          Élément  Zone      Décision  Raison',
      '  ──────────────────────────────────────────────────',
      '  Fiche          1 Fiche  bruz-sud  ignorée   à jour',
      '  Carte de zone  1 carte  bruz-sud  ignorée   à jour',
      '',
      "  rien n'a changé : aucun Parcours ni aucune carte de zone régénérés",
    ]);
  });

  it('should show one row per subject when it announces the same decision either way', () => {
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
            subject: 'fiche-reutilisée',
            zoneId: 'bruz-sud',
            label: 'V1',
            reason: 'up-to-date',
          },
          {
            id: 'fiche-reutilisée/bruz-sud/V2',
            subject: 'fiche-reutilisée',
            zoneId: 'bruz-sud',
            label: 'V2',
            reason: 'up-to-date',
          },
        ],
      },
    });

    const rows = formatPerfReport(report).filter((line) => line.includes('Fiches réutilisées'));

    expect(rows).toEqual(['  Fiches réutilisées   2']);
  });

  it('should tell a run that changed nothing from a run that did something', () => {
    const report = buildPerfReport({
      script: 'generate-start-end-gpx',
      totalMs: 300,
      steps: [],
      tiles: { fromCache: 0, downloaded: 0 },
      subjects: [SEGMENTS_SUBJECT],
      parcours: {
        changed: [],
        unchanged: [
          {
            id: 'segments/bruz-sud/V1',
            subject: 'segments',
            zoneId: 'bruz-sud',
            label: 'V1',
            reason: 'unchanged',
          },
        ],
      },
    });

    expect(formatPerfReport(report)).toEqual([
      '[perf] generate-start-end-gpx — durée totale : 300 ms',
      '',
      '  Métrique             Valeur',
      '  ───────────────────────────',
      '  Tuiles en cache      0',
      '  Tuiles téléchargées  0',
      '  Segments re-routés   0',
      '  Segments ignorés     1',
      '',
      '  Sujet     Élément    Zone      Décision  Raison',
      '  ───────────────────────────────────────────────',
      '  Segments  1 segment  bruz-sud  ignoré    à jour',
      '',
      "  rien n'a changé : aucun Parcours régénéré",
    ]);
  });

  it('should not tell a run that wrote packs changed nothing', () => {
    const report = buildPerfReport({
      script: 'generate-zone-pdf',
      totalMs: 1_000,
      steps: [],
      tiles: { fromCache: 0, downloaded: 0 },
      subjects: [],
      parcours: { changed: [], unchanged: [] },
      packs: { written: [], documents: 12 },
    });

    expect(formatPerfReport(report).some((line) => line.includes("rien n'a changé"))).toBe(false);
  });

  it('should show the documents the packs of the run hold', () => {
    const report = buildPerfReport({
      script: 'generate-zone-pdf',
      totalMs: 1_000,
      steps: [],
      tiles: { fromCache: 0, downloaded: 0 },
      subjects: [],
      parcours: { changed: [], unchanged: [] },
      packs: { written: [], documents: 49 },
    });

    expect(formatPerfReport(report)).toEqual([
      '[perf] generate-zone-pdf — durée totale : 1.0 s',
      '',
      '  Métrique             Valeur',
      '  ───────────────────────────',
      '  Tuiles en cache      0',
      '  Tuiles téléchargées  0',
      '  Documents des packs  49',
    ]);
  });
});

describe('createPerfRecorder', () => {
  it('should measure the duration of each step with the injected clock', async () => {
    let now = 1_000;
    const recorder = createPerfRecorder({ now: () => now });

    await recorder.measure('Fiches', async () => {
      now = 4_500;
    });
    await recorder.measure('Cartes de zone', () => {
      now = 5_000;
    });

    expect(recorder.steps).toEqual([
      { name: 'Fiches', durationMs: 3_500 },
      { name: 'Cartes de zone', durationMs: 500 },
    ]);
    expect(recorder.totalMs()).toBe(4_000);
  });

  it('should keep the duration of a step that failed', async () => {
    let now = 0;
    const recorder = createPerfRecorder({ now: () => now });

    await expect(
      recorder.measure('Fiches', () => {
        now = 800;
        throw new Error('router down');
      }),
    ).rejects.toThrow('router down');

    expect(recorder.steps).toEqual([{ name: 'Fiches', durationMs: 800 }]);
  });
});

describe('countersFromDecisions', () => {
  it('should count the elements the run changed and the ones it left alone', () => {
    const counters = countersFromDecisions(
      [
        { zoneId: 'bruz-sud', tourId: 'V1' },
        { zoneId: 'bruz-sud', tourId: 'V2' },
      ],
      {
        subject: 'fiche',
        label: (decision) => decision.tourId,
        reason: (decision) => (decision.tourId === 'V1' ? 'parcours-changed' : 'up-to-date'),
        isChanged: (decision) => decision.tourId === 'V1',
      },
    );

    expect(counters).toEqual({
      changed: [
        {
          id: 'fiche/bruz-sud/V1',
          subject: 'fiche',
          zoneId: 'bruz-sud',
          label: 'V1',
          reason: 'parcours-changed',
        },
      ],
      unchanged: [
        {
          id: 'fiche/bruz-sud/V2',
          subject: 'fiche',
          zoneId: 'bruz-sud',
          label: 'V2',
          reason: 'up-to-date',
        },
      ],
    });
  });

  it('should count only the elements of the run, never the whole catalogue', () => {
    const counters = countersFromDecisions([{ zoneId: 'bruz-sud', tourId: 'V1' }], {
      subject: 'fiche',
      label: (decision) => decision.tourId,
      reason: () => 'forced',
      isChanged: () => true,
    });

    expect(counters).toEqual({
      changed: [
        {
          id: 'fiche/bruz-sud/V1',
          subject: 'fiche',
          zoneId: 'bruz-sud',
          label: 'V1',
          reason: 'forced',
        },
      ],
      unchanged: [],
    });
  });
});

describe('countersFromZoneDecisions', () => {
  it('should count the zone maps the run rendered and the ones it left alone', () => {
    const counters = countersFromZoneDecisions(
      [
        { zoneId: 'bruz-sud', kind: 'V' },
        { zoneId: 'bruz-sud', kind: 'P' },
      ],
      {
        subject: 'carte de zone',
        label: (decision) => (decision.kind === 'V' ? 'vélo' : 'pied'),
        reason: () => 'up-to-date',
        isChanged: (decision) => decision.kind === 'V',
      },
    );

    expect(counters).toEqual({
      changed: [
        {
          id: 'carte de zone/bruz-sud/vélo',
          subject: 'carte de zone',
          zoneId: 'bruz-sud',
          label: 'vélo',
          reason: 'up-to-date',
        },
      ],
      unchanged: [
        {
          id: 'carte de zone/bruz-sud/pied',
          subject: 'carte de zone',
          zoneId: 'bruz-sud',
          label: 'pied',
          reason: 'up-to-date',
        },
      ],
    });
  });
});

describe('countersFromIds', () => {
  it('should count the elements left alone as the scope minus the changed ones', () => {
    const counters = countersFromIds(
      'données',
      ['bruz-sud/V1'],
      ['bruz-sud/V1', 'bruz-sud/V2'],
      'up-to-date',
      'data-changed',
    );

    expect(counters).toEqual({
      changed: [
        {
          id: 'données/bruz-sud/V1',
          subject: 'données',
          zoneId: 'bruz-sud',
          label: 'V1',
          reason: 'data-changed',
        },
      ],
      unchanged: [
        {
          id: 'données/bruz-sud/V2',
          subject: 'données',
          zoneId: 'bruz-sud',
          label: 'V2',
          reason: 'up-to-date',
        },
      ],
    });
  });

  it('should count a run that changed nothing as a run that left them all alone', () => {
    const counters = countersFromIds('données', [], ['bruz-sud/V1'], 'up-to-date');

    expect(counters).toEqual({
      changed: [],
      unchanged: [
        {
          id: 'données/bruz-sud/V1',
          subject: 'données',
          zoneId: 'bruz-sud',
          label: 'V1',
          reason: 'up-to-date',
        },
      ],
    });
  });
});

describe('aggregatePerfReports', () => {
  it('should merge the tiles of the steps of a run', () => {
    const report = aggregatePerfReports({
      script: 'generate-all',
      totalMs: 120_000,
      steps: [{ name: 'generate:pdfs', durationMs: 60_000 }],
      reports: [
        buildPerfReport({
          script: 'generate-pdfs',
          totalMs: 60_000,
          steps: [],
          tiles: { fromCache: 10, downloaded: 2 },
          subjects: [],
          parcours: { changed: [], unchanged: [] },
        }),
      ],
    });

    expect(report.tiles).toEqual({ fromCache: 10, downloaded: 2 });
  });

  it('should merge the subjects and the elements of the steps of a run', () => {
    const report = aggregatePerfReports({
      script: 'generate-all',
      totalMs: 120_000,
      steps: [],
      reports: [
        buildPerfReport({
          script: 'generate-start-end-gpx',
          totalMs: 60_000,
          steps: [],
          tiles: { fromCache: 0, downloaded: 0 },
          subjects: [FICHE_SUBJECT],
          parcours: { changed: [], unchanged: [] },
        }),
        buildPerfReport({
          script: 'generate-pdfs',
          totalMs: 60_000,
          steps: [],
          tiles: { fromCache: 0, downloaded: 0 },
          subjects: [ZONE_MAP_SUBJECT],
          parcours: {
            changed: [
              {
                id: 'fiche/bruz-sud/V1',
                subject: 'fiche',
                zoneId: 'bruz-sud',
                label: 'V1',
                reason: 'parcours-changed',
              },
            ],
            unchanged: [],
          },
        }),
      ],
    });

    expect(report.subjects).toEqual([FICHE_SUBJECT, ZONE_MAP_SUBJECT]);
    expect(report.parcours.changed).toHaveLength(1);
  });

  it('should count an element changed by a step as changed, not as left alone', () => {
    const element = {
      id: 'fiche/bruz-sud/V1',
      subject: 'fiche',
      zoneId: 'bruz-sud',
      label: 'V1',
      reason: 'parcours-changed',
    };
    const report = aggregatePerfReports({
      script: 'generate-all',
      totalMs: 120_000,
      steps: [],
      reports: [
        buildPerfReport({
          script: 'generate-pdfs',
          totalMs: 60_000,
          steps: [],
          tiles: { fromCache: 0, downloaded: 0 },
          subjects: [FICHE_SUBJECT],
          parcours: { changed: [], unchanged: [{ ...element, reason: 'up-to-date' }] },
        }),
        buildPerfReport({
          script: 'generate-pdfs',
          totalMs: 60_000,
          steps: [],
          tiles: { fromCache: 0, downloaded: 0 },
          subjects: [FICHE_SUBJECT],
          parcours: { changed: [element], unchanged: [] },
        }),
      ],
    });

    expect(report.parcours.changed).toEqual([element]);
    expect(report.parcours.unchanged).toEqual([]);
  });

  it('should keep the zone maps of the steps in their own counter', () => {
    const zoneMap = {
      id: 'carte de zone/bruz-sud/vélo',
      subject: 'carte de zone',
      zoneId: 'bruz-sud',
      label: 'vélo',
      reason: 'up-to-date',
    };
    const report = aggregatePerfReports({
      script: 'generate-all',
      totalMs: 120_000,
      steps: [],
      reports: [
        buildPerfReport({
          script: 'generate-pdfs',
          totalMs: 60_000,
          steps: [],
          tiles: { fromCache: 0, downloaded: 0 },
          subjects: [ZONE_MAP_SUBJECT],
          parcours: { changed: [], unchanged: [] },
          zoneMaps: { changed: [], unchanged: [zoneMap] },
        }),
      ],
    });

    expect(report.zoneMaps.unchanged).toEqual([zoneMap]);
    expect(report.parcours.unchanged).toEqual([]);
  });

  it('should merge the packs of the steps of a run', () => {
    const report = aggregatePerfReports({
      script: 'generate-all',
      totalMs: 120_000,
      steps: [],
      reports: [
        buildPerfReport({
          script: 'generate-zone-pdf',
          totalMs: 60_000,
          steps: [],
          tiles: { fromCache: 0, downloaded: 0 },
          subjects: [],
          parcours: { changed: [], unchanged: [] },
          packs: { written: [], documents: 12 },
        }),
      ],
    });

    expect(report.packs).toEqual({ written: [], documents: 12 });
  });

  it('should hold no pack when no step wrote one', () => {
    const report = aggregatePerfReports({
      script: 'generate-all',
      totalMs: 120_000,
      steps: [],
      reports: [
        buildPerfReport({
          script: 'generate-pdfs',
          totalMs: 60_000,
          steps: [],
          tiles: { fromCache: 0, downloaded: 0 },
          subjects: [],
          parcours: { changed: [], unchanged: [] },
        }),
      ],
    });

    expect(report.packs).toBeUndefined();
  });
});
