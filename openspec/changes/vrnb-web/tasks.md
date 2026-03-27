## 1. Layout partagé : Header et Footer

- [ ] 1.1 Créer le composant Header avec navigation (Accueil, Association avec sous-menu, Activités avec sous-menu, Programme, Documentation) dans `src/app/(frontend)/`
- [ ] 1.2 Implémenter le sous-menu déroulant « Association » (Présentation, Organisation, Référents)
- [ ] 1.3 Implémenter le sous-menu déroulant « Activités » (Randonnées à vélo, Formations, Projections de films, Éco citoyenneté, Autres activités de plein air)
- [ ] 1.4 Ajouter l'indicateur visuel de page active dans le header (menu et sous-menu)
- [ ] 1.5 Créer le composant Footer avec le carousel des partenaires (image, nom, URL)
- [ ] 1.6 Mettre à jour le layout `src/app/(frontend)/layout.tsx` pour intégrer Header et Footer

## 2. Page d'accueil enrichie

- [ ] 2.1 Enrichir le global `Home` avec les champs : titre présentation, description, URL Google Maps, tableau de cards (titre + description), upload PDF statut, upload PDF charte
- [ ] 2.2 Mettre à jour `HomePageClient.tsx` pour afficher la section présentation (titre + description)
- [ ] 2.3 Ajouter l'iframe Google Maps sur la page d'accueil
- [ ] 2.4 Ajouter la section cards activités/devises sur la page d'accueil
- [ ] 2.5 Ajouter les liens de téléchargement des PDFs statut et charte
- [ ] 2.6 Remplacer la liste statique des partenaires par le carousel du footer
- [ ] 2.7 Exécuter `bun run generate:types` après les modifications du global Home

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

## 5. Page Programme

- [ ] 5.1 Créer la route `src/app/(frontend)/programme/page.tsx` avec requête Payload pour les activités à venir (date >= aujourd'hui, triées par date)
- [ ] 5.2 Afficher la photo d'en-tête du programme (configurable via admin)
- [ ] 5.3 Créer le composant tableau des activités avec colonnes : date, nom, catégorie (`categories_formation.libelle`), ville (`lieu.nom_ville`), actions
- [ ] 5.4 Créer la sidebar de filtres avec checkboxes des catégories (depuis CategoriesFormations), champ de recherche et bouton « Filtrer »
- [ ] 5.5 Implémenter le filtrage côté client par catégorie et recherche textuelle sur le nom

## 6. Page Documentation

- [ ] 6.1 Créer la route `src/app/(frontend)/documentation/page.tsx` avec requête Payload pour les documentations groupées par catégorie
- [ ] 6.2 Afficher chaque documentation avec titre, auteur, intro et lien de lecture

## 7. Contrôle d'accès et authentification

- [ ] 7.1 Vérifier que la collection Users a `auth: true` et les champs obligatoires (email, username, nom, prenom)
- [ ] 7.2 Vérifier que `canAccessAdmin.ts` refuse l'accès admin aux utilisateurs sans le référent « site web »
- [ ] 7.3 Ajouter des contrôles d'accès sur les collections admin pour empêcher les adhérents non-admin de modifier le contenu via l'API
- [ ] 7.4 Ajouter un hook `beforeDelete` sur la collection Referents pour empêcher la suppression du référent « site web »

## 8. Gestion du contenu admin

- [ ] 8.1 Vérifier les collections Referents, Bureaux, Activites, Partenaires, Actualites avec tous les champs requis
- [ ] 8.2 Vérifier les relations : Activites → Etats, Lieux, organisateur, participants, categories_formation
- [ ] 8.3 Vérifier que le champ `affiche_actu` sur Actualites permet de masquer/afficher une actualité

## 9. Photos des activités

- [ ] 9.1 Vérifier que PhotosAlbums lie correctement les images aux activités
- [ ] 9.2 Vérifier que Media est configuré avec sharp pour le traitement d'images
- [ ] 9.3 Vérifier le stockage persistant dans le dossier `media/`

## 10. Tests et validation

- [ ] 10.1 Écrire un test E2E vérifiant le header et la navigation (menus, sous-menus Activités et Association)
- [ ] 10.2 Écrire un test E2E vérifiant l'affichage de la page d'accueil (présentation, cards, carte, partenaires)
- [ ] 10.3 Écrire un test E2E vérifiant la page Programme (tableau, filtres, recherche)
- [ ] 10.4 Écrire un test d'intégration vérifiant l'accès admin (refusé sans référent, autorisé avec)
- [ ] 10.5 Exécuter `turbo lint` et `turbo check-types` pour valider le code
