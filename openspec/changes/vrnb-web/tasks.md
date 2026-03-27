## 1. Layout partagé : Header et Footer

- [ ] 1.1 Créer le composant Header avec logo VRNB à gauche (upload depuis global Home, cliquable vers `/home`, fallback texte « VRNB ») et navigation (Accueil, Association avec sous-menu, Activités avec sous-menu, Nos Balades, Programme, Documentation, Espace Adhérent avec sous-menu, Profil) dans `src/app/(frontend)/`
- [ ] 1.2 Implémenter le sous-menu déroulant « Association » (Présentation, Organisation, Référents)
- [ ] 1.3 Implémenter le sous-menu déroulant « Activités » (Randonnées à vélo, Formations, Projections de films, Éco citoyenneté, Autres activités de plein air)
- [ ] 1.4 Implémenter le sous-menu déroulant « Espace Adhérent » (Trombinoscope) — visible uniquement pour les utilisateurs connectés
- [ ] 1.5 Implémenter le menu « Profil » — visible uniquement pour les utilisateurs connectés
- [ ] 1.6 Ajouter le menu « Adhésion » dans la navigation principale (visible pour tous les visiteurs, connectés ou non), lien vers `/adhesion`
- [ ] 1.7 Ajouter l'indicateur visuel de page active dans le header (menu et sous-menu)
- [ ] 1.8 Implémenter le bouton « Déconnexion » à droite du header (visible si connecté, appelle `POST /api/users/logout`, redirige vers `/home`)
- [ ] 1.9 Implémenter le bouton « Connexion » à droite du header (visible si non connecté, redirige vers `/login`)
- [ ] 1.10 Créer le composant Footer avec le carousel des partenaires (image, nom, URL)
- [ ] 1.11 Ajouter les liens du footer : « Qui sommes-nous ? » (`/presentation`), « Mentions légales » (`/mentionslegales`), « Contact » (`/contact`) + copyright « ©2026 VRNB » à droite
- [ ] 1.12 Mettre à jour le layout `src/app/(frontend)/layout.tsx` pour intégrer Header et Footer
- [ ] 1.13 Implémenter la visibilité conditionnelle des menus header : menus « Nos Balades », « Documentation », « Espace Adhérent », « Profil » visibles uniquement pour les utilisateurs connectés

## 2. Page d'accueil (`/home`)

