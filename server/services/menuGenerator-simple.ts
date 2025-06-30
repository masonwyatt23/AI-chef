import OpenAI from "openai";
import type { RestaurantContext } from "./aiChef";

const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.XAI_API_KEY ? "https://api.x.ai/v1" : undefined,
});

export interface DetailedIngredient {
  ingredient: string;
  amount: string;
  unit: string;
  cost: number;
  notes?: string;
  batchAmount?: string;
  batchUnit?: string;
}

export interface GeneratedMenuItem {
  name: string;
  description: string;
  category: string;
  ingredients: DetailedIngredient[];
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
    batchInstructions?: string[];
    batchServes?: number;
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
  specificRequests?: string;
  dietaryRestrictions?: string[];
  targetPricePoint?: number;
  seasonalFocus?: string;
  focusCategory?: string;
  batchProduction?: boolean;
  batchSize?: number;
}

export interface CocktailGenerationRequest {
  context: RestaurantContext;
  theme?: string;
  baseSpirits?: string[];
  complexity?: string;
  batchable?: boolean;
  seasonality?: string;
}

export interface GeneratedCocktail {
  name: string;
  description: string;
  category: string;
  ingredients: Array<{
    ingredient: string;
    amount: string;
    cost: number;
  }>;
  instructions: string[];
  garnish: string;
  glassware: string;
  estimatedCost: number;
  suggestedPrice: number;
  profitMargin: number;
  preparationTime: number;
}

