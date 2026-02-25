# Recipe Edit — Design

## Goal

Add ability to edit existing recipes with version history tracking.

## Decisions

- **Edit page:** `/recipes/[id]/edit` using existing RecipeForm with `defaultValues`
- **Edit button:** On detail page `/recipes/[id]`, next to Delete button
- **Change reason:** Required field in modal before saving (feeds `change_notes`)
- **Version history:** Section on detail page showing all versions chronologically
- **No diff/rollback** (YAGNI)

## Flow

```
/recipes/[id] → click "Edytuj" → /recipes/[id]/edit
→ RecipeForm with defaultValues → click "Zapisz"
→ modal "Powod zmiany" (required) → store.updateRecipe(id, data, changedBy, notes)
→ redirect /recipes/[id]
```

## Version History

Displayed on detail page under existing sections. Shows: version number, date, who changed, reason. Chronological (newest first). No pagination.

## New Files

- `src/app/(dashboard)/recipes/[id]/edit/page.tsx`

## Modified Files

- `src/app/(dashboard)/recipes/[id]/page.tsx` — Edit button + version history section
- `src/modules/recipes/repository.ts` — `getRecipeVersions(recipeId)` query
- `src/modules/recipes/store.ts` — version history action

## No Changes Needed

- RecipeForm — already supports defaultValues
- Types — RecipeVersion already exists
- Schemas — UpdateRecipeSchema already exists
