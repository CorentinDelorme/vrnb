## Context

Le projet **VRNB** (Vélo Rando Nature Bruz) est un monorepo Turborepo utilisant Bun. L'application principale (`apps/web`) est construite avec **Next.js 16 + Payload CMS 3 + MongoDB**. Payload fournit nativement un panneau d'administration à `/admin` et une API REST/GraphQL.

L'infrastructure existante comprend déjà :

- **20 collections Payload** : Users, Activites, Referents, Bureaux, Partenaires, Actualites, Photos, PhotosAlbums, Media, Lieux, Etats, etc.
- **2 globals** : Home (avec block PartenairesList), RandosVelo.
- **Contrôle d'accès admin** via `canAccessAdmin.ts` : seuls les utilisateurs ayant le référent « site web » accèdent au panneau admin.
- **Frontend minimal** : Une page d'accueil avec uniquement la liste des partenaires et un layout basique sans header/footer.

Le frontend public doit être considérablement étoffé : header avec navigation multi-niveaux, page d'accueil complète, pages association (organisation, référents), pages activités par type, page programme avec tableau filtrable, page documentation, et footer avec carousel partenaires.

## Goals / Non-Goals

**Goals :**

- Construire le frontend public complet du site VRNB avec navigation, page d'accueil riche, pages association, activités, programme, documentation, nos balades, trombinoscope et profil.
- Enrichir le global `Home` dans Payload pour gérer la présentation, la description, la carte Google Maps, les cards activités/devises et les PDFs (statut, charte).
- Créer un layout partagé avec header (navigation multi-niveaux) et footer (carousel partenaires).
- Créer les pages Organisation (bureau) et Référents avec données dynamiques depuis Payload.
- Créer les pages Activités par type (randonnées, formations, projections, éco citoyenneté, plein air) avec cards.
- Créer la page Programme avec tableau des activités à venir, filtres par catégorie et recherche.
- Créer la page Nos Balades avec photo d'en-tête, description, cards des activités passées et filtres par catégorie.
- Créer la page Documentation listant les documentations de l'association.
- Créer la page Trombinoscope dans l'espace adhérent, affichant les cartes des membres avec rôle et photo.
- Créer la page Profil permettant à l'adhérent de consulter et modifier ses informations personnelles.
- Extraire un composant `CategoryFilter` partagé entre Programme et Nos Balades.
- Maintenir l'authentification adhérents et la restriction d'accès admin.
- Permettre la gestion complète du contenu via Payload sans redéploiement.

**Non-Goals :**

- Système de paiement ou gestion de cotisations.
- Application mobile ou PWA.
- Notifications par email.
- Design system complet ou thème CSS avancé (un style fonctionnel suffit).

## Decisions

### 1. Structure des routes Next.js

**Choix** : Utiliser le App Router Next.js avec le groupe `(frontend)` existant.

```
src/app/(frontend)/
├── layout.tsx                        # Layout partagé : Header + Footer
├── page.tsx                          # Page d'accueil
├── association/
│   ├── presentation/page.tsx         # Présentation (= accueil détaillée)
│   ├── organisation/page.tsx         # Bureau et rôles
│   └── referents/page.tsx            # Liste des référents
├── activites/
│   ├── randonnees-velo/page.tsx      # Randonnées à vélo
│   ├── formations/page.tsx           # Formations
│   ├── projections-films/page.tsx    # Projections de films
│   ├── eco-citoyennete/page.tsx      # Éco citoyenneté
│   └── autres-plein-air/page.tsx     # Autres activités de plein air
├── nos-balades/page.tsx              # Galerie des balades passées
├── programme/page.tsx                # Programme des activités
├── documentation/page.tsx            # Page documentation
├── espace-adherent/
│   └── trombinoscope/page.tsx        # Trombinoscope des adhérents
└── profil/page.tsx                   # Profil de l'adhérent connecté
```

**Alternatives considérées** :

