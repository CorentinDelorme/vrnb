# Inscriptions des binômes

Pour chaque **Édition** (voir [../GLOSSARY.md](../GLOSSARY.md)), un **Binôme**
couvre un **Parcours** : une seule inscription par (Parcours, Édition),
attribuée au premier arrivé. Les prénoms et les noms ne sont jamais publics —
le site n'expose que les couples (Zone, Parcours) déjà couverts, sous forme de
badge « Binôme inscrit » placé là où se trouvait le bouton d'inscription.

L'inscription se fait depuis la page d'accueil (bouton « S'inscrire » à côté du
bouton de lecture du parcours), via les endpoints de l'API :

- `GET /api/inscriptions` — l'état public de l'Édition : l'Édition complète
  (l'année, la date de l'action, la date d'ouverture des inscriptions, les
  heures de l'action), l'ouverture de la fenêtre (`registrationOpen`) et la
  liste des Parcours couverts (**200**) ; si le KV est injoignable, la réponse
  est un **502** `{"error":"inscriptions-unavailable"}` ;
- `POST /api/inscriptions` — l'inscription d'un binôme sur un Parcours (les
  deux membres et l'engagement à participer ensemble). Le refus est un **400**
  portant l'une des trois causes : `invalid-inscription` (saisie invalide),
  `registration-not-open` (avant la date d'ouverture de l'Édition) ou
  `registration-closed` (après la fermeture, 3 jours avant l'action) ; un
  **409** quand un autre binôme a couvert le Parcours entre-temps, et rien
  n'est stocké sur aucun refus ;
- `GET /api/calendrier/<zone>/<parcours>` — le fichier calendrier (.ics) de
  l'action du couple (Zone, Parcours) : **200** `text/calendar` avec un nom de
  fichier explicite (`calendrier-<zone>-<parcours>.ics`), **404** sans fichier
  si le couple est inconnu du catalogue. Cette route ne touche pas au KV : le
  fichier ne contient aucune donnée personnelle.

À la confirmation d'une inscription, le formulaire affiche les deux liens
agenda du Parcours — « Google Agenda » (ouvre un nouvel onglet) et « Fichier
calendrier (.ics) » (le fichier ci-dessus) — et uniquement là : ils
n'existent sur aucune autre page du site.

Aucun de ces endpoints ne renvoie de nom : ils exposent uniquement les couples
(Zone, Parcours). Les noms restent dans le KV et ne sont lus que par le script
d'extraction local, décrit plus bas.

C'est la **clé** du KV qui couvre un Parcours, pas la valeur stockée : une clé
créée manuellement dans la console Upstash compte donc aussi, et le Parcours
correspondant apparaît sur le site sous forme de badge « Binôme inscrit ».

## Variables d'environnement du KV

Les inscriptions ne sont pas dans une base de données : elles sont stockées dans
un KV distant (Upstash, API REST). Deux variables d'environnement sont
nécessaires — **les noms seulement, les valeurs ne sont jamais versionnées** :

| Variable                   | Rôle                           |
| -------------------------- | ------------------------------ |
| `UPSTASH_REDIS_REST_URL`   | URL de l'API REST du KV        |
| `UPSTASH_REDIS_REST_TOKEN` | Jeton d'authentification du KV |

Elles doivent être renseignées à deux endroits :

- **sur Vercel**, dans les variables d'environnement du projet, pour que l'API
  déployé puisse lire et écrire les inscriptions ;
- **en local**, dans `apps/clean/.env.local` — ce fichier est chargé
  automatiquement, par Bun pour le script d'extraction (lancé depuis
  `apps/clean/`) et par Next.js pour le serveur de développement. Il n'est
  jamais committé.

Le jeton doit être un **jeton standard** Upstash : les jetons en lecture seule
ne peuvent pas exécuter le `SCAN` nécessaire à l'extraction.

## Extraire les feuilles de suivi (avant l'action)

Les prénoms et les noms ne quittent le KV que par le script d'extraction local,
qui écrit les **feuilles de suivi** en PDF : une par Zone et par type de
parcours, avec les deux colonnes « Prénom NOM » renseignées par les Binômes
inscrits (les colonnes de pesée se remplissent le jour de l'action).

```sh
# depuis apps/clean/
bun scripts/extract-inscriptions.ts                       # Édition configurée, sortie par défaut
bun scripts/extract-inscriptions.ts --out-dir=/tmp/fiches  # autre dossier de sortie
```

Par défaut, les feuilles sont écrites dans
`scripts/output/inscriptions/<année>/<zoneId>/` : un dossier gitignoré,
**jamais commité, publié ni déployé** (elles contiennent des données
personnelles). C'est la seule source des feuilles de suivi : les anciennes
feuilles blanches `Suivi_parcours_a_*.pdf` de `public/pdf/` ont été retirées,
et le lien « Télécharger le PDF de suivi » a été retiré du menu.

Le runbook complet — format des fichiers, cas particuliers, exemple de
désistement — est dans
[../scripts/README-inscriptions-extract.md](../scripts/README-inscriptions-extract.md).

## Opérations humaines

| Quand                                         | Qui        | Quoi                                                                                                                                                                                                      |
| --------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| À l'annonce de l'Édition                      | Mainteneur | Mettre à jour `CURRENT_EDITION` dans `src/app/inscriptions/edition.ts`, sa forme complète : `year`, `actionDate`, `inscriptionsOpenDate`, `actionStartTime`, `actionEndTime` (un seul commit)             |
| Avant la date d'ouverture de l'Édition        | —          | Rien : la fenêtre n'est pas encore ouverte — l'accueil n'affiche pas de bouton « S'inscrire » (il annonce la date d'ouverture à la place) et l'API refuse chaque inscription avec `registration-not-open` |
| 3 jours avant la date de l'action             | —          | Rien : la fenêtre d'inscription se ferme d'elle-même (`REGISTRATION_CLOSURE_DAYS = 3`) et le bouton « S'inscrire » disparaît de l'accueil, le temps d'imprimer les fiches et d'organiser la journée       |
| Avant l'action, à chaque vague d'inscriptions | Référent   | Régénérer et imprimer les fiches de suivi (`bun scripts/extract-inscriptions.ts`)                                                                                                                         |
| À tout moment (désistement)                   | Référent   | Supprimer la clé `inscriptions:<année>:<zoneId>:<parcours>` dans la console Upstash : le parcours redevient disponible                                                                                    |
| 90 jours après la date de l'action            | —          | Rien : les clés expirent automatiquement du KV                                                                                                                                                            |

Il n'existe aucun outil d'administration sur le site : un désistement se traite
directement dans la console Upstash (onglet **Data Browser** de la base REST,
rechercher la clé, **Delete**).

## Expiration automatique

Chaque clé d'inscription est créée avec une durée de vie (TTL) calculée **au
moment de l'inscription** : la date de l'action + 90 jours
(`INSCRIPTIONS_RETENTION_DAYS = 90`), fuseau Europe/Paris. Les prénoms et les
noms sont donc effacés d'eux-mêmes : **rien à lancer**, ni cron ni purge
manuelle. C'est également ce que rappelle la notice RGPD du formulaire
d'inscription.

## Rotation annuelle de l'Édition

`src/app/inscriptions/edition.ts` (`CURRENT_EDITION`) est le **point de bascule
unique** de l'année : la forme complète de l'Édition — `year` (le nom de
l'Édition), `actionDate` (le jour de l'action), `inscriptionsOpenDate` (la date
d'ouverture des inscriptions) et `actionStartTime` / `actionEndTime` (les
heures de l'action, de `09:00` à `12:00`). Les clés du KV sont indexées par année
(`inscriptions:<année>:…`) : la nouvelle Édition repart donc d'une liste de
Parcours couverts vide, sans aucune autre opération — un seul commit déplace
tout le basculement, les dates et heures annoncées par le site comme les dates
des fichiers calendrier (.ics).
