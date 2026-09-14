import type { Recipe } from './recipe-contract.ts';

type WithRecipe = { data: Recipe };

export function publishedRecipes<T extends WithRecipe>(recipes: T[]): T[] {
  return recipes.filter(({ data }) => data.publication_status === 'published');
}

export function recentRecipes<T extends WithRecipe>(recipes: T[]): T[] {
  return publishedRecipes(recipes).toSorted((a, b) => {
    const date = (item: T) => item.data.date_published ?? item.data.date_modified ?? item.data.date_created;
    return date(b).localeCompare(date(a)) || a.data.title.localeCompare(b.data.title);
  });
}

export function recipeHref(slug: string, base: string): string {
  return `${base.replace(/\/?$/, '/')}${slug}/`;
}

export interface RecipeFilters {
  category?: string;
  cuisine?: string;
  ingredient?: string;
  maxMinutes?: number;
}

export function matchesFilters(data: Pick<Recipe, 'category' | 'cuisine' | 'main_ingredients' | 'total_minutes'>, filters: RecipeFilters): boolean {
  return (!filters.category || data.category === filters.category)
    && (!filters.cuisine || data.cuisine === filters.cuisine)
    && (!filters.ingredient || data.main_ingredients.includes(filters.ingredient))
    && (filters.maxMinutes === undefined || (data.total_minutes !== null && data.total_minutes <= filters.maxMinutes));
}
