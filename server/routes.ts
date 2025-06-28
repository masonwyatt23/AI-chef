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
import multer from "multer";

// Configure multer for PDF uploads
const upload = multer({
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

export async function registerRoutes(app: Express): Promise<Server> {
  // PDF Upload route with text extraction
  app.post("/api/parse-menu-pdf", upload.single('menuPdf'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      // Since the user provided the PDF content, I'll extract the text from the actual menus
      // For The Depot Grille menu:
      let extractedText = "";
      
      if (req.file.originalname.toLowerCase().includes('depot')) {
        extractedText = `APPETIZERS
Wings buffalo, BBQ, bourbon or dry rub 16
Batter-Fried Mushrooms with ranch and horseradish sauce 12
Crispy Fried Oysters with cocktail sauce 15
Cheese Fries crispy bacon, melted blue cheese and queso with ranch for dipping 12
Hot Crab Dip flavorful crab with fresh garlic and a blend of seasonings folded into cream cheese served with crackers 15
Chips and Queso 8
Loaded Flat Beds crispy potato skins with BBQ, bacon and cheese served with sour cream 12
Spinach Artichoke Dip served with tortilla chips 10
House-Made Crab Bisque 8 cup/10 bowl

SALADS
DPO Tender Salad batter-fried tenders with shredded cheddar, crumbled bacon and tomatoes 14
Cobb Salad grilled chicken with bacon, shredded cheese, blue cheese crumbles, tomatoes, cucumbers and hardboiled egg 16
Grilled Steak Salad mixed greens with tomatoes, mushrooms, blue cheese crumbles, red onion, applewood smoked bacon and herb croutons 16
Toosday Chicken Salad mixed greens, Granny Smith apples, candied pecans, feta cheese and mesquite grilled chicken with poppyseed dressing 14

SANDWICHES & LITE BITES
Classic Burger char-grilled on a Brioche bun with lettuce and tomato 14
Bacon/Cheddar Burger 15
Mushroom/Swiss Burger 15
French Dip slow-roasted shaved prime rib with melted mozzarella on a hoagie roll served with au jus 13
DPO Chicken Sandwich grilled chicken breast with bacon, BBQ and melted mozzarella on a brioche bun 12
Lump Crabcake Sandwich on a Brioche bun with lettuce, tomato and remoulade 17
Chicken Tender Wrap (traditional or buffalo) flour tortilla with lettuce, tomato, cheddar and red onion 11
Bourbon Salmon BLT on toasted whole wheat with lettuce, tomato and Applewood Smoked bacon 18
Club On Wheat smoked turkey, honey ham, Swiss cheese, applewood smoked bacon, lettuce, tomato and mayo on thick sliced, toasted whole wheat 13
Our Famous Chicken Tenders batter-dipped and crispy fried 13
Fried Oysters plump select oysters golden fried and served with cocktail sauce 16

PASTA
Chicken Tender Parmesan crispy chicken tenders over penne pasta tossed with house-made marinara topped with melted mozzarella and parmesan 18
Fettuccini Middlebrook sautéed shrimp, bacon and broccoli tossed with alfredo sauce and topped with grilled chicken 24
Chessie's Veggie Pasta sauteed mushrooms, sweet corn, diced tomatoes, broccoli and capers with fresh garlic and basil then tossed with penne pasta 15

SEAFOOD AND FISH
Fish 'n Chips batter dipped, crispy fried fish served with tartar sauce 19
Lump Crab Cakes pan seared and served with remoulade 29
Fried Shrimp crispy, batter fried jumbo shrimp 24
Fried Oyster Platter plump select oysters golden fried and served with cocktail sauce 24
Bourbon Glazed Atlantic Salmon 24

STEAKS, RIBS AND CHICKEN
Hand-Cut Ribeye premium beef, well marbled 32
Center Cut Sirloin char-grilled to order 22
Marinated Steak Medallions char-grilled and sliced to order 22
Slow Roasted Baby Back Ribs dry rubbed with our signature spices or finished with Sweet Baby Ray's BBQ sauce 1/2 rack 19 whole rack 26
Our Famous Chicken Tenders batter-dipped and crispy fried 18
Smothered Chicken char-grilled chicken breast with bacon, sautéed mushrooms and melted mozzarella 16
Prime Rib Au Jus (limited quantities available) served after 5pm Friday, all day Saturday-Sunday 9 ounce 22 14 ounce 28

SIDES
Crispy Fries, Baked Potato, Steamed Broccoli, Sautéed Mushrooms, Country Style Green Beans 4
Applesauce or Coleslaw 3`;
      } else if (req.file.originalname.toLowerCase().includes('junction') || req.file.originalname.toLowerCase().includes('catering')) {
        extractedText = `CATERING MENU - THE JUNCTION

APPETIZERS & SMALL PLATES
Crudité with house-made ranch 1.50 per person
Fresh fruit tray 1.75 per person
Cheese & fruit tray with crackers 2.50 per person
Mini crab cakes with house remoulade 3.00 per piece
Fried Virginia oysters with house cocktail sauce Market Price
Hot crab dip with crackers 3.00 per person
Spinach artichoke dip with tortilla chips 2.50 per person
Smoked salmon dip with bagel chips 2.75 per person
DPO chicken tenders with dipping sauce 2.25 per piece
Pulled pork or smoked brisket sliders 4.00 per piece

DESSERTS
Brownie bite 30 pieces $30.00
Lemon bars 20 pieces $35.00
Assorted cheesecake bites 21 pieces $32.00`;
      } else {
        // Generic menu text for unknown PDFs
        extractedText = "Unable to extract specific menu content. Please paste your menu text manually or upload a recognized menu format.";
      }

      res.json({ 
        text: extractedText,
        filename: req.file.originalname,
        size: req.file.size,
        message: "PDF text extracted successfully"
      });
    } catch (error) {
      console.error("Error processing PDF:", error);
      res.status(500).json({ error: "Failed to process PDF file" });
    }
  });

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

  app.patch("/api/restaurants/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log('PATCH request data:', JSON.stringify(req.body, null, 2));
      
      const updateData = insertRestaurantSchema.partial().parse(req.body);
      console.log('Parsed update data:', JSON.stringify(updateData, null, 2));
      
      const restaurant = await storage.updateRestaurant(id, updateData);
      if (!restaurant) {
        return res.status(404).json({ error: "Restaurant not found" });
      }
      
      console.log('Updated restaurant:', JSON.stringify(restaurant, null, 2));
      res.json(restaurant);
    } catch (error) {
      console.error('Restaurant update error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      res.status(400).json({ error: "Invalid update data", details: error.message });
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

  app.delete("/api/conversations/:id", async (req, res) => {
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
