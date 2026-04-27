export type DrinkType = "water" | "soda_zero" | "soda_regular" | "beer" | "fernet" | "wine" | "whisky" | "jagger";

export const DRINK_DEFAULTS: Record<DrinkType, number> = {
  water: 1500,
  soda_zero: 1500,
  soda_regular: 1500,
  beer: 500,
  fernet: 200,
  wine: 375,
  whisky: 50,
  jagger: 50,
};

export const DRINK_LABELS: Record<DrinkType, string> = {
  water: "Agua",
  soda_zero: "Refresco Zero",
  soda_regular: "Refresco Común",
  beer: "Cerveza",
  fernet: "Fernet",
  wine: "Vino",
  whisky: "Whisky",
  jagger: "Jagger",
};

export const DRINK_UNITS: Record<DrinkType, string> = {
  water: "ml",
  soda_zero: "ml",
  soda_regular: "ml",
  beer: "ml",
  fernet: "ml",
  wine: "ml",
  whisky: "ml",
  jagger: "ml",
};
