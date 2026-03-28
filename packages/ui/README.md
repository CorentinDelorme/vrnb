# Composants Visuels Partagés (@repo/ui)

Bibliothèque de composants React réutilisables, partagés entre les différentes applications du projet. Utilise [DaisyUI 5](https://daisyui.com/) pour le style et [Storybook](https://storybook.js.org/) pour la documentation visuelle des composants.

## Prérequis

- Avoir installé les dépendances depuis la racine du monorepo (`bun install`)

## Consulter les composants avec Storybook

Storybook permet de visualiser et tester chaque composant de manière isolée, sans lancer toute l'application :

```sh
bun run storybook
```

Storybook sera accessible sur [http://localhost:6006](http://localhost:6006).

## Commandes utiles

| Commande | Description |
|---|---|
| `bun run storybook` | Ouvrir Storybook (visualisation des composants) |
| `bun run build-storybook` | Construire une version statique de Storybook |
| `bun run test` | Lancer les tests unitaires |
| `bun run test:watch` | Lancer les tests en mode continu (se relancent à chaque modification) |
| `bun run lint` | Vérifier la qualité du code |
