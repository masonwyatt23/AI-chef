import OpenAI from "openai";

const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY || process.env.OPENAI_API_KEY || "sk-placeholder"
});

export interface RestaurantContext {
  name: string;
  theme: string;
  categories: string[];
  kitchenCapability: string;
  staffSize: number;
  additionalContext?: string;
  
  // Business Context
  establishmentType?: string;
  serviceStyle?: string;
  targetDemographic?: string;
  averageTicketPrice?: number;
  diningCapacity?: number;
  operatingHours?: string;
  
  // Location & Market
  location?: string;
  marketType?: string;
  localIngredients?: string[];
  culturalInfluences?: string[];
  
  // Kitchen & Operations
  kitchenSize?: string;
  kitchenEquipment?: string[];
  prepSpace?: string;
  storageCapacity?: string;
  deliveryCapability?: boolean;
  
  // Staff & Skills
  chefExperience?: string;
  staffSkillLevel?: string;
  specializedRoles?: string[];
  laborBudget?: string;
  
  // Menu & Business Goals
  currentMenuSize?: number;
  menuChangeFrequency?: string;
  profitMarginGoals?: number;
  foodCostGoals?: number;
  specialDietaryNeeds?: string[];
  
  // Competition & Positioning
  primaryCompetitors?: string[];
  uniqueSellingPoints?: string[];
  pricePosition?: string;
  
  // Challenges & Priorities
  currentChallenges?: string[];
  businessPriorities?: string[];
  seasonalConsiderations?: string;
}

export interface ChefResponse {
  content: string;
  category?: string;
  recommendations?: Array<{
    title: string;
    description: string;
    recipe?: any;
  }>;
}

