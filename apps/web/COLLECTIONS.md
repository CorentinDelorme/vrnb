# Database Collections and Seed Setup

This document describes all the collections that have been added to the Payload CMS application and how to populate them with data from the SQL dump.

## New Collections Created

### Core Collections

1. **Etats** (`etats`)
   - Manages the status of activities (ouverte, finie, annulée, modifiée)
   - Fields: `libelle` (status name)

2. **Bureaux** (`bureaux`)
   - Organization roles and positions (Président, Trésorier, Secrétaire, etc.)
   - Fields: `ordre` (sort order), `nom` (role name)

3. **Referents** (`referents`)
   - Role referents (Site Web, Logistique, Photo-Vidéo, Mécanique, Navigation GPS, etc.)
   - Fields: `ordre` (sort order), `nom` (referent name)

4. **Partenaires** (`partenaires`)
   - Organization partners and sponsors
   - Fields: `ordre` (sort order), `nom` (partner name), `lien` (website link), `logo` (upload field for logo)

5. **Categories** (`categories`)
   - Activity categories
   - Fields: `libelle` (category name)

6. **CategoriesFormation** (`categories-formations`)
   - Formation/training categories
   - Fields: `libelle` (category name)

7. **Lieux** (`lieux`)
   - Locations/event venues
   - Fields: `nom_ville`, `cp_ville`, `num_rue`, `nom_rue`

8. **Actualites** (`actualites`)
   - News and updates
   - Fields: `actu`, `date_actu`, `affiche_actu`, `url`

9. **Commentaires** (`commentaires`)
   - Comments on documentation
   - Fields: `documentation` (relationship), `user_name`, `date_creation`, `date_modification`, `commentaire`

10. **DocsPdf** (`docs-pdf`)
    - PDF documents linked to activities
    - Fields: `pdfactivite` (relationship), `nompdf`

11. **ActivitesContent** (`activites-content`)
    - Content repository for activity descriptions and titles
    - Multiple text and title fields for different activity types

12. **Activites** (`activites`)
    - Main activities/events collection
    - Fields: `nom`, `date_activite`, `duree`, `distance`, `denivele`, `difficulte`, `infos_activite`, `total_participant`
   - Relationships: `etats`, `lieux`, `organisateur` (user), `categories_formation`
    - Many-to-many: `participants` (users)

13. **Photos** (`photos`)
    - User photos
    - Fields: `name`, `adhherent` (relationship to users)

14. **PhotosAlbums** (`photos-albums`)
    - Photo albums linked to activities
    - Fields: `image`, `url`, `activite` (relationship)

15. **PhotosCarousels** (`photos-carousels`)
    - Homepage carousel images
    - Fields: `image1` through `image7`

16. **EtiquettesContent** (`etiquettes-content`)
    - Label/tag content for homepage sections
    - Fields: 4 sets of etiquette text, photos, and overlays

17. **IntroPhotos** (`intro-photos`)
    - Introduction images for different sections
    - Fields: Various intro photo paths for different sections

18. **Documentations** (`documentations`)
    - Knowledge base/documentation articles
   - Fields: `titre`, `auteur`, `date_creation`, `paragraphe1`, `paragraphe2`, `image`, `url`, `intro`, `categorie` (relationship vers `categories`)
    - Supports PDF attachments

19. **Users** (`users`)
    - User authentication and profile management
    - Fields: `email` (unique, required), `username` (unique, required), `nom` (required), `prenom` (required), `telephone` (optional), `date_naissance` (optional)
   - Relationships: `bureaux` (single), `referents` (many)

### Global Configurations

1. **TextAccueil** (`text-accueil`)
   - Welcome page text content
   - Fields: `first_text` through `sixth_text`

2. **TextPresentation** (`text-presentation`)
   - Association presentation/about page
   - Fields: `text_one` through `text_six`, `title_one` through `title_four`

## Database Schema Relationships

- **Users** → Activities (organizateurs, participants)
- **Users** → Referents (many-to-many)
- **Users** → Bureaux (single relationship)
- **Activities** → Etats (status lookup)
- **Activities** → Lieux (location lookup)
- **Activities** → CategoriesFormation (formation category lookup)
- **Activities** → PhotosAlbums (one-to-many)
- **Documentations** → Categories (documentation category)
- **Documentations** → Commentaires (one-to-many)

## Seeding Data from SQL

### Prerequisites

1. Ensure MongoDB is running and accessible at the DATABASE_URL specified in `.env`
2. Ensure the development server has started with `bun dev` or the database is accessible via Payload
3. Have a MySQL SQL dump file ready

### Running the Seed Script

