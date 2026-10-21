import { describe, expect, it } from 'vitest';

import { parseGenerationFilters } from './generation-helpers';
import type { PlanCandidate } from './generation-plan';
import { planGeneration, zoneMapKey } from './generation-plan';
import type { GenerationState } from './generation-state';
import { nextGenerationState } from './generation-state';

/**
 * The generation plan (tickets #26 and #27): the pure decision of what a
 * generation run must regenerate. The module never touches the network nor
 * the filesystem — the fingerprints of the files are computed by the
 * caller and passed in, so the plan is checked here with fake inputs.
 */

const VERSION = 1;

function candidate(
  tourId: string,
  fingerprints: Partial<PlanCandidate['fingerprints']> = {},
  zoneId = 'bruz-sud',
): PlanCandidate {
  return {
    zoneId,
    tourId,
    fingerprints: {
      trace: 'trace',
      startSegment: 'start',
      endSegment: 'end',
      fiche: 'fiche',
      ...fingerprints,
    },
  };
}

function stateWith(record: GenerationState['parcours'][string]): GenerationState {
  return { version: VERSION, parcours: { 'bruz-sud/V1': record } };
}

const UP_TO_DATE_RECORD = {
  trace: 'trace',
  startSegment: 'start',
  endSegment: 'end',
  fiche: 'fiche',
};

describe('planGeneration', () => {
  it('should not re-route a Parcours whose trace and segments did not change', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1')],
    });

    expect(plan.decisions).toEqual([
      {
        zoneId: 'bruz-sud',
        tourId: 'V1',
        rerouteSegments: false,
        reason: 'unchanged',
        regenerateFiche: false,
        ficheReason: 'up-to-date',
      },
    ]);
  });

  it('should re-route a Parcours whose trace changed', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1', { trace: 'new-trace' })],
    });

    expect(plan.decisions[0]).toEqual({
      zoneId: 'bruz-sud',
      tourId: 'V1',
      rerouteSegments: true,
      reason: 'trace-changed',
      regenerateFiche: true,
      ficheReason: 'parcours-changed',
    });
  });

  it('should re-route a Parcours the state does not know', () => {
    const plan = planGeneration({
      state: { version: VERSION, parcours: {} },
      currentVersion: VERSION,
      candidates: [candidate('V1')],
    });

    expect(plan.decisions[0]?.rerouteSegments).toBe(true);
    expect(plan.decisions[0]?.reason).toBe('no-state-entry');
  });

  it('should re-route every Parcours when the version constant changed', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION + 1,
      candidates: [candidate('V1')],
    });

    expect(plan.decisions[0]?.rerouteSegments).toBe(true);
    expect(plan.decisions[0]?.reason).toBe('version-changed');
  });

  it('should re-route every Parcours when the state is missing', () => {
    const plan = planGeneration({
      state: undefined,
      currentVersion: VERSION,
      candidates: [candidate('V1')],
    });

    expect(plan.decisions[0]?.rerouteSegments).toBe(true);
    expect(plan.decisions[0]?.reason).toBe('no-state');
  });

  it('should re-route a Parcours whose segments are missing on disk', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1', { startSegment: undefined })],
    });

    expect(plan.decisions[0]?.rerouteSegments).toBe(true);
    expect(plan.decisions[0]?.reason).toBe('missing-segments');
  });

  it('should re-route a Parcours whose segments are not recorded in the state', () => {
    const plan = planGeneration({
      state: stateWith({ trace: 'trace' }),
      currentVersion: VERSION,
      candidates: [candidate('V1')],
    });

    expect(plan.decisions[0]?.rerouteSegments).toBe(true);
    expect(plan.decisions[0]?.reason).toBe('missing-segments');
  });

  it('should re-route a Parcours whose trace is missing on disk', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1', { trace: undefined })],
    });

    expect(plan.decisions[0]?.rerouteSegments).toBe(true);
    expect(plan.decisions[0]?.reason).toBe('missing-trace');
  });

  it('should re-route every selected Parcours when the run is forced', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1'), candidate('V2')],
      force: true,
    });

    expect(plan.decisions.map((decision) => decision.reason)).toEqual(['forced', 'forced']);
    expect(plan.decisions.every((decision) => decision.rerouteSegments)).toBe(true);
  });

  it('should leave the Parcours out of the filters out of the plan', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1'), candidate('V2'), candidate('V30', {}, 'bruz-ker-lann')],
      filters: parseGenerationFilters(['--tour=V1']),
    });

    expect(plan.decisions.map((decision) => decision.tourId)).toEqual(['V1']);
  });

  it('should force only the Parcours the filters select', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1'), candidate('V2')],
      filters: parseGenerationFilters(['--zone=bruz-sud']),
      force: true,
    });

    expect(plan.decisions).toHaveLength(2);
  });

  it('should plan nothing when there is no Parcours at all', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [],
    });

    expect(plan.decisions).toEqual([]);
    expect(plan.zoneDecisions).toEqual([]);
  });

  it('should route a Parcours again after a failed run dropped it from the state', () => {
    const state = nextGenerationState(stateWith(UP_TO_DATE_RECORD), [{ key: 'bruz-sud/V1' }]);

    const plan = planGeneration({
      state,
      currentVersion: VERSION,
      candidates: [candidate('V1')],
    });

    expect(plan.decisions[0]).toEqual({
      zoneId: 'bruz-sud',
      tourId: 'V1',
      rerouteSegments: true,
      reason: 'no-state-entry',
      regenerateFiche: true,
      ficheReason: 'parcours-changed',
    });
  });
});

