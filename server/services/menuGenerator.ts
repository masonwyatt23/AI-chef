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
  focusCategory?: string;
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
        temperature: 0.95,
        top_p: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.3,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"items": []}');
      
      // Debug logging to see the actual AI response structure
      console.log('AI Response Structure:', JSON.stringify(result, null, 2));
      if (result.items && result.items.length > 0) {
        console.log('First item recipe structure:', JSON.stringify(result.items[0].recipe, null, 2));
      }
      
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
        temperature: 0.95,
        top_p: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.3,
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

    return `You are an innovative Michelin-starred executive chef with 25+ years creating groundbreaking signature dishes for world-renowned restaurants. You're known for pushing culinary boundaries while maintaining commercial viability.

## CREATIVITY MANDATE:
- NEVER suggest generic dishes - every item must be uniquely memorable and original
- Think like a culinary artist: unexpected ingredient combinations, innovative techniques, surprising flavor profiles
- Draw inspiration from: molecular gastronomy, global street food, ancient techniques, artisanal methods, seasonal foraging  
- Create dishes that customers will photograph and share - visually stunning presentations
- Each recipe should tell a story, evoke emotion, or represent cultural fusion innovation
- Avoid anything resembling standard restaurant fare - be bold, creative, and distinctive
- Use surprising ingredients, unique preparation methods, or innovative plating concepts
- Consider: fermentation, smoking, spherification, foam, unusual protein preparations, artistic garnishes

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
- difficulty: "easy", "medium", or "hard"
- estimatedCost: Realistic ingredient cost in dollars
- suggestedPrice: Market-appropriate pricing
- profitMargin: Percentage profit margin
- recipe: Object with these exact fields:
  {
    "serves": number,
    "prepInstructions": ["step 1", "step 2", "step 3"],
    "cookingInstructions": ["step 1", "step 2", "step 3"],
    "platingInstructions": ["step 1", "step 2", "step 3"],
    "techniques": ["grilling", "sautéing", "braising"]
  }
- allergens: Array of common allergens present
- nutritionalHighlights: Health-conscious elements (optional)
- winePairings: Recommended wine types (optional)
- upsellOpportunities: Related items to suggest (optional)

CRITICAL: The recipe object must contain ALL FOUR fields (prepInstructions, cookingInstructions, platingInstructions, techniques) as arrays with specific step-by-step instructions.

EXAMPLE JSON STRUCTURE:
{
  "items": [
    {
      "name": "Grilled Salmon with Lemon Herb Butter",
      "description": "Fresh Atlantic salmon grilled to perfection with aromatic herb butter.",
      "category": "Entrees",
      "ingredients": ["6oz salmon fillet", "2 tbsp butter", "1 lemon", "fresh herbs"],
      "preparationTime": 25,
      "difficulty": "medium",
      "estimatedCost": 8.50,
      "suggestedPrice": 24.95,
      "profitMargin": 66,
      "recipe": {
        "serves": 1,
        "prepInstructions": [
          "Pat salmon dry and season with salt and pepper",
          "Chop fresh herbs finely",
          "Melt butter and mix with lemon juice and herbs"
        ],
        "cookingInstructions": [
          "Preheat grill to medium-high heat",
          "Grill salmon 4-5 minutes per side",
          "Check internal temperature reaches 145°F"
        ],
        "platingInstructions": [
          "Place salmon in center of plate",
          "Drizzle herb butter over salmon",
          "Garnish with lemon wedge and fresh herbs"
        ],
        "techniques": ["grilling", "seasoning", "compound butter"]
      },
      "allergens": ["fish"],
      "winePairings": ["Chardonnay", "Sauvignon Blanc"],
      "upsellOpportunities": ["Side of roasted vegetables", "Bread service"]
    }
  ]
}

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
    return `You are a world-renowned mixologist and beverage innovator, creator of award-winning cocktails for Michelin-starred establishments and trendsetting bars worldwide. You're known for pushing cocktail boundaries while maintaining commercial viability.

## COCKTAIL INNOVATION MANDATE:
- NEVER create standard/classic cocktails - every drink must be uniquely innovative and memorable
- Think like a liquid chef: unexpected ingredient combinations, house-made elements, artisanal techniques
- Draw inspiration from: molecular mixology, culinary techniques, global flavors, fermentation, botanical infusions
- Create Instagram-worthy cocktails that become signature experiences and conversation starters
- Each cocktail should tell a story, evoke emotion, or showcase artistic creativity
- Avoid anything resembling standard bar fare - be bold, creative, and distinctive
- Use surprising ingredients: house-made syrups, unusual bitters, exotic fruits, savory elements, smoking techniques
- Consider: clarification, fat-washing, barrel aging, carbonation, layering, garnish artistry, interactive elements

