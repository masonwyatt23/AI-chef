import { pgTable, text, varchar, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  theme: text("theme").notNull(),
  categories: text("categories").array().notNull().default([]),
  kitchenCapability: text("kitchen_capability").notNull().default("intermediate"),
  staffSize: integer("staff_size").notNull().default(5),
  additionalContext: text("additional_context"),
  
  // Business Context
  establishmentType: text("establishment_type"), // restaurant, cafe, bar, food_truck, etc.
  serviceStyle: text("service_style"), // fine_dining, casual, fast_casual, counter_service
  targetDemographic: text("target_demographic"), // families, young_professionals, tourists, etc.
  averageTicketPrice: integer("average_ticket_price"), // price range in dollars
  diningCapacity: integer("dining_capacity"), // number of seats
  operatingHours: text("operating_hours"), // business hours
  
  // Location & Market
  location: text("location"), // city/neighborhood
  marketType: text("market_type"), // urban, suburban, rural, tourist
  localIngredients: text("local_ingredients").array().default([]), // seasonal/local specialties
  culturalInfluences: text("cultural_influences").array().default([]), // cuisine influences
  
  // Kitchen & Operations
  kitchenSize: text("kitchen_size"), // small, medium, large
  kitchenEquipment: text("kitchen_equipment").array().default([]), // specific equipment available
  prepSpace: text("prep_space"), // limited, adequate, spacious
  storageCapacity: text("storage_capacity"), // walk_in, reach_in, limited
  deliveryCapability: boolean("delivery_capability").default(false),
  
  // Staff & Skills
  chefExperience: text("chef_experience"), // years or skill level
  staffSkillLevel: text("staff_skill_level"), // entry, experienced, professional
  specializedRoles: text("specialized_roles").array().default([]), // sommelier, pastry, etc.
  laborBudget: text("labor_budget"), // tight, moderate, flexible
  
  // Menu & Business Goals
  currentMenuSize: integer("current_menu_size"), // number of items
  menuChangeFrequency: text("menu_change_frequency"), // daily, weekly, seasonal, rarely
  profitMarginGoals: integer("profit_margin_goals"), // target percentage
  foodCostGoals: integer("food_cost_goals"), // target percentage
  specialDietaryNeeds: text("special_dietary_needs").array().default([]), // gluten_free, vegan, etc.
  
  // Competition & Positioning
  primaryCompetitors: text("primary_competitors").array().default([]),
  uniqueSellingPoints: text("unique_selling_points").array().default([]),
  pricePosition: text("price_position"), // budget, mid_range, premium, luxury
  
  // Challenges & Priorities
  currentChallenges: text("current_challenges").array().default([]), // high_turnover, food_costs, etc.
  businessPriorities: text("business_priorities").array().default([]), // increase_profit, expand_menu, etc.
  seasonalConsiderations: text("seasonal_considerations"), // how seasons affect business
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id).notNull(),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  category: text("category"), // 'menu', 'efficiency', 'cocktails', 'flavor-pairing'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  messageId: integer("message_id").references(() => messages.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  recipe: jsonb("recipe"), // structured recipe data
  implemented: boolean("implemented").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const savedMenus = pgTable("saved_menus", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  name: text("name").notNull(),
  menuText: text("menu_text").notNull(),
  menuType: text("menu_type").notNull().default("food"), // 'food' or 'cocktail'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertRecommendationSchema = createInsertSchema(recommendations).omit({
  id: true,
  createdAt: true,
});

export const insertSavedMenuSchema = createInsertSchema(savedMenus).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;

export type SavedMenu = typeof savedMenus.$inferSelect;
export type InsertSavedMenu = z.infer<typeof insertSavedMenuSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
