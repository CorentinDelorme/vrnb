# Tracer les parcours et ajouter une Zone ou un Parcours

Les traces GPX des Parcours sont dessinées à la main dans
[GPX Studio](https://gpx.studio/fr/app#14.65/48.02528/-1.74699), puis déposées
dans `public/gpx/<zone>/<parcours>/<parcours>.gpx`. Tout le reste — segments de
début et de fin, catalogue des Parcours, GeoJSON précalculé, Fiches et Fiches
de zone — est produit par la pipeline de génération (voir
[docs/generation.md](./generation.md)).

Le vocabulaire métier (Parcours, Zone, Type de parcours, Point de rendez-vous…) est
défini dans [../GLOSSARY.md](../GLOSSARY.md).

## Tracer un parcours avec GPX Studio

[GPX Studio](https://gpx.studio/fr/app#14.65/48.02528/-1.74699) est un éditeur
de fichiers GPX en ligne : sans compte, sans installation, tout se passe dans
le navigateur. Le lien ci-dessus ouvre la carte déjà centrée sur Bruz, il suffit de déplacer la carte
pour centrer la vue sur un autre endroit.

1. **Créer un GPX** — premier bouton « Planifier ou modifier un itinéraire » (`crayon`) dans le menu de gauche,
   ou cliquez directement sur la carte pour commencer un tracé.
2. **Placer les points** — cliquez sur la carte pour poser les points du
   parcours. Le mode « routage » (magnétisme) colle les points sur les
   chemins ; `F5` bascule en mode « vol d'oiseau » (segments en ligne droite),
   pour les portions hors-piste (sentiers, chemins agricoles).
3. **Ajuster le tracé** — glissez un point pour le déplacer, cliquez-droit
   dessus pour le supprimer ou le scinder ; `Ctrl+Z` annule la dernière action.
4. **Exporter** — bouton « Exporter » (`Ctrl+S`), format GPX : le fichier
   `.gpx` est téléchargé.

Le fichier exporté contient une trace (`<trk>`) : c'est elle que la pipeline
lit. Les points d'intérêt (`<wpt>`) sont ignorés.

## Ajouter un Parcours à une Zone existante

Le nom d'un Parcours est son type de pratique suivi d'un numéro : `P` pour à
pied, `V` à vélo (`P2`, `V16`). Le numéro doit être unique.

Deux méthodes sont disponibles :

### Méthode recommandée : page d'import (développement uniquement)

La page `/admin/import-parcours` permet d'importer plusieurs Parcours en une
seule action depuis l'interface, sans manipuler les fichiers ni lancer les
scripts à la main. Elle n'est accessible qu'en environnement local
(`NODE_ENV === 'development'`) : en production, toute tentative d'accès
retourne une 404.

1. **Tracer et exporter** chaque parcours dans GPX Studio (voir ci-dessus).
2. Ouvrir [http://localhost:4200/admin/import-parcours](http://localhost:4200/admin/import-parcours).
3. Choisir la **Zone** dans la liste déroulante.
4. Choisir le **type de pratique** (À pied P / À vélo V).
5. Sélectionner plusieurs fichiers `.gpx` à la fois via l'input file.
6. Cliquer sur **Importer**.

Le système attribue alors automatiquement le prochain identifiant libre par
lettre dans la zone choisie (par exemple `V16`, `P14`), écrit chaque fichier
dans `public/gpx/<zone>/<id>/<id>.gpx`, puis lance les scripts de génération
(routes, données, fiches) et affiche un résumé (fichiers importés, IDs
attribués, succès/échec par Parcours) avec les logs détaillés dépliables.

Le Parcours apparaît immédiatement sur l'accueil, dans l'accordéon de sa Zone,
après un rechargement de la page.

### Méthode manuelle (développeurs)

Pour ajouter un Parcours sans passer par la page d'import :

1. **Tracer et exporter** le parcours dans GPX Studio (voir ci-dessus).
2. **Déposer la trace** dans `public/gpx/<zone>/<parcours>/<parcours>.gpx` : le
   dossier porte le nom du Parcours, le fichier porte le même nom.

   ```text
   public/gpx/bruz-sud/V16/V16.gpx
   ```

   Seul le fichier `<parcours>.gpx` est à poser : les segments de début et de
   fin (`<parcours>_start.gpx`, `<parcours>_end.gpx`) sont calculés par la
   pipeline, depuis le Point de rendez-vous de la Zone.

3. **Régénérer** :

   ```sh
   bun run generate:one -- --tour=V16 --zone=bruz-sud
   ```

   La commande route les segments de début et de fin, met à jour le catalogue
   `src/app/tours-data.ts` et le GeoJSON précalculé
   (`public/geojson/bruz-sud/V16.geojson`), puis rend la Fiche du Parcours
   (`public/pdf/bruz-sud/V16.pdf`) et la Fiche de zone.

Le Parcours apparaît alors sur l'accueil, dans l'accordéon de sa Zone. Un
Parcours absent de l'état de génération est toujours re-routé : c'est le
premier run qui décide de son sort.

## Ajouter une nouvelle Zone

1. **Tracer et exporter** les Parcours de la Zone dans GPX Studio.
2. **Déclarer la Zone** dans `src/app/zones.ts` : un identifiant (slug en
   minuscules, séparé par des tirets), un nom affiché et le Point de
   rendez-vous de la Zone — les coordonnées sont au format
   `[longitude, latitude]`.

   ```ts
   {
     id: 'bruz-nord',
     name: 'Bruz Nord',
     meetingPoint: {
       name: 'Place du Dr Joly',
       coordinates: [-1.747083, 48.024417],
     },
   }
   ```

   L'identifiant ne doit pas ressembler à un nom de Parcours (`^[VP]\d+$`) :
   un tel dossier serait pris pour un Parcours de la Zone par défaut. Sans
   cette déclaration, la Zone n'apparaît pas sur l'accueil et ses Parcours
   seraient routés depuis le Point de rendez-vous de la Zone par défaut.

3. **Déposer les traces** dans `public/gpx/<zone>/<parcours>/<parcours>.gpx`,
   une par Parcours de la Zone.
4. **Régénérer** :

   ```sh
   bun run generate:all
   ```

   `bun run generate:one -- --zone=bruz-nord` ne touche qu'à la Zone et suffit
   quand elle ne contient que des Parcours neufs.

La Zone apparaît alors sur l'accueil, avec ses Parcours à vélo et à pied, et
sa Fiche de zone (`public/pdf/bruz-nord/Carte_parcours_a_velo.pdf`) est
publiée comme les autres.
