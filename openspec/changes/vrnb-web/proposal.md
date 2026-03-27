## Why

L'association **Vélo Rando Nature Bruz (VRNB)** a besoin d'un site web complet avec un espace administrateur Payload CMS pour gérer le contenu sans redéploiement. Le site public doit présenter l'association (présentation, organisation, référents), afficher les partenaires, et proposer une navigation claire. Les adhérents doivent pouvoir se connecter sans accéder à l'admin.

## What Changes

- **Page d'accueil** : Titre « Présentation », description de l'association, carte Google Maps pour la localisation, cards présentant les activités/devises de l'association, statut de l'association (PDF), charte de l'association (PDF), et footer avec carousel des partenaires (image, URL, nom).
- **Header / Navigation** : Menus « Accueil », « Association » (sous-menus : Présentation, Organisation, Référents) et « Documentation ».
- **Page Organisation** : Affichage des membres du bureau avec leurs rôles (président, secrétaire, trésorier, etc.) et les utilisateurs associés.
- **Page Référents** : Liste des référents de l'association (site web, logistique, mécanique, navigation GPS, etc.) avec les utilisateurs associés.
- **Gestion des adhérents** : Authentification des adhérents, restriction d'accès admin aux porteurs du référent « site web ».
- **Gestion du contenu admin** : CRUD complet pour référents, bureau, activités, partenaires, actualités via Payload.
- **Photos des activités** : Upload et gestion de photos/albums liées aux activités.

## Capabilities

### New Capabilities

- `page-accueil` : Page d'accueil avec présentation, description, carte Google Maps, cards activités/devises, statut PDF, charte PDF, et carousel partenaires dans le footer.
- `navigation-header` : Header avec menus Accueil, Association (Présentation, Organisation, Référents) et Documentation.
- `page-organisation` : Page affichant l'organisation du bureau (rôles et membres associés).
- `page-referents` : Page listant les référents de l'association avec les membres associés.
- `gestion-adherents` : Authentification des adhérents, profil utilisateur, restriction d'accès admin via le système de référents.
- `gestion-contenu-admin` : Espace administrateur Payload pour gérer référents, bureau, activités, partenaires et actualités sans redéploiement.
- `photos-activites` : Upload et gestion de photos et albums photo liés aux activités.

### Modified Capabilities

_(Aucune capacité existante modifiée — le dossier `openspec/specs/` est vide.)_

## Impact

- **Frontend** : Nouvelles pages Next.js dans `apps/web/src/app/(frontend)/` — accueil, association/presentation, association/organisation, association/referents, documentation.
- **Layout** : Header avec navigation et footer avec carousel partenaires.
- **Globals Payload** : Global `Home` enrichie avec champs présentation, description, Google Maps, cards, PDFs.
- **Collections Payload** : Users, Referents, Bureaux, Activites, Partenaires, Actualites, Photos, PhotosAlbums, Media.
- **Contrôle d'accès** : `src/access/canAccessAdmin.ts` — vérification du référent « site web ».
- **Dépendances** : Payload 3, Next.js 16, sharp, Google Maps embed (iframe).
