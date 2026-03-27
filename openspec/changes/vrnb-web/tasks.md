## 1. Layout partagé : Header et Footer

- [ ] 1.1 Créer le composant Header avec navigation (Accueil, Association avec sous-menu, Activités avec sous-menu, Nos Balades, Programme, Documentation, Espace Adhérent avec sous-menu, Profil) dans `src/app/(frontend)/`
- [ ] 1.2 Implémenter le sous-menu déroulant « Association » (Présentation, Organisation, Référents)
- [ ] 1.3 Implémenter le sous-menu déroulant « Activités » (Randonnées à vélo, Formations, Projections de films, Éco citoyenneté, Autres activités de plein air)
- [ ] 1.4 Implémenter le sous-menu déroulant « Espace Adhérent » (Trombinoscope) — visible uniquement pour les utilisateurs connectés
- [ ] 1.5 Implémenter le menu « Profil » — visible uniquement pour les utilisateurs connectés
- [ ] 1.6 Ajouter l'indicateur visuel de page active dans le header (menu et sous-menu)
- [ ] 1.7 Créer le composant Footer avec le carousel des partenaires (image, nom, URL)
- [ ] 1.8 Mettre à jour le layout `src/app/(frontend)/layout.tsx` pour intégrer Header et Footer

## 2. Page d'accueil (`/home`)

- [ ] 2.1 Créer la route `src/app/(frontend)/home/page.tsx` et ajouter une redirection de `/` vers `/home`
- [ ] 2.2 Enrichir le global `Home` avec les nouveaux champs : upload logo, texte configurable 1 (richText), carousel photos (tableau d'uploads), texte configurable 2 (richText), bloc titre (text) + contenu (richText), 2 textes configurables bas de page (richText)
- [ ] 2.3 Afficher le logo VRNB en haut de page (upload depuis global Home)
- [ ] 2.4 Créer la grande carte contenant les 2 prochaines balades (requête Activites date >= aujourd'hui, limit 2, relations lieu populées) avec date, titre, lieu, heure RDV
- [ ] 2.5 Ajouter le texte « À noter sur vos agendas : » avec compteur d'événements à venir (count Activites) et lien vers `/activites`
- [ ] 2.6 Afficher le premier texte configurable (richText) sous la grande carte
- [ ] 2.7 Créer le carousel de photos auto-scroll (tableau d'uploads depuis global Home)
- [ ] 2.8 Afficher le deuxième texte configurable (richText) sous le carousel
- [ ] 2.9 Afficher le bloc titre + texte modifiables
- [ ] 2.10 Créer la section des 4 photos activités cliquables (Randonnées à vélo, Formations, Projections de films, Éco citoyenneté) avec titre superposé au centre et liens vers les routes activités
- [ ] 2.11 Afficher les 2 textes configurables en bas de page
- [ ] 2.12 Exécuter `bun run generate:types` après les modifications du global Home

## 3. Pages Association

- [ ] 3.1 Créer la route `src/app/(frontend)/association/presentation/page.tsx` (contenu de présentation du global Home)
- [ ] 3.2 Créer la route `src/app/(frontend)/association/organisation/page.tsx` avec requête Payload pour les postes du bureau et les utilisateurs associés
- [ ] 3.3 Créer la route `src/app/(frontend)/association/referents/page.tsx` avec requête Payload pour les référents et les utilisateurs associés
- [ ] 3.4 Afficher les postes du bureau triés par `ordre` avec nom + prénom du membre
- [ ] 3.5 Afficher les référents triés par `ordre` avec la liste des membres associés

## 4. Pages Activités

- [ ] 4.1 Créer la route `src/app/(frontend)/activites/randonnees-velo/page.tsx` avec contenu depuis ActivitesContent (champs balade/escapade)
- [ ] 4.2 Créer la route `src/app/(frontend)/activites/formations/page.tsx` avec contenu depuis ActivitesContent (champs mécanique, sécurité, secourisme, etc.)
- [ ] 4.3 Créer la route `src/app/(frontend)/activites/projections-films/page.tsx` avec contenu depuis ActivitesContent (champs projection_film)
- [ ] 4.4 Créer la route `src/app/(frontend)/activites/eco-citoyennete/page.tsx` avec contenu depuis ActivitesContent (champs ecocitoyennete)
- [ ] 4.5 Créer la route `src/app/(frontend)/activites/autres-plein-air/page.tsx` avec contenu depuis ActivitesContent (champs autre)
- [ ] 4.6 Créer le composant Card réutilisable avec layout trois colonnes (nom à gauche, description au milieu, photo optionnelle à droite)

## 5. Composant partagé CategoryFilter

- [ ] 5.1 Créer le composant client `CategoryFilter` dans `src/components/` avec checkboxes par catégorie, champ de recherche et bouton « Filtrer »
- [ ] 5.2 Définir les catégories fixes : Balade du dimanche, Escapade, Formations, Film documentaire, Éco-citoyenneté, Longe-côte, Réunion, Autres
- [ ] 5.3 Implémenter la logique de filtrage réactive (état React) exportable vers les pages consommatrices (Programme, Nos Balades, Documentation)

## 6. Page Programme

- [ ] 6.1 Créer la route `src/app/(frontend)/programme/page.tsx` avec requête Payload pour les activités à venir (date >= aujourd'hui, triées par date)
- [ ] 6.2 Afficher la photo d'en-tête du programme (configurable via admin)
- [ ] 6.3 Créer le composant tableau des activités avec colonnes : date, nom, catégorie (`categories_formation.libelle`), ville (`lieu.nom_ville`), actions
- [ ] 6.4 Intégrer le composant `CategoryFilter` partagé dans la sidebar de la page Programme
- [ ] 6.5 Implémenter le filtrage côté client par catégorie et recherche textuelle sur le nom

## 7. Page Nos Balades

- [ ] 7.1 Créer la route `src/app/(frontend)/nos-balades/page.tsx` avec requête Payload pour les activités passées (date < aujourd'hui, triées par date décroissante)
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

## 10. Page Profil

- [ ] 10.1 Créer la route `src/app/(frontend)/profil/page.tsx` avec données de l'utilisateur connecté (relations bureau et referents populées)
- [ ] 10.2 Implémenter la protection d'accès : redirection vers la page de connexion si l'utilisateur n'est pas connecté
- [ ] 10.3 Afficher le titre « Mon profil » et la carte d'informations (pseudo, rôle, bureau, référent, nom, prénom, téléphone, email, date de naissance)
- [ ] 10.4 Implémenter le bouton « Modifier » avec passage en mode formulaire (champs éditables : pseudo, nom, prénom, téléphone, date de naissance)
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

## 14. Tests et validation

- [ ] 14.1 Écrire un test E2E vérifiant le header et la navigation (menus, sous-menus Activités, Association, Espace Adhérent)
- [ ] 14.2 Écrire un test E2E vérifiant l'affichage de la page d'accueil (présentation, cards, carte, partenaires)
- [ ] 14.3 Écrire un test E2E vérifiant la page Programme (tableau, filtres partagés, recherche)
- [ ] 14.4 Écrire un test E2E vérifiant la page Nos Balades (cards passées, filtres partagés, recherche)
- [ ] 14.5 Écrire un test E2E vérifiant la page Trombinoscope (accès protégé, cartes adhérents)
- [ ] 14.6 Écrire un test E2E vérifiant la page Profil (affichage, édition, sauvegarde)
- [ ] 14.7 Écrire un test d'intégration vérifiant l'accès admin (refusé sans référent, autorisé avec)
- [ ] 14.8 Exécuter `turbo lint` et `turbo check-types` pour valider le code
