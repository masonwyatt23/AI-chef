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

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  getRestaurant(id: number): Promise<Restaurant | undefined>;
  updateRestaurant(id: number, restaurant: Partial<InsertRestaurant>): Promise<Restaurant | undefined>;
  
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversationsByRestaurant(restaurantId: number): Promise<Conversation[]>;
  getConversation(id: number): Promise<Conversation | undefined>;
  
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversation(conversationId: number): Promise<Message[]>;
  
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  getRecommendationsByRestaurant(restaurantId: number): Promise<Recommendation[]>;
  updateRecommendation(id: number, recommendation: Partial<InsertRecommendation>): Promise<Recommendation | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private restaurants: Map<number, Restaurant>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private recommendations: Map<number, Recommendation>;
  private currentUserId: number;
  private currentRestaurantId: number;
  private currentConversationId: number;
  private currentMessageId: number;
  private currentRecommendationId: number;

  constructor() {
    this.users = new Map();
    this.restaurants = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.recommendations = new Map();
    this.currentUserId = 1;
    this.currentRestaurantId = 1;
    this.currentConversationId = 1;
    this.currentMessageId = 1;
    this.currentRecommendationId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createRestaurant(insertRestaurant: InsertRestaurant): Promise<Restaurant> {
    const id = this.currentRestaurantId++;
    const restaurant: Restaurant = { 
      id,
      name: insertRestaurant.name,
      theme: insertRestaurant.theme,
      categories: insertRestaurant.categories || [],
      kitchenCapability: insertRestaurant.kitchenCapability || "intermediate",
      staffSize: insertRestaurant.staffSize || 5,
      additionalContext: insertRestaurant.additionalContext || null,
      createdAt: new Date() 
    };
    this.restaurants.set(id, restaurant);
    return restaurant;
  }

  async getRestaurant(id: number): Promise<Restaurant | undefined> {
    return this.restaurants.get(id);
  }

  async updateRestaurant(id: number, updateData: Partial<InsertRestaurant>): Promise<Restaurant | undefined> {
    const restaurant = this.restaurants.get(id);
    if (!restaurant) return undefined;
    
    const updated = { ...restaurant, ...updateData };
    this.restaurants.set(id, updated);
    return updated;
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = this.currentConversationId++;
    const conversation: Conversation = { 
      ...insertConversation, 
      id, 
      createdAt: new Date() 
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getConversationsByRestaurant(restaurantId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values()).filter(
      (conv) => conv.restaurantId === restaurantId
    );
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = { 
      id,
      conversationId: insertMessage.conversationId,
      role: insertMessage.role,
      content: insertMessage.content,
      category: insertMessage.category || null,
      createdAt: new Date() 
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessagesByConversation(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((msg) => msg.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createRecommendation(insertRecommendation: InsertRecommendation): Promise<Recommendation> {
    const id = this.currentRecommendationId++;
    const recommendation: Recommendation = { 
      id,
      restaurantId: insertRecommendation.restaurantId,
      messageId: insertRecommendation.messageId || null,
      title: insertRecommendation.title,
      description: insertRecommendation.description,
      category: insertRecommendation.category,
      recipe: insertRecommendation.recipe || null,
      implemented: insertRecommendation.implemented || false,
      createdAt: new Date() 
    };
    this.recommendations.set(id, recommendation);
    return recommendation;
  }

  async getRecommendationsByRestaurant(restaurantId: number): Promise<Recommendation[]> {
    return Array.from(this.recommendations.values())
      .filter((rec) => rec.restaurantId === restaurantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateRecommendation(id: number, updateData: Partial<InsertRecommendation>): Promise<Recommendation | undefined> {
    const recommendation = this.recommendations.get(id);
    if (!recommendation) return undefined;
    
    const updated = { ...recommendation, ...updateData };
    this.recommendations.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