export class AIChefService {
  private buildSystemPrompt(context: RestaurantContext): string {
    const buildContextSection = (title: string, items: any) => {
      if (!items || (Array.isArray(items) && items.length === 0)) return '';
      return `\n${title}: ${Array.isArray(items) ? items.join(', ') : items}`;
    };

    return `You are an expert chef consultant specializing in restaurant operations and culinary development. You have decades of experience in menu development, flavor pairing, kitchen efficiency, and restaurant management.

RESTAURANT PROFILE:
## Basic Information
- Name: ${context.name}
- Theme & Concept: ${context.theme}
- Categories: ${context.categories.join(', ')}
- Kitchen Capability: ${context.kitchenCapability}
- Staff Size: ${context.staffSize}

## Business Context
${context.establishmentType ? `- Type: ${context.establishmentType}` : ''}
${context.serviceStyle ? `- Service Style: ${context.serviceStyle}` : ''}
${context.targetDemographic ? `- Target Customers: ${context.targetDemographic}` : ''}
${context.averageTicketPrice ? `- Average Ticket: $${context.averageTicketPrice}` : ''}
${context.diningCapacity ? `- Seating Capacity: ${context.diningCapacity}` : ''}
${context.operatingHours ? `- Hours: ${context.operatingHours}` : ''}

## Location & Market
${context.location ? `- Location: ${context.location}` : ''}
${context.marketType ? `- Market Type: ${context.marketType}` : ''}
${buildContextSection('Local Ingredients', context.localIngredients)}
${buildContextSection('Cultural Influences', context.culturalInfluences)}

## Kitchen & Operations
${context.kitchenSize ? `- Kitchen Size: ${context.kitchenSize}` : ''}
${context.prepSpace ? `- Prep Space: ${context.prepSpace}` : ''}
${context.storageCapacity ? `- Storage: ${context.storageCapacity}` : ''}
${context.deliveryCapability ? '- Delivery Available: Yes' : '- Delivery Available: No'}
${buildContextSection('Equipment Available', context.kitchenEquipment)}

## Staff & Skills
${context.chefExperience ? `- Chef Experience: ${context.chefExperience}` : ''}
${context.staffSkillLevel ? `- Staff Skill Level: ${context.staffSkillLevel}` : ''}
${context.laborBudget ? `- Labor Budget: ${context.laborBudget}` : ''}
${buildContextSection('Specialized Roles', context.specializedRoles)}

## Business Goals & Constraints
${context.currentMenuSize ? `- Current Menu Size: ${context.currentMenuSize} items` : ''}
${context.menuChangeFrequency ? `- Menu Changes: ${context.menuChangeFrequency}` : ''}
${context.profitMarginGoals ? `- Target Profit Margin: ${context.profitMarginGoals}%` : ''}
${context.foodCostGoals ? `- Target Food Cost: ${context.foodCostGoals}%` : ''}
${context.pricePosition ? `- Price Position: ${context.pricePosition}` : ''}
${buildContextSection('Dietary Accommodations', context.specialDietaryNeeds)}

## Market Position
${buildContextSection('Unique Selling Points', context.uniqueSellingPoints)}
${buildContextSection('Main Competitors', context.primaryCompetitors)}

## Current Challenges & Priorities
${buildContextSection('Operational Challenges', context.currentChallenges)}
${buildContextSection('Business Priorities', context.businessPriorities)}
${context.seasonalConsiderations ? `- Seasonal Factors: ${context.seasonalConsiderations}` : ''}

${context.additionalContext ? `## Additional Notes\n${context.additionalContext}` : ''}

EXPERTISE GUIDELINES:
Provide expert culinary advice that is:
1. **Highly Tailored**: Address the specific restaurant profile, constraints, and goals
2. **Financially Focused**: Consider profit margins, food costs, and pricing strategy
3. **Operationally Practical**: Match kitchen capabilities, staff skills, and prep limitations
4. **Market-Aware**: Reflect local ingredients, competition, and target demographic
5. **Challenge-Specific**: Address identified operational challenges and business priorities
6. **Scalable**: Suitable for the restaurant's size, capacity, and growth goals

Always provide specific, actionable recommendations with estimated costs, prep times, and implementation steps. Consider seasonal availability, dietary restrictions, and equipment limitations. Focus on maximizing profitability while maintaining quality and operational efficiency.`;
  }

  async getChefAdvice(
    userMessage: string, 
    context: RestaurantContext,
    conversationHistory: Array<{ role: string; content: string }> = [],
    responseLength: "brief" | "balanced" | "detailed" = "balanced"
  ): Promise<ChefResponse> {
    try {
      // Add response length instruction based on user preference
      let lengthInstruction = "";
      switch (responseLength) {
        case "brief":
          lengthInstruction = "\n\nIMPORTANT: Provide a brief, concise response. Keep it short and to the point with only the most essential information.";
          break;
        case "detailed":
          lengthInstruction = "\n\nIMPORTANT: Provide a comprehensive, detailed response with thorough explanations, examples, and step-by-step guidance.";
          break;
        case "balanced":
        default:
          lengthInstruction = "\n\nIMPORTANT: Provide a balanced response with moderate detail, covering key points without being overly brief or lengthy.";
          break;
      }

      const messages = [
        { role: "system", content: this.buildSystemPrompt(context) },
        ...conversationHistory.slice(-10), // Keep last 10 messages for context
        { role: "user", content: userMessage + lengthInstruction }
      ];

      const response = await openai.chat.completions.create({
        model: "grok-2-1212",
        messages: messages as any,
        max_tokens: 2000,
        temperature: 0.7,
      });

      const content = response.choices[0].message.content || "";
      
      // Analyze the response to categorize and extract recommendations
      const category = this.categorizeResponse(userMessage, content);
      const recommendations = this.extractRecommendations(content);

      return {
        content,
        category,
        recommendations
      };
    } catch (error) {
      console.error("AI Chef service error:", error);
      throw new Error("Failed to get chef advice: " + (error as Error).message);
    }
  }

  private categorizeResponse(userMessage: string, response: string): string {
    const message = userMessage.toLowerCase();
    const responseText = response.toLowerCase();

    if (message.includes('cocktail') || message.includes('drink') || message.includes('beverage') || 
        responseText.includes('cocktail') || responseText.includes('drink')) {
      return 'cocktails';
    }
    if (message.includes('efficiency') || message.includes('cost') || message.includes('labor') ||
        responseText.includes('efficiency') || responseText.includes('optimize')) {
      return 'efficiency';
    }
    if (message.includes('flavor') || message.includes('pairing') || message.includes('ingredient') ||
        responseText.includes('flavor') || responseText.includes('pair')) {
      return 'flavor-pairing';
    }
    return 'menu';
  }

  private extractRecommendations(content: string): Array<{ title: string; description: string; recipe?: any }> {
    const recommendations: Array<{ title: string; description: string; recipe?: any }> = [];
    
    // Look for recipe patterns or structured recommendations
    const recipePattern = /(?:Recipe|Recommendation):\s*\*\*([^*]+)\*\*\s*([^]*?)(?=\n\n|\n(?:Recipe|Recommendation):|$)/gi;
    let match;
    
    while ((match = recipePattern.exec(content)) !== null) {
      const title = match[1].trim();
      const description = match[2].trim();
      
      // Try to extract structured recipe data
      const recipe = this.parseRecipe(description);
      
      recommendations.push({
        title,
        description: description.substring(0, 200) + (description.length > 200 ? '...' : ''),
        recipe
      });
    }

    // If no structured recommendations found, create one from the main content
    if (recommendations.length === 0 && content.length > 50) {
      const lines = content.split('\n');
      const title = lines[0].replace(/[*#]/g, '').trim().substring(0, 50);
      recommendations.push({
        title: title || "Chef Recommendation",
        description: content.substring(0, 200) + (content.length > 200 ? '...' : '')
      });
    }

    return recommendations;
  }

  private parseRecipe(description: string): any {
    const recipe: any = {};
    
    // Extract ingredients
    const ingredientMatch = description.match(/(?:Ingredients?:)(.*?)(?=Instructions?:|Method:|Directions?:|$)/is);
    if (ingredientMatch) {
      recipe.ingredients = ingredientMatch[1]
        .split('\n')
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(line => line.length > 0);
    }

    // Extract instructions
    const instructionMatch = description.match(/(?:Instructions?:|Method:|Directions?:)(.*?)$/is);
    if (instructionMatch) {
      recipe.instructions = instructionMatch[1]
        .split('\n')
        .map(line => line.replace(/^[-•*]\d*\.?\s*/, '').trim())
        .filter(line => line.length > 0);
    }

    return Object.keys(recipe).length > 0 ? recipe : null;
  }

  async generateMenuSuggestions(context: RestaurantContext): Promise<ChefResponse> {
    const prompt = `Generate 3-5 innovative menu items that would complement the existing menu categories. Focus on items that:
1. Match the restaurant's theme and atmosphere
2. Use ingredients that can be efficiently prepared by the current kitchen staff
3. Offer good profit margins
4. Appeal to families while maintaining sophistication
5. Can be easily executed during busy periods

For each suggestion, include the item name, description, key ingredients, and brief preparation notes.`;

    return this.getChefAdvice(prompt, context);
  }

  async generateFlavorPairings(ingredient: string, context: RestaurantContext): Promise<ChefResponse> {
    const prompt = `Provide expert flavor pairing recommendations for ${ingredient}. Include:
1. Complementary ingredients that work well together
2. Seasoning and herb combinations
3. Cooking techniques that enhance the flavors
4. Wine or beverage pairings
5. How these pairings can be incorporated into our existing menu categories

Consider our restaurant's style and customer preferences.`;

    return this.getChefAdvice(prompt, context);
  }

  async analyzeOperationalEfficiency(context: RestaurantContext): Promise<ChefResponse> {
    const prompt = `Analyze our restaurant operations and provide specific recommendations to:
1. Reduce labor costs while maintaining quality
2. Streamline kitchen prep processes
3. Optimize inventory management
4. Improve food cost percentages
5. Enhance staff productivity and workflow

Provide concrete, implementable solutions with estimated cost savings where possible.`;

    return this.getChefAdvice(prompt, context);
  }

  async createSignatureCocktails(context: RestaurantContext): Promise<ChefResponse> {
    const prompt = `Create 2-3 signature cocktail recipes that:
1. Reflect our restaurant's train theme and atmosphere
2. Pair well with steak and seafood dishes
3. Use ingredients that are cost-effective and readily available
4. Can be prepared quickly by bartenders of varying skill levels
5. Appeal to our family-friendly clientele while offering sophistication

Include full recipes with measurements, garnishes, and presentation suggestions.`;

    return this.getChefAdvice(prompt, context);
  }
}

export const aiChefService = new AIChefService();
