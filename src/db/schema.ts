import { relations, sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

// ─── Auth tables (better-auth managed) ────────────────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  phone: text("phone"),
  role: text("role", { enum: ["admin", "member"] }).notNull().default("member"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(sql`(unixepoch())`),
});

// ─── Juntada ──────────────────────────────────────────────────────────────────

export const juntada = sqliteTable("juntada", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  location: text("location").notNull(),
  locationUrl: text("location_url"),
  wazeUrl: text("waze_url"),
  dateStart: text("date_start").notNull(), // ISO date string YYYY-MM-DD
  dateEnd: text("date_end").notNull(),
  description: text("description"),
  splitwiseGroupId: text("splitwise_group_id"),
  createdBy: text("created_by").notNull().references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ─── Attendance ───────────────────────────────────────────────────────────────

// day_slot: morning | noon | afternoon | night
// status: pending = sin decidir, confirmed = va, not_going = no va
export const attendance = sqliteTable("attendance", {
  id: text("id").primaryKey(),
  juntadaId: text("juntada_id").notNull().references(() => juntada.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  status: text("status", { enum: ["pending", "confirmed", "not_going"] }).notNull().default("pending"),
  arrivalDate: text("arrival_date"), // YYYY-MM-DD
  arrivalSlot: text("arrival_slot", { enum: ["morning", "noon", "afternoon", "night"] }),
  departureDate: text("departure_date"), // YYYY-MM-DD
  departureSlot: text("departure_slot", { enum: ["morning", "noon", "afternoon", "night"] }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ─── Meals ────────────────────────────────────────────────────────────────────

export const meal = sqliteTable("meal", {
  id: text("id").primaryKey(),
  juntadaId: text("juntada_id").notNull().references(() => juntada.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  type: text("type", { enum: ["lunch", "dinner"] }).notNull(),
  description: text("description"),
  vegetarianOption: text("vegetarian_option"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const mealCook = sqliteTable("meal_cook", {
  mealId: text("meal_id").notNull().references(() => meal.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const mealCost = sqliteTable("meal_cost", {
  id: text("id").primaryKey(),
  mealId: text("meal_id").notNull().references(() => meal.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  paidBy: text("paid_by").notNull().references(() => user.id),
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ─── Meal Ingredients ─────────────────────────────────────────────────────────

export const mealIngredient = sqliteTable("meal_ingredient", {
  id: text("id").primaryKey(),
  mealId: text("meal_id").notNull().references(() => meal.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity"),
  unit: text("unit"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ─── Drinks ───────────────────────────────────────────────────────────────────

// Default ml per person per day — stored per juntada (overrides global defaults)
export const drinkConfig = sqliteTable("drink_config", {
  id: text("id").primaryKey(),
  juntadaId: text("juntada_id").notNull().references(() => juntada.id, { onDelete: "cascade" }),
  drinkType: text("drink_type", {
    enum: ["water", "soda_zero", "soda_regular", "beer", "fernet", "wine", "whisky", "jagger"],
  }).notNull(),
  mlPerPersonPerDay: integer("ml_per_person_per_day").notNull(),
});

export const drinkPreference = sqliteTable("drink_preference", {
  id: text("id").primaryKey(),
  juntadaId: text("juntada_id").notNull().references(() => juntada.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  drinkType: text("drink_type", {
    enum: ["water", "soda_zero", "soda_regular", "beer", "fernet", "wine", "whisky", "jagger"],
  }).notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
});

// ─── Supply list ──────────────────────────────────────────────────────────────

export const supplyItem = sqliteTable("supply_item", {
  id: text("id").primaryKey(),
  juntadaId: text("juntada_id").notNull().references(() => juntada.id, { onDelete: "cascade" }),
  category: text("category", {
    enum: ["house", "food", "produce", "breakfast", "drinks", "condiments", "meal_ingredients", "picada"],
  }).notNull(),
  name: text("name").notNull(),
  quantity: text("quantity"),
  unit: text("unit"),
  checked: integer("checked", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ─── Things to bring ──────────────────────────────────────────────────────────

export const thingToBring = sqliteTable("thing_to_bring", {
  id: text("id").primaryKey(),
  juntadaId: text("juntada_id").notNull().references(() => juntada.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  checked: integer("checked", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const thingResponsible = sqliteTable("thing_responsible", {
  thingId: text("thing_id").notNull().references(() => thingToBring.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

// ─── Bring templates (listas reutilizables cross-juntadas) ───────────────────

export const bringTemplate = sqliteTable("bring_template", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: text("created_by").notNull().references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const bringTemplateItem = sqliteTable("bring_template_item", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull().references(() => bringTemplate.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ─── Supply templates (plantillas de surtido por categoría) ──────────────────

export const supplyTemplate = sqliteTable("supply_template", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category", {
    enum: ["house", "food", "produce", "breakfast", "drinks", "condiments", "meal_ingredients", "picada"],
  }).notNull(),
  createdBy: text("created_by").notNull().references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const supplyTemplateItem = sqliteTable("supply_template_item", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull().references(() => supplyTemplate.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: text("quantity"),
  unit: text("unit"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const expense = sqliteTable("expense", {
  id: text("id").primaryKey(),
  juntadaId: text("juntada_id").notNull().references(() => juntada.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["house", "general", "meal", "custom"] }).notNull(),
  splitMethod: text("split_method", { enum: ["linear", "portions"] }).notNull().default("portions"),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency", { enum: ["UYU", "USD"] }).notNull().default("UYU"),
  paidBy: text("paid_by").notNull().references(() => user.id),
  date: text("date").notNull(), // YYYY-MM-DD
  mealId: text("meal_id").references(() => meal.id), // only for type=meal
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// For custom expenses: explicit list of participants
export const expenseParticipant = sqliteTable("expense_participant", {
  expenseId: text("expense_id").notNull().references(() => expense.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

// ─── Personal lists ───────────────────────────────────────────────────────────

export const personalList = sqliteTable("personal_list", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const personalListItem = sqliteTable("personal_list_item", {
  id: text("id").primaryKey(),
  listId: text("list_id").notNull().references(() => personalList.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

export const juntadaPersonalItem = sqliteTable("juntada_personal_item", {
  id: text("id").primaryKey(),
  juntadaId: text("juntada_id").notNull().references(() => juntada.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  checked: integer("checked", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ─── Expense dependencies ─────────────────────────────────────────────────────
// "dependentId's share gets absorbed by coveredById" within a juntada

export const expenseDependency = sqliteTable("expense_dependency", {
  id: text("id").primaryKey(),
  juntadaId: text("juntada_id").notNull().references(() => juntada.id, { onDelete: "cascade" }),
  dependentId: text("dependent_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  coveredById: text("covered_by_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
});

// ─── Notifications ────────────────────────────────────────────────────────────

export const notification = sqliteTable("notification", {
  id: text("id").primaryKey(),
  juntadaId: text("juntada_id").notNull().references(() => juntada.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["attendance_check", "bring_reminder_week", "bring_reminder_day"] }).notNull(),
  scheduledFor: text("scheduled_for").notNull(), // YYYY-MM-DD
  sentAt: integer("sent_at", { mode: "timestamp" }),
  channel: text("channel", { enum: ["email", "whatsapp"] }).notNull().default("email"),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const juntadaRelations = relations(juntada, ({ many }) => ({
  attendance: many(attendance),
  meals: many(meal),
  drinkConfigs: many(drinkConfig),
  drinkPreferences: many(drinkPreference),
  supplyItems: many(supplyItem),
  thingsToBring: many(thingToBring),
  expenses: many(expense),
  notifications: many(notification),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  juntada: one(juntada, { fields: [attendance.juntadaId], references: [juntada.id] }),
  user: one(user, { fields: [attendance.userId], references: [user.id] }),
}));

export const mealRelations = relations(meal, ({ one, many }) => ({
  juntada: one(juntada, { fields: [meal.juntadaId], references: [juntada.id] }),
  cooks: many(mealCook),
  costs: many(mealCost),
  ingredients: many(mealIngredient),
}));

export const mealIngredientRelations = relations(mealIngredient, ({ one }) => ({
  meal: one(meal, { fields: [mealIngredient.mealId], references: [meal.id] }),
}));

export const mealCookRelations = relations(mealCook, ({ one }) => ({
  meal: one(meal, { fields: [mealCook.mealId], references: [meal.id] }),
  user: one(user, { fields: [mealCook.userId], references: [user.id] }),
}));

export const mealCostRelations = relations(mealCost, ({ one }) => ({
  meal: one(meal, { fields: [mealCost.mealId], references: [meal.id] }),
  paidByUser: one(user, { fields: [mealCost.paidBy], references: [user.id] }),
}));

export const drinkConfigRelations = relations(drinkConfig, ({ one }) => ({
  juntada: one(juntada, { fields: [drinkConfig.juntadaId], references: [juntada.id] }),
}));

export const drinkPreferenceRelations = relations(drinkPreference, ({ one }) => ({
  juntada: one(juntada, { fields: [drinkPreference.juntadaId], references: [juntada.id] }),
  user: one(user, { fields: [drinkPreference.userId], references: [user.id] }),
}));

export const supplyItemRelations = relations(supplyItem, ({ one }) => ({
  juntada: one(juntada, { fields: [supplyItem.juntadaId], references: [juntada.id] }),
}));

export const thingToBringRelations = relations(thingToBring, ({ one, many }) => ({
  juntada: one(juntada, { fields: [thingToBring.juntadaId], references: [juntada.id] }),
  responsibles: many(thingResponsible),
}));

export const thingResponsibleRelations = relations(thingResponsible, ({ one }) => ({
  thing: one(thingToBring, { fields: [thingResponsible.thingId], references: [thingToBring.id] }),
  user: one(user, { fields: [thingResponsible.userId], references: [user.id] }),
}));

export const supplyTemplateRelations = relations(supplyTemplate, ({ one, many }) => ({
  createdByUser: one(user, { fields: [supplyTemplate.createdBy], references: [user.id] }),
  items: many(supplyTemplateItem),
}));

export const supplyTemplateItemRelations = relations(supplyTemplateItem, ({ one }) => ({
  template: one(supplyTemplate, { fields: [supplyTemplateItem.templateId], references: [supplyTemplate.id] }),
}));

export const bringTemplateRelations = relations(bringTemplate, ({ one, many }) => ({
  createdByUser: one(user, { fields: [bringTemplate.createdBy], references: [user.id] }),
  items: many(bringTemplateItem),
}));

export const bringTemplateItemRelations = relations(bringTemplateItem, ({ one }) => ({
  template: one(bringTemplate, { fields: [bringTemplateItem.templateId], references: [bringTemplate.id] }),
}));

export const expenseRelations = relations(expense, ({ one, many }) => ({
  juntada: one(juntada, { fields: [expense.juntadaId], references: [juntada.id] }),
  paidByUser: one(user, { fields: [expense.paidBy], references: [user.id] }),
  meal: one(meal, { fields: [expense.mealId], references: [meal.id] }),
  participants: many(expenseParticipant),
}));

export const expenseParticipantRelations = relations(expenseParticipant, ({ one }) => ({
  expense: one(expense, { fields: [expenseParticipant.expenseId], references: [expense.id] }),
  user: one(user, { fields: [expenseParticipant.userId], references: [user.id] }),
}));

export const notificationRelations = relations(notification, ({ one }) => ({
  juntada: one(juntada, { fields: [notification.juntadaId], references: [juntada.id] }),
}));

export const expenseDependencyRelations = relations(expenseDependency, ({ one }) => ({
  juntada: one(juntada, { fields: [expenseDependency.juntadaId], references: [juntada.id] }),
  dependent: one(user, { fields: [expenseDependency.dependentId], references: [user.id] }),
  coveredBy: one(user, { fields: [expenseDependency.coveredById], references: [user.id] }),
}));

export const personalListRelations = relations(personalList, ({ one, many }) => ({
  user: one(user, { fields: [personalList.userId], references: [user.id] }),
  items: many(personalListItem),
}));

export const personalListItemRelations = relations(personalListItem, ({ one }) => ({
  list: one(personalList, { fields: [personalListItem.listId], references: [personalList.id] }),
}));

export const juntadaPersonalItemRelations = relations(juntadaPersonalItem, ({ one }) => ({
  juntada: one(juntada, { fields: [juntadaPersonalItem.juntadaId], references: [juntada.id] }),
  user: one(user, { fields: [juntadaPersonalItem.userId], references: [user.id] }),
}));

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof user.$inferSelect;
export type Juntada = typeof juntada.$inferSelect;
export type Attendance = typeof attendance.$inferSelect;
export type AttendanceStatus = "pending" | "confirmed" | "not_going";
export type Meal = typeof meal.$inferSelect;
export type MealCost = typeof mealCost.$inferSelect;
export type DrinkConfig = typeof drinkConfig.$inferSelect;
export type DrinkPreference = typeof drinkPreference.$inferSelect;
export type SupplyItem = typeof supplyItem.$inferSelect;
export type ThingToBring = typeof thingToBring.$inferSelect;
export type Expense = typeof expense.$inferSelect;
export type Notification = typeof notification.$inferSelect;
export type BringTemplate = typeof bringTemplate.$inferSelect;
export type BringTemplateItem = typeof bringTemplateItem.$inferSelect;
export type SupplyTemplate = typeof supplyTemplate.$inferSelect;
export type SupplyTemplateItem = typeof supplyTemplateItem.$inferSelect;
export type MealIngredient = typeof mealIngredient.$inferSelect;
export type PersonalList = typeof personalList.$inferSelect;
export type PersonalListItem = typeof personalListItem.$inferSelect;
export type JuntadaPersonalItem = typeof juntadaPersonalItem.$inferSelect;
export type ExpenseDependency = typeof expenseDependency.$inferSelect;
