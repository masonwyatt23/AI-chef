import OpenAI from "openai";
import type { RestaurantContext } from "./aiChef";

const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.XAI_API_KEY ? "https://api.x.ai/v1" : undefined,
});

export interface GeneratedMenuItem {
  name: string;
  description: string;
  category: string;
  ingredients: string[];
  preparationTime: number;
  difficulty: string;
  estimatedCost: number;
  suggestedPrice: number;
  profitMargin: number;
  recipe?: {
    serves: number;
    prepInstructions: string[];
    cookingInstructions: string[];
    platingInstructions: string[];
    techniques: string[];
  };
  allergens?: string[];
  nutritionalHighlights?: string[];
  winePairings?: string[];
  upsellOpportunities?: string[];
}

export interface MenuGenerationRequest {
  context: RestaurantContext;
  category?: string;
  currentMenu?: Array<{ name: string; category: string; }>;
}

export class SimpleMenuGenerator {
  async generateMenuItems(request: MenuGenerationRequest): Promise<GeneratedMenuItem[]> {
    console.log('Starting simplified menu generation');
    
    try {
      const response = await openai.chat.completions.create({
        model: "grok-2-1212",
        messages: [
          { 
            role: "system", 
            content: "You are a chef. Create 4 menu items in valid JSON format only." 
          },
          { 
            role: "user", 
            content: `Create 4 menu items for "${request.context.name}". 

Format:
{
  "items": [
    {
      "name": "Dish Name",
      "description": "Short description",
      "category": "entrees",
      "ingredients": ["ingredient1", "ingredient2"],
      "preparationTime": 25,
      "difficulty": "medium",
      "estimatedCost": 10,
      "suggestedPrice": 24,
      "profitMargin": 58,
      "recipe": {
        "serves": 1,
        "prepInstructions": ["step1"],
        "cookingInstructions": ["step1"],
        "platingInstructions": ["step1"],
        "techniques": ["technique1"]
      },
      "allergens": ["allergen1"],
      "nutritionalHighlights": ["highlight1"],
      "winePairings": ["wine1"],
      "upsellOpportunities": ["upsell1"]
    }
  ]
}` 
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 1500,
      });

      const content = response.choices[0].message.content || '{"items": []}';
      
      try {
        const result = JSON.parse(content);
        if (result.items && Array.isArray(result.items) && result.items.length > 0) {
          console.log(`Generated ${result.items.length} menu items successfully`);
          return result.items.slice(0, 4);
        }
      } catch (parseError) {
        console.log('Parse failed, using fallback');
      }
      
      // Simple fallback
      return this.getFallbackItems(request.context);
      
    } catch (error) {
      console.error('Menu generation failed:', error);
      return this.getFallbackItems(request.context);
    }
  }

  private getFallbackItems(context: RestaurantContext): GeneratedMenuItem[] {
    const theme = context.theme || 'American';
    const timestamp = Date.now().toString().slice(-3);
    
    return [
      {
        name: `${theme} Classic #${timestamp}`,
        description: "Traditional favorite with modern twist",
        category: "entrees",
        ingredients: ["Premium protein", "Seasonal vegetables", "House sauce"],
        preparationTime: 25,
        difficulty: "medium",
        estimatedCost: 12,
        suggestedPrice: 28,
        profitMargin: 57,
        recipe: {
          serves: 1,
          prepInstructions: ["Prepare ingredients", "Season protein"],
          cookingInstructions: ["Cook protein to temperature", "Prepare vegetables"],
          platingInstructions: ["Plate attractively", "Add sauce"],
          techniques: ["Grilling", "Sautéing"]
        },
        allergens: ["None specified"],
        nutritionalHighlights: ["High protein"],
        winePairings: ["House red"],
        upsellOpportunities: ["Wine pairing"]
      },
      {
        name: `${theme} Special #${timestamp}`,
        description: "Chef's signature creation",
        category: "appetizers",
        ingredients: ["Fresh herbs", "Local ingredients", "Artisan garnish"],
        preparationTime: 20,
        difficulty: "easy",
        estimatedCost: 8,
        suggestedPrice: 18,
        profitMargin: 56,
        recipe: {
          serves: 1,
          prepInstructions: ["Prepare garnish", "Mix ingredients"],
          cookingInstructions: ["Light cooking", "Final assembly"],
          platingInstructions: ["Elegant presentation", "Garnish placement"],
          techniques: ["Fresh preparation", "Presentation"]
        },
        allergens: ["None specified"],
        nutritionalHighlights: ["Fresh ingredients"],
        winePairings: ["Light white"],
        upsellOpportunities: ["Appetizer combo"]
      },
      {
        name: `${theme} Delight #${timestamp}`,
        description: "Satisfying comfort creation",
        category: "desserts",
        ingredients: ["Seasonal fruits", "Premium dairy", "House-made elements"],
        preparationTime: 30,
        difficulty: "medium",
        estimatedCost: 6,
        suggestedPrice: 16,
        profitMargin: 62,
        recipe: {
          serves: 1,
          prepInstructions: ["Prepare components", "Make sauce"],
          cookingInstructions: ["Bake elements", "Prepare garnish"],
          platingInstructions: ["Artistic plating", "Final touches"],
          techniques: ["Baking", "Sauce making"]
        },
        allergens: ["Dairy"],
        nutritionalHighlights: ["Natural sweetness"],
        winePairings: ["Dessert wine"],
        upsellOpportunities: ["Coffee pairing"]
      },
      {
        name: `${theme} Garden #${timestamp}`,
        description: "Fresh vegetarian option",
        category: "vegetarian",
        ingredients: ["Seasonal vegetables", "Grains", "Fresh herbs"],
        preparationTime: 28,
        difficulty: "easy",
        estimatedCost: 9,
        suggestedPrice: 22,
        profitMargin: 59,
        recipe: {
          serves: 1,
          prepInstructions: ["Wash vegetables", "Prepare grains"],
          cookingInstructions: ["Cook grains", "Prepare vegetables"],
          platingInstructions: ["Layer components", "Herb garnish"],
          techniques: ["Grain cooking", "Vegetable preparation"]
        },
        allergens: ["None"],
        nutritionalHighlights: ["High fiber", "Plant protein"],
        winePairings: ["Crisp white"],
        upsellOpportunities: ["Soup pairing"]
      }
    ];
  }
}

export const simpleMenuGenerator = new SimpleMenuGenerator();