export class SimpleMenuGenerator {
  private buildDetailedContext(context: RestaurantContext, currentMenu?: Array<{ name: string; category: string; }>): string {
    const sections = [];
    
    // Basic restaurant info
    sections.push(`Restaurant: "${context.name}"`);
    sections.push(`Theme/Concept: ${context.theme}`);
    sections.push(`Categories: ${context.categories?.join(', ') || 'Various'}`);
    
    // Business context
    if (context.establishmentType) sections.push(`Type: ${context.establishmentType}`);
    if (context.serviceStyle) sections.push(`Service: ${context.serviceStyle}`);
    if (context.targetDemographic) sections.push(`Target Customers: ${context.targetDemographic}`);
    if (context.averageTicketPrice) sections.push(`Average Check: $${context.averageTicketPrice}`);
    if (context.diningCapacity) sections.push(`Capacity: ${context.diningCapacity} seats`);
    
    // Location & market
    if (context.location) sections.push(`Location: ${context.location}`);
    if (context.marketType) sections.push(`Market: ${context.marketType}`);
    if (context.localIngredients?.length) sections.push(`Local Ingredients: ${context.localIngredients.join(', ')}`);
    if (context.culturalInfluences?.length) sections.push(`Cultural Influences: ${context.culturalInfluences.join(', ')}`);
    
    // Kitchen & operations
    sections.push(`Kitchen Capability: ${context.kitchenCapability}`);
    sections.push(`Staff Size: ${context.staffSize}`);
    if (context.kitchenSize) sections.push(`Kitchen Size: ${context.kitchenSize}`);
    if (context.kitchenEquipment?.length) sections.push(`Equipment: ${context.kitchenEquipment.join(', ')}`);
    if (context.staffSkillLevel) sections.push(`Staff Skill: ${context.staffSkillLevel}`);
    
    // Business goals
    if (context.profitMarginGoals) sections.push(`Target Profit Margin: ${context.profitMarginGoals}%`);
    if (context.foodCostGoals) sections.push(`Target Food Cost: ${context.foodCostGoals}%`);
    if (context.specialDietaryNeeds?.length) sections.push(`Dietary Accommodations: ${context.specialDietaryNeeds.join(', ')}`);
    
    // Competition & positioning
    if (context.primaryCompetitors?.length) sections.push(`Competitors: ${context.primaryCompetitors.join(', ')}`);
    if (context.uniqueSellingPoints?.length) sections.push(`USPs: ${context.uniqueSellingPoints.join(', ')}`);
    if (context.pricePosition) sections.push(`Price Position: ${context.pricePosition}`);
    
    // Current challenges and priorities
    if (context.currentChallenges?.length) sections.push(`Current Challenges: ${context.currentChallenges.join(', ')}`);
    if (context.businessPriorities?.length) sections.push(`Business Priorities: ${context.businessPriorities.join(', ')}`);
    if (context.seasonalConsiderations) sections.push(`Seasonal Notes: ${context.seasonalConsiderations}`);
    
    // Current menu analysis
    if (currentMenu?.length) {
      const menuByCategory = currentMenu.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item.name);
        return acc;
      }, {} as Record<string, string[]>);
      
      sections.push('\nCurrent Menu:');
      Object.entries(menuByCategory).forEach(([category, items]) => {
        sections.push(`${category}: ${items.join(', ')}`);
      });
    }
    
    return sections.join('\n');
  }

  async generateCocktails(request: CocktailGenerationRequest): Promise<GeneratedCocktail[]> {
    console.log('Starting personalized cocktail generation for:', request.context.name);
    
    // Build comprehensive restaurant context for cocktails
    const restaurantInfo = this.buildDetailedContext(request.context);
    
    try {
      const response = await openai.chat.completions.create({
        model: "grok-2-1212",
        messages: [
          { 
            role: "system", 
            content: "You are an expert mixologist and beverage consultant. Create signature cocktails that perfectly complement the restaurant's theme, atmosphere, and clientele. Write compelling 1-2 sentence descriptions that capture the drink's essence, flavor profile, and connection to the restaurant's identity." 
          },
          { 
            role: "user", 
            content: `Create 4 signature cocktails for "${request.context.name}" based on this restaurant profile:

${restaurantInfo}

Requirements:
- Reflect the ${request.context.theme} theme in both names and ingredients
- Match the ${request.context.establishmentType} atmosphere
- Appeal to ${request.context.targetDemographic} customers
- Use spirits and ingredients that fit the restaurant's style
- Consider local flavors from ${request.context.location || 'the region'}
- Price appropriately for $${request.context.averageTicketPrice || '25'} average check

${request.theme ? `Additional theme: ${request.theme}` : ''}
${request.baseSpirits?.length ? `Preferred spirits: ${request.baseSpirits.join(', ')}` : ''}
${request.seasonality ? `Seasonal focus: ${request.seasonality}` : ''}

Each cocktail should have:
- A creative name that reflects the restaurant's identity
- A compelling 1-2 sentence description that captures the drink's unique flavors, inspiration, and connection to the restaurant
- Ingredients that complement the restaurant's food style
- Pricing that matches their market position

JSON format:
{
  "cocktails": [
    {
      "name": "Restaurant-Themed Name",
      "description": "A thoughtful sentence or two describing the cocktail's flavor profile, inspiration, and connection to the restaurant's identity and atmosphere.",
      "category": "signature",
      "ingredients": [{"ingredient": "specific spirit", "amount": "2 oz", "cost": 3}],
      "instructions": ["detailed preparation"],
      "garnish": "themed garnish",
      "glassware": "appropriate glass",
      "estimatedCost": 4,
      "suggestedPrice": 14,
      "profitMargin": 70,
      "preparationTime": 3
    }
  ]
}

Make each cocktail unique and specifically tailored to this restaurant's character and brand.` 
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: 1200,
      });

      const content = response.choices[0].message.content || '{"cocktails": []}';
      
      try {
        const result = JSON.parse(content);
        if (result.cocktails && Array.isArray(result.cocktails) && result.cocktails.length > 0) {
          console.log(`Generated ${result.cocktails.length} cocktails successfully`);
          return result.cocktails.slice(0, 4);
        }
      } catch (parseError) {
        console.log('Parse failed, using fallback');
      }
      
      return this.getFallbackCocktails(request.context);
      
    } catch (error) {
      console.error('Cocktail generation failed:', error);
      return this.getFallbackCocktails(request.context);
    }
  }

  async generateMenuItems(request: MenuGenerationRequest): Promise<GeneratedMenuItem[]> {
    console.log('Starting personalized menu generation for:', request.context.name);
    
    // Build comprehensive restaurant context
    const restaurantInfo = this.buildDetailedContext(request.context, request.currentMenu);
    
    try {
      const response = await openai.chat.completions.create({
        model: "grok-2-1212",
        messages: [
          { 
            role: "system", 
            content: `You are an expert chef consultant specializing in menu development. Create innovative, restaurant-specific menu items that perfectly align with the establishment's theme, capabilities, and market positioning. Use the restaurant's complete profile to ensure every dish reflects their unique identity.` 
          },
          { 
            role: "user", 
            content: `Create 4 unique menu items for "${request.context.name}" based on this detailed restaurant profile:

${restaurantInfo}

Requirements:
- Each item must reflect the restaurant's ${request.context.theme} theme
- Consider their ${request.context.establishmentType} establishment type
- Target ${request.context.targetDemographic} demographic
- Use ingredients available in ${request.context.location || 'the local area'}
- Work within their kitchen capabilities: ${request.context.kitchenCapability}
- Staff skill level: ${request.context.staffSkillLevel || 'experienced'}
- Average ticket price range: $${request.context.averageTicketPrice || '25'}

${request.specificRequests ? `Special requests: ${request.specificRequests}` : ''}
${request.dietaryRestrictions?.length ? `Dietary considerations: ${request.dietaryRestrictions.join(', ')}` : ''}
${request.focusCategory ? `Focus on: ${request.focusCategory} category` : ''}

JSON format:
{
  "items": [
    {
      "name": "Creative Restaurant-Themed Name",
      "description": "Compelling description highlighting unique aspects",
      "category": "entrees",
      "ingredients": ["specific ingredient1", "local ingredient2"],
      "preparationTime": 25,
      "difficulty": "medium",
      "estimatedCost": 12,
      "suggestedPrice": 28,
      "profitMargin": 57,
      "recipe": {
        "serves": 1,
        "prepInstructions": ["detailed step1"],
        "cookingInstructions": ["specific technique step1"],
        "platingInstructions": ["presentation step1"],
        "techniques": ["relevant technique1"]
      },
      "allergens": ["specific allergen1"],
      "nutritionalHighlights": ["relevant highlight1"],
      "winePairings": ["appropriate wine1"],
      "upsellOpportunities": ["relevant upsell1"]
    }
  ]
}

Make each item distinctly different and specifically tailored to this restaurant's unique profile and capabilities.` 
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 2500,
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

  private generateUniqueId(): string {
    return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  private getFallbackItems(context: RestaurantContext): GeneratedMenuItem[] {
    const theme = context.theme || 'American';
    const uniqueId = this.generateUniqueId();
    const location = context.location || 'Local';
    const priceRange = context.averageTicketPrice || 25;
    
    // Restaurant-specific naming based on actual profile
    const namePrefix = context.name?.split(' ')[0] || theme;
    const demographic = context.targetDemographic || 'all guests';
    const establishment = context.establishmentType || 'restaurant';
    
    return [
      {
        name: `${namePrefix}'s Signature ${theme} Platter`,
        description: `Locally-sourced ${theme.toLowerCase()} dish crafted for ${demographic} with ${location} ingredients and our unique preparation style`,
        category: "entrees",
        ingredients: [
          {
            ingredient: `${location} sourced protein`,
            amount: "6",
            unit: "oz",
            cost: Math.floor(priceRange * 0.15),
            notes: `Premium grade, locally sourced from ${location} suppliers`
          },
          {
            ingredient: `Seasonal ${location.toLowerCase()} vegetables`,
            amount: "4",
            unit: "oz",
            cost: Math.floor(priceRange * 0.08),
            notes: "Fresh, seasonal selection"
          },
          {
            ingredient: `House-made ${theme.toLowerCase()} sauce`,
            amount: "2",
            unit: "oz",
            cost: Math.floor(priceRange * 0.05),
            notes: `Signature ${namePrefix} recipe`
          },
          {
            ingredient: `${namePrefix} special seasoning blend`,
            amount: "1",
            unit: "tsp",
            cost: 0.25,
            notes: "Proprietary blend of herbs and spices"
          }
        ],
        preparationTime: Math.floor(priceRange * 0.8),
        difficulty: context.staffSkillLevel?.includes('experienced') ? "medium" : "easy",
        estimatedCost: Math.floor(priceRange * 0.4),
        suggestedPrice: priceRange,
        profitMargin: Math.floor(((priceRange - (priceRange * 0.4)) / priceRange) * 100),
        recipe: {
          serves: 1,
          prepInstructions: [
            `Source premium ${location.toLowerCase()} ingredients according to seasonal availability`,
            `Prepare signature ${theme.toLowerCase()} marinade using house recipe`,
            `Set up mise en place for ${establishment} service standards`
          ],
          cookingInstructions: [
            `Execute ${theme.toLowerCase()} cooking technique with precision timing`,
            `Monitor temperatures to achieve perfect ${demographic} preference`,
            `Apply final ${namePrefix} finishing touches`
          ],
          platingInstructions: [
            `Present using ${establishment} plating standards`,
            `Garnish with ${location} seasonal elements`,
            `Add signature ${namePrefix} presentation touches`
          ],
          techniques: [`${theme} cooking methods`, "Local ingredient preparation", `${namePrefix} signature techniques`]
        },
        allergens: context.specialDietaryNeeds || ["Please check with kitchen staff"],
        nutritionalHighlights: [`${theme} cuisine benefits`, `${location} fresh ingredients`],
        winePairings: [`${theme} wine selection`, `${location} vineyard recommendations`],
        upsellOpportunities: [`${theme} appetizer pairing`, `${location} beverage selection`]
      },
      {
        name: `${namePrefix} ${theme} Signature Appetizer`,
        description: "Chef's signature creation",
        category: "appetizers",
        ingredients: [
          { ingredient: "Fresh herbs", amount: "2", unit: "tbsp", cost: 1.50, notes: "Mixed seasonal herbs" },
          { ingredient: "Local ingredients", amount: "3", unit: "oz", cost: 2.25, notes: "Market fresh" },
          { ingredient: "Artisan garnish", amount: "1", unit: "piece", cost: 0.75, notes: "House-made accent" }
        ],
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
        name: `${namePrefix} ${theme} Signature Dessert`,
        description: "Satisfying comfort creation",
        category: "desserts",
        ingredients: [
          { ingredient: "Seasonal fruits", amount: "4", unit: "oz", cost: 2.00, notes: "Peak season selection" },
          { ingredient: "Premium dairy", amount: "2", unit: "oz", cost: 1.25, notes: "Local dairy source" },
          { ingredient: "House-made elements", amount: "1", unit: "portion", cost: 1.50, notes: "Signature preparation" }
        ],
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
        name: `${namePrefix} ${theme} Garden Selection`,
        description: "Fresh vegetarian option",
        category: "vegetarian",
        ingredients: [
          { ingredient: "Seasonal vegetables", amount: "6", unit: "oz", cost: 2.50, notes: "Farm-fresh selection" },
          { ingredient: "Grains", amount: "3", unit: "oz", cost: 1.00, notes: "Ancient grain blend" },
          { ingredient: "Fresh herbs", amount: "1", unit: "tbsp", cost: 0.75, notes: "Garden fresh" }
        ],
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

  private getFallbackCocktails(context: RestaurantContext): GeneratedCocktail[] {
    const theme = context.theme || 'Classic';
    const uniqueId = this.generateUniqueId();
    const location = context.location || 'locally';
    const namePrefix = context.name?.split(' ')[0] || theme;
    
    return [
      {
        name: `${namePrefix} ${theme} Bourbon Signature`,
        description: `A sophisticated bourbon cocktail that captures the warmth and character of ${context.name || 'our establishment'}, featuring premium bourbon perfectly balanced with subtle sweetness and bright citrus notes that complement our ${theme.toLowerCase()} dining atmosphere.`,
        category: "signature",
        ingredients: [
          { ingredient: "Bourbon", amount: "2 oz", cost: 3 },
          { ingredient: "Simple syrup", amount: "0.5 oz", cost: 0.2 },
          { ingredient: "Lemon juice", amount: "0.5 oz", cost: 0.1 }
        ],
        instructions: ["Shake with ice", "Strain into glass"],
        garnish: "lemon twist",
        glassware: "rocks glass",
        estimatedCost: 3.3,
        suggestedPrice: 14,
        profitMargin: 76,
        preparationTime: 3
      },
      {
        name: `${namePrefix} ${theme} Gin Garden`,
        description: `A refreshing gin-based cocktail that embodies the crisp, botanical essence perfect for ${context.name || 'our restaurant'}, combining premium gin with effervescent tonic and fresh citrus to create a drink that pairs beautifully with our ${theme.toLowerCase()} cuisine.`,
        category: "signature", 
        ingredients: [
          { ingredient: "Gin", amount: "2 oz", cost: 2.5 },
          { ingredient: "Tonic water", amount: "4 oz", cost: 0.3 },
          { ingredient: "Lime juice", amount: "0.25 oz", cost: 0.1 }
        ],
        instructions: ["Build in glass", "Stir gently"],
        garnish: "lime wheel",
        glassware: "highball glass",
        estimatedCost: 2.9,
        suggestedPrice: 12,
        profitMargin: 76,
        preparationTime: 2
      },
      {
        name: `${namePrefix} ${theme} Vodka Splash`,
        description: `A vibrant vodka cocktail designed to reflect the clean, modern aesthetic of ${context.name || 'our establishment'}, blending premium vodka with fresh cranberry and lime to create a beautifully balanced drink that's both visually stunning and perfectly suited to our ${theme.toLowerCase()} atmosphere.`,
        category: "signature",
        ingredients: [
          { ingredient: "Vodka", amount: "2 oz", cost: 2 },
          { ingredient: "Cranberry juice", amount: "1 oz", cost: 0.2 },
          { ingredient: "Lime juice", amount: "0.5 oz", cost: 0.1 }
        ],
        instructions: ["Shake with ice", "Strain over fresh ice"],
        garnish: "lime wedge",
        glassware: "rocks glass",
        estimatedCost: 2.3,
        suggestedPrice: 11,
        profitMargin: 79,
        preparationTime: 3
      },
      {
        name: `${namePrefix} ${theme} Rum Paradise`,
        description: `An inviting rum cocktail that brings tropical warmth to ${context.name || 'our dining experience'}, featuring smooth white rum combined with sweet pineapple and sparkling soda to create a refreshing drink that perfectly complements our ${theme.toLowerCase()} hospitality and cuisine.`,
        category: "signature",
        ingredients: [
          { ingredient: "White rum", amount: "2 oz", cost: 2.2 },
          { ingredient: "Pineapple juice", amount: "1 oz", cost: 0.3 },
          { ingredient: "Club soda", amount: "2 oz", cost: 0.1 }
        ],
        instructions: ["Shake juice and rum", "Top with soda"],
        garnish: "pineapple wedge",
        glassware: "highball glass",
        estimatedCost: 2.6,
        suggestedPrice: 13,
        profitMargin: 80,
        preparationTime: 3
      }
    ];
  }

  async generatePairedMenuCocktails(menuItems: any[], context: RestaurantContext): Promise<any> {
    // Simple pairing fallback
    return {
      pairings: menuItems.map((item, index) => ({
        menuItem: item,
        cocktail: this.getFallbackCocktails(context)[index % 4]
      }))
    };
  }
}

export const simpleMenuGenerator = new SimpleMenuGenerator();