import { describe, expect, it, vi } from 'vitest';

import { fetchInscriptionsOutcome, parseInscriptionsState } from './inscriptions-client';

/**
 * Browser client of `GET /api/inscriptions`: relative-URL fetch with an
 * injectable fetch, strict deserialization to success/error outcomes.
 */

const STATE = {
  edition: { actionDate: '2027-02-14', year: 2027 },
  inscriptions: [{ tourId: 'V1', zoneId: 'bruz-sud' }],
  registrationOpen: true,
} as const;

describe('fetchInscriptionsOutcome', () => {
  it('should fetch the relative /api/inscriptions URL and return the state', async () => {
    const fetchImpl = vi.fn(
      async (): Promise<Response> => new Response(JSON.stringify(STATE), { status: 200 }),
    );

    const outcome = await fetchInscriptionsOutcome(fetchImpl);

    expect(outcome.status).toBe('success');
    if (outcome.status === 'success') expect(outcome.state).toEqual(STATE);
    expect(fetchImpl.mock.calls).toEqual([['/api/inscriptions']]);
  });

  it('should map an HTTP error to the error outcome', async () => {
    const outcome = await fetchInscriptionsOutcome(async () => new Response('', { status: 500 }));
    expect(outcome.status).toBe('error');
  });

  it('should map a malformed payload to the error outcome', async () => {
    const malformed = '{"edition":{"year":2027},"inscriptions":[]}'; // missing fields
    const outcome = await fetchInscriptionsOutcome(
      async () => new Response(malformed, { status: 200 }),
    );
    expect(outcome.status).toBe('error');
  });

  it('should map a network failure to the error outcome', async () => {
    const outcome = await fetchInscriptionsOutcome(async () => {
      throw new Error('offline');
    });
    expect(outcome.status).toBe('error');
  });
});

describe('parseInscriptionsState', () => {
  it('should keep a well-formed state, filtering unusable rows', () => {
    const state = parseInscriptionsState({
      edition: { actionDate: '2027-02-14', year: 2027 },
      inscriptions: [
        { tourId: 'V1', zoneId: 'bruz-sud' },
        { tourId: 'V2' }, // missing zone
        { zoneId: 'bruz-sud' }, // missing tour
        { tourId: '', zoneId: 'bruz-sud' },
        { tourId: 'V3', zoneId: 'bruz-sud' },
      ],
      registrationOpen: false,
    });
    expect(state).toEqual({
      edition: { actionDate: '2027-02-14', year: 2027 },
      inscriptions: [
        { tourId: 'V1', zoneId: 'bruz-sud' },
        { tourId: 'V3', zoneId: 'bruz-sud' },
      ],
      registrationOpen: false,
    });
  });

  it('should reject non objects and incomplete states', () => {
    expect(parseInscriptionsState('plain text')).toBeNull();
    expect(parseInscriptionsState('{"inscriptions":[]}')).toBeNull();
    expect(
      parseInscriptionsState({
        edition: { actionDate: '2027-02-14', year: 2027 },
        inscriptions: [],
      }), // registrationOpen missing
    ).toBeNull();
    expect(
      parseInscriptionsState({
        edition: { actionDate: 2027, year: 'x' },
        inscriptions: [],
        registrationOpen: true,
      }),
    ).toBeNull();
    expect(
      parseInscriptionsState({
        edition: { actionDate: '2027-02-14', year: 2027 },
        inscriptions: 'twelve',
        registrationOpen: true,
      }),
    ).toBeNull();
  });
});
