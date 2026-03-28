# Configuration ESLint Partagée (@repo/eslint-config)

Règles de qualité de code partagées entre toutes les applications du projet.

Ce package contient les configurations [ESLint](https://eslint.org/) qui vérifient automatiquement que le code respecte les bonnes pratiques (erreurs courantes, conventions de style, etc.).

## Contenu

| Fichier | Utilisé par |
|---|---|
| `base.js` | Configuration de base, utilisée par tous les projets |
| `next.js` | Configuration spécifique au site web (Next.js) |
| `react-internal.js` | Configuration pour les bibliothèques React internes |

## Utilisation

Ce package est utilisé automatiquement par les applications. Vous n'avez normalement pas besoin d'y toucher.

Pour vérifier la qualité du code de tout le projet, lancez depuis la racine :

```sh
bun run lint
```
