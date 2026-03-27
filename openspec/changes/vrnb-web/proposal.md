## Why

L'association **Vélo Rando Nature Bruz (VRNB)** a besoin d'un site web complet avec un espace administrateur Payload CMS pour gérer le contenu sans redéploiement. Le site public doit présenter l'association (présentation, organisation, référents), afficher les partenaires, proposer les activités (randonnées vélo, formations, projections de films, éco citoyenneté, plein air), un programme des activités à venir, une galerie des balades passées, un espace adhérent avec trombinoscope, une page profil et une section documentation. Les adhérents doivent pouvoir se connecter sans accéder à l'admin.

## What Changes

- **Page d'accueil** (`/home`) : Logo VRNB, grande carte contenant les 2 prochaines balades (date, titre, lieu, heure RDV) et un texte « À noter sur vos agendas : » avec le nombre d'événements à venir (lien vers `/activites`). Texte configurable. Carousel de photos auto-scroll. Texte configurable. Bloc avec titre et texte modifiables. 4 photos cliquables avec titre superposé correspondant aux 4 premières activités du sous-menu Activités. 2 textes configurables en bas de page.
- **Header / Navigation** : Logo VRNB à gauche. Menus publics : « Accueil », « Association » (sous-menus : Présentation, Organisation, Référents), « Activités » (sous-menus : Randonnées à vélo, Formations, Projections de films, Éco citoyenneté, Autres activités de plein air), « Programme », « Adhésion ». Menus connectés : « Nos Balades », « Documentation », « Espace Adhérent » (sous-menu : Trombinoscope), « Profil ». Bouton « Connexion » à droite (non connecté) ou « Déconnexion » (connecté).
- **Page Organisation** : Affichage des membres du bureau avec leurs rôles (président, secrétaire, trésorier, etc.) et les utilisateurs associés.
- **Page Référents** : Liste des référents de l'association (site web, logistique, mécanique, navigation GPS, etc.) avec les utilisateurs associés.
- **Page Documentation** : Liste des documentations en cartes (titre, description, catégorie, date de création, auteur) avec sidebar de filtres par catégorie (composant `CategoryFilter` partagé). Provient de la collection Documentations.
- **Pages Activités** : Sous-pages par type d'activité, chacune avec un titre, une description et des cards (nom à gauche, description au milieu, photo optionnelle à droite). Contenu géré via la collection ActivitesContent.
- **Page Programme** : Photo d'en-tête, tableau des activités à venir triées par date (colonnes : date, nom, catégorie, ville, actions), sidebar avec filtres par catégorie (composant commun), champ de recherche et bouton filtrer. La colonne actions contient un bouton « Détails » redirigeant vers `/activites/detail/:id`. Catégories : Balade du dimanche, Escapade, Formations, Film documentaire, Éco-citoyenneté, Longe-côte, Réunion, Autres.
- **Page Détail Activité** (`/activites/detail/:id`) : Date et heure, nom, ville. Carte organisateur (lien vers `/user/:userId`). Durée (minutes), distance (km), lieu de rassemblement, info de l'activité.
- **Page Profil Utilisateur** (`/user/:id`) : Affichage du profil public d'un utilisateur.
- **Footer** : Carousel des partenaires. En dessous : liens « Qui sommes-nous ? » (`/presentation`), « Mentions légales » (`/mentionslegales`), « Contact » (`/contact`). Copyright © 2026 VRNB à droite.
- **Page Mentions légales** (`/mentionslegales`) : Titre « Mentions légales », paragraphes configurables (dénomination, siège social, hébergement, données personnelles, etc.) modifiables dans Payload.
- **Page Contact** (`/contact`) : Carte « Nous contacter » avec formulaire (nom et prénom, email, message), boutons « Envoyer » et « Retour » (vers `/home`).
- **Page Adhésion** (`/adhesion`) : Titre et description configurables via Payload CMS (global Adhesion). Indique le statut des adhésions (ouvertes/clôturées). Accessible publiquement.
- **Page Connexion** (`/login`) : Carte « Connectez-vous » avec formulaire pseudo + mot de passe (required). Authentification via `POST /api/users/login`. Lien « Mot de passe oublié » vers `/oubli-pass`. Section « Nouveau sur le site ? » avec bouton « Adhérer à l'association » vers `/adhesion`.
- **Page Mot de passe oublié** (`/oubli-pass`) : Titre « Réinitialisation du mot de passe » (configurable). Formulaire email avec validation. Envoi via `POST /api/users/forgot-password`. Lien retour vers `/login`.
- **Contrôle d'accès** : Pages publiques (accueil, association, activités, programme, adhésion, contact, mentions légales, login, oubli-pass). Pages authentifiées (balades, documentation, trombinoscope, profil) avec redirection vers `/login`.
- **PDFs Statut et Charte** : Uploads configurables via Payload (global Home) pour le statut de l'association et la charte.
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
- `navigation-header` : Header avec logo VRNB à gauche, menus publics (Accueil, Association, Activités, Programme, Adhésion), menus connectés (Nos Balades, Documentation, Espace Adhérent, Profil), bouton Connexion (non connecté) / Déconnexion (connecté) à droite.
- `page-organisation` : Page affichant l'organisation du bureau (rôles et membres associés).
- `page-referents` : Page listant les référents de l'association avec les membres associés.
- `page-documentation` : Page listant les documentations en cartes (titre, description, catégorie, date, auteur) avec sidebar filtre par catégorie (composant `CategoryFilter` partagé).
- `pages-activites` : Pages par type d'activité avec titre, description et cards (nom, description, photo optionnelle). Contenu depuis la collection ActivitesContent.
- `page-programme` : Page programme avec photo, tableau des activités à venir (date, nom, catégorie, ville, actions avec bouton Détails), filtres par catégorie (composant commun), recherche et bouton filtrer.
- `page-detail-activite` : Page détail d'une activité (`/activites/detail/:id`) avec date/heure, nom, ville, organisateur (lien), durée, distance, lieu de rassemblement, info.
- `page-user-profil` : Page profil public d'un utilisateur (`/user/:id`).
- `page-mentions-legales` : Page mentions légales avec paragraphes configurables dans Payload.
- `page-contact` : Page contact avec formulaire (nom/prénom, email, message) et boutons envoyer/retour.
- `footer-links` : Liens footer (Qui sommes-nous, Mentions légales, Contact) + copyright.
- `pdfs-statut-charte` : Upload et gestion des PDFs statut et charte de l'association via Payload.
- `page-nos-balades` : Page galerie des balades passées avec photo d'en-tête, description, cards activités passées (titre, date, créateur, description, badge catégorie), sidebar filtre par catégorie (composant commun).
- `page-trombinoscope` : Trombinoscope des adhérents avec cartes (rôle, prénom NOM, photo optionnelle).
- `page-profil` : Page profil adhérent avec informations personnelles et bouton modifier.
- `gestion-adherents` : Authentification des adhérents, profil utilisateur, restriction d'accès admin via le système de référents.
- `gestion-contenu-admin` : Espace administrateur Payload pour gérer référents, bureau, activités, partenaires et actualités sans redéploiement.
- `photos-activites` : Upload et gestion de photos et albums photo liés aux activités.
- `page-adhesion` : Page adhésion (`/adhesion`) avec titre et description configurables via global Payload Adhesion. Accessible publiquement.
- `page-login` : Page connexion (`/login`) avec formulaire pseudo/mot de passe, authentification via Payload REST API, lien mot de passe oublié, section adhésion.
- `page-oubli-pass` : Page mot de passe oublié (`/oubli-pass`) avec formulaire email et envoi via `POST /api/users/forgot-password`.
- `access-control` : Contrôle d'accès frontend — pages publiques vs authentifiées avec redirection vers `/login`.

