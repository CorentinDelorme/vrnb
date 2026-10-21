/**
 * PDF renderer of the « Suivi » sheets — the printed tracking sheets of a Zone,
 * with the binômes of the registered Parcours filled in.
 *
 * The layout is the one the site used to publish (the `Suivi_parcours_a_*.pdf`
 * files of `public/pdf/<zone>/`): a table of the Zone's Parcours with the two
 * members of their binôme, the weight columns to fill on the day, and the
 * totals. The files are written outside `public/` (never deployed) and in a
 * gitignored folder: they carry the volunteers' names.
 */
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { formatActionDateLabel } from '../src/app/inscriptions/edition';
import type { SuiviSheet } from './inscriptions-extract';

/** jsPDF with the autoTable plugin, as the PDF generation script uses it. */
type AutoTableDoc = jsPDF & { lastAutoTable: { finalY: number } };

/** Title of the sheet: the Zone and the practice type, as before. */
function sheetTitle(sheet: SuiviSheet): string {
  return sheet.practice === 'V'
    ? `${sheet.zoneName} - Suivi des parcours à vélo`
    : `${sheet.zoneName} - Suivi des parcours à pied`;
}

/**
 * Render one sheet as a PDF. The bytes are returned instead of being written:
 * the filesystem stays in the CLI adapter.
 */
export function renderSuiviSheetPdf(sheet: SuiviSheet): Uint8Array {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(sheetTitle(sheet), 14, 16);

  // The Édition line sits under the sheet title: « Édition 2027 - dimanche
  // 14 février 2027 ».
  doc.setFontSize(11);
  doc.text(
    `Édition ${sheet.edition.year} - ${formatActionDateLabel(sheet.edition.actionDate)}`,
    14,
    27,
  );

  autoTable(doc, {
    body: sheet.rows.map((row) => [row.tourId, row.member1, row.member2, '', '', '']),
    columnStyles: {
      0: { cellWidth: 20 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
    },
    head: [['Parcours', 'Prénom NOM', 'Prénom NOM', 'Ordures (g)', 'Tri (g)', 'Verre (g)']],
    headStyles: { fillColor: [66, 135, 75] },
    startY: 38,
    theme: 'grid',
  });

  autoTable(doc, {
    body: [['', '', '', '']],
    head: [['Ordures (kg)', 'Tri (kg)', 'Verre (kg)', 'Total (kg)']],
    headStyles: { fillColor: [66, 135, 75] },
    startY: (doc as AutoTableDoc).lastAutoTable.finalY + 8,
    theme: 'grid',
  });

  return new Uint8Array(doc.output('arraybuffer'));
}
