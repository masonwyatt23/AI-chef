import { 
  users, 
  restaurants, 
  conversations, 
  messages, 
  recommendations,
  type User, 
  type InsertUser,
  type Restaurant,
  type InsertRestaurant,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Recommendation,
  type InsertRecommendation
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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

  async updateRestaurant(id: number, updateData: Partial<InsertRestaurant>): Promise<Restaurant | undefined> {
    const [updated] = await db
      .update(restaurants)
      .set(updateData)
      .where(eq(restaurants.id, id))
      .returning();
    return updated || undefined;
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
}

export const storage = new DatabaseStorage();