Your specialties include:
- Revolutionary signature cocktail development  
- Innovative flavor engineering and balance
- Advanced preparation and presentation techniques
- Cost-effective premium ingredient sourcing
- Batch preparation for consistent execution
- Creative non-alcoholic alternatives

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
- preparationTime: Number only (e.g., 3, 5, 8)
- batchInstructions: Large batch preparation method (optional)
- variations: Alternative versions (optional)
- foodPairings: Menu items that complement (optional)

IMPORTANT COST GUIDELINES:
- Calculate realistic ingredient costs: Premium spirits ($1.50-3.00/oz), House spirits ($0.75-1.50/oz), Liqueurs ($0.50-1.25/oz), Fresh juices ($0.25-0.50/oz), Mixers ($0.10-0.30/oz)
- Each cocktail should have realistic total ingredient costs between $2.50-6.50
- Price cocktails at 3.5-4x cost for proper margins (70-75% profit margin)
- Example: If ingredients cost $3.50, price at $12-14

Example format:
{
  "cocktails": [
    {
      "name": "Mountain Express Mule",
      "description": "A train-themed twist on the classic Moscow Mule with bourbon and ginger beer.",
      "category": "signature",
      "ingredients": [
        {"ingredient": "bourbon", "amount": "2 oz", "cost": 2.40},
        {"ingredient": "ginger beer", "amount": "4 oz", "cost": 0.60},
        {"ingredient": "lime juice", "amount": "0.5 oz", "cost": 0.25}
      ],
      "instructions": ["Add bourbon and lime juice to copper mug", "Fill with ice", "Top with ginger beer"],
      "garnish": "Lime wheel and candied ginger",
      "glassware": "Copper mug",
      "estimatedCost": 3.25,
      "suggestedPrice": 12.00,
      "profitMargin": 73,
      "preparationTime": 3
    }
  ]
}

