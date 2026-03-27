## Context

Le projet **VRNB** (Vélo Rando Nature Bruz) est un monorepo Turborepo utilisant Bun. L'application principale (`apps/web`) est construite avec **Next.js 16 + Payload CMS 3 + MongoDB**. Payload fournit nativement un panneau d'administration à `/admin` et une API REST/GraphQL.

L'infrastructure existante comprend déjà :

- **20 collections Payload** : Users, Activites, Referents, Bureaux, Partenaires, Actualites, Photos, PhotosAlbums, Media, Lieux, Etats, etc.
- **2 globals** : Home (avec block PartenairesList), RandosVelo.
- **Contrôle d'accès admin** via `canAccessAdmin.ts` : seuls les utilisateurs ayant le référent « site web » accèdent au panneau admin.
- **Frontend minimal** : Une page d'accueil avec uniquement la liste des partenaires et un layout basique sans header/footer.

Le frontend public doit être considérablement étoffé : header avec navigation, page d'accueil complète, pages association (organisation, référents), et footer avec carousel partenaires.

## Goals / Non-Goals

**Goals :**

- Construire le frontend public complet du site VRNB avec navigation, page d'accueil riche, pages association et footer.
- Enrichir le global `Home` dans Payload pour gérer la présentation, la description, la carte Google Maps, les cards activités/devises et les PDFs (statut, charte).
- Créer un layout partagé avec header (navigation multi-niveaux) et footer (carousel partenaires).
- Créer les pages Organisation (bureau) et Référents avec données dynamiques depuis Payload.
- Maintenir l'authentification adhérents et la restriction d'accès admin.
- Permettre la gestion complète du contenu via Payload sans redéploiement.

**Non-Goals :**

- Page documentation complète (structure identifiée mais contenu détaillé hors scope de ce change).
- Système de paiement ou gestion de cotisations.
- Application mobile ou PWA.
- Notifications par email.
- Design system complet ou thème CSS avancé (un style fonctionnel suffit).

## Decisions

### 1. Structure des routes Next.js

**Choix** : Utiliser le App Router Next.js avec le groupe `(frontend)` existant.

```
src/app/(frontend)/
├── layout.tsx                    # Layout partagé : Header + Footer
├── page.tsx                      # Page d'accueil
├── association/
│   ├── presentation/page.tsx     # Présentation (= accueil détaillée)
│   ├── organisation/page.tsx     # Bureau et rôles
│   └── referents/page.tsx        # Liste des référents
└── documentation/page.tsx        # Page documentation
```

**Alternatives considérées** :

- Pages API séparées + SPA React : perte du SSR et du SEO.
- Chaque page dans un dossier plat : moins organisé pour le sous-menu « Association ».

**Rationale** : Le groupe `(frontend)` est déjà en place. Les sous-routes `association/` regroupent logiquement les pages liées.

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

## Risks / Trade-offs

- **[Google Maps iframe et RGPD]** → L'embed Google Maps peut poser des problèmes RGPD (cookies tiers). **Mitigation** : Afficher un consentement avant le chargement de l'iframe, ou utiliser OpenStreetMap comme alternative.
- **[Carousel CSS limité]** → Un carousel purement CSS peut manquer de fonctionnalités (swipe mobile, pagination). **Mitigation** : Ajouter un minimum de JS pour le swipe ; migrer vers une librairie si le besoin évolue.
- **[Stockage local des PDFs]** → Les uploads PDF sont sur le filesystem. **Mitigation** : Volume persistant Docker pour `media/`.
- **[Pas de rôle admin explicite]** → L'accès admin dépend du référent « site web ». **Mitigation** : Hook `beforeDelete` sur Referents pour empêcher la suppression du référent « site web ».
