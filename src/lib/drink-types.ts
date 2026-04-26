export type DrinkType = "water" | "soda" | "beer" | "fernet" | "wine" | "whisky" | "jagger";

export const DRINK_DEFAULTS: Record<DrinkType, number> = {
  water: 1500,
  soda: 1500,
  beer: 500,
  fernet: 200,
  wine: 375,
  whisky: 50,
  jagger: 50,
};

export const DRINK_LABELS: Record<DrinkType, string> = {
  water: "Agua",
  soda: "Refresco",
  beer: "Cerveza",
  fernet: "Fernet",
  wine: "Vino",
  whisky: "Whisky",
  jagger: "Jagger",
};

export const DRINK_UNITS: Record<DrinkType, string> = {
  water: "ml",
  soda: "ml",
  beer: "ml",
  fernet: "ml",
  wine: "ml",
  whisky: "ml",
  jagger: "ml",
};
