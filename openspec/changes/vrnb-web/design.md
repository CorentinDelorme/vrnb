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
- Enrichir le global `Home` dans Payload pour gérer le contenu de la page d'accueil : grande carte des 2 prochaines balades, textes configurables, carousel photos, bloc titre/texte, photos activités cliquables.
- Créer un layout partagé avec header (logo VRNB à gauche, navigation multi-niveaux, bouton déconnexion/connexion à droite selon l'état de connexion) et footer (carousel partenaires, liens Qui sommes-nous / Mentions légales / Contact, copyright).
- Créer la page Détail Activité (`/activites/detail/:id`) avec date/heure, nom, ville, organisateur (lien), durée, distance, lieu de rassemblement, info.
- Créer la page Profil Utilisateur (`/user/:id`) affichant le profil public d'un utilisateur.
- Créer la page Mentions Légales avec paragraphes configurables dans Payload.
- Créer la page Contact avec formulaire (nom/prénom, email, message) et boutons envoyer/retour.
- Créer la page Adhésion (`/adhesion`) avec titre et description configurables dans Payload, indiquant le statut des adhésions.
- Créer la page Connexion (`/login`) avec formulaire pseudo/mot de passe, lien mot de passe oublié et bouton adhésion.
- Créer la page Mot de passe oublié (`/oubli-pass`) avec formulaire email et envoi via Payload.
- Appliquer le contrôle d'accès : pages publiques (accueil, association, activités, programme, adhésion, contact, mentions légales) et pages authentifiées (balades, documentation, trombinoscope, profil).
- Gérer les PDFs statut et charte de l'association via des uploads Payload (global Home).
- Garantir que tous les titres et textes sur toutes les pages sont modifiables dans Payload CMS.
- Créer les pages Organisation (bureau) et Référents avec données dynamiques depuis Payload.
- Créer les pages Activités par type (randonnées, formations, projections, éco citoyenneté, plein air) avec cards.
- Créer la page Programme avec tableau des activités à venir, filtres par catégorie et recherche.
- Créer la page Nos Balades avec photo d'en-tête, description, cards des activités passées et filtres par catégorie.
- Créer la page Documentation avec cartes (titre, description, catégorie, date, auteur) et sidebar de filtres par catégorie (composant `CategoryFilter` partagé).
- Créer la page Trombinoscope dans l'espace adhérent, affichant les cartes des membres avec rôle et photo.
- Créer la page Profil permettant à l'adhérent de consulter et modifier ses informations personnelles.
- Extraire un composant `CategoryFilter` partagé entre Programme, Nos Balades et Documentation.
- Maintenir l'authentification adhérents et la restriction d'accès admin.
- Permettre la gestion complète du contenu via Payload sans redéploiement.

**Non-Goals :**

- Système de paiement ou gestion de cotisations.
- Application mobile ou PWA.
- Notifications par email.
- Design system complet au-delà des composants DaisyUI/TailwindCSS fournis par `packages/ui`.

## Decisions

### 1. Structure des routes Next.js

**Choix** : Utiliser le App Router Next.js avec le groupe `(frontend)` existant.

```
src/app/(frontend)/
├── layout.tsx                        # Layout partagé : Header + Footer
├── home/page.tsx                     # Page d'accueil (/home)
├── presentation/page.tsx             # Présentation de l'association
├── organisation/page.tsx             # Bureau et rôles
├── referents/page.tsx                # Liste des référents
├── randosvelo/page.tsx               # Randonnées à vélo
├── formations/page.tsx               # Formations
├── projections/page.tsx              # Projections de films
├── ecocitoyennete/page.tsx           # Éco citoyenneté
├── pleinair/page.tsx                 # Autres activités de plein air
├── activites/
│   ├── page.tsx                      # Programme des activités (/activites)
│   └── detail/[id]/page.tsx          # Détail d'une activité
├── balades/page.tsx                  # Galerie des balades passées (/balades)
├── documentation/page.tsx            # Page documentation
├── espace-adherent/
│   └── trombinoscope/page.tsx        # Trombinoscope des adhérents
├── user/[id]/page.tsx                # Profil utilisateur (propre profil éditable + profil public)
├── mentionslegales/page.tsx          # Mentions légales
├── contact/page.tsx                  # Page contact
├── adhesion/page.tsx                 # Page adhésion (/adhesion)
├── login/page.tsx                    # Page connexion (/login)
└── oubli-pass/page.tsx              # Mot de passe oublié (/oubli-pass)
```

Redirections permanentes configurées dans `next.config.ts` :

- `/activite` → `/activites` (ancienne URL du programme)
- `/album` → `/balades` (ancienne URL des balades)

**Alternatives considérées** :

- Pages API séparées + SPA React : perte du SSR et du SEO.
- Sous-dossiers `association/` et `activites/` : ajoutent de la profondeur d'URL inutile pour des pages simples.

**Rationale** : Le groupe `(frontend)` est déjà en place. Les routes plates (`/presentation`, `/organisation`, `/randosvelo`, etc.) offrent des URLs plus courtes et plus lisibles. Le dossier `activites/` est conservé uniquement pour le programme (`/activites`) et le détail (`/activites/detail/[id]`).

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

### 4. Enrichissement du global Home pour la page d'accueil

**Choix** : Ajouter des champs au global `Home` existant pour la page d'accueil complète : texte sous la grande carte (richText), carousel de photos (tableau d'uploads), deux blocs texte configurable (richText), bloc titre/texte modifiable à titre et description libres, et deux textes configurables en bas de page. Les 2 prochaines balades et le compteur d'événements sont calculés dynamiquement depuis la collection Activites. Les 4 photos activités sont liées aux 4 premiers sous-menus Activités.

