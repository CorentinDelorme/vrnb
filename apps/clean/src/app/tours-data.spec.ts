import { describe, expect, it } from 'vitest';

import { ALL_TOURS, findParcours } from './tours-queries';

describe('toursData', () => {
  it('should carry the Distance totale of the three Étapes for every Parcours', () => {
    expect(ALL_TOURS.length).toBe(47);

    for (const tour of ALL_TOURS) {
      const steps = tour.startDistance + tour.distance + tour.endDistance;
      // The sum of the three 0.1-km-rounded steps carries float noise
      // (0.1 + 1.1 + 1.1 reads 2.3000000000000003) — the emitted total
      // must stay the tenth-of-a-kilometre value.
      expect(tour.total, tour.name).toBeCloseTo(steps, 9);
      expect(Number.isInteger(tour.total * 10), tour.name).toBe(true);
      expect(Number.isFinite(tour.total), tour.name).toBe(true);
    }
  });

  it('should give known Parcours their known Distance totale', () => {
    expect(findParcours('bruz-sud', 'P1')?.total).toBe(2.3); // Début 0.1 + Nettoyage 1.1 + Fin 1.1
    expect(findParcours('bruz-ker-lann', 'V200')?.total).toBe(7.6); // Début 2.7 + Nettoyage 1.4 + Fin 3.5
  });
});
