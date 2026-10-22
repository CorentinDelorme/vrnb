/**
 * The vocabulary of the subjects of the `[perf]` recap (ticket #28).
 *
 * The referent reads the recap: every subject needs a French name, the
 * unit it counts and the decisions it announces. The generation scripts
 * own that vocabulary — the renderer of the block stays generic.
 *
 * Pure module: no import-time side effect, no console output.
 */

import type { PerfSubject } from './generation-perf';

/**
 * The segments of the Parcours: what the run re-routed, and what it left
 * alone.
 *
 * The element of the subject is a Parcours: the recap counts the Parcours
 * whose segments were re-routed.
 */
export const SEGMENTS_SUBJECT: PerfSubject = {
  id: 'segments',
  label: 'Segments',
  plural: 'segments',
  unit: { singular: 'Parcours', plural: 'Parcours' },
  changed: { singular: 're-routé', plural: 're-routés' },
  unchanged: { singular: 'ignoré', plural: 'ignorés' },
};

/**
 * The data of the Parcours: what the run updated, and what it left alone.
 *
 * The element of the subject is a Parcours: the recap counts the Parcours
 * whose data changed.
 */
export const DATA_SUBJECT: PerfSubject = {
  id: 'données',
  label: 'Données',
  plural: 'données',
  unit: { singular: 'Parcours', plural: 'Parcours' },
  changed: { singular: 'mise à jour', plural: 'mises à jour' },
  unchanged: { singular: 'inchangée', plural: 'inchangées' },
};

/**
 * The Fiches of the Parcours: what the run rendered again, and what it
 * left alone.
 */
export const FICHE_SUBJECT: PerfSubject = {
  id: 'fiche',
  label: 'Fiche',
  plural: 'Fiches',
  unit: { singular: 'Fiche', plural: 'Fiches' },
  changed: { singular: 'regénérée', plural: 'regénérées' },
  unchanged: { singular: 'ignorée', plural: 'ignorées' },
};

/**
 * The overview maps of the Zones: what the run rendered again, and what it
 * left alone.
 */
export const ZONE_MAP_SUBJECT: PerfSubject = {
  id: 'carte de zone',
  label: 'Carte de zone',
  plural: 'cartes de zone',
  unit: { singular: 'carte', plural: 'cartes' },
  changed: { singular: 'regénérée', plural: 'regénérées' },
  unchanged: { singular: 'ignorée', plural: 'ignorées' },
};

/**
 * The packs of the Zones: what the run wrote, and what it left alone.
 */
export const PACK_SUBJECT: PerfSubject = {
  id: 'pack',
  label: 'Pack',
  plural: 'packs',
  unit: { singular: 'pack', plural: 'packs' },
  changed: { singular: 'écrit', plural: 'écrits' },
  unchanged: { singular: 'réutilisé', plural: 'réutilisés' },
};

/**
 * The Fiches the packs reuse: the pack script renders no Fiche, it merges
 * the ones that are already published.
 *
 * The subject never announces a regenerated Fiche: both of its decisions
 * read « réutilisée ».
 */
export const REUSED_FICHE_SUBJECT: PerfSubject = {
  id: 'fiche-reutilisée',
  label: 'Fiche',
  plural: 'Fiches',
  unit: { singular: 'Fiche', plural: 'Fiches' },
  changed: { singular: 'réutilisée', plural: 'réutilisées' },
  unchanged: { singular: 'réutilisée', plural: 'réutilisées' },
};
