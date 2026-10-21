# Extraction des inscriptions — Suivi des parcours

Le script `extract-inscriptions.ts` lit les inscriptions de l'Édition en cours
dans le KV (Upstash) via son API REST, et génère les **feuilles de suivi** en
PDF : une par Zone et par type de parcours, dans un sous-dossier par Zone :

```
scripts/output/inscriptions/<année>/<zoneId>/Suivi_parcours_a_velo.pdf
scripts/output/inscriptions/<année>/<zoneId>/Suivi_parcours_a_pied.pdf
```

Chaque feuille reprend le gabarit des anciennes feuilles publiées par le site
(`public/pdf/<zone>/Suivi_parcours_a_*.pdf`, retirées depuis) : le titre de la
Zone, puis sous-titre « Édition <année> - <date de l'action> », le tableau des
Parcours avec les deux colonnes « Prénom NOM » — **renseignées avec les Binômes
inscrits** — puis les colonnes de pesée (Ordures / Tri / Verre) et le tableau
des totaux, à remplir le jour de l'action.

Les feuilles contiennent des données personnelles : elles sont écrites dans un
dossier **gitignoré**, jamais versionnées, jamais publiées ni déployées.

- **Qui** : le référent de l'association (accès au tableau de bord Upstash et à
  ce dépôt).
- **Quand** : avant l'action annuelle, quand les inscriptions sont assez
  complètes — relancer le script en rafraîchissant les fiches à chaque vague
  d'inscriptions (chaque exécution réécrit les fichiers de la sortie).
- **Où** : dans un dossier local gitignoré, **jamais publié** :
  `scripts/output/inscriptions/<année>/<zoneId>/` par défaut, surchargeable
  avec `--out-dir`. Les feuilles contiennent des données personnelles : elles
  ne doivent **jamais** être committées, copiées sous `public/` ni déployées
  avec le site.

## Prérequis

- [Bun](https://bun.sh) pour exécuter le script (le runtime charge aussi le
  fichier `.env.local`, voir ci-dessous).
- Dans `apps/clean/.env.local` :
  `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN` — les mêmes variables
  que celles de l'API sur Vercel (elles ne sont jamais committées dans le dépôt).
  Le script s'exécute depuis `apps/clean` : Bun charge `.env.local`
  automatiquement.
- Le jeton doit être un **jeton standard** : les jetons en lecture seule
  ne peuvent pas exécuter le SCAN nécessaire à l'extraction.

La configuration de l'Édition (année et date de l'action) vient de
[`../src/app/inscriptions/edition.ts`](../src/app/inscriptions/edition.ts)
(`CURRENT_EDITION`) : le script extraie toujours l'Édition configurée.

## Lancer l'extraction

```sh
cd apps/clean
bun scripts/extract-inscriptions.ts                       # Édition configurée, sortie par défaut
bun scripts/extract-inscriptions.ts --out-dir=/tmp/fiches  # autre dossier de sortie
```

Sortie par défaut : `apps/clean/scripts/output/inscriptions/<année>/<zoneId>/`,
avec une feuille par Zone et par type de parcours qui a des parcours :

| Cas                               | Fichiers générés                                                                         |
| --------------------------------- | ---------------------------------------------------------------------------------------- |
| Zone avec des parcours            | `Suivi_parcours_a_velo.pdf` et/ou `Suivi_parcours_a_pied.pdf` (un sous-dossier par Zone) |
| Parcours inscrit                  | Les deux colonnes « Prénom NOM » de la ligne sont renseignées                            |
| Parcours libre                    | Les deux colonnes restent vides                                                          |
| Aucune inscription pour l'Édition | Les feuilles sont générées **vides** (elles servent de support de pesée)                 |

Le récapitulatif de la console (nombre d'inscriptions, clés ignorées, chemins)
n'affiche **jamais** de valeur stockée ni de nom : les données personnelles ne
sortent pas du KV. Les entrées inutilisables (valeur JSON illisible, Binôme
incomplet, clé de format inattendu) sont ignorées avec un avertissement nommant
la clé ; le script poursuit sans elles.

## Désistement d'un binôme

Supprimer la clé `inscriptions:<année>:<zoneId>:<parcours>` (ex.
`inscriptions:2027:bruz-sud:V1`) d'une inscription depuis la console Upstash
(<https://console.upstash.com>) : onglet **Data Browser** de la base REST,
rechercher la clé, **Delete**. Le parcours redevient disponible sur le site et
la prochaine extraction ne le liste plus dans la feuille ; aucun outil
d'administration spécifique n'existe pour cette opération rare.

## Expiration automatique (à la création de chaque clé)

Chaque clé est créée avec une durée de vie de **90 jours après la date de
l'action de l'Édition** (TTL posé par l'API au moment de l'inscription, fuseau
Europe/Paris — cohérent avec la notice RGPD affichée dans le formulaire). La
suppression des prénoms et noms est donc automatique : **rien à exécuter**, ni
cron ni purge manuelle, et un changement d'année dans `CURRENT_EDITION` suffit
à repartir d'une base vide.

## Qui fait quoi / quand

| Quand                                          | Qui        | Quoi                                                                                         |
| ---------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------- |
| À l'annonce de l'Édition                       | Mainteneur | Mettre à jour `year` et `actionDate` dans `src/app/inscriptions/edition.ts` (un seul commit) |
| Avant l'action (à chaque vague d'inscriptions) | Référent   | Régénérer et imprimer les feuilles de suivi (`bun scripts/extract-inscriptions.ts`)          |
| À tout moment                                  | Référent   | Traiter un désistement (supprimer la clé du parcours dans la console Upstash)                |
| 90 jours après la date de l'action             | —          | Rien : les clés (et les noms) expirent automatiquement du KV                                 |
