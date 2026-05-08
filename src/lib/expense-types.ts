export type ExpenseType = "house" | "general" | "meal" | "custom";
export type SplitMethod = "linear" | "portions";

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  house: "Casa",
  general: "General",
  meal: "Comida",
  custom: "Custom",
};

export const SPLIT_METHOD_LABELS: Record<SplitMethod, string> = {
  linear: "Lineal",
  portions: "Porciones de día",
};
