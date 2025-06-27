import OpenAI from "openai";
import type { RestaurantContext } from "./aiChef";

const openai = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY || process.env.OPENAI_API_KEY
});

export interface MenuGenerationRequest {
  context: RestaurantContext;
  specificRequests?: string[];
  dietaryRestrictions?: string[];
  targetPricePoint?: 'budget' | 'mid-range' | 'premium';
  seasonalFocus?: string;
  currentMenu?: Array<{name: string; category: string; price?: number}>;
}

export interface GeneratedMenuItem {
  name: string;
  description: string;
  category: string;
  ingredients: string[];
  preparationTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedCost: number;
  suggestedPrice: number;
  profitMargin: number;
  recipe: {
    serves: number;
    prepInstructions: string[];
    cookingInstructions: string[];
    platingInstructions: string[];
    techniques: string[];
  };
  allergens: string[];
  nutritionalHighlights?: string[];
  wineParings?: string[];
  upsellOpportunities?: string[];
}

export interface CocktailGenerationRequest {
  context: RestaurantContext;
  theme?: string;
  baseSpirits?: string[];
  complexity?: 'simple' | 'moderate' | 'advanced';
  batchable?: boolean;
  seasonality?: string;
  existingCocktails?: string[];
}

export interface GeneratedCocktail {
  name: string;
  description: string;
  category: 'signature' | 'classic' | 'seasonal' | 'mocktail';
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
  batchInstructions?: string[];
  variations?: Array<{
    name: string;
    changes: string[];
  }>;
  foodPairings?: string[];
}

