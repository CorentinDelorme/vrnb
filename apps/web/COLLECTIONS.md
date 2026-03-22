# Database Collections and Seed Setup

This document describes all the collections that have been added to the Payload CMS application and how to populate them with data from the SQL dump.

## New Collections Created

### Core Collections

1. **Etat** (`etat`)
   - Manages the status of activities (ouverte, finie, annulée, modifiée)
   - Fields: `libelle` (status name)

2. **Categorie** (`categorie`)
   - Activity categories
   - Fields: `libelle` (category name)

3. **CategorieFormation** (`categorie-formation`)
   - Formation/training categories
   - Fields: `libelle` (category name)

4. **Lieu** (`lieu`)
   - Locations/event venues
   - Fields: `nom_ville`, `cp_ville`, `num_rue`, `nom_rue`

5. **Actualite** (`actualite`)
   - News and updates
   - Fields: `actu`, `date_actu`, `affiche_actu`, `url`

6. **Commentaire** (`commentaire`)
   - Comments on documentation
   - Fields: `documentation` (relationship), `user_name`, `date_creation`, `date_modification`, `commentaire`

7. **DocPdf** (`doc-pdf`)
   - PDF documents linked to activities
   - Fields: `pdfactivite` (relationship), `nompdf`

8. **ActiviteContent** (`activite-content`)
   - Content repository for activity descriptions and titles
   - Multiple text and title fields for different activity types

9. **Activite** (`activite`)
   - Main activities/events collection
   - Fields: `nom`, `date_activite`, `duree`, `distance`, `denivele`, `difficulte`, `infos_activite`, `total_participant`
   - Relationships: `etat`, `lieu`, `organisateur` (user), `categories_formation`
   - Many-to-many: `participants` (users)

10. **Photo** (`photo`)
    - User photos
    - Fields: `name`, `adhherent` (relationship to users)

11. **PhotoAlbum** (`photo-album`)
    - Photo albums linked to activities
    - Fields: `image`, `url`, `activite` (relationship)

12. **PhotoCarousel** (`photo-carousel`)
    - Homepage carousel images
    - Fields: `image1` through `image7`

13. **EtiquetteContent** (`etiquette-content`)
    - Label/tag content for homepage sections
    - Fields: 4 sets of etiquette text, photos, and overlays

14. **IntroPhoto** (`intro-photo`)
    - Introduction images for different sections
    - Fields: Various intro photo paths for different sections

15. **Documentation** (`documentation`)
    - Knowledge base/documentation articles
    - Fields: `titre`, `auteur`, `date_creation`, `paragraphe1`, `paragraphe2`, `image`, `url`, `intro`, `categorie` (relationship)
    - Supports PDF attachments

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
- **Activities** → État (status lookup)
- **Activities** → Lieu (location lookup)
- **Activities** → CategorieFormation (formation category lookup)
- **Activities** → PhotoAlbum (one-to-many)
- **Documentation** → Categorie (documentation category)
- **Documentation** → Commentaire (one-to-many)

## Seeding Data from SQL

### Prerequisites

1. Ensure MongoDB is running and accessible at the DATABASE_URL specified in `.env`
2. Ensure the development server has started with `bun dev` or the database is accessible via Payload
3. Have the SQL dump file at: `apps/web/dbs1369285_2026-03-13.sql`

### Running the Seed Script

```bash
# From the app directory
cd apps/web

# Run the seed script
bun run seed:sql
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
| etat                | etat                | Etat.ts               |
| categorie           | categorie           | Categorie.ts          |
| categorie_formation | categorie-formation | CategorieFormation.ts |
| lieu                | lieu                | Lieu.ts               |
| actualite           | actualite           | Actualite.ts          |
| commentaire         | commentaire         | Commentaire.ts        |
| doc_pdf             | doc-pdf             | DocPdf.ts             |
| activite_content    | activite-content    | ActiviteContent.ts    |
| activite            | activite            | Activite.ts           |
| photo               | photo               | Photo.ts              |
| photo_album         | photo-album         | PhotoAlbum.ts         |
| photo_carousel      | photo-carousel      | PhotoCarousel.ts      |
| etiquette_content   | etiquette-content   | EtiquetteContent.ts   |
| intro_photo         | intro-photo         | IntroPhoto.ts         |
| documentation       | documentation       | Documentation.ts      |

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
│   │   ├── Etat.ts
│   │   ├── Categorie.ts
│   │   ├── CategorieFormation.ts
│   │   ├── Lieu.ts
│   │   ├── Actualite.ts
│   │   ├── Commentaire.ts
│   │   ├── DocPdf.ts
│   │   ├── ActiviteContent.ts
│   │   ├── Activite.ts
│   │   ├── Photo.ts
│   │   ├── PhotoAlbum.ts
│   │   ├── PhotoCarousel.ts
│   │   ├── EtiquetteContent.ts
│   │   ├── IntroPhoto.ts
│   │   ├── Documentation.ts
│   ├── globals/
│   └── payload.config.ts
├── scripts/
│   ├── seedFromSQL.ts (new)
```
