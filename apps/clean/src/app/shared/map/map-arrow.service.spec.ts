import { TestBed } from '@angular/core/testing';
import { MapArrowService } from './map-arrow.service';

describe('MapArrowService', () => {
  let service: MapArrowService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapArrowService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('computeFrequency', () => {
    it('should return 125 for distances under 1km', () => {
      expect(service.computeFrequency(0.5)).toBe(125);
      expect(service.computeFrequency(0.9)).toBe(125);
    });

    it('should return 200 for distances between 1km and 1.5km', () => {
      expect(service.computeFrequency(1.0)).toBe(200);
      expect(service.computeFrequency(1.4)).toBe(200);
    });

    it('should return 250 for distances between 1.5km and 2km', () => {
      expect(service.computeFrequency(1.5)).toBe(250);
      expect(service.computeFrequency(1.9)).toBe(250);
    });

    it('should return 300 for distances 2km and above', () => {
      expect(service.computeFrequency(2.0)).toBe(300);
      expect(service.computeFrequency(5.0)).toBe(300);
    });
  });
});
