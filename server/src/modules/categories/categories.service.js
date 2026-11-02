import { Category } from '../../models/index.js';

export async function getActiveCategoriesGrouped() {
  const categories = await Category.find({ active: true }).lean();

  const grouped = {
    community: [],
    professional: [],
    instant: [],
  };

  for (const cat of categories) {
    if (grouped[cat.type]) {
      grouped[cat.type].push(cat);
    } else {
      grouped[cat.type] = [cat];
    }
  }

  return grouped;
}

export default {
  getActiveCategoriesGrouped,
};