**Alternatives considérées** :

- Créer un nouveau global séparé : fragmente les données de la page d'accueil.
- Stocker en dur dans le code : pas modifiable sans redéploiement.

**Rationale** : Le global `Home` est déjà lié à la page d'accueil via live preview. L'enrichir centralise la gestion du contenu.

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

### 8. Page Documentation avec cartes et filtre catégorie

**Choix** : La page Documentation affiche chaque documentation dans une carte contenant le titre, la description (intro), le nom de la catégorie (relation `Categories`), la date de création et l'auteur. Une sidebar à gauche utilise le composant `CategoryFilter` partagé (même que Programme et Nos Balades) pour filtrer les documentations par catégorie côté client.

**Alternatives considérées** :

- Groupement par catégorie sans filtre : moins interactif.
- Filtre serveur : latence inutile pour un volume modéré.

**Rationale** : Réutiliser le `CategoryFilter` assure une UX cohérente entre les pages. Le filtrage côté client est suffisant pour le volume de documentations.

### 9. Composant `CategoryFilter` partagé entre Programme, Nos Balades et Documentation

**Choix** : Extraire un composant React client `CategoryFilter` utilisé dans la page Programme, la page Nos Balades et la page Documentation. Ce composant affiche une sidebar avec les catégories d'activités sous forme de checkboxes et un champ de recherche. Catégories fixes : Balade du dimanche, Escapade, Formations, Film documentaire, Éco-citoyenneté, Longe-côte, Réunion, Autres.

**Alternatives considérées** :

- Dupliquer la logique de filtrage dans chaque page : maintenance plus lourde.
- Composant serveur avec query params : latence à chaque filtre.

**Rationale** : Les trois pages partagent la même logique de filtrage par catégorie. Un composant client réactif offre une UX fluide et une maintenance centralisée.

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

**Choix** : La page Profil (route `/user/:id`) affiche les informations de l'utilisateur. Lorsqu'un utilisateur connecté consulte son propre profil, une card affiche ses informations (pseudo, rôle bureau, référents, nom, prénom, téléphone, email, date de naissance) avec un bouton « Modifier » ouvrant un formulaire d'édition utilisant l'API REST Payload (`PATCH /api/users/:id`). Pour les autres utilisateurs, seul le profil public est affiché. Accès réservé aux utilisateurs connectés.

**Alternatives considérées** :

- Rediriger vers le profil Payload admin : les adhérents n'ont pas accès au panneau admin.
- Formulaire en page séparée : une card avec toggle edit/view est plus fluide.

**Rationale** : Les adhérents sans accès admin ont besoin d'un point d'entrée frontend pour consulter et mettre à jour leur profil.

### 13. Page d'accueil — Layout vertical complet

**Choix** : La page d'accueil (`/home`) suit un layout vertical composé de sections dans cet ordre :

