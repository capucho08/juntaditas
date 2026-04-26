export type SupplyCategory = "house" | "food" | "produce" | "breakfast" | "drinks" | "condiments";

export const CATEGORY_LABELS: Record<SupplyCategory, string> = {
  house: "Cosas de la casa",
  food: "Comida",
  produce: "Frutas y verduras",
  breakfast: "Desayuno / Merienda",
  drinks: "Bebidas",
  condiments: "Condimentos",
};
