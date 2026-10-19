import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildTourGeoJsonAsset,
  fetchTourGeoJsonSet,
  fetchTourRouteGeoJson,
  getLineCoordinates,
  parseTourGeoJsonAsset,
} from './tour-geojson';

const START_LINE = {
  type: 'Feature' as const,
  properties: { name: 'V1_start' },
  geometry: {
    type: 'LineString' as const,
    coordinates: [
      [-1.747083, 48.024417],
      [-1.746, 48.016],
    ],
  },
};

const TOUR_LINE = {
  type: 'Feature' as const,
  properties: { name: 'Parcours V1' },
  geometry: {
    type: 'LineString' as const,
    coordinates: [
      [-1.746, 48.016],
      [-1.748, 48.018],
    ],
  },
};

const END_LINE = {
  type: 'Feature' as const,
  properties: { name: 'V1_end' },
  geometry: {
    type: 'LineString' as const,
    coordinates: [
      [-1.748, 48.018],
      [-1.747083, 48.024417],
    ],
  },
};

describe('buildTourGeoJsonAsset', () => {
  it('should tag each segment features with its role', () => {
    const asset = buildTourGeoJsonAsset({
      start: { type: 'FeatureCollection', features: [START_LINE] },
      tour: { type: 'FeatureCollection', features: [TOUR_LINE] },
      end: { type: 'FeatureCollection', features: [END_LINE] },
    });

    expect(asset.type).toBe('FeatureCollection');
    expect(asset.features.map((f) => f.properties?.['role'])).toEqual(['start', 'tour', 'end']);
  });

  it('should preserve original feature properties and geometry', () => {
    const asset = buildTourGeoJsonAsset({
      tour: { type: 'FeatureCollection', features: [TOUR_LINE] },
    });

    const feature = asset.features[0];
    expect(feature.properties?.['name']).toBe('Parcours V1');
    expect(feature.geometry).toEqual(TOUR_LINE.geometry);
  });

  it('should keep every feature of a segment and skip absent segments', () => {
    const waypoint = {
      type: 'Feature' as const,
      properties: { name: 'waypoint' },
      geometry: { type: 'Point' as const, coordinates: [-1.746, 48.016] },
    };

    const asset = buildTourGeoJsonAsset({
      start: { type: 'FeatureCollection', features: [START_LINE, waypoint] },
    });

    expect(asset.features.map((f) => f.properties?.['role'])).toEqual(['start', 'start']);
    expect(asset.features[1].geometry?.type).toBe('Point');
  });
});

describe('parseTourGeoJsonAsset', () => {
  it('should rebuild the segment set from a built asset', () => {
    const asset = buildTourGeoJsonAsset({
      start: { type: 'FeatureCollection', features: [START_LINE] },
      tour: { type: 'FeatureCollection', features: [TOUR_LINE] },
      end: { type: 'FeatureCollection', features: [END_LINE] },
    });

    const set = parseTourGeoJsonAsset(asset);

    expect(set).not.toBeNull();
    expect(set!.start.features).toEqual([
      expect.objectContaining({ properties: expect.objectContaining({ role: 'start' }) }),
    ]);
    expect(set!.tour.features[0].geometry).toEqual(TOUR_LINE.geometry);
    expect(set!.end.features[0].geometry).toEqual(END_LINE.geometry);
  });

  it('should yield empty collections for absent segments', () => {
    const asset = buildTourGeoJsonAsset({
      tour: { type: 'FeatureCollection', features: [TOUR_LINE] },
    });

    const set = parseTourGeoJsonAsset(asset);

    expect(set!.start.features).toEqual([]);
    expect(set!.tour.features.length).toBe(1);
    expect(set!.end.features).toEqual([]);
  });

  it('should ignore features without a known role', () => {
    const asset = {
      type: 'FeatureCollection' as const,
      features: [
        { ...TOUR_LINE, properties: { ...TOUR_LINE.properties, role: 'tour' } },
        { ...START_LINE, properties: { name: 'V1_start' } },
      ],
    };

    const set = parseTourGeoJsonAsset(asset);

    expect(set!.tour.features.length).toBe(1);
    expect(set!.start.features).toEqual([]);
  });

  it('should return null when the payload is not a FeatureCollection', () => {
    expect(parseTourGeoJsonAsset(null)).toBeNull();
    expect(parseTourGeoJsonAsset({ type: 'Feature' })).toBeNull();
    expect(parseTourGeoJsonAsset({ type: 'FeatureCollection', features: 'nope' })).toBeNull();
  });
});

