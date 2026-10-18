# Fiches de suivi des inscriptions

Le script `extract-inscriptions.ts` lit les inscriptions de l'année dans le KV
(Upstash) et génère une fiche de suivi PDF par zone et par type de parcours
(`Suivi_parcours_a_velo.pdf`, `Suivi_parcours_a_pied.pdf`), avec les binômes
inscrits et les parcours restés libres (lignes vides).

- **Qui** : le référent de l'association (accès au KV et à ce dépôt).
- **Quand** : avant l'action annuelle, quand les inscriptions sont assez complètes.
  Les parcours non inscrits restent sur les fiches pour les inscriptions de dernière minute.
- **Où** : dans un dossier local **jamais publié**, `scripts/output/inscriptions/<année>/` par défaut.

## Prérequis

- [Bun](https://bun.sh) (le script s'exécute avec le runtime bun).
- Dans `apps/clean/.env.local` : `UPSTASH_REDIS_REST_URL` et `UPSTASH_REDIS_REST_TOKEN`
  (ou les équivalents `KV_REST_API_URL` / `KV_REST_API_TOKEN` posés par l'intégration Vercel).
  Le script exige un **jeton standard** : les jetons en lecture seule ne peuvent pas exécuter `SCAN`.
  Voir [`../api/README.md`](../api/README.md) pour la mise en place du stockage KV.
- Bun charge `.env.local` automatiquement quand la commande est lancée depuis `apps/clean`.

## Lancer l'extraction

```sh
cd apps/clean
bun scripts/extract-inscriptions.ts                             # année de registration-config.ts, sortie par défaut
bun scripts/extract-inscriptions.ts --year=2027                 # forcer l'année
bun scripts/extract-inscriptions.ts --out-dir=/tmp/fiches-suivi # autre dossier de sortie
```

Sortie par défaut : `apps/clean/scripts/output/inscriptions/<année>/<zone>/Suivi_parcours_a_*.pdf`.

⚠️ Ce dossier est gitignoré et **ne doit jamais être copié dans `public/`** ni déployé :
les fiches contiennent des noms de bénévoles (données personnelles). La sortie du script
n'affiche que l'année, les compteurs et les chemins — jamais de noms.

## Runbook

### Désistement d'un binôme

Supprimer la clé `inscriptions:<année>:<zoneId>:<nomParcours>` (ex. `inscriptions:2027:bruz-sud:V1`)
depuis la console Upstash ou l'onglet Storage → Database du tableau de bord Vercel.
Le parcours redevient disponible sur le site ; aucun outil d'administration n'existe pour
cette opération rare.

### Purge annuelle (début janvier)

Supprimer toutes les clés `inscriptions:<année écoulée>:*` (ex. `inscriptions:2027:*` en
janvier 2028) depuis la console KV. Les clés sont volontairement **sans TTL** : l'échéance
est pilotée par l'association, pas par le stockage.

### Rétention des données

Les noms des binômes ne servent qu'aux fiches de suivi de l'édition en cours. Ils sont
supprimés au début de l'année suivante (purge ci-dessus) ; le changement d'année dans la
clé `inscriptions:<année>:...` suffit à remettre les inscriptions à zéro sur le site.

### Clés ignorées

Les clés non lisibles (valeur JSON invalide, contexte incohérent avec la clé, année
différente) sont ignorées et signalées sur la sortie d'erreur, avec la clé mais jamais la
valeur. Corriger la clé concernée dans la console KV, puis relancer le script.

## Qui fait quoi / quand

| Quand                                     | Qui                    | Quoi                                                                                                     |
| ----------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Une fois par an, à l'annonce de l'édition | Mainteneur             | Mettre à jour `year` et `actionDate` dans `src/app/registration/registration-config.ts` (un seul commit) |
| Avant l'action                            | Référent               | Générer les fiches de suivi (`bun scripts/extract-inscriptions.ts`) et les imprimer                      |
| À tout moment                             | Référent               | Traiter un désistement (supprimer la clé du parcours dans la console KV)                                 |
| Début janvier                             | Référent ou mainteneur | Purger les clés `inscriptions:<année écoulée>:*` dans la console KV                                      |
