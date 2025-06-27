import { pgTable, serial, varchar, text, integer, decimal, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Menu Management
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  costToMake: decimal("cost_to_make", { precision: 10, scale: 2 }),
  ingredients: json("ingredients").$type<string[]>(),
  allergens: json("allergens").$type<string[]>(),
  calories: integer("calories"),
  prepTime: integer("prep_time_minutes"),
  cookTime: integer("cook_time_minutes"),
  popularity: integer("popularity").default(0),
  available: boolean("available").default(true),
  imageUrl: varchar("image_url", { length: 500 }),
  recipe: json("recipe").$type<{
    instructions: string[];
    techniques: string[];
    plating: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Inventory Management
export const inventory = pgTable("inventory", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull(),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  currentStock: decimal("current_stock", { precision: 10, scale: 2 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  minThreshold: decimal("min_threshold", { precision: 10, scale: 2 }).notNull(),
  maxThreshold: decimal("max_threshold", { precision: 10, scale: 2 }),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }).notNull(),
  supplier: varchar("supplier", { length: 255 }),
  lastOrderDate: timestamp("last_order_date"),
  expirationDate: timestamp("expiration_date"),
  location: varchar("location", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Staff Management
export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  position: varchar("position", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  startDate: timestamp("start_date").notNull(),
  skills: json("skills").$type<string[]>(),
  certifications: json("certifications").$type<string[]>(),
  availability: json("availability").$type<{
    [day: string]: { start: string; end: string; available: boolean };
  }>(),
  active: boolean("active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sales Analytics
export const salesData = pgTable("sales_data", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull(),
  date: timestamp("date").notNull(),
  menuItemId: integer("menu_item_id"),
  quantity: integer("quantity").notNull(),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }),
  profit: decimal("profit", { precision: 10, scale: 2 }),
  customerCount: integer("customer_count"),
  averageTicket: decimal("average_ticket", { precision: 10, scale: 2 }),
  peakHour: varchar("peak_hour", { length: 10 }),
  weatherCondition: varchar("weather_condition", { length: 50 }),
  specialEvents: text("special_events"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Kitchen Operations
export const kitchenOperations = pgTable("kitchen_operations", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull(),
  date: timestamp("date").notNull(),
  averageTicketTime: integer("average_ticket_time_minutes"),
  ordersCompleted: integer("orders_completed"),
  ordersReturned: integer("orders_returned"),
  wasteAmount: decimal("waste_amount", { precision: 10, scale: 2 }),
  wasteCost: decimal("waste_cost", { precision: 10, scale: 2 }),
  staffHours: decimal("staff_hours", { precision: 10, scale: 2 }),
  equipmentDowntime: integer("equipment_downtime_minutes"),
  qualityScore: integer("quality_score"), // 1-10 scale
  efficiency: decimal("efficiency", { precision: 5, scale: 2 }), // percentage
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Customer Feedback
export const customerFeedback = pgTable("customer_feedback", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").notNull(),
  menuItemId: integer("menu_item_id"),
  customerName: varchar("customer_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  rating: integer("rating").notNull(), // 1-5 scale
  comments: text("comments"),
  category: varchar("category", { length: 100 }), // food, service, atmosphere, etc.
  date: timestamp("date").notNull(),
  resolved: boolean("resolved").default(false),
  responseText: text("response_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Export schemas
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStaffSchema = createInsertSchema(staff).omit({
  id: true,
  createdAt: true,
});

export const insertSalesDataSchema = createInsertSchema(salesData).omit({
  id: true,
  createdAt: true,
});

export const insertKitchenOperationsSchema = createInsertSchema(kitchenOperations).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerFeedbackSchema = createInsertSchema(customerFeedback).omit({
  id: true,
  createdAt: true,
});

// Types
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

export type InventoryItem = typeof inventory.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventorySchema>;

export type StaffMember = typeof staff.$inferSelect;
export type InsertStaffMember = z.infer<typeof insertStaffSchema>;

export type SalesData = typeof salesData.$inferSelect;
export type InsertSalesData = z.infer<typeof insertSalesDataSchema>;

export type KitchenOperations = typeof kitchenOperations.$inferSelect;
export type InsertKitchenOperations = z.infer<typeof insertKitchenOperationsSchema>;

export type CustomerFeedback = typeof customerFeedback.$inferSelect;
export type InsertCustomerFeedback = z.infer<typeof insertCustomerFeedbackSchema>;