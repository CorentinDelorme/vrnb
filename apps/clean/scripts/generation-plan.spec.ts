import { describe, expect, it } from 'vitest';

import { parseGenerationFilters } from './generation-helpers';
import type { PlanCandidate } from './generation-plan';
import { planGeneration } from './generation-plan';
import type { GenerationState } from './generation-state';

/**
 * The generation plan (ticket #26): the pure decision of what a
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
      ...fingerprints,
    },
  };
}

function stateWith(record: GenerationState['parcours'][string]): GenerationState {
  return { version: VERSION, parcours: { 'bruz-sud/V1': record } };
}

const UP_TO_DATE_RECORD = { trace: 'trace', startSegment: 'start', endSegment: 'end' };

describe('planGeneration', () => {
  it('should not re-route a Parcours whose trace and segments did not change', () => {
    const plan = planGeneration({
      state: stateWith(UP_TO_DATE_RECORD),
      currentVersion: VERSION,
      candidates: [candidate('V1')],
    });

    expect(plan.decisions).toEqual([
      { zoneId: 'bruz-sud', tourId: 'V1', rerouteSegments: false, reason: 'unchanged' },
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
  });
});
