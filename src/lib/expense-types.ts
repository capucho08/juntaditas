export type ExpenseType = "house" | "general" | "meal" | "custom";

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  house: "Casa",
  general: "General",
  meal: "Comida",
  custom: "Custom",
};
