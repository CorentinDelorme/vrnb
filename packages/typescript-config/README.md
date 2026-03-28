# Configuration TypeScript Partagée (@repo/typescript-config)

Configurations TypeScript de base partagées entre toutes les applications du projet.

[TypeScript](https://www.typescriptlang.org/) permet de détecter les erreurs dans le code avant même de le lancer, en vérifiant les types de données.

## Contenu

| Fichier | Utilisé par |
|---|---|
| `base.json` | Configuration de base, commune à tous les projets |
| `nextjs.json` | Configuration spécifique au site web (Next.js) |
| `react-library.json` | Configuration pour les bibliothèques React (composants partagés) |

## Utilisation

Ce package est utilisé automatiquement par les applications. Vous n'avez normalement pas besoin d'y toucher.

Pour vérifier les types de tout le projet, lancez depuis la racine :

```sh
bun run check-types
```