describe('fetchTourGeoJsonSet', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('should load the zone-scoped asset', async () => {
    const asset = buildTourGeoJsonAsset({
      tour: { type: 'FeatureCollection', features: [TOUR_LINE] },
    });
    fetchMock.mockResolvedValue(new Response(JSON.stringify(asset), { status: 200 }));

    const set = await fetchTourGeoJsonSet('V1', 'bruz-sud');

    expect(set).not.toBeNull();
    expect(set!.tour.features.length).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('/geojson/bruz-sud/V1.geojson');
  });

  it('should fall back to the legacy flat layout when the zone-scoped asset is missing', async () => {
    const asset = buildTourGeoJsonAsset({
      tour: { type: 'FeatureCollection', features: [TOUR_LINE] },
    });
    fetchMock
      .mockResolvedValueOnce(new Response('Not found', { status: 404 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(asset), { status: 200 }));

    const set = await fetchTourGeoJsonSet('V1', 'bruz-sud');

    expect(set).not.toBeNull();
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/geojson/bruz-sud/V1.geojson');
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/geojson/V1.geojson');
  });

  it('should return null when no asset exists so callers can fall back to GPX', async () => {
    fetchMock.mockResolvedValue(new Response('Not found', { status: 404 }));

    const set = await fetchTourGeoJsonSet('V1', 'bruz-sud');

    expect(set).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('should default to the default zone', async () => {
    fetchMock.mockResolvedValue(new Response('Not found', { status: 404 }));

    await fetchTourGeoJsonSet('V1');

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/geojson/bruz-sud/V1.geojson');
  });

  it('should throw when the asset exists but is not a FeatureCollection', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ broken: true }), { status: 200 }));

    await expect(fetchTourGeoJsonSet('V1', 'bruz-sud')).rejects.toThrow(
      /Invalid tour GeoJSON asset/,
    );
  });
});

describe('fetchTourRouteGeoJson', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('should return only the tour-route features', async () => {
    const asset = buildTourGeoJsonAsset({
      start: { type: 'FeatureCollection', features: [START_LINE] },
      tour: { type: 'FeatureCollection', features: [TOUR_LINE] },
      end: { type: 'FeatureCollection', features: [END_LINE] },
    });
    fetchMock.mockResolvedValue(new Response(JSON.stringify(asset), { status: 200 }));

    const route = await fetchTourRouteGeoJson('V1', 'bruz-sud');

    expect(route).not.toBeNull();
    expect(route!.features.length).toBe(1);
    expect(route!.features[0].geometry).toEqual(TOUR_LINE.geometry);
  });

  it('should return null when no asset exists', async () => {
    fetchMock.mockResolvedValue(new Response('Not found', { status: 404 }));

    expect(await fetchTourRouteGeoJson('V1', 'bruz-sud')).toBeNull();
  });

  it('should return null when the asset holds no tour-route feature', async () => {
    const asset = buildTourGeoJsonAsset({
      end: { type: 'FeatureCollection', features: [END_LINE] },
    });
    fetchMock.mockResolvedValue(new Response(JSON.stringify(asset), { status: 200 }));

    expect(await fetchTourRouteGeoJson('V1', 'bruz-sud')).toBeNull();
  });
});

describe('getLineCoordinates', () => {
  it('should return the coordinates of the first LineString feature', () => {
    const collection = {
      type: 'FeatureCollection' as const,
      features: [TOUR_LINE],
    };

    expect(getLineCoordinates(collection)).toEqual(TOUR_LINE.geometry.coordinates);
  });

  it('should skip non-LineString features', () => {
    const waypoint = {
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'Point' as const, coordinates: [-1.746, 48.016] },
    };
    const collection = {
      type: 'FeatureCollection' as const,
      features: [waypoint, TOUR_LINE],
    };

    expect(getLineCoordinates(collection)).toEqual(TOUR_LINE.geometry.coordinates);
  });

  it('should return an empty array when there is no LineString', () => {
    const collection = { type: 'FeatureCollection' as const, features: [] };

    expect(getLineCoordinates(collection)).toEqual([]);
  });
});
