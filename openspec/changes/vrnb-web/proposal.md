## Why

L'association **Vélo Rando Nature Bruz (VRNB)** a besoin d'un site web complet avec un espace administrateur Payload CMS pour gérer le contenu sans redéploiement. Le site public doit présenter l'association (présentation, organisation, référents), afficher les partenaires, proposer les activités (randonnées vélo, formations, projections de films, éco citoyenneté, plein air), un programme des activités à venir, une galerie des balades passées, un espace adhérent avec trombinoscope, une page profil et une section documentation. Les adhérents doivent pouvoir se connecter sans accéder à l'admin.

## What Changes

- **Page d'accueil** (`/home`) : Logo VRNB, grande carte contenant les 2 prochaines balades (date, titre, lieu, heure RDV) et un texte « À noter sur vos agendas : » avec le nombre d'événements à venir (lien vers `/activites`). Texte configurable. Carousel de photos auto-scroll. Texte configurable. Bloc avec titre et texte modifiables. 4 photos cliquables avec titre superposé correspondant aux 4 premières activités du sous-menu Activités. 2 textes configurables en bas de page.
- **Header / Navigation** : Menus « Accueil », « Association » (sous-menus : Présentation, Organisation, Référents), « Activités » (sous-menus : Randonnées à vélo, Formations, Projections de films, Éco citoyenneté, Autres activités de plein air), « Nos Balades », « Programme », « Documentation », « Espace Adhérent » (sous-menu : Trombinoscope) et « Profil ».
- **Page Organisation** : Affichage des membres du bureau avec leurs rôles (président, secrétaire, trésorier, etc.) et les utilisateurs associés.
- **Page Référents** : Liste des référents de l'association (site web, logistique, mécanique, navigation GPS, etc.) avec les utilisateurs associés.
- **Page Documentation** : Liste des documentations en cartes (titre, description, catégorie, date de création, auteur) avec sidebar de filtres par catégorie (composant `CategoryFilter` partagé). Provient de la collection Documentations.
- **Pages Activités** : Sous-pages par type d'activité, chacune avec un titre, une description et des cards (nom à gauche, description au milieu, photo optionnelle à droite). Contenu géré via la collection ActivitesContent.
- **Page Programme** : Photo d'en-tête, tableau des activités à venir triées par date (colonnes : date, nom, catégorie, ville, actions), sidebar avec filtres par catégorie (composant commun), champ de recherche et bouton filtrer. Catégories : Balade du dimanche, Escapade, Formations, Film documentaire, Éco-citoyenneté, Longe-côte, Réunion, Autres.
- **Page Nos Balades** : Photo d'en-tête avec texte « Nos Balades » configurable, description, cards des activités passées (titre, date, créateur, description, badge catégorie), sidebar de filtres par catégorie (composant commun partagé avec Programme).
- **Page Trombinoscope** : Titre, cartes pour chaque adhérent avec rôle (président, secrétaire, trésorier, adhérent, etc.), prénom NOM (en majuscule), photo optionnelle.
- **Page Profil** : Titre « Mon profil », carte avec informations (pseudo, rôle, bureau, référent, nom, prénom, téléphone, email, date de naissance), bouton modifier.
- **Gestion des adhérents** : Authentification des adhérents, restriction d'accès admin aux porteurs du référent « site web ».
- **Gestion du contenu admin** : CRUD complet pour référents, bureau, activités, partenaires, actualités via Payload.
- **Photos des activités** : Upload et gestion de photos/albums liées aux activités.
- **Données de référence** : Référents (Site web, Logistique, Photo-Vidéo, Mécanique, Navigation GPS, Sécurité, Secourisme, Stagiaire, Veille documentaire, Festivités, Guide conférencier, Balade du mardi, Equipement, Maniabilité). Bureau (Président, Trésorier, Secrétaire, Vice-Président, Vice-Secrétaire, Vice-Trésorier, Adhérent, Secrétaire-Comptable, Logistique, Référent des Référents).

## Capabilities

### New Capabilities

- `page-accueil` : Page d'accueil (`/home`) avec logo VRNB, grande carte des 2 prochaines balades + compteur événements, texte configurable, carousel photos auto-scroll, bloc titre/texte modifiable, 4 photos activités cliquables, 2 textes configurables.
- `navigation-header` : Header avec menus Accueil, Association (Présentation, Organisation, Référents), Activités (Randonnées à vélo, Formations, Projections de films, Éco citoyenneté, Autres activités), Nos Balades, Programme, Documentation, Espace Adhérent (Trombinoscope) et Profil.
- `page-organisation` : Page affichant l'organisation du bureau (rôles et membres associés).
- `page-referents` : Page listant les référents de l'association avec les membres associés.
- `page-documentation` : Page listant les documentations en cartes (titre, description, catégorie, date, auteur) avec sidebar filtre par catégorie (composant `CategoryFilter` partagé).
- `pages-activites` : Pages par type d'activité avec titre, description et cards (nom, description, photo optionnelle). Contenu depuis la collection ActivitesContent.
- `page-programme` : Page programme avec photo, tableau des activités à venir (date, nom, catégorie, ville, actions), filtres par catégorie (composant commun), recherche et bouton filtrer.
- `page-nos-balades` : Page galerie des balades passées avec photo d'en-tête, description, cards activités passées (titre, date, créateur, description, badge catégorie), sidebar filtre par catégorie (composant commun).
- `page-trombinoscope` : Trombinoscope des adhérents avec cartes (rôle, prénom NOM, photo optionnelle).
- `page-profil` : Page profil adhérent avec informations personnelles et bouton modifier.
- `gestion-adherents` : Authentification des adhérents, profil utilisateur, restriction d'accès admin via le système de référents.
- `gestion-contenu-admin` : Espace administrateur Payload pour gérer référents, bureau, activités, partenaires et actualités sans redéploiement.
- `photos-activites` : Upload et gestion de photos et albums photo liés aux activités.

### Modified Capabilities

_(Aucune capacité existante modifiée — le dossier `openspec/specs/` est vide.)_

## Impact

- **Frontend** : Nouvelles pages Next.js dans `apps/web/src/app/(frontend)/` — accueil, association/\*, activites/\*, nos-balades, programme, documentation, espace-adherent/trombinoscope, profil.
- **Layout** : Header avec navigation multi-niveaux et footer avec carousel partenaires.
- **Composants partagés** : Composant `CategoryFilter` réutilisé entre Programme, Nos Balades et Documentation.
- **Globals Payload** : Global `Home` enrichie avec champs présentation, description, Google Maps, cards, PDFs.
- **Collections Payload** : Users, Referents, Bureaux, Activites, ActivitesContent, Partenaires, Actualites, Photos, PhotosAlbums, Media, Documentations, Categories, CategoriesFormations, Lieux, Etats.
- **Contrôle d'accès** : `src/access/canAccessAdmin.ts` — vérification du référent « site web ».
- **Dépendances** : Payload 3, Next.js 16, sharp, Google Maps embed (iframe).
