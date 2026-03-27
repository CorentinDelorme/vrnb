## 1. Layout partagé : Header et Footer

- [x] 1.1 Créer le composant Header avec logo VRNB à gauche (upload depuis global Home, cliquable vers `/home`, fallback texte « VRNB ») et navigation (Accueil, Association avec sous-menu, Activités avec sous-menu, Nos Balades, Programme, Documentation, Espace Adhérent avec sous-menu, Profil) dans `src/app/(frontend)/`
- [x] 1.2 Implémenter le sous-menu déroulant « Association » (Présentation, Organisation, Référents)
- [x] 1.3 Implémenter le sous-menu déroulant « Activités » (Randonnées à vélo, Formations, Projections de films, Éco citoyenneté, Autres activités de plein air)
- [x] 1.4 Implémenter le sous-menu déroulant « Espace Adhérent » (Trombinoscope) — visible uniquement pour les utilisateurs connectés
- [x] 1.5 Implémenter le menu « Profil » — visible uniquement pour les utilisateurs connectés
- [x] 1.6 Ajouter le menu « Adhésion » dans la navigation principale (visible pour tous les visiteurs, connectés ou non), lien vers `/adhesion`
- [x] 1.7 Ajouter l'indicateur visuel de page active dans le header (menu et sous-menu)
- [x] 1.8 Implémenter le bouton « Déconnexion » à droite du header (visible si connecté, appelle `POST /api/users/logout`, redirige vers `/home`)
- [x] 1.9 Implémenter le bouton « Connexion » à droite du header (visible si non connecté, redirige vers `/login`)
- [x] 1.10 Créer le composant Footer avec le carousel des partenaires (image, nom, URL)
- [x] 1.11 Ajouter les liens du footer : « Qui sommes-nous ? » (`/presentation`), « Mentions légales » (`/mentionslegales`), « Contact » (`/contact`) + copyright « ©2026 VRNB » à droite
- [x] 1.12 Mettre à jour le layout `src/app/(frontend)/layout.tsx` pour intégrer Header et Footer
- [x] 1.13 Implémenter la visibilité conditionnelle des menus header : menus « Nos Balades », « Documentation », « Espace Adhérent », « Profil » visibles uniquement pour les utilisateurs connectés

## 2. Page d'accueil (`/home`)

