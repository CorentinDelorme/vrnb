import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { join } from 'path';
import { toursData } from '../src/app/tours-data';

const rootDir = join(__dirname, '..');
const pdfDir = join(rootDir, 'public/pdf');

function generatePdf(tours: string[], title: string, filename: string): void {
  const doc = new jsPDF();

  doc.setFontSize(18);
  doc.text(title, 14, 20);

  autoTable(doc, {
    startY: 30,
    head: [['Parcours', 'Prénom NOM', 'Prénom NOM', 'Ordures (g)', 'Tri (g)', 'Verre (g)']],
    body: tours.map((tour) => [tour, '', '', '', '', '']),
    theme: 'grid',
    headStyles: { fillColor: [66, 135, 75] },
    columnStyles: {
      0: { cellWidth: 20 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
    },
  });

  autoTable(doc, {
    startY: (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15,
    head: [['Ordures (kg)', 'Tri (kg)', 'Verre (kg)', 'Total (kg)']],
    body: [['', '', '', '']],
    theme: 'grid',
    headStyles: { fillColor: [66, 135, 75] },
  });

  const outputPath = join(pdfDir, filename);
  doc.save(outputPath);
  console.log(`Generated: ${outputPath}`);
}

const vTours = toursData.vTours.map((t) => t.name);
const pTours = toursData.pTours.map((t) => t.name);

generatePdf(vTours, 'Feuille de suivi des parcours à vélo', 'Suivi_parcours_a_velo.pdf');
generatePdf(pTours, 'Feuille de suivi des parcours à pied', 'Suivi_parcours_a_pied.pdf');
