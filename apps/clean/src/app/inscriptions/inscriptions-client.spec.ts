import { describe, expect, it, vi } from 'vitest';

import type { BinomeRegistration } from './inscriptions-client';
import {
  fetchInscriptionsOutcome,
  parseInscriptionsState,
  postRegistration,
  registrationRequestBody,
} from './inscriptions-client';

/**
 * Browser client of the inscriptions endpoints: relative-URL fetch with an
 * injectable fetch and strict deserialization. GET degrades every failure to
 * the error outcome; POST maps the handler's status codes to the distinct
 * registration outcomes (created/taken/invalid/error).
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

/** One complete registration fixture, tweakable per test. */
const REGISTRATION: BinomeRegistration = {
  firstName1: 'Léa',
  firstName2: 'Marc',
  lastName1: 'Dupont',
  lastName2: 'Martin',
  tourId: 'V1',
  zoneId: 'bruz-sud',
};

describe('registrationRequestBody', () => {
  it('should serialize the exact POST contract keys', () => {
    expect(registrationRequestBody(REGISTRATION)).toBe(
      '{"engaged":true,"firstName1":"Léa","firstName2":"Marc","honeypot":"",' +
        '"lastName1":"Dupont","lastName2":"Martin","tourId":"V1","zoneId":"bruz-sud"}',
    );
  });
});

describe('postRegistration', () => {
  it('should POST the contract payload to the inscriptions URL', async () => {
    const fetches: [URL | string, RequestInit | undefined][] = [];
    const fetchImpl = vi.fn(async (input: URL | string, init?: RequestInit): Promise<Response> => {
      fetches.push([input, init]);
      return new Response('{"inscription":{"tourId":"V1","zoneId":"bruz-sud"}}', {
        status: 201,
      });
    });

    const outcome = await postRegistration(REGISTRATION, fetchImpl);

    expect(outcome).toEqual({ status: 'created' });
    const [url, init] = fetches[0] ?? [];
    expect(url).toBe('/api/inscriptions');
    expect(init).toMatchObject({
      body: registrationRequestBody(REGISTRATION),
      headers: { 'content-type': 'application/json; charset=utf-8' },
      method: 'POST',
    });
  });

  it('should map the created status to the created outcome, body unneeded', async () => {
    const outcome = await postRegistration(
      REGISTRATION,
      async () => new Response('', { status: 201 }),
    );
    expect(outcome).toEqual({ status: 'created' });
  });

  it('should map 409 to the taken outcome and 400 to the invalid outcome', async () => {
    const taken = await postRegistration(
      REGISTRATION,
      async () => new Response('{"error":"inscriptions-conflict"}', { status: 409 }),
    );
    expect(taken).toEqual({ status: 'taken' });

    const invalid = await postRegistration(
      REGISTRATION,
      async () => new Response('{"error":"invalid-inscription"}', { status: 400 }),
    );
    expect(invalid).toEqual({ status: 'invalid' });
  });

  it('should map any other HTTP status to the error outcome', async () => {
    const serverError = await postRegistration(
      REGISTRATION,
      async () => new Response('{"error":"inscriptions-unavailable"}', { status: 500 }),
    );
    expect(serverError).toEqual({ status: 'error' });

    const unauthorized = await postRegistration(
      REGISTRATION,
      async () => new Response('', { status: 403 }),
    );
    expect(unauthorized).toEqual({ status: 'error' });
  });

  it('should map a network failure to the error outcome', async () => {
    const outcome = await postRegistration(REGISTRATION, async () => {
      throw new Error('offline');
    });
    expect(outcome).toEqual({ status: 'error' });
  });
});
