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

### Requirement: Thèmes DaisyUI exclusifs VRNB et VRNB-DARK

Tous les composants UI DOIVENT utiliser exclusivement les thèmes DaisyUI personnalisés `vrnb` (light) et `vrnb-dark` (dark) définis dans `packages/ui/app/globals.css`. Aucun autre thème DaisyUI (light, dark, cupcake, etc.) ne DOIT être référencé ni utilisé. Les composants utilisent les classes sémantiques DaisyUI (`btn-primary`, `bg-base-100`, `text-base-content`, etc.) qui héritent des couleurs du thème actif. Aucune couleur en dur (hex, rgb, oklch) ne DOIT apparaître dans le code des composants.

#### Scenario: Utilisation exclusive des tokens DaisyUI

- **WHEN** un composant utilise une couleur
- **THEN** il utilise une classe sémantique DaisyUI (`text-primary`, `bg-base-200`, `border-base-300`, etc.)
- **AND** aucune valeur hex, rgb, ou oklch n'apparaît dans le code du composant

#### Scenario: Pas de thème DaisyUI tiers

- **WHEN** on recherche `data-theme` dans le code source
- **THEN** seules les valeurs `vrnb` et `vrnb-dark` sont utilisées

#### Scenario: Compatibilité light et dark

- **GIVEN** un composant rendu avec `data-theme="vrnb"`
- **AND** le même composant rendu avec `data-theme="vrnb-dark"`
- **THEN** les deux rendus sont visuellement cohérents et le texte est lisible sur les deux thèmes

### Requirement: Accessibilité et contrastes WCAG AA

Tous les composants UI DOIVENT respecter les ratios de contraste WCAG AA : 4.5:1 pour le texte normal, 3:1 pour le texte large (≥ 18px ou ≥ 14px bold) et les éléments interactifs. Les composants DOIVENT être accessibles au clavier et aux lecteurs d'écran.

#### Scenario: Contraste texte sur fond

- **GIVEN** un composant avec du texte affiché sur un fond
- **THEN** le ratio de contraste entre la couleur du texte et la couleur du fond est ≥ 4.5:1 (texte normal) ou ≥ 3:1 (texte large)
- **AND** cela est vérifié pour les deux thèmes (vrnb et vrnb-dark)

#### Scenario: Audit Lighthouse accessibilité

- **WHEN** on lance un audit Lighthouse accessibilité sur une page ou une story Storybook
- **THEN** le score d'accessibilité est ≥ 90

#### Scenario: Labels et ARIA sur les formulaires

- **GIVEN** un composant formulaire (Input, FormField, etc.)
- **THEN** chaque champ a un `<label>` associé via `htmlFor`/`id`
- **AND** les messages d'erreur utilisent `aria-describedby`
- **AND** les champs obligatoires ont `aria-required="true"`

#### Scenario: Images accessibles

- **GIVEN** un composant affichant une image
- **THEN** les images informatives ont un attribut `alt` descriptif
- **AND** les images décoratives ont `alt=""`

### Requirement: Style moderne, épuré et aéré

Les composants UI DOIVENT suivre un style moderne, épuré et bien aéré. Les espacements internes des composants DaisyUI ne DOIVENT PAS être surchargés. Les classes Tailwind utilitaires sont réservées aux ajustements de layout entre sections, pas aux overrides internes des composants.

#### Scenario: Pas de surcharge de spacing sur les composants DaisyUI

- **WHEN** un composant utilise une classe DaisyUI (card, btn, input, hero, etc.)
- **THEN** il ne rajoute PAS de classes Tailwind `p-*`, `m-*`, `px-*`, `py-*` qui surchargent le spacing interne du composant DaisyUI
- **AND** les ajustements de layout se font entre les composants (gap, margin entre sections)

#### Scenario: Espace blanc entre sections

- **GIVEN** une page ou un composant composite
- **THEN** les sections sont séparées par un espacement suffisant (`gap-6`, `my-8`, `py-12`, etc.)
- **AND** le contenu n'est pas tassé visuellement

#### Scenario: Typographie lisible

- **WHEN** du texte est affiché
- **THEN** les tailles de texte utilisent les classes Tailwind par défaut (`text-base`, `text-lg`, `text-xl`, etc.)
- **AND** aucune taille micro (`text-[10px]`, `text-xs` pour du contenu principal) n'est utilisée

### Requirement: Vérification visuelle via Chrome DevTools MCP

Chaque composant UI et chaque page DOIVENT faire l'objet d'une vérification visuelle via Chrome DevTools MCP lors de leur implémentation.

#### Scenario: Screenshot de composant via Storybook

- **GIVEN** un composant dans `packages/ui` avec sa story Storybook
- **WHEN** le Storybook est lancé
- **THEN** un screenshot du composant est pris via Chrome DevTools MCP pour vérifier le rendu visuel

#### Scenario: Audit Lighthouse via Chrome DevTools MCP

- **GIVEN** une page rendue sur le serveur de développement ou un composant dans Storybook
- **WHEN** un audit Lighthouse accessibilité est lancé via Chrome DevTools MCP
- **THEN** le score d'accessibilité est ≥ 90
- **AND** aucune erreur de contraste n'est signalée

#### Scenario: Vérification responsive

- **GIVEN** un composant ou une page
- **WHEN** l'affichage est vérifié via Chrome DevTools MCP
- **THEN** le rendu est correct sur mobile (375px), tablette (768px) et desktop (1280px)
