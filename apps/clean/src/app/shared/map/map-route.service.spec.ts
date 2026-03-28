import { TestBed } from '@angular/core/testing';
import { MapRouteService } from './map-route.service';

describe('MapRouteService', () => {
  let service: MapRouteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapRouteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return default route style', () => {
    const style = service.getDefaultRouteStyle();
    expect(style.color).toBe('#0058ca');
    expect(style.weight).toBe(4);
    expect(style.dashArray).toBeUndefined();
  });

  it('should return dashed route style', () => {
    const style = service.getDashedRouteStyle();
    expect(style.color).toBe('#0058ca');
    expect(style.weight).toBe(4);
    expect(style.dashArray).toBe('10, 10');
  });

  it('should create a valid GeoJSON Feature from coordinates', () => {
    const coords = [
      [-1.746, 48.016],
      [-1.747, 48.017],
    ];
    const feature = service.createRouteLine(coords);

    expect(feature.type).toBe('Feature');
    expect(feature.geometry.type).toBe('LineString');
    if (feature.geometry.type === 'LineString') {
      expect(feature.geometry.coordinates).toEqual(coords);
    }
  });
});