describe('planGeneration — the Fiche of a Parcours', () => {
  it('should not render the Fiche of a Parcours that did not change', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1')],
    });

    expect(plan.decisions[0]?.regenerateFiche).toBe(false);
    expect(plan.decisions[0]?.ficheReason).toBe('up-to-date');
  });

  it('should render the Fiche of a Parcours whose trace changed', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1', { trace: 'new-trace' })],
    });

    expect(plan.decisions[0]?.regenerateFiche).toBe(true);
    expect(plan.decisions[0]?.ficheReason).toBe('parcours-changed');
  });

  it('should render the Fiche of a Parcours whose segments changed', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1', { endSegment: 'new-end' })],
    });

    expect(plan.decisions[0]?.regenerateFiche).toBe(true);
    expect(plan.decisions[0]?.ficheReason).toBe('parcours-changed');
  });

  it('should render the Fiche when the Fiche file is missing', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1', { fiche: undefined })],
    });

    expect(plan.decisions[0]?.regenerateFiche).toBe(true);
    expect(plan.decisions[0]?.ficheReason).toBe('missing-fiche');
  });

  it('should render the Fiche when the state records no Fiche fingerprint', () => {
    const plan = planGeneration({
      state: stateWith({ trace: 'trace', startSegment: 'start', endSegment: 'end' }),
      currentVersion: VERSION,
      candidates: [candidate('V1')],
    });

    expect(plan.decisions[0]?.regenerateFiche).toBe(true);
    expect(plan.decisions[0]?.ficheReason).toBe('no-fiche-state');
  });

  it('should render the Fiche when the Fiche on the disk differs from the state', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1', { fiche: 'other-fiche' })],
    });

    expect(plan.decisions[0]?.regenerateFiche).toBe(true);
    expect(plan.decisions[0]?.ficheReason).toBe('fiche-changed');
  });

  it('should render every Fiche of the selection when the run is forced', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1'), candidate('V2', {}, 'bruz-ker-lann')],
      force: true,
    });

    expect(plan.decisions.map((decision) => decision.ficheReason)).toEqual(['forced', 'forced']);
    expect(plan.decisions.every((decision) => decision.regenerateFiche)).toBe(true);
  });
});

describe('planGeneration — the overview map of a Zone', () => {
  const zoneFingerprints = {
    [zoneMapKey('bruz-sud', 'V')]: 'zone-map',
    [zoneMapKey('bruz-sud', 'P')]: 'zone-map-p',
  };

  it('should not render the overview map of a Zone whose Parcours did not change', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1')],
      zoneMapFingerprints: zoneFingerprints,
    });

    expect(plan.zoneDecisions).toEqual([
      { zoneId: 'bruz-sud', kind: 'V', regenerateZoneMap: false, reason: 'up-to-date' },
    ]);
  });

  it('should render the overview map when a Parcours of the Zone changed', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1', { trace: 'new-trace' })],
      zoneMapFingerprints: zoneFingerprints,
    });

    expect(plan.zoneDecisions).toEqual([
      { zoneId: 'bruz-sud', kind: 'V', regenerateZoneMap: true, reason: 'parcours-changed' },
    ]);
  });

  it('should render the overview map when the Fiche of a Parcours of the Zone is rendered again', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1', { fiche: undefined })],
      zoneMapFingerprints: zoneFingerprints,
    });

    expect(plan.zoneDecisions[0]?.regenerateZoneMap).toBe(true);
    expect(plan.zoneDecisions[0]?.reason).toBe('parcours-changed');
  });

  it('should render the overview map when the map file is missing', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1')],
      zoneMapFingerprints: {},
    });

    expect(plan.zoneDecisions).toEqual([
      { zoneId: 'bruz-sud', kind: 'V', regenerateZoneMap: true, reason: 'missing-zone-map' },
    ]);
  });

  it('should render every overview map of the selection when the run is forced', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1'), candidate('P1')],
      zoneMapFingerprints: zoneFingerprints,
      force: true,
    });

    expect(plan.zoneDecisions.map((decision) => decision.reason)).toEqual(['forced', 'forced']);
    expect(plan.zoneDecisions.every((decision) => decision.regenerateZoneMap)).toBe(true);
  });

  it('should decide one overview map per practice type of the Zone', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1'), candidate('P1')],
      zoneMapFingerprints: zoneFingerprints,
    });

    expect(plan.zoneDecisions.map((decision) => decision.kind)).toEqual(['V', 'P']);
  });

  it('should not decide the overview map of a Zone out of the run', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1'), candidate('V30', {}, 'bruz-ker-lann')],
      zoneMapFingerprints: zoneFingerprints,
      filters: parseGenerationFilters(['--zone=bruz-sud']),
    });

    expect(plan.zoneDecisions.map((decision) => decision.zoneId)).toEqual(['bruz-sud']);
  });
});