- Pages API séparées + SPA React : perte du SSR et du SEO.
- Chaque page dans un dossier plat : moins organisé pour les sous-menus « Association » et « Activités ».

**Rationale** : Le groupe `(frontend)` est déjà en place. Les sous-routes `association/` et `activites/` regroupent logiquement les pages liées à chaque menu.

### 2. Google Maps via iframe embed

**Choix** : Intégrer Google Maps via une iframe embed (pas d'API JavaScript).

**Alternatives considérées** :

- Google Maps JavaScript API : nécessite une clé API, plus complexe, coût potentiel.
- Mapbox/Leaflet : dépendance supplémentaire, overhead pour un simple point de localisation.

**Rationale** : Une iframe Google Maps embed est gratuite, ne nécessite pas de clé API pour un usage basique, et suffit pour afficher la localisation d'une association.

### 3. Carousel partenaires dans le footer

**Choix** : Carousel CSS/JS léger dans le composant Footer, alimenté par la collection Partenaires triée par `ordre`.

**Alternatives considérées** :

- Librairie carousel (Swiper, Embla) : dépendance lourde pour un besoin simple.
- Grille statique : moins dynamique pour beaucoup de partenaires.

**Rationale** : Un carousel CSS avec animation auto-scroll est léger et ne nécessite aucune dépendance. Pour un volume modéré de partenaires, c'est suffisant.

### 4. Enrichissement du global Home

**Choix** : Ajouter des champs au global `Home` existant pour la présentation, la description, l'URL Google Maps, les cards et les uploads PDF.

**Alternatives considérées** :

- Créer un nouveau global `Presentation` séparé : fragmente les données de la page d'accueil.
- Stocker en dur dans le code : pas modifiable sans redéploiement.

**Rationale** : Le global `Home` est déjà lié à la page d'accueil via live preview. L'enrichir centralise la gestion du contenu de la page d'accueil.

### 5. PDFs statut et charte comme uploads Payload

**Choix** : Utiliser des champs `upload` (relation vers Media) pour les PDFs statut et charte dans le global Home.

**Rationale** : Payload gère déjà les uploads via la collection Media. Les administrateurs peuvent remplacer les PDFs directement via le panneau admin.

### 6. Pages Activités alimentées par ActivitesContent

**Choix** : Chaque page activité (randonnées, formations, etc.) récupère son contenu depuis la collection `ActivitesContent` existante. Cette collection contient déjà les champs titre, texte (richText) et photo pour chaque type d'activité (balade, escapade, mécanique, sécurité, projection_film, ecocitoyennete, autre, etc.).

**Alternatives considérées** :

- Créer une collection séparée par type d'activité : duplication, plus de collections à maintenir.
- Stocker le contenu dans des globals : la collection ActivitesContent remplit déjà ce rôle.

**Rationale** : Réutiliser la collection existante `ActivitesContent` évite toute migration et garde un point d'édition unique pour les administrateurs. Les cards sont construites à partir des champs `*_title`, `*_text` et `*_photo`.

### 7. Page Programme avec tableau filtrable côté client

**Choix** : La page Programme charge les activités à venir (date >= aujourd'hui, triées par date) côté serveur. Les filtres par catégorie et la recherche sont appliqués côté client (React state) pour une UX réactive sans rechargement de page.

**Alternatives considérées** :

- Filtrage côté serveur avec query params : ajoute de la latence à chaque filtre.
- Pagination serveur : pertinent à terme si le volume d'activités est très élevé.

**Rationale** : Le volume d'activités d'une association locale est modéré. Charger toutes les activités à venir et filtrer côté client offre une UX fluide. La colonne « ville » provient de la relation `lieu.nom_ville`, et « catégorie » de `categories_formation.libelle`.

### 8. Page Documentation depuis la collection Documentations

**Choix** : La page Documentation liste les documents de la collection `Documentations` existante, groupés par catégorie (relation vers `Categories`). Chaque documentation affiche titre, auteur, intro et un lien de lecture.

**Rationale** : La collection et les relations existent déjà. Il suffit de construire la page frontend.

### 9. Composant `CategoryFilter` partagé entre Programme et Nos Balades

**Choix** : Extraire un composant React client `CategoryFilter` utilisé à la fois dans la page Programme et la page Nos Balades. Ce composant affiche une sidebar avec les catégories d'activités sous forme de checkboxes et un champ de recherche. Catégories fixes : Balade du dimanche, Escapade, Formations, Film documentaire, Éco-citoyenneté, Longe-côte, Réunion, Autres.

**Alternatives considérées** :

- Dupliquer la logique de filtrage dans chaque page : maintenance plus lourde.
- Composant serveur avec query params : latence à chaque filtre.

**Rationale** : Les deux pages partagent exactement la même logique de filtrage par catégorie. Un composant client réactif offre une UX fluide et une maintenance centralisée.

### 10. Page Nos Balades — Activités passées avec cards

**Choix** : La page Nos Balades charge les activités passées (date < aujourd'hui, triées par date décroissante) côté serveur. Chaque activité s'affiche en card avec titre, date, créateur (relation `organisateur`), description (extrait de `infos_activite`) et badge catégorie. Le composant `CategoryFilter` partagé permet de filtrer côté client. La photo d'en-tête et le texte « Nos Balades » sont configurables via un nouveau global `NosBalades` ou des champs dans `Home`.

**Rationale** : Même pattern que Programme mais centré sur les activités passées. Les données proviennent de la même collection `Activites` avec un filtre de date inversé.

### 11. Page Trombinoscope — Annuaire des adhérents

**Choix** : La page Trombinoscope (route `/espace-adherent/trombinoscope`) charge tous les utilisateurs actifs depuis la collection `Users`. Chaque adhérent s'affiche en card avec : rôle (dérivé de la relation `bureau` — ex. Président, Secrétaire, Adhérent), prénom NOM (nom en majuscules), et photo optionnelle (champ upload à ajouter à Users si absent). L'accès est réservé aux utilisateurs connectés.

**Alternatives considérées** :

- Page publique sans authentification : expose les données personnelles des adhérents.
- Rôle stocké en champ texte dans Users : la relation `bureau` existe déjà et porte le libellé du rôle.

**Rationale** : L'association souhaite un annuaire interne. La relation `bureau` fournit le rôle affiché. Restreindre l'accès aux adhérents connectés protège les données.

### 12. Page Profil — Consultation et modification

**Choix** : La page Profil (route `/profil`) affiche les informations de l'utilisateur connecté dans une card (pseudo, rôle bureau, référents, nom, prénom, téléphone, email, date de naissance). Un bouton « Modifier » ouvre un formulaire d'édition utilisant l'API REST Payload (`PATCH /api/users/:id`). Accès réservé aux utilisateurs connectés.

**Alternatives considérées** :

- Rediriger vers le profil Payload admin : les adhérents n'ont pas accès au panneau admin.
- Formulaire en page séparée : une card avec toggle edit/view est plus fluide.

**Rationale** : Les adhérents sans accès admin ont besoin d'un point d'entrée frontend pour consulter et mettre à jour leur profil.

## Risks / Trade-offs

- **[Google Maps iframe et RGPD]** → L'embed Google Maps peut poser des problèmes RGPD (cookies tiers). **Mitigation** : Afficher un consentement avant le chargement de l'iframe, ou utiliser OpenStreetMap comme alternative.
- **[Carousel CSS limité]** → Un carousel purement CSS peut manquer de fonctionnalités (swipe mobile, pagination). **Mitigation** : Ajouter un minimum de JS pour le swipe ; migrer vers une librairie si le besoin évolue.
- **[Stockage local des PDFs]** → Les uploads PDF sont sur le filesystem. **Mitigation** : Volume persistant Docker pour `media/`.
- **[Pas de rôle admin explicite]** → L'accès admin dépend du référent « site web ». **Mitigation** : Hook `beforeDelete` sur Referents pour empêcher la suppression du référent « site web ».
