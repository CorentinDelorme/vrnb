## ADDED Requirements

### Requirement: Composants UI dans `packages/ui` avec DaisyUI et TailwindCSS

Tous les composants UI réutilisables (boutons, inputs, cards, badges, navbar, footer, carousel, table, modal, avatar, formulaire, etc.) DOIVENT être définis dans le package `packages/ui/src/components/`. Chaque composant DOIT avoir son propre dossier contenant le composant, sa story Storybook et ses tests unitaires. Les composants DOIVENT utiliser exclusivement les classes DaisyUI et TailwindCSS. Aucun style en dur (`style={{}}`, CSS modules, inline CSS) n'est autorisé.

#### Scenario: Structure d'un composant

- **GIVEN** un composant `Button`
- **THEN** il existe un dossier `packages/ui/src/components/Button/`
- **AND** ce dossier contient `Button.tsx`, `Button.stories.ts` et `Button.test.tsx`

#### Scenario: Pas de style en dur

- **WHEN** un développeur crée ou modifie un composant dans `packages/ui`
- **THEN** le composant utilise uniquement des classes TailwindCSS et DaisyUI
- **AND** aucune propriété `style={{}}`, aucun CSS module, aucun inline CSS n'est utilisé

#### Scenario: Import depuis `apps/web`

- **WHEN** une page dans `apps/web` a besoin d'un composant UI
- **THEN** elle importe le composant depuis `packages/ui` (ex : `import { Button } from 'ui'`)

### Requirement: Stories Storybook pour chaque composant

Chaque composant dans `packages/ui` DOIT avoir un fichier `.stories.ts` Storybook documentant ses variantes (tailles, couleurs, états, props optionnelles).

#### Scenario: Story par défaut

- **GIVEN** un composant `Button`
- **THEN** `Button.stories.ts` exporte au minimum une story `Default`
- **AND** des stories supplémentaires pour les variantes (Primary, Secondary, Outline, Disabled, Loading, etc.)

#### Scenario: Build Storybook sans erreur

- **WHEN** on exécute `cd packages/ui && bun run build-storybook`
- **THEN** le build se termine sans erreur

### Requirement: Tests unitaires pour chaque composant

Chaque composant dans `packages/ui` DOIT avoir un fichier `.test.tsx` avec des tests unitaires Vitest vérifiant le rendu, les props, les interactions et l'accessibilité.

#### Scenario: Tests du composant Button

- **GIVEN** un composant `Button`
- **THEN** `Button.test.tsx` vérifie au minimum :
  - Le rendu par défaut
  - L'application des variantes (classes CSS correctes)
  - L'état disabled
  - Le déclenchement du callback onClick

#### Scenario: Exécution des tests sans erreur

- **WHEN** on exécute `cd packages/ui && bun run test`
- **THEN** tous les tests passent sans erreur

### Requirement: Liste des composants UI requis

Le package `packages/ui` DOIT fournir les composants suivants :

- `Button` : Bouton avec variantes DaisyUI (primary, secondary, outline, ghost, tailles sm/md/lg, états disabled/loading)
- `Card` : Carte avec image optionnelle, titre, contenu et actions — classes DaisyUI card
- `Input` : Champ de saisie avec variantes (text, email, password), label, message d'erreur — classes DaisyUI input
- `Badge` : Badge avec variantes de couleur — classes DaisyUI badge
- `Navbar` : Barre de navigation avec slots logo, menus, actions, dropdown pour sous-menus — classes DaisyUI navbar
- `Footer` : Pied de page avec slots pour carousel, liens et copyright — classes DaisyUI footer
- `Carousel` : Carousel d'images avec auto-scroll — classes DaisyUI carousel ou CSS/JS léger
- `Table` : Tableau avec colonnes configurables et rows dynamiques — classes DaisyUI table
- `Modal` : Modale avec ouverture/fermeture — classes DaisyUI modal
- `Avatar` : Avatar avec image ou placeholder par défaut — classes DaisyUI avatar
- `FormField` : Wrapper label + input + message erreur — classes Tailwind form-control
- `CategoryFilter` : Sidebar avec checkboxes par catégorie, champ de recherche et bouton filtrer
- `HeroImage` : Image pleine largeur avec titre superposé centré — classes DaisyUI hero
- `RichText` : Rendu de contenu richText avec classes Tailwind typography (prose)

#### Scenario: Export centralisé

- **WHEN** un composant est ajouté à `packages/ui`
- **THEN** il est exporté depuis `packages/ui/src/index.ts`

### Requirement: Payload blocks communs et génériques

Des blocks Payload réutilisables DOIVENT être créés dans `apps/web/src/blocks/` pour les patterns de contenu récurrents. Les textes configurés dans ces blocks DOIVENT être modifiables dans l'espace administrateur Payload et ne DOIVENT JAMAIS être codés en dur dans le frontend. Les blocks utilisent les composants UI de `packages/ui` pour le rendu frontend.

#### Scenario: Block RichTextBlock

- **GIVEN** un global ou une collection utilisant le block `RichTextBlock`
- **THEN** l'administrateur peut configurer un titre optionnel (text) et un contenu (richText)
- **AND** le rendu frontend utilise le composant `RichText` de `packages/ui`

#### Scenario: Block HeroImageBlock

- **GIVEN** un global ou une collection utilisant le block `HeroImageBlock`
- **THEN** l'administrateur peut configurer une image (upload), un titre superposé (text) et une description optionnelle (richText)
- **AND** le rendu frontend utilise le composant `HeroImage` de `packages/ui`

#### Scenario: Block CardListBlock

- **GIVEN** un global ou une collection utilisant le block `CardListBlock`
- **THEN** l'administrateur peut configurer un titre optionnel et un tableau de cards (titre, description, image, lien)
- **AND** le rendu frontend utilise le composant `Card` de `packages/ui`

#### Scenario: Block CarouselBlock

- **GIVEN** un global ou une collection utilisant le block `CarouselBlock`
- **THEN** l'administrateur peut configurer un titre optionnel et un tableau d'images (uploads)
- **AND** le rendu frontend utilise le composant `Carousel` de `packages/ui`

#### Scenario: Block ContactFormBlock

- **GIVEN** un global ou une collection utilisant le block `ContactFormBlock`
- **THEN** l'administrateur peut configurer un titre et un texte d'introduction (richText)
- **AND** le rendu frontend utilise les composants `FormField`, `Input` et `Button` de `packages/ui`

### Requirement: Séparation stricte packages/ui et apps/web

Le package `packages/ui` ne DOIT PAS dépendre de Payload CMS, de Next.js server components, ni de la base de données. Il ne contient que des composants React client purs avec DaisyUI/TailwindCSS. Toute logique Payload (blocks, hooks, requêtes, accès) reste dans `apps/web`.

#### Scenario: Pas de dépendance Payload dans packages/ui

- **WHEN** on examine le `package.json` de `packages/ui`
- **THEN** il ne contient aucune dépendance vers `payload`, `@payloadcms/*` ou `mongodb`

#### Scenario: Composants client uniquement

- **WHEN** un composant de `packages/ui` est importé
- **THEN** il peut être utilisé comme composant client React sans directive serveur
