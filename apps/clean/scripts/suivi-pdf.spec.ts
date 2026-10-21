import { describe, expect, it } from 'vitest';

import type { SuiviSheet } from './inscriptions-extract';
import { renderSuiviSheetPdf } from './suivi-pdf';

/**
 * PDF renderer of the « Suivi » sheets: the printed tracking sheet, with the
 * binômes of the registered Parcours in the two name columns. The bytes are
 * decoded as Latin-1 (jsPDF writes an uncompressed content stream), so the
 * text of the sheet can be asserted.
 */
const SHEET: SuiviSheet = {
  edition: { actionDate: '2027-02-14', year: 2027 },
  fileName: 'Suivi_parcours_a_velo.pdf',
  practice: 'V',
  rows: [
    { member1: 'Léa DUPONT', member2: 'Yann TANGUY', tourId: 'V1' },
    { member1: '', member2: '', tourId: 'V2' },
  ],
  zoneId: 'bruz-sud',
  zoneName: 'Bruz Sud',
};

describe('renderSuiviSheetPdf', () => {
  it('should render a real PDF document', () => {
    const bytes = renderSuiviSheetPdf(SHEET);
    expect(bytes.byteLength).toBeGreaterThan(1000);
    expect(Buffer.from(bytes).subarray(0, 4).toString('latin1')).toBe('%PDF');
  });

  it('should carry the Zone title and the binôme of the registered Parcours', () => {
    const text = Buffer.from(renderSuiviSheetPdf(SHEET)).toString('latin1');
    expect(text).toContain('Bruz Sud - Suivi des parcours');
    expect(text).toContain('V1');
    expect(text).toContain('Léa DUPONT');
    expect(text).toContain('Yann TANGUY');
    // The columns of the printed sheet (the weights are filled on the day).
    // The parentheses are escaped in the PDF content stream, so the labels
    // are asserted without them.
    expect(text).toContain('Ordures');
    expect(text).toContain('Verre');
    expect(text).toContain('Prénom NOM');
  });

  it('should tell which Édition it belongs to, above the sheet title', () => {
    const text = Buffer.from(renderSuiviSheetPdf(SHEET)).toString('latin1');
    expect(text).toContain('Édition 2027 du dimanche 14 février 2027');
    // The Édition line comes before the Zone title, and no retention footer
    // is printed anymore.
    expect(text.indexOf('Édition 2027 du dimanche 14 février 2027')).toBeLessThan(
      text.indexOf('Bruz Sud - Suivi des parcours'),
    );
    expect(text).not.toContain('90 jours');
  });
});
