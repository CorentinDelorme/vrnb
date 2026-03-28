import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const rootDir = join(__dirname, '..');
const gpxDir = join(rootDir, 'public/gpx');
const outputFile = join(rootDir, 'src/app/tours-data.ts');

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseGpxDistance(gpxPath: string): number {
  if (!existsSync(gpxPath)) {
    return 0;
  }

  const content = readFileSync(gpxPath, 'utf-8');
  const parsedGpx = new DOMParser().parseFromString(content, 'application/xml');
  const geoJson = gpx(parsedGpx);
  const feature = geoJson.features[0];

  if (!feature || feature.geometry.type !== 'LineString') {
    return 0;
  }

  const coords = feature.geometry.coordinates;
  let totalDistance = 0;

  for (let i = 1; i < coords.length; i++) {
    const [lon1, lat1] = coords[i - 1];
    const [lon2, lat2] = coords[i];
    totalDistance += haversineDistance(lat1, lon1, lat2, lon2);
  }

  return Math.round(totalDistance * 10) / 10;
}

function getTours(
  prefix: string,
): { name: string; distance: number; startDistance: number; endDistance: number }[] {
  if (!existsSync(gpxDir)) {
    return [];
  }

  const folders = readdirSync(gpxDir).filter((f) => f.startsWith(prefix));
  return folders
    .map((tourId) => {
      const gpxPath = join(gpxDir, tourId, `${tourId}.gpx`);
      const startGpxPath = join(gpxDir, tourId, `${tourId}_start.gpx`);
      const endGpxPath = join(gpxDir, tourId, `${tourId}_end.gpx`);

      const distance = parseGpxDistance(gpxPath);
      const startDistance = parseGpxDistance(startGpxPath);
      const endDistance = parseGpxDistance(endGpxPath);

      return {
        name: tourId,
        distance,
        startDistance,
        endDistance,
      };
    })
    .sort((a, b) => {
      const numA = parseInt(a.name.slice(1));
      const numB = parseInt(b.name.slice(1));
      return numA - numB;
    });
}

const vTours = getTours('V');
const pTours = getTours('P');

const content = `// Auto-generated from public/gpx folder
export const toursData = {
  vTours: ${JSON.stringify(vTours, null, 2).replace(/"/g, "'")},
  pTours: ${JSON.stringify(pTours, null, 2).replace(/"/g, "'")},
};
`;

writeFileSync(outputFile, content);
console.log(`Generated tours data: ${vTours.length} bike tours, ${pTours.length} walking tours`);
