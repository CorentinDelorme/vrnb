import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { GpxService } from './gpx.service';

describe('GpxService', () => {
  let service: GpxService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(GpxService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have null geoJson initially', () => {
    expect(service.geoJson()).toBeNull();
  });

  describe('getGeoJsonFromGpx', () => {
    it('should convert a valid GPX string to GeoJSON FeatureCollection', () => {
      const gpxStr = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1" creator="test">
          <trk>
            <trkseg>
              <trkpt lat="48.016" lon="-1.746"><ele>0</ele></trkpt>
              <trkpt lat="48.017" lon="-1.747"><ele>0</ele></trkpt>
            </trkseg>
          </trk>
        </gpx>`;

      const result = service.getGeoJsonFromGpx(gpxStr);

      expect(result.type).toBe('FeatureCollection');
      expect(result.features.length).toBeGreaterThan(0);
      expect(result.features[0].geometry.type).toBe('LineString');
    });
  });

  describe('getStartAndEndPointsFromGeoJson', () => {
    it('should return undefined when geoJson is null', () => {
      const geoJson = {
        type: 'FeatureCollection' as const,
        features: [],
      };
      expect(service.getStartAndEndPointsFromGeoJson(geoJson)).toBeUndefined();
    });

    it('should extract start and end points from LineString', () => {
      const gpxStr = `<?xml version="1.0" encoding="UTF-8"?>
        <gpx version="1.1" creator="test">
          <trk>
            <trkseg>
              <trkpt lat="48.016" lon="-1.746"><ele>0</ele></trkpt>
              <trkpt lat="48.017" lon="-1.747"><ele>0</ele></trkpt>
              <trkpt lat="48.018" lon="-1.748"><ele>0</ele></trkpt>
            </trkseg>
          </trk>
        </gpx>`;

      const geoJson = service.getGeoJsonFromGpx(gpxStr);
      const result = service.getStartAndEndPointsFromGeoJson(geoJson);

      expect(result).toBeDefined();
      expect(result!.start[0]).toBeCloseTo(-1.746);
      expect(result!.start[1]).toBeCloseTo(48.016);
      expect(result!.end[0]).toBeCloseTo(-1.748);
      expect(result!.end[1]).toBeCloseTo(48.018);
    });
  });
});
