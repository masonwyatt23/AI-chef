import { 
  users, 
  restaurants, 
  conversations, 
  messages, 
  recommendations,
  savedMenus,
  menuItemHistory,
  cocktailHistory,
  type User, 
  type InsertUser,
  type Restaurant,
  type InsertRestaurant,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Recommendation,
  type InsertRecommendation,
  type SavedMenu,
  type InsertSavedMenu,
  type MenuItemHistory,
  type InsertMenuItemHistory,
  type CocktailHistory,
  type InsertCocktailHistory
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfilePicture(id: number, profilePicture: string): Promise<void>;
  
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  getRestaurantsByUser(userId: number): Promise<Restaurant[]>;
  updateRestaurant(id: number, restaurant: Partial<InsertRestaurant>): Promise<Restaurant | undefined>;
  deleteRestaurant(id: number): Promise<boolean>;
  
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversationsByRestaurant(restaurantId: number): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  deleteConversation(id: number): Promise<boolean>;
  
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  getRecommendationsByRestaurant(restaurantId: number): Promise<Recommendation[]>;
  updateRecommendation(id: number, recommendation: Partial<InsertRecommendation>): Promise<Recommendation | undefined>;
  
  createSavedMenu(savedMenu: InsertSavedMenu): Promise<SavedMenu>;
  getSavedMenusByRestaurant(restaurantId: number): Promise<SavedMenu[]>;
  getSavedMenu(id: number): Promise<SavedMenu | undefined>;
  deleteSavedMenu(id: number): Promise<boolean>;
  
  // Recipe History operations
  addMenuItemToHistory(menuItem: InsertMenuItemHistory): Promise<MenuItemHistory>;
  getMenuItemHistory(userId: number, restaurantId: number): Promise<MenuItemHistory[]>;
  deleteMenuItemFromHistory(id: number, userId: number): Promise<boolean>;
  clearMenuItemHistory(userId: number, restaurantId: number): Promise<boolean>;
  
  addCocktailToHistory(cocktail: InsertCocktailHistory): Promise<CocktailHistory>;
  getCocktailHistory(userId: number, restaurantId: number): Promise<CocktailHistory[]>;
  deleteCocktailFromHistory(id: number, userId: number): Promise<boolean>;
  clearCocktailHistory(userId: number, restaurantId: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserProfilePicture(id: number, profilePicture: string): Promise<void> {
    await db
      .update(users)
      .set({ profilePicture })
      .where(eq(users.id, id));
  }

  async createRestaurant(insertRestaurant: InsertRestaurant): Promise<Restaurant> {
    const [restaurant] = await db
      .insert(restaurants)
      .values(insertRestaurant)
      .returning();
    return restaurant;
  }

  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, id));
    return restaurant || undefined;
  }

  async getRestaurantsByUser(userId: number): Promise<Restaurant[]> {
    return await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.userId, userId))
      .orderBy(restaurants.createdAt);
  }

  async updateRestaurant(id: number, updateData: Partial<InsertRestaurant>): Promise<Restaurant | undefined> {
    const [updated] = await db
      .update(restaurants)
      .set(updateData)
      .where(eq(restaurants.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteRestaurant(id: number): Promise<boolean> {
    try {
      // Get all conversations for this restaurant
      const restaurantConversations = await db
        .select()
        .from(conversations)
        .where(eq(conversations.restaurantId, id));
      
      // Delete all data associated with this restaurant
      for (const conversation of restaurantConversations) {
        await this.deleteConversation(conversation.id);
      }
      
      // Delete recommendations directly associated with restaurant
      await db.delete(recommendations).where(eq(recommendations.restaurantId, id));
      
      // Finally delete the restaurant
      await db.delete(restaurants).where(eq(restaurants.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      return false;
    }
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async getConversationsByRestaurant(restaurantId: number): Promise<Conversation[]> {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.restaurantId, restaurantId))
      .orderBy(conversations.createdAt);
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations).where(eq(conversations.id, id));
    return conversation || undefined;
  }

  async deleteConversation(id: number): Promise<boolean> {
    try {
      // First get all messages in this conversation
      const conversationMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, id));
      
      // Delete recommendations that reference these messages
      for (const message of conversationMessages) {
        await db.delete(recommendations).where(eq(recommendations.messageId, message.id));
      }
      
      // Then delete all messages in the conversation
      await db.delete(messages).where(eq(messages.conversationId, id));
      
      // Finally delete the conversation
      await db.delete(conversations).where(eq(conversations.id, id));
      
      return true;
    } catch (error) {
      console.error("Error deleting conversation:", error);
      return false;
    }
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createRecommendation(insertRecommendation: InsertRecommendation): Promise<Recommendation> {
    const [recommendation] = await db
      .insert(recommendations)
      .values(insertRecommendation)
      .returning();
    return recommendation;
  }

  async getRecommendationsByRestaurant(restaurantId: number): Promise<Recommendation[]> {
    return await db
      .select()
      .from(recommendations)
      .where(eq(recommendations.restaurantId, restaurantId))
      .orderBy(recommendations.createdAt);
  }

  async updateRecommendation(id: number, updateData: Partial<InsertRecommendation>): Promise<Recommendation | undefined> {
    const [updated] = await db
      .update(recommendations)
      .set(updateData)
      .where(eq(recommendations.id, id))
      .returning();
    return updated || undefined;
  }

  async createSavedMenu(insertSavedMenu: InsertSavedMenu): Promise<SavedMenu> {
    const [savedMenu] = await db
      .insert(savedMenus)
      .values(insertSavedMenu)
      .returning();
    return savedMenu;
  }

  async getSavedMenusByRestaurant(restaurantId: number): Promise<SavedMenu[]> {
    return await db
      .select()
      .from(savedMenus)
      .where(eq(savedMenus.restaurantId, restaurantId))
      .orderBy(savedMenus.createdAt);
  }

  async getSavedMenu(id: number): Promise<SavedMenu | undefined> {
    const [savedMenu] = await db
      .select()
      .from(savedMenus)
      .where(eq(savedMenus.id, id));
    return savedMenu || undefined;
  }

  async deleteSavedMenu(id: number): Promise<boolean> {
    try {
      await db.delete(savedMenus).where(eq(savedMenus.id, id));
      return true;
    } catch (error) {
      console.error("Error deleting saved menu:", error);
      return false;
    }
  }

  // Recipe History operations
  async addMenuItemToHistory(menuItem: InsertMenuItemHistory): Promise<MenuItemHistory> {
    const [history] = await db
      .insert(menuItemHistory)
      .values(menuItem)
      .returning();
    return history;
  }

  async getMenuItemHistory(userId: number, restaurantId: number): Promise<MenuItemHistory[]> {
    return await db
      .select()
      .from(menuItemHistory)
      .where(eq(menuItemHistory.userId, userId))
      .orderBy(menuItemHistory.createdAt);
  }

  async deleteMenuItemFromHistory(id: number, userId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(menuItemHistory)
        .where(eq(menuItemHistory.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Error deleting menu item from history:", error);
      return false;
    }
  }

  async clearMenuItemHistory(userId: number, restaurantId: number): Promise<boolean> {
    try {
      await db
        .delete(menuItemHistory)
        .where(eq(menuItemHistory.userId, userId));
      return true;
    } catch (error) {
      console.error("Error clearing menu item history:", error);
      return false;
    }
  }

  async addCocktailToHistory(cocktail: InsertCocktailHistory): Promise<CocktailHistory> {
    const [history] = await db
      .insert(cocktailHistory)
      .values(cocktail)
      .returning();
    return history;
  }

  async getCocktailHistory(userId: number, restaurantId: number): Promise<CocktailHistory[]> {
    return await db
      .select()
      .from(cocktailHistory)
      .where(eq(cocktailHistory.userId, userId))
      .orderBy(cocktailHistory.createdAt);
  }

  async deleteCocktailFromHistory(id: number, userId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(cocktailHistory)
        .where(eq(cocktailHistory.id, id));
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      console.error("Error deleting cocktail from history:", error);
      return false;
    }
  }

  async clearCocktailHistory(userId: number, restaurantId: number): Promise<boolean> {
    try {
      await db
        .delete(cocktailHistory)
        .where(eq(cocktailHistory.userId, userId));
      return true;
    } catch (error) {
      console.error("Error clearing cocktail history:", error);
      return false;
    }
  }
}

export const storage = new DatabaseStorage();