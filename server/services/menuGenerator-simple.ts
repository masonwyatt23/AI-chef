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
    unit: string;
    cost: number;
    batchAmount?: string;
    batchUnit?: string;
  }>;
  instructions: string[];
  garnish: string;
  glassware: string;
  estimatedCost: number;
  suggestedPrice: number;
  profitMargin: number;
  preparationTime: number;
  batchInstructions?: string[];
  batchYield?: number;
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
    
    // Use sanitized context values to prevent business description contamination
    const cleanName = this.sanitizeContextValue(request.context.name) || 'The Restaurant';
    const cleanTheme = this.sanitizeContextValue(request.context.theme) || 'Modern';
    const cleanEstablishmentType = this.sanitizeContextValue(request.context.establishmentType) || 'restaurant';
    const cleanTargetDemo = this.sanitizeContextValue(request.context.targetDemographic) || 'general dining';
    const cleanLocation = this.sanitizeContextValue(request.context.location) || 'local area';
    
    try {
      const response = await openai.chat.completions.create({
        model: "grok-2-1212",
        messages: [
          { 
            role: "system", 
            content: `You are an expert mixologist and beverage consultant specializing in signature cocktail development. Create unique, restaurant-specific cocktails that perfectly align with the establishment's theme and atmosphere.

CRITICAL: You MUST respond with valid JSON only. No additional text or explanations. Ensure the JSON is properly formatted and complete.` 
          },
          { 
            role: "user", 
            content: `Create 4 signature cocktails for "${cleanName}" based on this restaurant profile:

Restaurant Name: ${cleanName}
Theme: ${cleanTheme}
Establishment Type: ${cleanEstablishmentType}
Target Demographic: ${cleanTargetDemo}
Location: ${cleanLocation}
Average Check: $${request.context.averageTicketPrice || '25'}
${request.batchable ? `Batch Production: Required for ${request.context.diningCapacity || 50} seat capacity` : ''}

Requirements:
- Create cocktails that reflect the restaurant's ${cleanTheme} theme
- Each cocktail should have a creative, themed name (2-4 words max)
- Keep descriptions brief and appetizing (1-2 sentences max)
- Use premium spirits and fresh ingredients
- Price appropriately for the target market
${request.batchable ? '- Include batch production instructions for high-volume service' : ''}

IMPORTANT: Return ONLY valid JSON. No additional text or explanations.

JSON format:
{
  "cocktails": [
    {
      "name": "Creative Themed Name",
      "description": "Brief, appetizing description",
      "category": "signature",
      "ingredients": [
        {
          "ingredient": "spirit name",
          "amount": "2",
          "unit": "oz",
          "cost": 3.00${request.batchable ? ',\n          "batchAmount": "1",\n          "batchUnit": "liter"' : ''}
        }
      ],
      "instructions": ["step 1", "step 2"],
      "garnish": "garnish type",
      "glassware": "glass type",
      "estimatedCost": 5.50,
      "suggestedPrice": 16.00,
      "profitMargin": 65,
      "preparationTime": 3${request.batchable ? ',\n      "batchInstructions": ["Batch step 1", "Batch step 2"],\n      "batchYield": 25' : ''}
    }
  ]
}

Make each cocktail unique and specifically tailored to this restaurant's character and brand.` 
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
        max_tokens: 2000,
      });

      let content = response.choices[0].message.content || '{"cocktails": []}';
      
      // Clean the content to ensure it's valid JSON
      content = content.trim();
      
      // Remove any potential markdown formatting
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      if (content.startsWith('```')) {
        content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      try {
        const result = JSON.parse(content);
        if (result.cocktails && Array.isArray(result.cocktails) && result.cocktails.length > 0) {
          console.log(`Generated ${result.cocktails.length} cocktails successfully`);
          return result.cocktails.slice(0, 4);
        } else {
          console.error('AI generated invalid cocktail structure:', result);
          throw new Error('AI generated empty or invalid cocktails array');
        }
      } catch (parseError) {
        console.error('Failed to parse cocktail AI response:', parseError);
        console.error('Raw AI Response (first 500 chars):', content.substring(0, 500));
        console.error('Raw AI Response (last 500 chars):', content.substring(Math.max(0, content.length - 500)));
        throw new Error(`AI failed to generate valid cocktails. JSON parsing failed - this indicates the AI output was malformed.`);
      }
      
    } catch (error) {
      console.error('Cocktail generation error:', error);
      throw new Error(`Cocktail generation failed: ${error}`);
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
            content: `You are an expert chef consultant specializing in menu development. Create innovative, restaurant-specific menu items that perfectly align with the establishment's theme, capabilities, and market positioning. Use the restaurant's complete profile to ensure every dish reflects their unique identity.

CRITICAL: You MUST respond with valid JSON only. Do not include any text outside the JSON structure. Ensure the JSON is properly formatted and complete.` 
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
${request.batchProduction ? `BATCH PRODUCTION: Include detailed batch preparation instructions for ${request.batchSize || 10} servings, with scaled ingredient amounts and specific batch cooking techniques.` : ''}

IMPORTANT: Return ONLY valid JSON. No additional text or explanations.

JSON format:
{
  "items": [
    {
      "name": "Creative Restaurant Name",
      "description": "Compelling description",
      "category": "entrees",
      "ingredients": [
        {
          "ingredient": "ingredient name",
          "amount": "2",
          "unit": "oz", 
          "cost": 1.50,
          "notes": "preparation notes"${request.batchProduction ? ',\n          "batchAmount": "20",\n          "batchUnit": "oz"' : ''}
        }
      ],
      "preparationTime": 25,
      "difficulty": "medium",
      "estimatedCost": 12,
      "suggestedPrice": 28,
      "profitMargin": 57,
      "recipe": {
        "serves": 1,
        "prepInstructions": ["step 1"],
        "cookingInstructions": ["step 1"],
        "platingInstructions": ["step 1"],
        "techniques": ["technique 1"]${request.batchProduction ? ',\n        "batchServes": ' + (request.batchSize || 10) + ',\n        "batchInstructions": ["batch step 1", "batch step 2"]' : ''}
      },
      "allergens": ["allergen"],
      "nutritionalHighlights": ["highlight"],
      "winePairings": ["wine"],
      "upsellOpportunities": ["upsell"]
    }
  ]
}

Make each item distinctly different and specifically tailored to this restaurant's unique profile and capabilities.` 
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
        max_tokens: 3000,
      });

      let content = response.choices[0].message.content || '{"items": []}';
      
      // Clean the content to ensure it's valid JSON
      content = content.trim();
      
      // Remove any potential markdown formatting
      if (content.startsWith('```json')) {
        content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      }
      if (content.startsWith('```')) {
        content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      try {
        const result = JSON.parse(content);
        if (result.items && Array.isArray(result.items) && result.items.length > 0) {
          console.log(`Generated ${result.items.length} menu items successfully`);
          return result.items.slice(0, 4);
        } else {
          console.error('AI generated invalid structure:', result);
          throw new Error('AI generated empty or invalid menu items array');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        console.error('Raw AI Response (first 500 chars):', content.substring(0, 500));
        console.error('Raw AI Response (last 500 chars):', content.substring(Math.max(0, content.length - 500)));
        throw new Error(`AI failed to generate valid menu items. JSON parsing failed - this indicates the AI output was malformed.`);
      }
      
    } catch (error) {
      console.error('Menu generation failed:', error);
      throw new Error(`Menu generation failed: ${error}`);
    }
  }

  private generateUniqueId(): string {
    return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  private sanitizeContextValue(value: string | undefined): string | undefined {
    if (!value) return value;
    
    // If the value is longer than 50 characters, it's likely descriptive text rather than a simple value
    if (value.length > 50) {
      // For restaurant names, try to extract the actual name from descriptive text
      if (value.toLowerCase().includes('depot') && value.toLowerCase().includes('grille')) {
        return 'The Depot Grille';
      }
      
      // For themes, look for cuisine/style keywords
      if (value.toLowerCase().includes('steak') && value.toLowerCase().includes('seafood')) {
        return 'Steakhouse';
      }
      if (value.toLowerCase().includes('american') || value.toLowerCase().includes('casual')) {
        return 'American';
      }
      if (value.toLowerCase().includes('italian')) {
        return 'Italian';
      }
      if (value.toLowerCase().includes('mexican')) {
        return 'Mexican';
      }
      
      // Look for common restaurant name patterns
      const nameMatch = value.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
      if (nameMatch) {
        return nameMatch[1];
      }
      
      // Try to extract the first meaningful word/phrase
      const words = value.split(/[,.\s]+/).filter(word => word.length > 2);
      return words[0] || 'Local';
    }
    
    // Clean up common descriptive patterns
    return value
      .replace(/^(Our|The|A|An)\s+/i, '') // Remove articles
      .replace(/\s+(restaurant|establishment|venue|location)$/i, '') // Remove common suffixes
      .trim();
  }

  async generatePairedMenuCocktails(menuItems: any[], context: RestaurantContext): Promise<any> {
    // Simple pairing - return empty since we don't use fallbacks anymore
    return {
      pairings: menuItems.map((item, index) => ({
        menuItem: item,
        cocktail: null // No fallback cocktails
      }))
    };
  }
}

export const simpleMenuGenerator = new SimpleMenuGenerator();