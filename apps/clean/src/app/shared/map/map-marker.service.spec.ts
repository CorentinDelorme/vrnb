import { TestBed } from '@angular/core/testing';
import { MapMarkerService } from './map-marker.service';

describe('MapMarkerService', () => {
  let service: MapMarkerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapMarkerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