1. **Logo VRNB** : Image du logo, upload configurable via le global Home.
2. **Grande carte « Prochaines balades »** : Contient deux cartes internes affichant les 2 prochaines activités (date, titre, lieu, heure RDV), calculées dynamiquement depuis la collection `Activites` (date >= aujourd'hui, triées par date, limit 2). En dessous : texte « À noter sur vos agendas : » + nombre d'événements à venir (lien vers `/activites`).
3. **Texte configurable 1** : Champ richText dans le global Home.
4. **Carousel de photos** : Tableau d'uploads dans le global Home, défilement automatique (CSS/JS léger).
5. **Texte configurable 2** : Champ richText dans le global Home.
6. **Bloc titre + texte modifiable** : Champs titre (text) et contenu (richText) dans le global Home.
7. **Photos des 4 activités** : 4 images avec titre superposé centré, cliquables, correspondant aux 4 premières entrées du sous-menu Activités (Randonnées à vélo, Formations, Projections de films, Éco citoyenneté). Photos et titres configurables ou issus d'ActivitesContent.
8. **2 textes configurables** : Deux champs richText supplémentaires dans le global Home.

**Alternatives considérées** :

- Page statique codée en dur : pas modifiable sans redéploiement.
- CMS blocks dynamiques (Payload blocks) : plus flexible mais plus complexe ; un layout fixe avec champs configurables suffit pour cette page.

**Rationale** : Un layout fixe avec des champs configurables dans le global Home offre à la fois la structure visuelle souhaitée et la modularité de contenu via l'admin.

### 14. Carousel de photos sur la page d'accueil

**Choix** : Carousel CSS/JS léger (même approche que le carousel partenaires du footer) avec défilement automatique. Les photos sont stockées dans un tableau de champs `upload` (relation vers Media) dans le global Home.

**Rationale** : Cohérent avec l'approche carousel du footer. Un volume modéré de photos ne justifie pas une librairie lourde.

### 15. URL de la page d'accueil : `/home`

**Choix** : La page d'accueil est servie à la route `/home` (et non `/`). La route racine `/` redirigera vers `/home`.

**Alternatives considérées** :

- Servir directement sur `/` : le fichier `page.tsx` existant est déjà lié au live preview Payload, risque de conflit.

**Rationale** : Une route dédiée `/home` simplifie la coexistence avec le `page.tsx` existant et la route Payload admin.

### 16. Page Détail Activité (`/activites/detail/:id`)

**Choix** : Route dynamique `activites/detail/[id]/page.tsx`. La page charge l'activité par ID depuis la collection `Activites` avec les relations populées (lieu, organisateur). Affiche : date et heure, nom, ville, carte organisateur (lien vers `/user/:userId`), durée (minutes), distance (km), lieu de rassemblement, info de l'activité (`infos_activite`).

**Rationale** : Permet d'accéder au détail complet d'une activité depuis le bouton « Détails » du tableau Programme. Le lien organisateur offre une navigation vers le profil utilisateur.

### 17. Page Profil Utilisateur (`/user/:id`)

**Choix** : Route dynamique `user/[id]/page.tsx`. Charge l'utilisateur par ID depuis `Users` avec relations `bureau` et `referents` populées. Affiche le profil public : prénom, nom, rôle bureau, photo optionnelle.

**Rationale** : Permet de consulter le profil d'un organisateur depuis la page détail activité.

### 18. Footer enrichi : liens et copyright

**Choix** : Le footer affiche le carousel des partenaires, puis en dessous trois liens : « Qui sommes-nous ? » (`/presentation`), « Mentions légales » (`/mentionslegales`), « Contact » (`/contact`). À droite, le copyright « ©2026 VRNB ».

**Rationale** : Conventions standard pour un site associatif français. Les liens sont accessibles depuis toutes les pages via le layout partagé.

### 19. Page Mentions Légales

**Choix** : Route `mentionslegales/page.tsx`. Contenu géré via un nouveau global Payload `MentionsLegales` avec un titre (text) et un tableau de paragraphes (titre + contenu richText). Paragraphes typiques : dénomination, siège social, hébergement, collecte et traitement des données personnelles, etc.

**Alternatives considérées** :

- Fichier statique markdown : pas modifiable sans redéploiement.

**Rationale** : Un global Payload permet aux administrateurs de mettre à jour les mentions légales sans intervention technique.

### 20. Page Contact avec formulaire

**Choix** : Route `contact/page.tsx`. Carte « Nous contacter » avec formulaire : champs Nom et prénom, Email, Message. Bouton « Envoyer » (soumet via API route `/api/contact` ou envoi email). Bouton « Retour » redirige vers `/home`. Le titre et le texte d'introduction de la page sont configurables via un global Payload `Contact`.

**Rationale** : Un formulaire simple couvre le besoin de contact. L'envoi peut être implémenté via une API route Next.js ou un service email.

### 21. PDFs statut et charte via Payload

**Choix** : Ajouter deux champs `upload` (relation vers Media) dans le global `Home` pour le PDF statut de l'association et le PDF charte de l'association. Les administrateurs peuvent uploader/remplacer ces PDFs via le panneau admin.

**Rationale** : Payload gère déjà les uploads via Media. Centraliser dans le global Home permet une gestion simple.

### 22. Header : logo VRNB et bouton déconnexion

**Choix** : Le header affiche à gauche le logo de l'association VRNB (upload configurable via le global Home). À droite, un bouton « Déconnexion » visible uniquement pour les utilisateurs connectés. Le bouton appelle `POST /api/users/logout` et redirige vers `/home`.

**Rationale** : Le logo renforce l'identité visuelle. Le bouton déconnexion est essentiel pour les adhérents connectés.

### 23. Contenu éditable dans Payload pour toutes les pages

**Choix** : Tous les titres et textes affichés sur les pages publiques DOIVENT être configurables via Payload CMS (globals ou collections). Aucun texte statique ne doit être codé en dur dans le frontend, à l'exception des labels de navigation et des textes techniques (boutons, formulaires).

**Rationale** : Permet à l'association de personnaliser entièrement le contenu sans intervention technique.

### 24. URLs plates et redirections permanentes

**Choix** : Les pages de l'association et des activités utilisent des routes plates (sans sous-dossiers) : `/presentation`, `/organisation`, `/referents`, `/randosvelo`, `/formations`, `/projections`, `/ecocitoyennete`, `/pleinair`. Le programme est à `/activites` et les balades à `/balades`. Deux redirections permanentes (301) sont configurées dans `next.config.ts` : `/activite` → `/activites` et `/album` → `/balades` pour compatibilité avec les anciennes URLs.

**Alternatives considérées** :

- Sous-dossiers `/association/*` et `/activites/*` : URLs plus longues sans bénéfice.

**Rationale** : Des URLs courtes sont plus faciles à partager et à mémoriser. Les redirections assurent la compatibilité SEO.

### 25. Profil utilisateur unifié à `/user/:id`

**Choix** : La route `/user/[id]` sert à la fois de profil public et de profil éditable. Lorsqu'un utilisateur connecté consulte son propre profil (`/user/:ownId`), le bouton « Modifier » et le mode édition sont disponibles. Pour les autres profils, seules les informations publiques sont affichées. Le menu « Profil » dans le header redirige vers `/user/:currentUserId`.

**Alternatives considérées** :

- Route séparée `/profil` : duplique la page de profil, nécessite deux templates.

**Rationale** : Un seul template avec affichage conditionnel simplifie la maintenance et offre une URL cohérente.

### 26. Hover overlay sur les photos activités de la page d'accueil

**Choix** : Les 4 photos des activités sur la page d'accueil affichent au survol (hover) un overlay semi-transparent (fond sombre opaque) avec la description de l'activité en haut de la photo. Le titre reste visible au centre. L'overlay utilise une transition CSS douce.

**Alternatives considérées** :

- Tooltip séparé : moins intégré visuellement.
- Description toujours visible : surcharge visuelle.

**Rationale** : Le hover overlay offre une découverte progressive du contenu sans surcharger la vue initiale.

### 27. Contrôle d'accès : pages publiques vs authentifiées

**Choix** : Séparer les pages en deux catégories d'accès :

**Pages publiques** (accessibles sans connexion) :

- Accueil (`/home`)
- Présentation (`/presentation`), Organisation (`/organisation`), Référents (`/referents`)
- Pages Activités : Randonnées à vélo (`/randosvelo`), Formations (`/formations`), Projections (`/projections`), Éco citoyenneté (`/ecocitoyennete`), Plein air (`/pleinair`)
- Programme (`/activites`), Détail activité (`/activites/detail/:id`)
- Adhésion (`/adhesion`)
- Connexion (`/login`), Mot de passe oublié (`/oubli-pass`)
- Mentions légales (`/mentionslegales`), Contact (`/contact`)

**Pages authentifiées** (réservées aux utilisateurs connectés, redirection vers `/login` sinon) :

- Nos Balades (`/balades`)
- Documentation (`/documentation`)
- Espace Adhérent / Trombinoscope (`/espace-adherent/trombinoscope`)
- Profil utilisateur (`/user/:id`)

Le header adapte sa navigation en conséquence : les menus « Nos Balades », « Documentation », « Espace Adhérent » et « Profil » ne sont visibles que pour les utilisateurs connectés.

**Alternatives considérées** :

- Tout public : expose les données personnelles des adhérents.
- Tout authentifié : empêche les non-adhérents de découvrir l'association.

**Rationale** : Les pages vitrine de l'association et des activités doivent être publiques pour encourager l'adhésion. Les pages contenant des données personnelles (annuaire, balades, documentation) sont protégées.

### 28. Page Adhésion (`/adhesion`)

**Choix** : Route `adhesion/page.tsx`. Contenu géré via un nouveau global Payload `Adhesion` avec un titre (text, défaut « Adhésion ») et une description (richText) indiquant que les adhésions sont clôturées ou ouvertes selon la configuration.

**Alternatives considérées** :

- Formulaire d'inscription en ligne : hors scope (non-goal : pas de gestion de cotisations).
- Page statique codée en dur : pas modifiable sans redéploiement.

**Rationale** : Un global Payload permet aux administrateurs de mettre à jour le statut des adhésions et le contenu de la page sans intervention technique.

### 29. Page Connexion (`/login`)

**Choix** : Route `login/page.tsx`. Affiche une carte « Connectez-vous » avec un formulaire contenant pseudo (text, required) et mot de passe (password, required). L'authentification se fait via `POST /api/users/login` (API REST Payload) avec le champ `email` ou `username` selon le pseudo saisi. Sous le formulaire : lien « Mot de passe oublié » vers `/oubli-pass`. En dessous : section « Nouveau sur le site ? » avec bouton « Adhérer à l'association » redirigeant vers `/adhesion`.

**Alternatives considérées** :

- Rediriger vers le panneau admin Payload pour la connexion : les adhérents n'ont pas accès au panneau admin.
- OAuth / SSO : surdimensionné pour une association locale.

**Rationale** : Un formulaire de connexion dédié sur le frontend permet aux adhérents de se connecter sans exposer le panneau admin. L'API REST Payload gère nativement l'authentification.

### 30. Page Mot de passe oublié (`/oubli-pass`)

**Choix** : Route `oubli-pass/page.tsx`. Affiche un titre « Réinitialisation du mot de passe » (configurable via un global ou un champ admin) et un formulaire avec un champ email (email, required, validation format email) et un bouton « Envoyer ». Le formulaire appelle `POST /api/users/forgot-password` (API REST Payload) qui envoie un email de réinitialisation.

**Alternatives considérées** :

- Pas de page de récupération : les adhérents perdent l'accès en cas d'oubli.

**Rationale** : Payload fournit nativement l'endpoint `forgot-password`. Une page dédiée offre une UX complète pour le flux d'authentification.

### 31. Bouton Connexion dans le header

**Choix** : Le header affiche à droite un bouton « Connexion » redirigeant vers `/login`, visible uniquement pour les utilisateurs non connectés. Pour les utilisateurs connectés, ce bouton est remplacé par le bouton « Déconnexion » existant (décision #22). Le menu « Adhésion » est ajouté à la navigation principale, visible pour tous les visiteurs (connectés ou non).

**Alternatives considérées** :

- Pas de bouton connexion : les utilisateurs non connectés n'ont aucun point d'entrée visible pour se connecter.

**Rationale** : Un bouton connexion visible à droite du header est une convention standard sur les sites web. Le menu Adhésion permet de diriger les prospects vers l'inscription.

### 32. Composants UI dans `packages/ui` avec DaisyUI + TailwindCSS

**Choix** : Tous les composants UI réutilisables (boutons, inputs, cards, badges, modales, tableaux, formulaires, etc.) DOIVENT être définis dans le package `packages/ui`. Chaque composant a son propre dossier : `packages/ui/src/components/<ComponentName>/` contenant au minimum `<ComponentName>.tsx`, `<ComponentName>.stories.ts` et `<ComponentName>.test.tsx`. Les composants utilisent exclusivement les classes **DaisyUI** et **TailwindCSS** — aucun style en dur (`style={{}}`, CSS modules, inline CSS) n'est autorisé. Le package `packages/ui` exporte ces composants pour consommation par `apps/web`.

Structure type :

```
packages/ui/src/components/
├── Button/
│   ├── Button.tsx
│   ├── Button.stories.ts
│   └── Button.test.tsx
├── Card/
│   ├── Card.tsx
│   ├── Card.stories.ts
│   └── Card.test.tsx
├── Input/
│   ├── Input.tsx
│   ├── Input.stories.ts
│   └── Input.test.tsx
├── Badge/
│   ├── Badge.tsx
│   ├── Badge.stories.ts
│   └── Badge.test.tsx
├── Navbar/
│   ├── Navbar.tsx
│   ├── Navbar.stories.ts
│   └── Navbar.test.tsx
├── Footer/
│   ├── Footer.tsx
│   ├── Footer.stories.ts
│   └── Footer.test.tsx
├── Carousel/
│   ├── Carousel.tsx
│   ├── Carousel.stories.ts
│   └── Carousel.test.tsx
├── Table/
│   ├── Table.tsx
│   ├── Table.stories.ts
│   └── Table.test.tsx
├── Modal/
│   ├── Modal.tsx
│   ├── Modal.stories.ts
│   └── Modal.test.tsx
├── Avatar/
│   ├── Avatar.tsx
│   ├── Avatar.stories.ts
│   └── Avatar.test.tsx
├── FormField/
│   ├── FormField.tsx
│   ├── FormField.stories.ts
│   └── FormField.test.tsx
├── CategoryFilter/
│   ├── CategoryFilter.tsx
│   ├── CategoryFilter.stories.ts
│   └── CategoryFilter.test.tsx
├── HeroImage/
│   ├── HeroImage.tsx
│   ├── HeroImage.stories.ts
│   └── HeroImage.test.tsx
└── RichText/
    ├── RichText.tsx
    ├── RichText.stories.ts
    └── RichText.test.tsx
```

**Alternatives considérées** :

- Composants inline dans `apps/web` : pas réutilisables, pas testables indépendamment.
- CSS Modules ou styled-components : incohérent avec DaisyUI, ajoute une couche d'abstraction.

**Rationale** : Le package `packages/ui` existe déjà avec Storybook, Vitest, DaisyUI et TailwindCSS configurés. Centraliser les composants UI permet une cohérence visuelle, des tests unitaires isolés, et une documentation Storybook vivante. DaisyUI fournit des composants prêts à l'emploi (btn, card, input, navbar, etc.) stylés via des classes Tailwind sémantiques.

### 33. Storybook stories et tests unitaires par composant

**Choix** : Chaque composant dans `packages/ui` DOIT avoir :

- Un fichier `.stories.ts` Storybook documentant les variantes (tailles, couleurs, états disabled/loading, avec/sans icône, etc.).
- Un fichier `.test.tsx` avec tests unitaires Vitest vérifiant le rendu, les props, les interactions et l'accessibilité.

Les stories servent de documentation visuelle et de tests de non-régression visuels. Les tests unitaires couvrent la logique métier et les edge cases.

**Rationale** : `packages/ui` a déjà Storybook 10 et Vitest configurés. Maintenir stories + tests par composant garantit la qualité et facilite le développement itératif.

### 34. Payload blocks communs pour composants partagés

**Choix** : Créer des blocks Payload réutilisables et génériques pour les patterns de contenu récurrents. Ces blocks sont configurables dans l'admin Payload et les textes ne DOIVENT JAMAIS être codés en dur dans le frontend. Les blocks sont définis dans `apps/web/src/blocks/` et utilisent les composants UI de `packages/ui` pour leur rendu frontend.

Blocks génériques à créer :

- `RichTextBlock` : titre (text, optionnel) + contenu (richText). Utilisé pour tous les blocs de texte configurable.
- `HeroImageBlock` : image (upload) + titre superposé (text) + description optionnelle (richText). Utilisé pour les en-têtes de pages.
- `CardListBlock` : titre (text, optionnel) + tableau de cards (titre, description, image, lien). Utilisé pour les listes de contenu (activités, documentations).
- `CarouselBlock` : titre (text, optionnel) + tableau d'images (uploads). Utilisé pour les carousels de photos.
- `ContactFormBlock` : titre (text) + texte intro (richText) + configuration des champs.

Le block `PartenairesList` existant est conservé dans le footer.

**Alternatives considérées** :

- Champs directs sur les globals sans blocks : moins flexible, pas réutilisable.
- Un seul block « catch-all » : trop générique, difficile à maintenir.

**Rationale** : Les blocks Payload permettent aux administrateurs de composer du contenu via l'interface admin. Les blocs génériques évitent la duplication et restent réutilisables entre différentes pages/globals.

### 35. Séparation stricte `packages/ui` (composants) vs `apps/web` (pages + Payload)

**Choix** : Le site web vit dans `apps/web` (Next.js + Payload CMS). Les composants UI purs (sans logique Payload ni dépendance serveur) vivent dans `packages/ui`. Les pages dans `apps/web` importent les composants depuis `packages/ui` et les alimentent avec les données Payload. Les blocks Payload et la logique métier (accès, hooks, requêtes) restent dans `apps/web`.

Règle : `packages/ui` ne DOIT PAS dépendre de Payload, Next.js (server components), ni de la base de données. Il ne contient que des composants React client purs avec DaisyUI/TailwindCSS.

**Rationale** : Cette séparation garantit que les composants UI sont testables en isolation (Storybook + Vitest), réutilisables, et découplés de l'infrastructure CMS.

### 36. Thèmes DaisyUI exclusifs : VRNB (light) et VRNB-DARK (dark)

**Choix** : Le site utilise **exclusivement** les deux thèmes DaisyUI personnalisés définis dans `packages/ui/app/globals.css` :

- **`vrnb`** (thème clair, `--default`) : primary `#b5ea86`, primary-content `#212529`, secondary `#198754`, secondary-content `#fff`, base-100 blanc, base-content sombre.
- **`vrnb-dark`** (thème sombre, `--prefersdark`) : palette adaptée au mode sombre, respectant les mêmes tokens de couleur.

Aucun autre thème DaisyUI (light, dark, cupcake, etc.) ne DOIT être utilisé. Les attributs `data-theme="vrnb"` et `data-theme="vrnb-dark"` sont appliqués au `<html>` via le layout racine. Les composants UI dans `packages/ui` DOIVENT utiliser les classes sémantiques DaisyUI (`btn-primary`, `bg-base-100`, `text-base-content`, etc.) qui héritent automatiquement des couleurs du thème actif. Aucune couleur en dur (hex, rgb, oklch) ne DOIT être utilisée dans les composants — uniquement les tokens DaisyUI.

**Alternatives considérées** :

- Thèmes DaisyUI par défaut : ne correspondent pas à l'identité visuelle VRNB.
- Variables CSS custom sans DaisyUI : perd les classes sémantiques DaisyUI.

**Rationale** : Les thèmes personnalisés garantissent la cohérence visuelle avec l'identité VRNB tout en conservant le système de design DaisyUI. Le basculement light/dark est géré nativement via `prefers-color-scheme`.

### 37. Accessibilité : contrastes de couleurs et conformité WCAG

**Choix** : Tous les composants UI DOIVENT respecter un ratio de contraste minimum **WCAG AA** (4.5:1 pour le texte normal, 3:1 pour le texte large et les éléments interactifs). Lors de l'implémentation de chaque composant :

1. Vérifier que les combinaisons fond/texte du thème VRNB et VRNB-DARK respectent les ratios WCAG AA.
2. Utiliser un outil de vérification de contraste (Lighthouse, axe-core, ou Chrome DevTools) pour valider.
3. Si un token de couleur du thème produit un contraste insuffisant, ajuster le token dans `globals.css` (et NON dans le composant).
4. Les éléments interactifs (boutons, liens, inputs) DOIVENT avoir des états visuels distincts (hover, focus, active, disabled) avec des contrastes suffisants.
5. Les images décoratives utilisent `alt=""`, les images informatives ont un `alt` descriptif.
6. Les formulaires utilisent des `<label>` associés, des `aria-describedby` pour les messages d'erreur, et `aria-required` pour les champs obligatoires.

**Rationale** : L'accessibilité est un prérequis légal (RGAA en France) et une bonne pratique. Vérifier les contrastes dès le développement évite des corrections coûteuses.

### 38. Style moderne, épuré et aéré — respect des défauts DaisyUI

**Choix** : Le site DOIT avoir un style **moderne, épuré et bien aéré**. Pour atteindre cet objectif :

1. **Ne PAS surcharger les composants DaisyUI** avec des classes Tailwind de padding, margin ou spacing excessifs. Les composants DaisyUI ont des espacements internes bien calibrés — les respecter.
2. **Préférer les classes DaisyUI sémantiques** (`card`, `btn`, `input`, `hero`, `navbar`, `footer`, etc.) plutôt que de reconstruire des layouts manuellement avec Tailwind.
3. **Limiter les classes Tailwind utilitaires** aux ajustements de layout (flex, grid, gap, max-w) et aux espacements entre sections (`my-8`, `py-12`, `gap-6`, etc.). Éviter les surcharges internes aux composants (`p-2 m-1` sur un `card-body` par exemple).
4. **Utiliser l'espace blanc** comme élément de design : des sections bien espacées, pas de contenu tassé.
5. **Typographie aérée** : utiliser les tailles de texte Tailwind par défaut (`text-base`, `text-lg`, `text-xl`), pas de tailles micro.
6. **Bordures subtiles** : le thème VRNB définit `border: 1px` et `depth: 1` — respecter ces paramètres, pas de bordures épaisses ni d'ombres lourdes.

**Alternatives considérées** :

- Framework CSS custom avec variables de spacing : surdimensionné, incohérent avec DaisyUI.
- Override systématique des composants DaisyUI : casse les mises à jour DaisyUI, complexifie la maintenance.

**Rationale** : DaisyUI fournit des composants déjà stylés et cohérents. Les surcharger avec des utilitaires Tailwind crée des incohérences et rend le code difficile à maintenir. Un style épuré passe par le respect des défauts et l'utilisation judicieuse de l'espace blanc.

### 39. Vérification visuelle des composants via Chrome DevTools MCP

**Choix** : Lors de l'implémentation de chaque composant UI et de chaque page, effectuer une vérification visuelle en utilisant **Chrome DevTools MCP** pour :

1. **Capture d'écran** : prendre un screenshot du composant ou de la page rendue dans le navigateur via Storybook (composants) ou le serveur de développement (pages).
2. **Audit Lighthouse** : lancer un audit Lighthouse ciblé accessibilité pour vérifier les contrastes, les labels, les rôles ARIA et le score d'accessibilité (objectif ≥ 90).
3. **Inspection des couleurs** : vérifier visuellement que les couleurs du thème VRNB/VRNB-DARK sont correctement appliquées et que le texte est lisible sur tous les fonds.
4. **Test responsive** : vérifier l'affichage sur les breakpoints principaux (mobile 375px, tablet 768px, desktop 1280px).

Cette vérification est à effectuer pour chaque composant de `packages/ui` via Storybook et pour chaque page de `apps/web` via le serveur de développement.

**Rationale** : Chrome DevTools MCP permet une vérification automatisée et documentée de l'affichage, évitant les régressions visuelles. Combiné avec Lighthouse, cela garantit l'accessibilité et la qualité visuelle.

## Risks / Trade-offs

- **[Google Maps iframe et RGPD]** → L'embed Google Maps peut poser des problèmes RGPD (cookies tiers). **Mitigation** : Afficher un consentement avant le chargement de l'iframe, ou utiliser OpenStreetMap comme alternative.
- **[Carousel CSS limité]** → Un carousel purement CSS peut manquer de fonctionnalités (swipe mobile, pagination). **Mitigation** : Ajouter un minimum de JS pour le swipe ; migrer vers une librairie si le besoin évolue.
- **[Stockage local des PDFs]** → Les uploads PDF sont sur le filesystem. **Mitigation** : Volume persistant Docker pour `media/`.
- **[Pas de rôle admin explicite]** → L'accès admin dépend du référent « site web ». **Mitigation** : Hook `beforeDelete` sur Referents pour empêcher la suppression du référent « site web ».