- [x] 2.1 Créer la route `src/app/(frontend)/home/page.tsx` et ajouter une redirection de `/` vers `/home`
- [x] 2.2 Enrichir le global `Home` avec les nouveaux champs : upload logo, texte configurable 1 (richText), carousel photos (tableau d'uploads), texte configurable 2 (richText), bloc titre (text) + contenu (richText), 2 textes configurables bas de page (richText), upload PDF statut (relation DocsPdf/Media), upload PDF charte (relation DocsPdf/Media)
- [x] 2.3 Afficher le logo VRNB en haut de page (upload depuis global Home)
- [x] 2.4 Créer la grande carte contenant les 2 prochaines balades (requête Activites date >= aujourd'hui, limit 2, relations lieu populées) avec date, titre, lieu, heure RDV
- [x] 2.5 Ajouter le texte « À noter sur vos agendas : » avec compteur d'événements à venir (count Activites) et lien vers `/activites`
- [x] 2.6 Afficher le premier texte configurable (richText) sous la grande carte
- [x] 2.7 Créer le carousel de photos auto-scroll (tableau d'uploads depuis global Home)
- [x] 2.8 Afficher le deuxième texte configurable (richText) sous le carousel
- [x] 2.9 Afficher le bloc titre + texte modifiables
- [x] 2.10 Créer la section des 4 photos activités cliquables (Randonnées à vélo, Formations, Projections de films, Éco citoyenneté) avec titre superposé au centre et liens vers les routes activités
- [x] 2.11 Afficher les 2 textes configurables en bas de page
- [x] 2.12 Afficher les liens de téléchargement des PDFs « Statut de l'association » et « Charte de l'association » (uploads depuis global Home, affichage conditionnel)
- [x] 2.13 Exécuter `bun run generate:types` après les modifications du global Home

## 3. Pages Association

- [x] 3.1 Créer la route `src/app/(frontend)/presentation/page.tsx` (contenu de présentation du global Home)
- [x] 3.2 Créer la route `src/app/(frontend)/organisation/page.tsx` avec requête Payload pour les postes du bureau et les utilisateurs associés
- [x] 3.3 Créer la route `src/app/(frontend)/referents/page.tsx` avec requête Payload pour les référents et les utilisateurs associés
- [x] 3.4 Afficher les postes du bureau triés par `ordre` avec nom + prénom du membre
- [x] 3.5 Afficher les référents triés par `ordre` avec la liste des membres associés

## 4. Pages Activités

- [x] 4.1 Créer la route `src/app/(frontend)/randosvelo/page.tsx` avec contenu depuis ActivitesContent (champs balade/escapade)
- [x] 4.2 Créer la route `src/app/(frontend)/formations/page.tsx` avec contenu depuis ActivitesContent (champs mécanique, sécurité, secourisme, etc.)
- [x] 4.3 Créer la route `src/app/(frontend)/projections/page.tsx` avec contenu depuis ActivitesContent (champs projection_film)
- [x] 4.4 Créer la route `src/app/(frontend)/ecocitoyennete/page.tsx` avec contenu depuis ActivitesContent (champs ecocitoyennete)
- [x] 4.5 Créer la route `src/app/(frontend)/pleinair/page.tsx` avec contenu depuis ActivitesContent (champs autre)
- [x] 4.6 Utiliser le composant Card de `packages/ui` pour le layout trois colonnes (nom à gauche, description au milieu, photo optionnelle à droite)

## 5. Composant partagé CategoryFilter

- [x] 5.1 Déplacer/créer le composant client `CategoryFilter` dans `packages/ui/src/components/CategoryFilter/CategoryFilter.tsx` avec checkboxes par catégorie, champ de recherche et bouton « Filtrer » — utiliser uniquement les classes DaisyUI/TailwindCSS
- [x] 5.2 Définir les catégories fixes : Balade du dimanche, Escapade, Formations, Film documentaire, Éco-citoyenneté, Longe-côte, Réunion, Autres
- [x] 5.3 Implémenter la logique de filtrage réactive (état React) exportable vers les pages consommatrices (Programme, Nos Balades, Documentation)
- [x] 5.4 Créer `CategoryFilter.stories.ts` avec variantes (vide, avec catégories sélectionnées, avec recherche)
- [x] 5.5 Créer `CategoryFilter.test.tsx` avec tests unitaires (rendu, sélection de catégories, recherche, callback)

## 6. Page Programme

- [x] 6.1 Créer la route `src/app/(frontend)/activites/page.tsx` avec requête Payload pour les activités à venir (date >= aujourd'hui, triées par date)
- [x] 6.2 Afficher la photo d'en-tête du programme (configurable via admin)
- [x] 6.3 Créer le composant tableau des activités avec colonnes : date, nom, catégorie (`categories_formation.libelle`), ville (`lieu.nom_ville`), actions
- [x] 6.4 Ajouter le bouton « Détails » dans la colonne actions du tableau, redirigeant vers `/activites/detail/:id`
- [x] 6.5 Intégrer le composant `CategoryFilter` partagé dans la sidebar de la page Programme
- [x] 6.6 Implémenter le filtrage côté client par catégorie et recherche textuelle sur le nom

## 7. Page Nos Balades

- [x] 7.1 Créer la route `src/app/(frontend)/balades/page.tsx` avec requête Payload pour les activités passées (date < aujourd'hui, triées par date décroissante)
- [x] 7.2 Afficher la photo d'en-tête avec texte « Nos Balades » configurable (global Payload)
- [x] 7.3 Afficher le texte de description introductive sous la photo d'en-tête
- [x] 7.4 Créer le composant card pour les activités passées (titre, date, créateur, extrait description, badge catégorie)
- [x] 7.5 Intégrer le composant `CategoryFilter` partagé dans la sidebar de la page Nos Balades
- [x] 7.6 Implémenter le filtrage côté client par catégorie et recherche textuelle

## 8. Page Documentation

- [x] 8.1 Créer la route `src/app/(frontend)/documentation/page.tsx` avec requête Payload pour les documentations (relations catégorie populées)
- [x] 8.2 Créer le composant carte documentation (titre, description, catégorie, date de création, auteur)
- [x] 8.3 Intégrer le composant `CategoryFilter` partagé dans la sidebar de la page Documentation
- [x] 8.4 Implémenter le filtrage côté client par catégorie et recherche textuelle sur titre/auteur
- [x] 8.5 Implémenter la vue détail d'une documentation (titre, auteur, date, paragraphes richText, images, PDFs)

## 9. Page Trombinoscope (Espace Adhérent)

- [x] 9.1 Créer la route `src/app/(frontend)/espace-adherent/trombinoscope/page.tsx` avec requête Payload pour les utilisateurs actifs (relations bureau populées)
- [x] 9.2 Implémenter la protection d'accès : redirection vers la page de connexion si l'utilisateur n'est pas connecté
- [x] 9.3 Afficher le titre « Trombinoscope » en haut de la page
- [x] 9.4 Créer le composant carte adhérent (rôle bureau, prénom NOM en majuscules, photo optionnelle ou avatar par défaut)
- [x] 9.5 Trier les cartes par priorité de rôle bureau (Président en premier, puis autres rôles, puis adhérents par ordre alphabétique)
- [x] 9.6 Ajouter un champ upload photo de profil à la collection Users si absent

## 10. Page Profil (`/user/[id]`)

- [x] 10.1 Créer ou étendre la route `src/app/(frontend)/user/[id]/page.tsx` pour servir à la fois de profil public et de profil éditable (propre profil si userId === currentUserId)
- [x] 10.2 Implémenter la protection d'accès : redirection vers la page de connexion si l'utilisateur n'est pas connecté
- [x] 10.3 Afficher le titre « Mon profil » et la carte d'informations (pseudo, rôle, bureau, référent, nom, prénom, téléphone, email, date de naissance)
- [x] 10.4 Implémenter le bouton « Modifier » (visible uniquement sur son propre profil) avec passage en mode formulaire (champs éditables : pseudo, nom, prénom, téléphone, date de naissance)
- [x] 10.5 Implémenter la sauvegarde via `PATCH /api/users/:id` avec message de confirmation/erreur

## 11. Contrôle d'accès et authentification

- [x] 11.1 Vérifier que la collection Users a `auth: true` et les champs obligatoires (email, username, nom, prenom)
- [x] 11.2 Vérifier que `canAccessAdmin.ts` refuse l'accès admin aux utilisateurs sans le référent « site web »
- [x] 11.3 Ajouter des contrôles d'accès sur les collections admin pour empêcher les adhérents non-admin de modifier le contenu via l'API
- [x] 11.4 Ajouter un hook `beforeDelete` sur la collection Referents pour empêcher la suppression du référent « site web »

## 12. Gestion du contenu admin

- [x] 12.1 Vérifier les collections Referents, Bureaux, Activites, Partenaires, Actualites avec tous les champs requis
- [x] 12.2 Vérifier les relations : Activites → Etats, Lieux, organisateur, participants, categories_formation
- [x] 12.3 Vérifier que le champ `affiche_actu` sur Actualites permet de masquer/afficher une actualité

## 13. Photos des activités

- [x] 13.1 Vérifier que PhotosAlbums lie correctement les images aux activités
- [x] 13.2 Vérifier que Media est configuré avec sharp pour le traitement d'images
- [x] 13.3 Vérifier le stockage persistant dans le dossier `media/`

## 14. Page Détail Activité (`/activites/detail/[id]`)

- [x] 14.1 Créer la route `src/app/(frontend)/activites/detail/[id]/page.tsx` avec requête Payload pour charger l'activité par ID (relations lieu, organisateur, categories_formation populées)
- [x] 14.2 Afficher les informations principales : date et heure, nom de l'activité, ville (depuis lieu)
- [x] 14.3 Créer la carte organisateur avec prénom + NOM (majuscules), photo ou avatar par défaut, lien vers `/user/:userId`
- [x] 14.4 Afficher les informations complémentaires : durée (minutes), distance (km), point de rendez-vous, infos activité
- [x] 14.5 Rendre le titre « Détails de l'activité » configurable via un global ou un champ admin

## 15. Page Mentions Légales (`/mentionslegales`)

- [x] 15.1 Créer le global `MentionsLegales` dans Payload avec champs : titre (text), paragraphes (array avec titre text + contenu richText)
- [x] 15.2 Créer la route `src/app/(frontend)/mentionslegales/page.tsx` avec chargement SSR du global MentionsLegales
- [x] 15.3 Afficher le titre et les paragraphes configurés (itération sur le tableau)
- [x] 15.4 Exécuter `bun run generate:types` après ajout du global

## 16. Page Contact (`/contact`)

- [x] 16.1 Créer le global `Contact` dans Payload avec champs : titre (text, défaut « Nous contacter »), texte intro (richText)
- [x] 16.2 Créer la route `src/app/(frontend)/contact/page.tsx` avec chargement SSR du global Contact
- [x] 16.3 Créer le formulaire contact : champs « Nom et prénom » (text, required), « Email » (email, required), « Message » (textarea, required) — tous les champs sont obligatoires, le formulaire ne peut pas être soumis si un champ est vide
- [x] 16.4 Implémenter le bouton « Envoyer » avec appel API (ex: `POST /api/contact`) pour envoi du formulaire
- [x] 16.5 Implémenter le bouton « Retour » redirigeant vers `/home`
- [x] 16.6 Créer un endpoint API custom ou un hook pour traiter la soumission du formulaire contact
- [x] 16.7 Exécuter `bun run generate:types` après ajout du global

## 17. Page Adhésion (`/adhesion`)

- [x] 17.1 Créer le global `Adhesion` dans Payload avec champs : titre (text, défaut « Adhésion »), description (richText)
- [x] 17.2 Créer la route `src/app/(frontend)/adhesion/page.tsx` avec chargement SSR du global Adhesion
- [x] 17.3 Afficher le titre et la description (richText) configurés
- [x] 17.4 Exécuter `bun run generate:types` et `bun run generate:importmap` après ajout du global

## 18. Page Connexion (`/login`)

- [x] 18.1 Créer la route `src/app/(frontend)/login/page.tsx` avec composant client pour le formulaire
- [x] 18.2 Afficher la carte « Connectez-vous » (titre configurable via Payload) avec formulaire : champ Pseudo (text, required), champ Mot de passe (password, required), bouton « Se connecter »
- [x] 18.3 Implémenter l'authentification via `POST /api/users/login` avec gestion des erreurs (identifiants incorrects, champs vides)
- [x] 18.4 Rediriger vers `/home` après connexion réussie ; si déjà connecté, rediriger vers `/home`
- [x] 18.5 Ajouter le lien « Mot de passe oublié » sous le formulaire, redirigeant vers `/oubli-pass`
- [x] 18.6 Ajouter la section « Nouveau sur le site ? » avec bouton « Adhérer à l'association » redirigeant vers `/adhesion`

## 19. Page Mot de passe oublié (`/oubli-pass`)

- [x] 19.1 Créer la route `src/app/(frontend)/oubli-pass/page.tsx` avec composant client pour le formulaire
- [x] 19.2 Afficher le titre « Réinitialisation du mot de passe » (configurable via Payload)
- [x] 19.3 Créer le formulaire : champ Email (email, required, validation format email), bouton « Envoyer »
- [x] 19.4 Implémenter l'appel à `POST /api/users/forgot-password` avec message de confirmation générique
- [x] 19.5 Ajouter le lien « Retour à la connexion » redirigeant vers `/login`

## 20. Contrôle d'accès frontend

- [x] 20.1 Implémenter la protection d'accès sur la page Nos Balades (`/balades`) : redirection vers `/login` si non connecté
- [x] 20.2 Implémenter la protection d'accès sur la page Documentation (`/documentation`) : redirection vers `/login` si non connecté
- [x] 20.3 Vérifier la protection d'accès existante sur Trombinoscope (`/espace-adherent/trombinoscope`) : redirection vers `/login`
- [x] 20.4 Vérifier la protection d'accès existante sur Profil (`/user/:id`) : redirection vers `/login`
- [x] 20.5 Créer un composant ou middleware partagé de vérification d'authentification (helper `requireAuth`) réutilisable par toutes les pages protégées

## 21. Bibliothèque de composants UI (`packages/ui`)

- [x] 21.1 Créer la structure `packages/ui/src/components/` avec un dossier par composant
- [x] 21.2 Créer le composant `Button` (`packages/ui/src/components/Button/Button.tsx`) — variantes DaisyUI (btn-primary, btn-secondary, btn-outline, btn-ghost, tailles sm/md/lg, états disabled/loading) — aucun style en dur
- [x] 21.3 Créer `Button.stories.ts` et `Button.test.tsx`
- [x] 21.4 Créer le composant `Card` (`packages/ui/src/components/Card/Card.tsx`) — classes DaisyUI card, card-body, card-title, card-actions, variantes avec/sans image, avec/sans footer
- [x] 21.5 Créer `Card.stories.ts` et `Card.test.tsx`
- [x] 21.6 Créer le composant `Input` (`packages/ui/src/components/Input/Input.tsx`) — DaisyUI input, input-bordered, variantes text/email/password, label, erreur validation, required
- [x] 21.7 Créer `Input.stories.ts` et `Input.test.tsx`
- [x] 21.8 Créer le composant `Badge` (`packages/ui/src/components/Badge/Badge.tsx`) — DaisyUI badge avec variantes de couleur
- [x] 21.9 Créer `Badge.stories.ts` et `Badge.test.tsx`
- [x] 21.10 Créer le composant `Navbar` (`packages/ui/src/components/Navbar/Navbar.tsx`) — DaisyUI navbar, dropdown pour sous-menus, responsive, slots pour logo/menus/actions
- [x] 21.11 Créer `Navbar.stories.ts` et `Navbar.test.tsx`
- [x] 21.12 Créer le composant `Footer` (`packages/ui/src/components/Footer/Footer.tsx`) — DaisyUI footer, slots pour carousel/liens/copyright
- [x] 21.13 Créer `Footer.stories.ts` et `Footer.test.tsx`
- [x] 21.14 Créer le composant `Carousel` (`packages/ui/src/components/Carousel/Carousel.tsx`) — DaisyUI carousel avec auto-scroll CSS/JS léger
- [x] 21.15 Créer `Carousel.stories.ts` et `Carousel.test.tsx`
- [x] 21.16 Créer le composant `Table` (`packages/ui/src/components/Table/Table.tsx`) — DaisyUI table, colonnes configurables, rows dynamiques
- [x] 21.17 Créer `Table.stories.ts` et `Table.test.tsx`
- [x] 21.18 Créer le composant `Modal` (`packages/ui/src/components/Modal/Modal.tsx`) — DaisyUI modal avec open/close
- [x] 21.19 Créer `Modal.stories.ts` et `Modal.test.tsx`
- [x] 21.20 Créer le composant `Avatar` (`packages/ui/src/components/Avatar/Avatar.tsx`) — DaisyUI avatar avec image ou placeholder par défaut
- [x] 21.21 Créer `Avatar.stories.ts` et `Avatar.test.tsx`
- [x] 21.22 Créer le composant `FormField` (`packages/ui/src/components/FormField/FormField.tsx`) — wrapper label + input + message erreur, classes Tailwind
- [x] 21.23 Créer `FormField.stories.ts` et `FormField.test.tsx`
- [x] 21.24 Créer le composant `HeroImage` (`packages/ui/src/components/HeroImage/HeroImage.tsx`) — image pleine largeur avec titre superposé centré, classes DaisyUI hero
- [x] 21.25 Créer `HeroImage.stories.ts` et `HeroImage.test.tsx`
- [x] 21.26 Créer le composant `RichText` (`packages/ui/src/components/RichText/RichText.tsx`) — rendu de contenu richText Payload, classes Tailwind typography (prose)
- [x] 21.27 Créer `RichText.stories.ts` et `RichText.test.tsx`
- [x] 21.28 Exporter tous les composants depuis `packages/ui/src/index.ts`
- [x] 21.29 Vérifier que `apps/web` importe correctement les composants depuis `packages/ui`
- [x] 21.30 Migrer le composant Button existant (`packages/ui/stories/Button.tsx`) vers la nouvelle structure

## 22. Payload blocks communs

- [x] 22.1 Créer le block `RichTextBlock` dans `apps/web/src/blocks/RichTextBlock.ts` — champs : titre (text, optionnel), contenu (richText)
- [x] 22.2 Créer le block `HeroImageBlock` dans `apps/web/src/blocks/HeroImageBlock.ts` — champs : image (upload Media), titre superposé (text), description (richText, optionnel)
- [x] 22.3 Créer le block `CardListBlock` dans `apps/web/src/blocks/CardListBlock.ts` — champs : titre (text, optionnel), cards (array: titre, description, image optionnelle, lien optionnel)
- [x] 22.4 Créer le block `CarouselBlock` dans `apps/web/src/blocks/CarouselBlock.ts` — champs : titre (text, optionnel), images (array d'uploads Media)
- [x] 22.5 Créer le block `ContactFormBlock` dans `apps/web/src/blocks/ContactFormBlock.ts` — champs : titre (text), texte intro (richText), configuration
- [x] 22.6 Enregistrer les blocks dans `payload.config.ts`
- [x] 22.7 Créer les composants de rendu frontend pour chaque block dans `apps/web/src/components/blocks/` utilisant les composants de `packages/ui`
- [x] 22.8 Exécuter `bun run generate:types` et `bun run generate:importmap` après ajout des blocks

## 23. Tests et validation

- [x] 23.1 Écrire un test E2E vérifiant le header (logo VRNB, navigation publique, menus connectés, bouton Connexion/Déconnexion, sous-menus Activités, Association, Espace Adhérent, menu Adhésion)
- [x] 23.2 Écrire un test E2E vérifiant le footer (liens Qui sommes-nous, Mentions légales, Contact, copyright)
- [x] 23.3 Écrire un test E2E vérifiant l'affichage de la page d'accueil (présentation, cards, carte, partenaires, PDFs, hover photos activités)
- [x] 23.4 Écrire un test E2E vérifiant la page Programme (tableau, filtres partagés, recherche, bouton Détails)
- [x] 23.5 Écrire un test E2E vérifiant la page Détail Activité (informations, carte organisateur, lien profil)
- [x] 23.6 Écrire un test E2E vérifiant la page Nos Balades (accès protégé, cards passées, filtres partagés, recherche)
- [x] 23.7 Écrire un test E2E vérifiant la page Trombinoscope (accès protégé, cartes adhérents)
- [x] 23.8 Écrire un test E2E vérifiant la page Profil unifiée (`/user/:id`, accès protégé, affichage public, édition propre profil, sauvegarde)
- [x] 23.9 Écrire un test E2E vérifiant la page Mentions Légales (titre, paragraphes)
- [x] 23.10 Écrire un test E2E vérifiant la page Contact (formulaire, champs obligatoires, envoi, bouton retour)
- [x] 23.11 Écrire un test E2E vérifiant les redirections permanentes (`/activite` → `/activites`, `/album` → `/balades`)
- [x] 23.12 Écrire un test E2E vérifiant la page Adhésion (titre, description configurables)
- [x] 23.13 Écrire un test E2E vérifiant la page Connexion (formulaire, validation, authentification, lien oubli mot de passe, section adhésion)
- [x] 23.14 Écrire un test E2E vérifiant la page Mot de passe oublié (formulaire email, validation, message de confirmation, lien retour)
- [x] 23.15 Écrire un test E2E vérifiant le contrôle d'accès (pages protégées redirigent vers `/login`, pages publiques accessibles sans connexion)
- [x] 23.16 Vérifier que tous les composants `packages/ui` ont leurs stories Storybook et tests unitaires — exécuter `cd packages/ui && bun run storybook build` et `bun run test`
- [x] 23.17 Écrire un test d'intégration vérifiant l'accès admin (refusé sans référent, autorisé avec)
- [x] 23.18 Exécuter `turbo lint` et `turbo check-types` pour valider le code

## 24. Thèmes, accessibilité et vérification visuelle

- [x] 24.1 Vérifier que `packages/ui/app/globals.css` définit les thèmes `vrnb` (light, `--default`) et `vrnb-dark` (dark, `--prefersdark`) avec les tokens de couleur corrects
- [x] 24.2 Vérifier que le `<html>` du layout racine applique `data-theme="vrnb"` et que le basculement `prefers-color-scheme` fonctionne
- [x] 24.3 Vérifier qu'aucun composant dans `packages/ui/src/components/` n'utilise de couleurs en dur (hex, rgb, oklch) — uniquement des classes sémantiques DaisyUI
- [x] 24.4 Vérifier qu'aucun thème DaisyUI autre que `vrnb` et `vrnb-dark` n'est référencé dans le code source
- [x] 24.5 Vérifier les contrastes WCAG AA (4.5:1 texte normal, 3:1 texte large/éléments interactifs) pour toutes les combinaisons couleur du thème `vrnb`
- [x] 24.6 Vérifier les contrastes WCAG AA pour le thème `vrnb-dark` — ajuster les tokens dans `globals.css` si nécessaire (notamment base-100 et base-content pour le mode sombre)
- [x] 24.7 Vérifier que les composants ne surchargent pas les espacements internes DaisyUI avec des classes Tailwind `p-*`, `m-*` redondantes
- [x] 24.8 Lancer un audit Lighthouse accessibilité via Chrome DevTools MCP sur chaque story Storybook — objectif score ≥ 90
- [x] 24.9 Prendre un screenshot via Chrome DevTools MCP de chaque composant UI dans Storybook pour vérification visuelle
- [x] 24.10 Lancer un audit Lighthouse accessibilité via Chrome DevTools MCP sur chaque page du site — objectif score ≥ 90
- [x] 24.11 Vérifier l'affichage responsive de chaque page via Chrome DevTools MCP sur mobile (375px), tablette (768px) et desktop (1280px)
- [x] 24.12 Vérifier visuellement que les couleurs du thème VRNB/VRNB-DARK sont correctement appliquées sur toutes les pages via Chrome DevTools MCP
- [x] 24.13 Vérifier que tout le code source (composants, props, variables, fonctions, hooks, commentaires, tests, stories) est rédigé en anglais — sauf les noms d'entités métier Payload en français (Referents, Activites, Bureaux, etc.)
- [x] 24.14 Vérifier qu'aucun texte UI visible par l'utilisateur n'est codé en dur dans les composants — les textes français sont configurables via Payload