- [ ] 2.1 Créer la route `src/app/(frontend)/home/page.tsx` et ajouter une redirection de `/` vers `/home`
- [ ] 2.2 Enrichir le global `Home` avec les nouveaux champs : upload logo, texte configurable 1 (richText), carousel photos (tableau d'uploads), texte configurable 2 (richText), bloc titre (text) + contenu (richText), 2 textes configurables bas de page (richText), upload PDF statut (relation DocsPdf/Media), upload PDF charte (relation DocsPdf/Media)
- [ ] 2.3 Afficher le logo VRNB en haut de page (upload depuis global Home)
- [ ] 2.4 Créer la grande carte contenant les 2 prochaines balades (requête Activites date >= aujourd'hui, limit 2, relations lieu populées) avec date, titre, lieu, heure RDV
- [ ] 2.5 Ajouter le texte « À noter sur vos agendas : » avec compteur d'événements à venir (count Activites) et lien vers `/activites`
- [ ] 2.6 Afficher le premier texte configurable (richText) sous la grande carte
- [ ] 2.7 Créer le carousel de photos auto-scroll (tableau d'uploads depuis global Home)
- [ ] 2.8 Afficher le deuxième texte configurable (richText) sous le carousel
- [ ] 2.9 Afficher le bloc titre + texte modifiables
- [ ] 2.10 Créer la section des 4 photos activités cliquables (Randonnées à vélo, Formations, Projections de films, Éco citoyenneté) avec titre superposé au centre et liens vers les routes activités
- [ ] 2.11 Afficher les 2 textes configurables en bas de page
- [ ] 2.12 Afficher les liens de téléchargement des PDFs « Statut de l'association » et « Charte de l'association » (uploads depuis global Home, affichage conditionnel)
- [ ] 2.13 Exécuter `bun run generate:types` après les modifications du global Home

## 3. Pages Association

- [ ] 3.1 Créer la route `src/app/(frontend)/presentation/page.tsx` (contenu de présentation du global Home)
- [ ] 3.2 Créer la route `src/app/(frontend)/organisation/page.tsx` avec requête Payload pour les postes du bureau et les utilisateurs associés
- [ ] 3.3 Créer la route `src/app/(frontend)/referents/page.tsx` avec requête Payload pour les référents et les utilisateurs associés
- [ ] 3.4 Afficher les postes du bureau triés par `ordre` avec nom + prénom du membre
- [ ] 3.5 Afficher les référents triés par `ordre` avec la liste des membres associés

## 4. Pages Activités

- [ ] 4.1 Créer la route `src/app/(frontend)/randosvelo/page.tsx` avec contenu depuis ActivitesContent (champs balade/escapade)
- [ ] 4.2 Créer la route `src/app/(frontend)/formations/page.tsx` avec contenu depuis ActivitesContent (champs mécanique, sécurité, secourisme, etc.)
- [ ] 4.3 Créer la route `src/app/(frontend)/projections/page.tsx` avec contenu depuis ActivitesContent (champs projection_film)
- [ ] 4.4 Créer la route `src/app/(frontend)/ecocitoyennete/page.tsx` avec contenu depuis ActivitesContent (champs ecocitoyennete)
- [ ] 4.5 Créer la route `src/app/(frontend)/pleinair/page.tsx` avec contenu depuis ActivitesContent (champs autre)
- [ ] 4.6 Créer le composant Card réutilisable avec layout trois colonnes (nom à gauche, description au milieu, photo optionnelle à droite)

## 5. Composant partagé CategoryFilter

- [ ] 5.1 Créer le composant client `CategoryFilter` dans `src/components/` avec checkboxes par catégorie, champ de recherche et bouton « Filtrer »
- [ ] 5.2 Définir les catégories fixes : Balade du dimanche, Escapade, Formations, Film documentaire, Éco-citoyenneté, Longe-côte, Réunion, Autres
- [ ] 5.3 Implémenter la logique de filtrage réactive (état React) exportable vers les pages consommatrices (Programme, Nos Balades, Documentation)

## 6. Page Programme

- [ ] 6.1 Créer la route `src/app/(frontend)/activites/page.tsx` avec requête Payload pour les activités à venir (date >= aujourd'hui, triées par date)
- [ ] 6.2 Afficher la photo d'en-tête du programme (configurable via admin)
- [ ] 6.3 Créer le composant tableau des activités avec colonnes : date, nom, catégorie (`categories_formation.libelle`), ville (`lieu.nom_ville`), actions
- [ ] 6.4 Ajouter le bouton « Détails » dans la colonne actions du tableau, redirigeant vers `/activites/detail/:id`
- [ ] 6.5 Intégrer le composant `CategoryFilter` partagé dans la sidebar de la page Programme
- [ ] 6.6 Implémenter le filtrage côté client par catégorie et recherche textuelle sur le nom

## 7. Page Nos Balades

- [ ] 7.1 Créer la route `src/app/(frontend)/balades/page.tsx` avec requête Payload pour les activités passées (date < aujourd'hui, triées par date décroissante)
- [ ] 7.2 Afficher la photo d'en-tête avec texte « Nos Balades » configurable (global Payload)
- [ ] 7.3 Afficher le texte de description introductive sous la photo d'en-tête
- [ ] 7.4 Créer le composant card pour les activités passées (titre, date, créateur, extrait description, badge catégorie)
- [ ] 7.5 Intégrer le composant `CategoryFilter` partagé dans la sidebar de la page Nos Balades
- [ ] 7.6 Implémenter le filtrage côté client par catégorie et recherche textuelle

## 8. Page Documentation

- [ ] 8.1 Créer la route `src/app/(frontend)/documentation/page.tsx` avec requête Payload pour les documentations (relations catégorie populées)
- [ ] 8.2 Créer le composant carte documentation (titre, description, catégorie, date de création, auteur)
- [ ] 8.3 Intégrer le composant `CategoryFilter` partagé dans la sidebar de la page Documentation
- [ ] 8.4 Implémenter le filtrage côté client par catégorie et recherche textuelle sur titre/auteur
- [ ] 8.5 Implémenter la vue détail d'une documentation (titre, auteur, date, paragraphes richText, images, PDFs)

## 9. Page Trombinoscope (Espace Adhérent)

- [ ] 9.1 Créer la route `src/app/(frontend)/espace-adherent/trombinoscope/page.tsx` avec requête Payload pour les utilisateurs actifs (relations bureau populées)
- [ ] 9.2 Implémenter la protection d'accès : redirection vers la page de connexion si l'utilisateur n'est pas connecté
- [ ] 9.3 Afficher le titre « Trombinoscope » en haut de la page
- [ ] 9.4 Créer le composant carte adhérent (rôle bureau, prénom NOM en majuscules, photo optionnelle ou avatar par défaut)
- [ ] 9.5 Trier les cartes par priorité de rôle bureau (Président en premier, puis autres rôles, puis adhérents par ordre alphabétique)
- [ ] 9.6 Ajouter un champ upload photo de profil à la collection Users si absent

## 10. Page Profil (`/user/[id]`)

- [ ] 10.1 Créer ou étendre la route `src/app/(frontend)/user/[id]/page.tsx` pour servir à la fois de profil public et de profil éditable (propre profil si userId === currentUserId)
- [ ] 10.2 Implémenter la protection d'accès : redirection vers la page de connexion si l'utilisateur n'est pas connecté
- [ ] 10.3 Afficher le titre « Mon profil » et la carte d'informations (pseudo, rôle, bureau, référent, nom, prénom, téléphone, email, date de naissance)
- [ ] 10.4 Implémenter le bouton « Modifier » (visible uniquement sur son propre profil) avec passage en mode formulaire (champs éditables : pseudo, nom, prénom, téléphone, date de naissance)
- [ ] 10.5 Implémenter la sauvegarde via `PATCH /api/users/:id` avec message de confirmation/erreur

## 11. Contrôle d'accès et authentification

- [ ] 11.1 Vérifier que la collection Users a `auth: true` et les champs obligatoires (email, username, nom, prenom)
- [ ] 11.2 Vérifier que `canAccessAdmin.ts` refuse l'accès admin aux utilisateurs sans le référent « site web »
- [ ] 11.3 Ajouter des contrôles d'accès sur les collections admin pour empêcher les adhérents non-admin de modifier le contenu via l'API
- [ ] 11.4 Ajouter un hook `beforeDelete` sur la collection Referents pour empêcher la suppression du référent « site web »

## 12. Gestion du contenu admin

- [ ] 12.1 Vérifier les collections Referents, Bureaux, Activites, Partenaires, Actualites avec tous les champs requis
- [ ] 12.2 Vérifier les relations : Activites → Etats, Lieux, organisateur, participants, categories_formation
- [ ] 12.3 Vérifier que le champ `affiche_actu` sur Actualites permet de masquer/afficher une actualité

## 13. Photos des activités

- [ ] 13.1 Vérifier que PhotosAlbums lie correctement les images aux activités
- [ ] 13.2 Vérifier que Media est configuré avec sharp pour le traitement d'images
- [ ] 13.3 Vérifier le stockage persistant dans le dossier `media/`

## 14. Page Détail Activité (`/activites/detail/[id]`)

- [ ] 14.1 Créer la route `src/app/(frontend)/activites/detail/[id]/page.tsx` avec requête Payload pour charger l'activité par ID (relations lieu, organisateur, categories_formation populées)
- [ ] 14.2 Afficher les informations principales : date et heure, nom de l'activité, ville (depuis lieu)
- [ ] 14.3 Créer la carte organisateur avec prénom + NOM (majuscules), photo ou avatar par défaut, lien vers `/user/:userId`
- [ ] 14.4 Afficher les informations complémentaires : durée (minutes), distance (km), point de rendez-vous, infos activité
- [ ] 14.5 Rendre le titre « Détails de l'activité » configurable via un global ou un champ admin

## 15. Page Mentions Légales (`/mentionslegales`)

- [ ] 15.1 Créer le global `MentionsLegales` dans Payload avec champs : titre (text), paragraphes (array avec titre text + contenu richText)
- [ ] 15.2 Créer la route `src/app/(frontend)/mentionslegales/page.tsx` avec chargement SSR du global MentionsLegales
- [ ] 15.3 Afficher le titre et les paragraphes configurés (itération sur le tableau)
- [ ] 15.4 Exécuter `bun run generate:types` après ajout du global

## 16. Page Contact (`/contact`)

- [ ] 16.1 Créer le global `Contact` dans Payload avec champs : titre (text, défaut « Nous contacter »), texte intro (richText)
- [ ] 16.2 Créer la route `src/app/(frontend)/contact/page.tsx` avec chargement SSR du global Contact
- [ ] 16.3 Créer le formulaire contact : champs « Nom et prénom » (text, required), « Email » (email, required), « Message » (textarea, required) — tous les champs sont obligatoires, le formulaire ne peut pas être soumis si un champ est vide
- [ ] 16.4 Implémenter le bouton « Envoyer » avec appel API (ex: `POST /api/contact`) pour envoi du formulaire
- [ ] 16.5 Implémenter le bouton « Retour » redirigeant vers `/home`
- [ ] 16.6 Créer un endpoint API custom ou un hook pour traiter la soumission du formulaire contact
- [ ] 16.7 Exécuter `bun run generate:types` après ajout du global

## 17. Page Adhésion (`/adhesion`)

- [ ] 17.1 Créer le global `Adhesion` dans Payload avec champs : titre (text, défaut « Adhésion »), description (richText)
- [ ] 17.2 Créer la route `src/app/(frontend)/adhesion/page.tsx` avec chargement SSR du global Adhesion
- [ ] 17.3 Afficher le titre et la description (richText) configurés
- [ ] 17.4 Exécuter `bun run generate:types` et `bun run generate:importmap` après ajout du global

## 18. Page Connexion (`/login`)

- [ ] 18.1 Créer la route `src/app/(frontend)/login/page.tsx` avec composant client pour le formulaire
- [ ] 18.2 Afficher la carte « Connectez-vous » (titre configurable via Payload) avec formulaire : champ Pseudo (text, required), champ Mot de passe (password, required), bouton « Se connecter »
- [ ] 18.3 Implémenter l'authentification via `POST /api/users/login` avec gestion des erreurs (identifiants incorrects, champs vides)
- [ ] 18.4 Rediriger vers `/home` après connexion réussie ; si déjà connecté, rediriger vers `/home`
- [ ] 18.5 Ajouter le lien « Mot de passe oublié » sous le formulaire, redirigeant vers `/oubli-pass`
- [ ] 18.6 Ajouter la section « Nouveau sur le site ? » avec bouton « Adhérer à l'association » redirigeant vers `/adhesion`

## 19. Page Mot de passe oublié (`/oubli-pass`)

- [ ] 19.1 Créer la route `src/app/(frontend)/oubli-pass/page.tsx` avec composant client pour le formulaire
- [ ] 19.2 Afficher le titre « Réinitialisation du mot de passe » (configurable via Payload)
- [ ] 19.3 Créer le formulaire : champ Email (email, required, validation format email), bouton « Envoyer »
- [ ] 19.4 Implémenter l'appel à `POST /api/users/forgot-password` avec message de confirmation générique
- [ ] 19.5 Ajouter le lien « Retour à la connexion » redirigeant vers `/login`

## 20. Contrôle d'accès frontend

- [ ] 20.1 Implémenter la protection d'accès sur la page Nos Balades (`/balades`) : redirection vers `/login` si non connecté
- [ ] 20.2 Implémenter la protection d'accès sur la page Documentation (`/documentation`) : redirection vers `/login` si non connecté
- [ ] 20.3 Vérifier la protection d'accès existante sur Trombinoscope (`/espace-adherent/trombinoscope`) : redirection vers `/login`
- [ ] 20.4 Vérifier la protection d'accès existante sur Profil (`/user/:id`) : redirection vers `/login`
- [ ] 20.5 Créer un composant ou middleware partagé de vérification d'authentification (helper `requireAuth`) réutilisable par toutes les pages protégées

## 21. Tests et validation

- [ ] 21.1 Écrire un test E2E vérifiant le header (logo VRNB, navigation publique, menus connectés, bouton Connexion/Déconnexion, sous-menus Activités, Association, Espace Adhérent, menu Adhésion)
- [ ] 21.2 Écrire un test E2E vérifiant le footer (liens Qui sommes-nous, Mentions légales, Contact, copyright)
- [ ] 21.3 Écrire un test E2E vérifiant l'affichage de la page d'accueil (présentation, cards, carte, partenaires, PDFs, hover photos activités)
- [ ] 21.4 Écrire un test E2E vérifiant la page Programme (tableau, filtres partagés, recherche, bouton Détails)
- [ ] 21.5 Écrire un test E2E vérifiant la page Détail Activité (informations, carte organisateur, lien profil)
- [ ] 21.6 Écrire un test E2E vérifiant la page Nos Balades (accès protégé, cards passées, filtres partagés, recherche)
- [ ] 21.7 Écrire un test E2E vérifiant la page Trombinoscope (accès protégé, cartes adhérents)
- [ ] 21.8 Écrire un test E2E vérifiant la page Profil unifiée (`/user/:id`, accès protégé, affichage public, édition propre profil, sauvegarde)
- [ ] 21.9 Écrire un test E2E vérifiant la page Mentions Légales (titre, paragraphes)
- [ ] 21.10 Écrire un test E2E vérifiant la page Contact (formulaire, champs obligatoires, envoi, bouton retour)
- [ ] 21.11 Écrire un test E2E vérifiant les redirections permanentes (`/activite` → `/activites`, `/album` → `/balades`)
- [ ] 21.12 Écrire un test E2E vérifiant la page Adhésion (titre, description configurables)
- [ ] 21.13 Écrire un test E2E vérifiant la page Connexion (formulaire, validation, authentification, lien oubli mot de passe, section adhésion)
- [ ] 21.14 Écrire un test E2E vérifiant la page Mot de passe oublié (formulaire email, validation, message de confirmation, lien retour)
- [ ] 21.15 Écrire un test E2E vérifiant le contrôle d'accès (pages protégées redirigent vers `/login`, pages publiques accessibles sans connexion)
- [ ] 21.16 Écrire un test d'intégration vérifiant l'accès admin (refusé sans référent, autorisé avec)
- [ ] 21.17 Exécuter `turbo lint` et `turbo check-types` pour valider le code
