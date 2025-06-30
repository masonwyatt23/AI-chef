import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { aiChefService } from "./services/aiChef";
import { menuGenerator } from "./services/menuGenerator";
import { configureSession, hashPassword, comparePassword, requireAuth } from "./auth";
import { 
  insertRestaurantSchema, 
  insertConversationSchema, 
  insertMessageSchema,
  insertRecommendationSchema,
  insertSavedMenuSchema
} from "@shared/schema";
import { z } from "zod";
import multer from "multer";

// Configure multer for PDF uploads
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Configure multer for profile picture uploads
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/profile-pictures/',
    filename: (req, file, cb) => {
      const userId = (req as any).session.userId;
      const ext = file.originalname.split('.').pop();
      cb(null, `user-${userId}-${Date.now()}.${ext}`);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session middleware
  configureSession(app);

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({ username, password: hashedPassword });

      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;

      res.json({ id: user.id, username: user.username });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      // Find user
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Check password
      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;

      res.json({ id: user.id, username: user.username });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ 
        id: user.id, 
        username: user.username,
        profilePicture: user.profilePicture
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user data" });
    }
  });

  // Profile picture upload endpoint
  app.post("/api/auth/profile-picture", requireAuth, imageUpload.single('profilePicture'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file uploaded" });
      }

      const userId = req.session.userId;
      const profilePicturePath = `/uploads/profile-pictures/${req.file.filename}`;

      // Update user profile picture in database
      await storage.updateUserProfilePicture(userId, profilePicturePath);

      res.json({ 
        message: "Profile picture uploaded successfully",
        profilePicture: profilePicturePath
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      res.status(500).json({ error: "Failed to upload profile picture" });
    }
  });
  // PDF Upload route with text extraction
  app.post("/api/parse-menu-pdf", pdfUpload.single('menuPdf'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      try {
        // For now, provide a helpful message since pdf-parse has compatibility issues
        const filename = req.file.originalname;
        
        console.log(`PDF uploaded: ${filename} (${req.file.size} bytes)`);
        
        res.json({ 
          text: `PDF "${filename}" uploaded successfully.\n\nTo use your menu content:\n1. Open the PDF file on your computer\n2. Copy the menu text\n3. Paste it into the text area below\n\nThis ensures the most accurate menu information for AI analysis.`,
          filename: filename,
          size: req.file.size,
          uploaded: true,
          message: "PDF received - please copy/paste content manually for best results"
        });
      } catch (error) {
        console.error("Error handling PDF upload:", error);
        res.status(500).json({ 
          error: "Failed to process PDF upload",
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Error processing PDF:", error);
      res.status(500).json({ error: "Failed to process PDF file" });
    }
  });

  // Restaurant routes
  app.get("/api/restaurants", requireAuth, async (req, res) => {
    try {
      const restaurants = await storage.getRestaurantsByUser(req.user!.id);
      res.json(restaurants);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurants" });
    }
  });

  app.post("/api/restaurants", requireAuth, async (req, res) => {
    try {
      const restaurantData = insertRestaurantSchema.parse({
        ...req.body,
        userId: req.user!.id
      });
      const restaurant = await storage.createRestaurant(restaurantData);
      res.json(restaurant);
    } catch (error) {
      res.status(400).json({ error: "Invalid restaurant data" });
    }
  });

  app.get("/api/restaurants/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      // Check ownership
      if (restaurant.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(restaurant);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch restaurant" });
    }
  });

  app.put("/api/restaurants/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      // Check ownership
      if (restaurant.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updateData = insertRestaurantSchema.partial().parse(req.body);
      const updatedRestaurant = await storage.updateRestaurant(id, updateData);
      res.json(updatedRestaurant);
    } catch (error) {
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  app.patch("/api/restaurants/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const restaurant = await storage.getRestaurant(id);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      // Check ownership
      if (restaurant.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const updateData = insertRestaurantSchema.partial().parse(req.body);
      const updatedRestaurant = await storage.updateRestaurant(id, updateData);
      res.json(updatedRestaurant);
    } catch (error) {
      res.status(400).json({ error: "Invalid update data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Conversation routes
  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const conversationData = insertConversationSchema.parse(req.body);
      // Verify restaurant ownership
      const restaurant = await storage.getRestaurant(conversationData.restaurantId);
      if (!restaurant || restaurant.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const conversation = await storage.createConversation(conversationData);
      res.json(conversation);
    } catch (error) {
      res.status(400).json({ error: "Invalid conversation data" });
    }
  });

  app.get("/api/restaurants/:id/conversations", requireAuth, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.id);
      // Verify restaurant ownership
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant || restaurant.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const conversations = await storage.getConversationsByRestaurant(restaurantId);
      res.json(conversations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      // Verify conversation access through restaurant ownership
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const restaurant = await storage.getRestaurant(conversation.restaurantId);
      if (!restaurant || restaurant.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.delete("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const success = await storage.deleteConversation(conversationId);
      if (success) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Conversation not found or could not be deleted" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Chat routes
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, restaurantId, conversationId, responseLength = "balanced" } = req.body;
      
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
        conversationHistory,
        responseLength
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
  app.get("/api/restaurants/:id/recommendations", requireAuth, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.id);
      // Verify restaurant ownership
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant || restaurant.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }
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

  // Saved Menus routes
  app.post("/api/saved-menus", requireAuth, async (req, res) => {
    try {
      const savedMenuData = insertSavedMenuSchema.parse(req.body);
      // Verify restaurant ownership
      const restaurant = await storage.getRestaurant(savedMenuData.restaurantId);
      if (!restaurant || restaurant.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const savedMenu = await storage.createSavedMenu(savedMenuData);
      res.json(savedMenu);
    } catch (error) {
      res.status(400).json({ error: "Invalid saved menu data" });
    }
  });

  app.get("/api/restaurants/:id/saved-menus", requireAuth, async (req, res) => {
    try {
      const restaurantId = parseInt(req.params.id);
      // Verify restaurant ownership
      const restaurant = await storage.getRestaurant(restaurantId);
      if (!restaurant || restaurant.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const savedMenus = await storage.getSavedMenusByRestaurant(restaurantId);
      res.json(savedMenus);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch saved menus" });
    }
  });

  app.delete("/api/saved-menus/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Get the saved menu to verify ownership
      const savedMenu = await storage.getSavedMenu(id);
      if (!savedMenu) {
        return res.status(404).json({ error: "Saved menu not found" });
      }
      // Verify restaurant ownership
      const restaurant = await storage.getRestaurant(savedMenu.restaurantId);
      if (!restaurant || restaurant.userId !== req.user!.id) {
        return res.status(403).json({ error: "Access denied" });
      }
      const success = await storage.deleteSavedMenu(id);
      if (!success) {
        return res.status(500).json({ error: "Failed to delete saved menu" });
      }
      res.json({ message: "Saved menu deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete saved menu" });
    }
  });

  // Enhanced Menu Generation API
  app.post("/api/generate/menu-items", async (req, res) => {
    try {
      const { restaurantId, specificRequests, dietaryRestrictions, targetPricePoint, seasonalFocus, focusCategory, currentMenu } = req.body;
      
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
        additionalContext: restaurant.additionalContext || undefined
      };

      const menuItems = await menuGenerator.generateMenuItems({
        context,
        specificRequests,
        dietaryRestrictions,
        targetPricePoint,
        seasonalFocus,
        focusCategory,
        currentMenu
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
        additionalContext: restaurant.additionalContext || undefined
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
        additionalContext: restaurant.additionalContext || undefined
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