export class MenuGeneratorService {
  async generateMenuItems(request: MenuGenerationRequest): Promise<GeneratedMenuItem[]> {
    const systemPrompt = this.buildMenuSystemPrompt(request.context);
    const userPrompt = this.buildMenuUserPrompt(request);

    try {
      const response = await openai.chat.completions.create({
        model: "grok-2-1212",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"items": []}');
      return result.items || [];
    } catch (error) {
      console.error('Menu generation error:', error);
      throw new Error('Failed to generate menu items');
    }
  }

  async generateCocktails(request: CocktailGenerationRequest): Promise<GeneratedCocktail[]> {
    const systemPrompt = this.buildCocktailSystemPrompt(request.context);
    const userPrompt = this.buildCocktailUserPrompt(request);

    try {
      const response = await openai.chat.completions.create({
        model: "grok-2-1212",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"cocktails": []}');
      return result.cocktails || [];
    } catch (error) {
      console.error('Cocktail generation error:', error);
      throw new Error('Failed to generate cocktails');
    }
  }

  private buildMenuSystemPrompt(context: RestaurantContext): string {
    const buildContextSection = (title: string, items: any) => {
      if (!items || (Array.isArray(items) && items.length === 0)) return '';
      return `\n${title}: ${Array.isArray(items) ? items.join(', ') : items}`;
    };

    return `You are a world-class chef and menu development expert with deep knowledge of cost engineering, flavor development, kitchen efficiency, and authentic cuisine.

RESTAURANT PROFILE:
## Basic Information
- Name: ${context.name}
- Theme: ${context.theme}
- Categories: ${context.categories.join(', ')}
- Kitchen Level: ${context.kitchenCapability}
- Staff: ${context.staffSize} team members

## Business Context
${context.establishmentType ? `- Type: ${context.establishmentType}` : ''}
${context.serviceStyle ? `- Service Style: ${context.serviceStyle}` : ''}
${context.targetDemographic ? `- Target Customers: ${context.targetDemographic}` : ''}
${context.averageTicketPrice ? `- Average Ticket: $${context.averageTicketPrice}` : ''}
${context.pricePosition ? `- Price Position: ${context.pricePosition}` : ''}

## Location & Market
${context.location ? `- Location: ${context.location}` : ''}
${buildContextSection('Local Ingredients', context.localIngredients)}
${buildContextSection('Cultural Influences', context.culturalInfluences)}

## Kitchen & Operations
${context.kitchenSize ? `- Kitchen Size: ${context.kitchenSize}` : ''}
${context.prepSpace ? `- Prep Space: ${context.prepSpace}` : ''}
${buildContextSection('Equipment', context.kitchenEquipment)}

## Staff & Skills
${context.chefExperience ? `- Chef Experience: ${context.chefExperience}` : ''}
${context.staffSkillLevel ? `- Staff Level: ${context.staffSkillLevel}` : ''}
${context.laborBudget ? `- Labor Budget: ${context.laborBudget}` : ''}

## Business Goals
${context.profitMarginGoals ? `- Target Profit: ${context.profitMarginGoals}%` : ''}
${context.foodCostGoals ? `- Target Food Cost: ${context.foodCostGoals}%` : ''}
${buildContextSection('Dietary Needs', context.specialDietaryNeeds)}

## Challenges & Priorities
${buildContextSection('Challenges', context.currentChallenges)}
${buildContextSection('Priorities', context.businessPriorities)}

${context.additionalContext ? `## Additional Notes\n${context.additionalContext}` : ''}

You must respond with a JSON object containing an "items" array. Each item must include:
- name: Creative, theme-appropriate name
- description: Appetizing 2-3 sentence description
- category: One of the restaurant's categories
- ingredients: Array of specific ingredients with quantities
- preparationTime: Minutes for complete preparation
- difficulty: Based on kitchen capability level
- estimatedCost: Realistic ingredient cost in dollars
- suggestedPrice: Market-appropriate pricing
- profitMargin: Percentage profit margin
- recipe: Detailed cooking instructions object
- allergens: Array of common allergens present
- nutritionalHighlights: Health-conscious elements (optional)
- winePairings: Recommended wine types (optional)
- upsellOpportunities: Related items to suggest (optional)

Focus on:
1. **Perfect Theme Match**: Align with restaurant concept and cultural influences
2. **Financial Targets**: Meet profit margin and food cost goals
3. **Operational Reality**: Match kitchen capability, staff skills, and equipment
4. **Market Positioning**: Reflect price position and target demographic
5. **Challenge Solutions**: Address specific operational challenges and priorities
6. **Local Integration**: Use available local ingredients and cultural elements

Create items that maximize profitability while maintaining authenticity and operational efficiency.`;
  }

  private buildCocktailSystemPrompt(context: RestaurantContext): string {
    return `You are an expert mixologist and beverage program consultant specializing in:
- Signature cocktail development
- Cost-effective recipe engineering
- Batch preparation techniques
- Flavor balance and innovation
- Alcohol inventory optimization
- Non-alcoholic alternatives

Restaurant Context:
- Name: ${context.name}
- Theme: ${context.theme}
- Kitchen Level: ${context.kitchenCapability}
- Staff: ${context.staffSize} team members
${context.additionalContext ? `- Context: ${context.additionalContext}` : ''}

You must respond with a JSON object containing a "cocktails" array. Each cocktail must include:
- name: Creative, theme-appropriate name
- description: Enticing 1-2 sentence description
- category: signature/classic/seasonal/mocktail
- ingredients: Array with ingredient, amount, and cost per serving
- instructions: Step-by-step preparation method
- garnish: Specific garnish description
- glassware: Appropriate glass type
- estimatedCost: Total ingredient cost
- suggestedPrice: Market-competitive pricing
- profitMargin: Percentage profit margin
- preparationTime: Minutes to prepare
- batchInstructions: Large batch preparation method (optional)
- variations: Alternative versions (optional)
- foodPairings: Menu items that complement (optional)

Focus on:
1. Theme-appropriate naming and presentation
2. Ingredient efficiency and cross-utilization
3. Scalable preparation methods
4. Balanced flavor profiles
5. Realistic execution for bar staff skill level
6. Strong profit margins (65%+ target)`;
  }

  private buildMenuUserPrompt(request: MenuGenerationRequest): string {
    let prompt = `Generate 3-5 innovative menu items`;
    
    if (request.specificRequests?.length) {
      prompt += ` incorporating these requests: ${request.specificRequests.join(', ')}`;
    }
    
    if (request.dietaryRestrictions?.length) {
      prompt += `. Include options for: ${request.dietaryRestrictions.join(', ')}`;
    }
    
    if (request.targetPricePoint) {
      prompt += `. Target ${request.targetPricePoint} price point`;
    }
    
    if (request.seasonalFocus) {
      prompt += `. Focus on ${request.seasonalFocus} seasonal ingredients`;
    }
    
    if (request.currentMenu?.length) {
      prompt += `. Avoid duplicating these existing items: ${request.currentMenu.map(item => item.name).join(', ')}`;
    }
    
    prompt += `. Ensure each item aligns with the restaurant theme and can be executed by the current kitchen team.`;
    
    return prompt;
  }

  private buildCocktailUserPrompt(request: CocktailGenerationRequest): string {
    let prompt = `Create 3-4 unique cocktails`;
    
    if (request.theme) {
      prompt += ` with ${request.theme} theme`;
    }
    
    if (request.baseSpirits?.length) {
      prompt += ` featuring: ${request.baseSpirits.join(', ')}`;
    }
    
    if (request.complexity) {
      prompt += `. Keep complexity ${request.complexity}`;
    }
    
    if (request.batchable) {
      prompt += `. Include batch preparation methods`;
    }
    
    if (request.seasonality) {
      prompt += `. Focus on ${request.seasonality} seasonal flavors`;
    }
    
    if (request.existingCocktails?.length) {
      prompt += `. Avoid similarity to: ${request.existingCocktails.join(', ')}`;
    }
    
    prompt += `. Ensure cocktails complement the restaurant's atmosphere and food menu.`;
    
    return prompt;
  }

  async generatePairedMenuCocktails(menuItems: GeneratedMenuItem[], context: RestaurantContext): Promise<Array<{menuItem: string; cocktail: GeneratedCocktail}>> {
    const systemPrompt = `You are a beverage pairing expert. Create cocktails specifically designed to complement given menu items.

Restaurant: ${context.name} - ${context.theme}

Respond with JSON: {"pairings": [{"menuItem": "item name", "cocktail": {...cocktail object}}]}`;

    const userPrompt = `Create signature cocktails paired with these menu items: ${menuItems.map(item => `${item.name} (${item.description})`).join('; ')}`;

    try {
      const response = await openai.chat.completions.create({
        model: "grok-2-1212",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"pairings": []}');
      return result.pairings || [];
    } catch (error) {
      console.error('Pairing generation error:', error);
      return [];
    }
  }
}

export const menuGenerator = new MenuGeneratorService();