```bash
# From the app directory
cd apps/web

# Run the seed script, passing the path to your SQL dump file
bun run seed:sql <path-to-sql-file>

# Examples:
bun run seed:sql ./dump.sql
bun run seed:sql /absolute/path/to/dump.sql
```

### What the Script Does

The `seedFromSQL.ts` script:

1. Parses the MySQL dump file
2. Extracts INSERT statements for all tables
3. Maps SQL columns to Payload collection fields
4. Creates documents in MongoDB through Payload API
5. Respects foreign key relationships by processing tables in the correct order

### Handled Tables

The seed script includes mapping for:

- etat (status)
- categorie
- categorie_formation
- bureau
- lieu
- referent
- user (mapped to users)
- partenaire
- activite
- actualite
- commentaire
- doc_pdf
- documentation
- etiquette_content
- intro_photo
- photo
- photo_album
- photo_carousel
- user_activite (junction table - handled via relationships)
- user_referent (junction table - handled via relationships)

## Manual Data Migration Notes

### Junction Tables

The following junction tables from the SQL structure are automatically represented through relationship fields in Payload:

- **user_activite**: Represented through the `participants` field in Activite collection (many-to-many relationship)
- **user_referent**: Can be added to Users collection if needed

### Data Type Mappings

- SQL `VARCHAR` → Payload `text`
- SQL `LONGTEXT` → Payload `richText` or `textarea`
- SQL `INT` → Payload `number`
- SQL `DATETIME` → Payload `date`
- SQL `TINYINT(1)` → Payload `checkbox`
- SQL Foreign Keys → Payload `relationship`

## Important Configuration Details

### Collection Slugs

Payload uses URL-friendly "slugs" for collection identifiers. The mappings are:

| SQL Table           | Payload Slug        | Collection TSX File   |
| ------------------- | ------------------- | --------------------- |
| etat                | etats               | Etats.ts                |
| categorie           | categories          | Categories.ts           |
| categorie_formation | categories-formations | CategoriesFormations.ts |
| bureau              | bureaux             | Bureaux.ts              |
| lieu                | lieux               | Lieux.ts                |
| referent            | referents           | Referents.ts            |
| actualite           | actualites          | Actualites.ts           |
| partenaire          | partenaires         | Partenaires.ts          |
| commentaire         | commentaires        | Commentaires.ts         |
| doc_pdf             | docs-pdf            | DocsPdf.ts              |
| activite_content    | activites-content   | ActivitesContent.ts     |
| activite            | activites           | Activites.ts            |
| photo               | photos              | Photos.ts               |
| photo_album         | photos-albums       | PhotosAlbums.ts         |
| photo_carousel      | photos-carousels    | PhotosCarousels.ts      |
| etiquette_content   | etiquettes-content  | EtiquettesContent.ts    |
| intro_photo         | intro-photos        | IntroPhotos.ts          |
| documentation       | documentations      | Documentations.ts       |

## Troubleshooting

### Issues with Seed Script

1. **"Could not find module"**: Ensure you're running from the correct directory
2. **Database connection errors**: Check DATABASE_URL in `.env` and ensure MongoDB is running
3. **Parse errors in SQL**: Some SQL syntax variations may not be parsed correctly - review the error log
4. **Foreign key violations**: Tables must be processed in the correct order (already handled by the script)

### Admin UI Access

After seeding:

1. Access the Payload Admin at `/admin`
2. All new collections will appear in the sidebar
3. Verify data was imported correctly before deploying

## Next Steps

1. Generate TypeScript types: `bun run generate:types`
2. Generate import map: `bun run generate:importmap`
3. Restart the development server if needed
4. Access all collections through the Payload Admin UI

## File Structure

```
apps/web/
├── src/
│   ├── collections/
│   │   ├── Etats.ts
│   │   ├── Categories.ts
│   │   ├── CategoriesFormations.ts
│   │   ├── Bureaux.ts
│   │   ├── Lieux.ts
│   │   ├── Referents.ts
│   │   ├── Actualites.ts
│   │   ├── Partenaires.ts
│   │   ├── Commentaires.ts
│   │   ├── DocsPdf.ts
│   │   ├── ActivitesContent.ts
│   │   ├── Activites.ts
│   │   ├── Photos.ts
│   │   ├── PhotosAlbums.ts
│   │   ├── PhotosCarousels.ts
│   │   ├── EtiquettesContent.ts
│   │   ├── IntroPhotos.ts
│   │   ├── Documentations.ts
│   │   ├── Users.ts
│   │   ├── Media.ts
│   ├── globals/
│   └── payload.config.ts
├── scripts/
│   ├── seedFromSQL.ts
│   └── seedOrderedCollections.ts
```
