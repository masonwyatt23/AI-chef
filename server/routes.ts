import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aiChefService } from "./services/aiChef";
import { menuGenerator } from "./services/menuGenerator";
import { 
  insertRestaurantSchema, 
  insertConversationSchema, 
  insertMessageSchema,
  insertRecommendationSchema 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Restaurant routes
  app.post("/api/restaurants", async (req, res) => {
    try {
      const restaurantData = insertRestaurantSchema.parse(req.body);
      const restaurant = await storage.createRestaurant(restaurantData);
      res.json(restaurant);
    } catch (error) {
      res.status(400).json({ error: "Invalid restaurant data" });
    }
  });

  app.get("/api/restaurants/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      res.json(restaurant);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant" });
    }
  });

  app.put("/api/restaurants/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertRestaurantSchema.partial().parse(req.body);
      const restaurant = await storage.updateRestaurant(id, updateData);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      res.json(restaurant);
    } catch (error) {
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  // Conversation routes
  app.post("/api/conversations", async (req, res) => {
    try {
      const conversationData = insertConversationSchema.parse(req.body);
      const conversation = await storage.createConversation(conversationData);
      res.json(conversation);
    } catch (error) {
      res.status(400).json({ error: "Invalid conversation data" });
    }
  });

  app.get("/api/restaurants/:id/conversations", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.id);
      const conversations = await storage.getConversationsByRestaurant(restaurantId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  // Chat routes
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, restaurantId, conversationId } = req.body;
      
      if (!message || !restaurantId) {
        return res.status(400).json({ error: "Message and restaurant ID are required" });
      }

      // Get restaurant context
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      // Create or get conversation
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const conversation = await storage.createConversation({
          restaurantId,
          title: message.substring(0, 50) + (message.length > 50 ? "..." : "")
        });
        activeConversationId = conversation.id;
      }

      // Get conversation history
      const messages = await storage.getMessagesByConversation(activeConversationId);
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Create user message
      const userMessage = await storage.createMessage({
        conversationId: activeConversationId,
        role: "user",
        content: message,
        category: null
      });

      // Get AI response
      const aiResponse = await aiChefService.getChefAdvice(
        message,
        {
          name: restaurant.name,
          theme: restaurant.theme,
          categories: restaurant.categories,
          kitchenCapability: restaurant.kitchenCapability,
          staffSize: restaurant.staffSize,
          additionalContext: restaurant.additionalContext || undefined
        },
        conversationHistory
      );

      // Create assistant message
      const assistantMessage = await storage.createMessage({
        conversationId: activeConversationId,
        role: "assistant",
        content: aiResponse.content,
        category: aiResponse.category || null
      });

      // Save recommendations if any
      const savedRecommendations = [];
      if (aiResponse.recommendations && aiResponse.recommendations.length > 0) {
        for (const rec of aiResponse.recommendations) {
          const savedRec = await storage.createRecommendation({
            restaurantId,
            messageId: assistantMessage.id,
            title: rec.title,
            description: rec.description,
            category: aiResponse.category || "general",
            recipe: rec.recipe || null,
            implemented: false
          });
          savedRecommendations.push(savedRec);
        }
      }

      res.json({
        conversationId: activeConversationId,
        userMessage,
        assistantMessage,
        recommendations: savedRecommendations
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  // Quick action routes
  app.post("/api/quick-actions/menu-suggestions", async (req, res) => {
    try {
      const { restaurantId } = req.body;
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const response = await aiChefService.generateMenuSuggestions({
        name: restaurant.name,
        theme: restaurant.theme,
        categories: restaurant.categories,
        kitchenCapability: restaurant.kitchenCapability,
        staffSize: restaurant.staffSize,
        additionalContext: restaurant.additionalContext || undefined
      });

      // Save recommendations from the response
      const savedRecommendations = [];
      if (response.recommendations && response.recommendations.length > 0) {
        for (const rec of response.recommendations) {
          const savedRec = await storage.createRecommendation({
            restaurantId,
            messageId: null,
            title: rec.title,
            description: rec.description,
            category: response.category || "menu",
            recipe: rec.recipe || null,
            implemented: false
          });
          savedRecommendations.push(savedRec);
        }
      }

      res.json({
        ...response,
        savedRecommendations
      });
    } catch (error) {
      console.error("Menu suggestions error:", error);
      res.status(500).json({ error: "Failed to generate menu suggestions" });
    }
  });

  app.post("/api/quick-actions/flavor-pairing", async (req, res) => {
    try {
      const { restaurantId, ingredient } = req.body;
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const response = await aiChefService.generateFlavorPairings(ingredient || "beef", {
        name: restaurant.name,
        theme: restaurant.theme,
        categories: restaurant.categories,
        kitchenCapability: restaurant.kitchenCapability,
        staffSize: restaurant.staffSize,
        additionalContext: restaurant.additionalContext || undefined
      });

      // Save recommendations from the response
      const savedRecommendations = [];
      if (response.recommendations && response.recommendations.length > 0) {
        for (const rec of response.recommendations) {
          const savedRec = await storage.createRecommendation({
            restaurantId,
            messageId: null,
            title: rec.title,
            description: rec.description,
            category: response.category || "flavor-pairing",
            recipe: rec.recipe || null,
            implemented: false
          });
          savedRecommendations.push(savedRec);
        }
      }

      res.json({
        ...response,
        savedRecommendations
      });
    } catch (error) {
      console.error("Flavor pairing error:", error);
      res.status(500).json({ error: "Failed to generate flavor pairings" });
    }
  });

  app.post("/api/quick-actions/efficiency-analysis", async (req, res) => {
    try {
      const { restaurantId } = req.body;
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const response = await aiChefService.analyzeOperationalEfficiency({
        name: restaurant.name,
        theme: restaurant.theme,
        categories: restaurant.categories,
        kitchenCapability: restaurant.kitchenCapability,
        staffSize: restaurant.staffSize,
        additionalContext: restaurant.additionalContext || undefined
      });

      // Save recommendations from the response
      const savedRecommendations = [];
      if (response.recommendations && response.recommendations.length > 0) {
        for (const rec of response.recommendations) {
          const savedRec = await storage.createRecommendation({
            restaurantId,
            messageId: null,
            title: rec.title,
            description: rec.description,
            category: response.category || "efficiency",
            recipe: rec.recipe || null,
            implemented: false
          });
          savedRecommendations.push(savedRec);
        }
      }

      res.json({
        ...response,
        savedRecommendations
      });
    } catch (error) {
      console.error("Efficiency analysis error:", error);
      res.status(500).json({ error: "Failed to analyze efficiency" });
    }
  });

  app.post("/api/quick-actions/cocktail-creation", async (req, res) => {
    try {
      const { restaurantId } = req.body;
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const response = await aiChefService.createSignatureCocktails({
        name: restaurant.name,
        theme: restaurant.theme,
        categories: restaurant.categories,
        kitchenCapability: restaurant.kitchenCapability,
        staffSize: restaurant.staffSize,
        additionalContext: restaurant.additionalContext || undefined
      });

      // Save recommendations from the response
      const savedRecommendations = [];
      if (response.recommendations && response.recommendations.length > 0) {
        for (const rec of response.recommendations) {
          const savedRec = await storage.createRecommendation({
            restaurantId,
            messageId: null,
            title: rec.title,
            description: rec.description,
            category: response.category || "cocktails",
            recipe: rec.recipe || null,
            implemented: false
          });
          savedRecommendations.push(savedRec);
        }
      }

      res.json({
        ...response,
        savedRecommendations
      });
    } catch (error) {
      console.error("Cocktail creation error:", error);
      res.status(500).json({ error: "Failed to create cocktail suggestions" });
    }
  });

  // Recommendations routes
  app.get("/api/restaurants/:id/recommendations", async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.id);
      const recommendations = await storage.getRecommendationsByRestaurant(restaurantId);
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  app.put("/api/recommendations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertRecommendationSchema.partial().parse(req.body);
      const recommendation = await storage.updateRecommendation(id, updateData);
      if (!recommendation) {
        return res.status(404).json({ error: "Recommendation not found" });
      }
      res.json(recommendation);
    } catch (error) {
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  // Enhanced Menu Generation API
  app.post("/api/generate/menu-items", async (req, res) => {
    try {
      const { restaurantId, specificRequests, dietaryRestrictions, targetPricePoint, seasonalFocus } = req.body;
      
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const context = {
        name: restaurant.name,
        theme: restaurant.theme,
        categories: restaurant.categories,
        kitchenCapability: restaurant.kitchenCapability,
        staffSize: restaurant.staffSize,
        additionalContext: restaurant.additionalContext
      };

      const menuItems = await menuGenerator.generateMenuItems({
        context,
        specificRequests,
        dietaryRestrictions,
        targetPricePoint,
        seasonalFocus
      });

      res.json({ menuItems });
    } catch (error) {
      console.error("Menu generation error:", error);
      res.status(500).json({ error: "Failed to generate menu items" });
    }
  });

  // Enhanced Cocktail Generation API
  app.post("/api/generate/cocktails", async (req, res) => {
    try {
      const { restaurantId, theme, baseSpirits, complexity, batchable, seasonality } = req.body;
      
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const context = {
        name: restaurant.name,
        theme: restaurant.theme,
        categories: restaurant.categories,
        kitchenCapability: restaurant.kitchenCapability,
        staffSize: restaurant.staffSize,
        additionalContext: restaurant.additionalContext
      };

      const cocktails = await menuGenerator.generateCocktails({
        context,
        theme,
        baseSpirits,
        complexity,
        batchable,
        seasonality
      });

      res.json({ cocktails });
    } catch (error) {
      console.error("Cocktail generation error:", error);
      res.status(500).json({ error: "Failed to generate cocktails" });
    }
  });

  // Menu-Cocktail Pairing Generation
  app.post("/api/generate/paired-menu-cocktails", async (req, res) => {
    try {
      const { restaurantId, menuItems } = req.body;
      
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }

      const context = {
        name: restaurant.name,
        theme: restaurant.theme,
        categories: restaurant.categories,
        kitchenCapability: restaurant.kitchenCapability,
        staffSize: restaurant.staffSize,
        additionalContext: restaurant.additionalContext
      };

      const pairings = await menuGenerator.generatePairedMenuCocktails(menuItems, context);

      res.json({ pairings });
    } catch (error) {
      console.error("Menu-cocktail pairing error:", error);
      res.status(500).json({ error: "Failed to generate menu-cocktail pairings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