Focus on:
1. Theme-appropriate naming and presentation
2. Ingredient efficiency and cross-utilization
3. Scalable preparation methods
4. Balanced flavor profiles
5. Realistic execution for bar staff skill level
6. Strong profit margins (65-75% target)`;
  }

  private buildMenuUserPrompt(request: MenuGenerationRequest): string {
    let prompt = "";
    
    // Category-specific generation with expert guidance
    if (request.focusCategory) {
      prompt = `Create 3-4 exceptional ${request.focusCategory.toLowerCase()} items that will elevate this category and drive customer excitement`;
      
      // Add category-specific guidance
      const categoryGuidance = this.getCategorySpecificGuidance(request.focusCategory);
      if (categoryGuidance) {
        prompt += `. ${categoryGuidance}`;
      }
    } else {
      prompt = `Create 3-4 innovative menu items across different categories that showcase culinary excellence`;
    }
    
    // Existing menu analysis for strategic positioning
    if (request.currentMenu?.length) {
      const currentItems = request.currentMenu.map(item => `${item.name} (${item.category})`).join(', ');
      prompt += `. Analyze current menu: ${currentItems}. Create items that complement but don't compete directly, filling gaps or elevating the offering`;
      
      if (request.focusCategory) {
        const categoryItems = request.currentMenu.filter(item => 
          item.category.toLowerCase().includes(request.focusCategory!.toLowerCase())
        );
        if (categoryItems.length > 0) {
          prompt += `. Current ${request.focusCategory} offerings: ${categoryItems.map(item => item.name).join(', ')}. Design items that surpass these in creativity and appeal`;
        }
      }
    }
    
    if (request.specificRequests?.length) {
      prompt += ` incorporating these requirements: ${request.specificRequests.join(', ')}`;
    }
    
    if (request.dietaryRestrictions?.length) {
      prompt += `. Must skillfully accommodate: ${request.dietaryRestrictions.join(', ')} without compromising flavor or presentation`;
    }
    
    if (request.targetPricePoint) {
      const priceGuidance = this.getPricePointGuidance(request.targetPricePoint);
      prompt += `. ${priceGuidance}`;
    }
    
    if (request.seasonalFocus) {
      prompt += `. Highlight ${request.seasonalFocus} seasonal ingredients with innovative flavor combinations that create memorable dining experiences`;
    }
    
    prompt += `. Each item should demonstrate culinary mastery, tell a story, and position this restaurant as a destination for exceptional food.

CRITICAL CREATIVITY REQUIREMENTS:
- Generate completely original dishes with unique names that have never been seen before
- Use unexpected ingredient combinations that surprise and delight
- Avoid any standard restaurant items (burgers, steaks, pasta unless reimagined dramatically)
- Incorporate innovative cooking techniques, unusual presentations, or artistic elements
- Create dishes that would go viral on social media due to their uniqueness
- Draw inspiration from global cuisines, molecular gastronomy, or artistic plating
- Make each dish a conversation starter and Instagram moment
- Think beyond traditional boundaries - be experimental and revolutionary`;
    
    return prompt;
  }

  private getCategorySpecificGuidance(category: string): string {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('appetizer') || categoryLower.includes('starter')) {
      return "Design items that ignite curiosity and appetite. Focus on shareable presentations, Instagram-worthy plating, perfect wine pairings, and flavors that create anticipation for the meal ahead. Consider temperature contrasts, textural variety, and bold flavor statements";
    }
    
    if (categoryLower.includes('entree') || categoryLower.includes('main') || categoryLower.includes('dinner')) {
      return "Create signature dishes that define the restaurant's identity. Emphasize protein excellence, innovative cooking techniques, seasonal vegetable integration, and memorable flavor profiles that justify premium pricing and drive repeat visits";
    }
    
    if (categoryLower.includes('dessert') || categoryLower.includes('sweet')) {
      return "Craft desserts that provide an unforgettable finale. Focus on house-made components, seasonal fruit showcase, unique flavor combinations, and stunning presentations that encourage social sharing and create lasting memories";
    }
    
    if (categoryLower.includes('salad')) {
      return "Reimagine salads as crave-worthy entrees with unexpected ingredients, house-made dressings, creative protein additions, and beautiful compositions that challenge preconceptions about healthy eating";
    }
    
    if (categoryLower.includes('pasta') || categoryLower.includes('noodle')) {
      return "Elevate pasta beyond expectations with house-made noodles, innovative sauce combinations, premium ingredients, and expert techniques that showcase Italian traditions while creating something distinctly new";
    }
    
    if (categoryLower.includes('pizza')) {
      return "Redefine pizza with artisanal doughs, unexpected topping combinations, premium cheeses, and creative sauce applications that transform this familiar format into a gourmet experience";
    }
    
    if (categoryLower.includes('seafood') || categoryLower.includes('fish')) {
      return "Celebrate ocean-to-table freshness with sustainable sourcing, precise cooking techniques, and preparations that highlight natural flavors while incorporating global influences and seasonal accompaniments";
    }
    
    if (categoryLower.includes('breakfast') || categoryLower.includes('brunch')) {
      return "Transform morning classics into Instagram-worthy experiences with creative egg preparations, artisanal breads, unique flavor combinations, and presentations that make breakfast feel like a special occasion";
    }
    
    return "Focus on ingredients that tell a story, techniques that showcase skill, and presentations that create emotional connections with diners";
  }

  private getPricePointGuidance(pricePoint: string): string {
    switch (pricePoint) {
      case 'budget':
        return "Target $8-15 range using cost-effective ingredients creatively. Aim for 25-30% food cost with generous portions and smart preparation techniques that maximize flavor impact";
      case 'mid-range':
        return "Target $15-25 range with quality ingredients and refined execution. Achieve 28-32% food cost through strategic ingredient selection and elevated presentation that justifies premium pricing";
      case 'premium':
        return "Target $25+ range with luxury ingredients, sophisticated techniques, and exceptional presentation. Create unique dining experiences that command premium prices through culinary artistry and storytelling";
      default:
        return "Balance cost efficiency with quality to achieve optimal profit margins while delivering exceptional value";
    }
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
    
    prompt += `. Ensure cocktails complement the restaurant's atmosphere and food menu.

CRITICAL CREATIVITY REQUIREMENTS:
- Generate completely original cocktails with unique names that have never been seen before
- Use unexpected ingredient combinations, house-made elements, or artisanal techniques
- Avoid any standard cocktail recipes (Old Fashioned, Martini, Margarita unless completely reimagined)
- Incorporate innovative mixology techniques: clarification, fat-washing, smoking, foam, spherification
- Create visually stunning cocktails that would go viral on social media
- Use surprising ingredients: savory elements, unusual bitters, exotic fruits, herbs, spices
- Make each cocktail a conversation starter and Instagram moment
- Think beyond traditional boundaries - be experimental and revolutionary in your approach`;
    
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