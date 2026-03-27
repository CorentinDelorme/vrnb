## 1. Layout partagé : Header et Footer

- [ ] 1.1 Créer le composant Header avec navigation (Accueil, Association avec sous-menu, Documentation) dans `src/app/(frontend)/`
- [ ] 1.2 Créer le composant Footer avec le carousel des partenaires (image, nom, URL)
- [ ] 1.3 Mettre à jour le layout `src/app/(frontend)/layout.tsx` pour intégrer Header et Footer
- [ ] 1.4 Ajouter l'indicateur visuel de page active dans le header
- [ ] 1.5 Implémenter le sous-menu déroulant « Association » (Présentation, Organisation, Référents)

## 2. Page d'accueil enrichie

- [ ] 2.1 Enrichir le global `Home` avec les champs : titre présentation, description, URL Google Maps, tableau de cards (titre + description), upload PDF statut, upload PDF charte
- [ ] 2.2 Mettre à jour `HomePageClient.tsx` pour afficher la section présentation (titre + description)
- [ ] 2.3 Ajouter l'iframe Google Maps sur la page d'accueil
- [ ] 2.4 Ajouter la section cards activités/devises sur la page d'accueil
- [ ] 2.5 Ajouter les liens de téléchargement des PDFs statut et charte
- [ ] 2.6 Remplacer la liste statique des partenaires par le carousel du footer
- [ ] 2.7 Exécuter `bun run generate:types` après les modifications du global Home

## 3. Pages Association

- [ ] 3.1 Créer la route `src/app/(frontend)/association/presentation/page.tsx` (peut pointer vers le contenu de présentation du global Home)
- [ ] 3.2 Créer la route `src/app/(frontend)/association/organisation/page.tsx` avec requête Payload pour les postes du bureau et les utilisateurs associés
- [ ] 3.3 Créer la route `src/app/(frontend)/association/referents/page.tsx` avec requête Payload pour les référents et les utilisateurs associés
- [ ] 3.4 Afficher les postes du bureau triés par `ordre` avec nom + prénom du membre
- [ ] 3.5 Afficher les référents triés par `ordre` avec la liste des membres associés

## 4. Page Documentation

- [ ] 4.1 Créer la route `src/app/(frontend)/documentation/page.tsx` (structure de base)

## 5. Contrôle d'accès et authentification

- [ ] 5.1 Vérifier que la collection Users a `auth: true` et les champs obligatoires (email, username, nom, prenom)
- [ ] 5.2 Vérifier que `canAccessAdmin.ts` refuse l'accès admin aux utilisateurs sans le référent « site web »
- [ ] 5.3 Ajouter des contrôles d'accès sur les collections admin pour empêcher les adhérents non-admin de modifier le contenu via l'API
- [ ] 5.4 Ajouter un hook `beforeDelete` sur la collection Referents pour empêcher la suppression du référent « site web »

## 6. Gestion du contenu admin

- [ ] 6.1 Vérifier les collections Referents, Bureaux, Activites, Partenaires, Actualites avec tous les champs requis
- [ ] 6.2 Vérifier les relations : Activites → Etats, Lieux, organisateur, participants
- [ ] 6.3 Vérifier que le champ `affiche_actu` sur Actualites permet de masquer/afficher une actualité

## 7. Photos des activités

- [ ] 7.1 Vérifier que PhotosAlbums lie correctement les images aux activités
- [ ] 7.2 Vérifier que Media est configuré avec sharp pour le traitement d'images
- [ ] 7.3 Vérifier le stockage persistant dans le dossier `media/`

## 8. Tests et validation

- [ ] 8.1 Écrire un test E2E vérifiant le header et la navigation (menus, sous-menus)
- [ ] 8.2 Écrire un test E2E vérifiant l'affichage de la page d'accueil (présentation, cards, carte, partenaires)
- [ ] 8.3 Écrire un test d'intégration vérifiant l'accès admin (refusé sans référent, autorisé avec)
- [ ] 8.4 Exécuter `turbo lint` et `turbo check-types` pour valider le code