### Modified Capabilities

_(Aucune capacité existante modifiée — le dossier `openspec/specs/` est vide.)_

## Impact

- **Frontend** : Nouvelles pages Next.js dans `apps/web/src/app/(frontend)/` — accueil, presentation, organisation, referents, randosvelo, formations, projections, ecocitoyennete, pleinair, activites (programme), activites/detail/[id], user/[id], balades, documentation, espace-adherent/trombinoscope, mentionslegales, contact, adhesion, login, oubli-pass. Redirections permanentes : `/activite` → `/activites`, `/album` → `/balades`.
- **Layout** : Header avec logo VRNB, navigation multi-niveaux (menus publics + menus connectés), bouton connexion/déconnexion. Footer avec carousel partenaires, liens (Qui sommes-nous, Mentions légales, Contact) et copyright.
- **Composants partagés** : Composant `CategoryFilter` réutilisé entre Programme, Nos Balades et Documentation.
- **Globals Payload** : Global `Home` enrichie, nouveaux globals `MentionsLegales`, `Contact`, `Adhesion`.
- **Collections Payload** : Users, Referents, Bureaux, Activites, ActivitesContent, Partenaires, Actualites, Photos, PhotosAlbums, Media, Documentations, Categories, CategoriesFormations, Lieux, Etats.
- **Contrôle d'accès** : `src/access/canAccessAdmin.ts` — vérification du référent « site web ».
- **Dépendances** : Payload 3, Next.js 16, sharp, Google Maps embed (iframe).
