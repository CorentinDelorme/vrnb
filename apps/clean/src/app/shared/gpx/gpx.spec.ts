import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildGeoVeloToMeetingPointLink,
  fetchGpxFile,
  generateGeoVeloLinks,
  getGeoJsonFromGpx,
  getStartAndEndPointsFromGeoJson,
} from './gpx';

const GPX_WITH_THREE_POINTS = `<?xml version="1.0" encoding="UTF-8"?>
  <gpx version="1.1" creator="test">
    <trk>
      <trkseg>
        <trkpt lat="48.016" lon="-1.746"><ele>0</ele></trkpt>
        <trkpt lat="48.017" lon="-1.747"><ele>0</ele></trkpt>
        <trkpt lat="48.018" lon="-1.748"><ele>0</ele></trkpt>
      </trkseg>
    </trk>
  </gpx>`;

const MEETING_POINT: [number, number] = [-1.747083, 48.024417];

const GEOVELO_BASE = 'https://geovelo.app/fr/route/?bike-type=own&e-bike=false&zone=rennes';

describe('getGeoJsonFromGpx', () => {
  it('should convert a valid GPX string to GeoJSON FeatureCollection', () => {
    const result = getGeoJsonFromGpx(GPX_WITH_THREE_POINTS);

    expect(result.type).toBe('FeatureCollection');
    expect(result.features.length).toBeGreaterThan(0);
    expect(result.features[0].geometry?.type).toBe('LineString');
  });
});

describe('getStartAndEndPointsFromGeoJson', () => {
  it('should return undefined when geoJson has no features', () => {
    const geoJson = {
      type: 'FeatureCollection' as const,
      features: [],
    };
    expect(getStartAndEndPointsFromGeoJson(geoJson)).toBeUndefined();
  });

  it('should extract start and end points from LineString', () => {
    const geoJson = getGeoJsonFromGpx(GPX_WITH_THREE_POINTS);
    const result = getStartAndEndPointsFromGeoJson(geoJson);

    expect(result).toBeDefined();
    expect(result!.start[0]).toBeCloseTo(-1.746);
    expect(result!.start[1]).toBeCloseTo(48.016);
    expect(result!.end[0]).toBeCloseTo(-1.748);
    expect(result!.end[1]).toBeCloseTo(48.018);
  });

  it('should extract start and end points across lines from MultiLineString', () => {
    const geoJson = {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          properties: {},
          geometry: {
            type: 'MultiLineString' as const,
            coordinates: [
              [
                [-1.74, 48.01],
                [-1.741, 48.011],
              ],
              [
                [-1.75, 48.02],
                [-1.751, 48.021],
              ],
            ],
          },
        },
      ],
    };
    const result = getStartAndEndPointsFromGeoJson(geoJson);

    expect(result).toBeDefined();
    expect(result!.start).toEqual([-1.74, 48.01]);
    expect(result!.end).toEqual([-1.751, 48.021]);
  });
});

describe('generateGeoVeloLinks', () => {
  it('should build meeting-point to start and end to meeting-point links', () => {
    const geoJson = getGeoJsonFromGpx(GPX_WITH_THREE_POINTS);
    const links = generateGeoVeloLinks(geoJson, MEETING_POINT);

    expect(links).toBeDefined();
    expect(links!.toStart).toBe(`${GEOVELO_BASE}&from=-1.747083,48.024417&to=-1.746,48.016`);
    expect(links!.fromEnd).toBe(`${GEOVELO_BASE}&from=-1.748,48.018&to=-1.747083,48.024417`);
  });

  it('should return undefined when there is no GeoJson', () => {
    expect(generateGeoVeloLinks(null, MEETING_POINT)).toBeUndefined();
  });
});

describe('buildGeoVeloToMeetingPointLink', () => {
  it('should target the meeting point without origin when position is unknown', () => {
    expect(buildGeoVeloToMeetingPointLink(MEETING_POINT)).toBe(
      `${GEOVELO_BASE}&to=-1.747083,48.024417`,
    );
  });

  it('should add the current position as origin when available', () => {
    expect(buildGeoVeloToMeetingPointLink(MEETING_POINT, { lat: 48.02, lng: -1.75 })).toBe(
      `${GEOVELO_BASE}&to=-1.747083,48.024417&from=-1.75,48.02`,
    );
  });
});

describe('fetchGpxFile', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('should load the zone-scoped GPX file', async () => {
    fetchMock.mockResolvedValue(new Response('<gpx></gpx>', { status: 200 }));

    const result = await fetchGpxFile('V1', 'start', 'bruz-sud');

    expect(result).toBe('<gpx></gpx>');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/gpx/bruz-sud/V1/V1_start.gpx');
  });

  it('should fall back to the legacy flat layout when the zone-scoped file fails', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('Not found', { status: 404 }))
      .mockResolvedValueOnce(new Response('<gpx legacy />', { status: 200 }));

    const result = await fetchGpxFile('V1', undefined, 'bruz-sud');

    expect(result).toBe('<gpx legacy />');
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/gpx/bruz-sud/V1/V1.gpx');
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/gpx/V1/V1.gpx');
  });

  it('should reject when neither the zone-scoped nor the legacy file loads', async () => {
    fetchMock.mockResolvedValue(new Response('Not found', { status: 404 }));

    await expect(fetchGpxFile('V1', undefined, 'bruz-sud')).rejects.toThrow(/V1/);
  });
});
