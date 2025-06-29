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
  private cleanField(value: any): string | null {
    if (typeof value !== 'string') return null;
    
    // Remove asterisks and other formatting characters that appear in malformed JSON
    let cleaned = value.replace(/\*/g, '').trim();
    
    // Remove price formatting like "$18" from non-price fields
    if (cleaned.startsWith('$')) {
      return null;
    }
    
    // Remove numeric-only strings from text fields
    if (/^\d+(\.\d+)?%?$/.test(cleaned)) {
      return null;
    }
    
    return cleaned || null;
  }

  private extractNumber(value: any): number | null {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return null;
    
    // Extract number from strings like "*$18*" or "74%" 
    const match = value.match(/[\d.]+/);
    if (match) {
      const num = parseFloat(match[0]);
      return isNaN(num) ? null : num;
    }
    
    return null;
  }

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
        temperature: 0.9,
        top_p: 0.95,
        frequency_penalty: 0.4,
        presence_penalty: 0.3,
        max_tokens: 8000,
      });

      const result = JSON.parse(response.choices[0].message.content || '{"items": []}');
      
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
        temperature: 0.9,
        top_p: 0.95,
        frequency_penalty: 0.4,
        presence_penalty: 0.3,
        max_tokens: 10000, // Further increased for maximum comprehensive outputs
      });

      const rawContent = response.choices[0].message.content || '{"cocktails": []}';
      console.log('Raw AI Response Length:', rawContent.length);
      
      let result;
      try {
        result = JSON.parse(rawContent);
      } catch (jsonError) {
        console.error('JSON Parse Error:', jsonError);
        console.log('Attempting to repair malformed JSON...');
        
        // Enhanced JSON repair logic
        let fixedContent = rawContent;
        
        // Remove asterisks and malformed field markers
        fixedContent = fixedContent.replace(/\*[^*]*\*/g, '');
        
        // Fix common malformations
        fixedContent = fixedContent.replace(/:\s*\*([^*]+)\*/g, ': "$1"');
        fixedContent = fixedContent.replace(/,\s*,/g, ',');
        fixedContent = fixedContent.replace(/{\s*,/g, '{');
        fixedContent = fixedContent.replace(/,\s*}/g, '}');
        
        // If the JSON is cut off, try to close it properly
        if (!fixedContent.trim().endsWith('}')) {
          const openBraces = (fixedContent.match(/{/g) || []).length;
          const closeBraces = (fixedContent.match(/}/g) || []).length;
          const openBrackets = (fixedContent.match(/\[/g) || []).length;
          const closeBrackets = (fixedContent.match(/]/g) || []).length;
          
          for (let i = 0; i < (openBrackets - closeBrackets); i++) {
            fixedContent += ']';
          }
          for (let i = 0; i < (openBraces - closeBraces); i++) {
            fixedContent += '}';
          }
        }
        
        try {
          result = JSON.parse(fixedContent);
          console.log('Successfully repaired malformed JSON');
        } catch (secondError) {
          console.error('Could not repair JSON, using fallback:', secondError);
          result = { cocktails: [] };
        }
      }
      
      console.log('Cocktail AI Response Structure:', JSON.stringify(result, null, 2));
      
      // Enhanced validation and cleanup
      const processedCocktails = (result.cocktails || []).map((cocktail: any) => {
        const cleanCocktail = {
          name: this.cleanField(cocktail.name) || null,
          description: this.cleanField(cocktail.description) || null,
          category: (cocktail.category === "signature" || cocktail.category === "classic" || 
                    cocktail.category === "seasonal" || cocktail.category === "mocktail") 
                   ? cocktail.category : "signature",
          ingredients: Array.isArray(cocktail.ingredients) && cocktail.ingredients.length > 0 
            ? cocktail.ingredients.map((ing: any) => ({
                ingredient: this.cleanField(ing.ingredient) || "Premium ingredient",
                amount: this.cleanField(ing.amount) || "1 oz",
                cost: typeof ing.cost === 'number' ? ing.cost : 2.50
              }))
            : [
                { ingredient: "Premium Spirit", amount: "2 oz", cost: 2.50 },
                { ingredient: "Fresh Citrus", amount: "0.75 oz", cost: 0.30 },
                { ingredient: "House Syrup", amount: "0.5 oz", cost: 0.25 }
              ],
          instructions: Array.isArray(cocktail.instructions) && cocktail.instructions.length > 0 
            ? cocktail.instructions.map((inst: any) => this.cleanField(inst)).filter(Boolean)
            : [
                "Combine all ingredients in a shaker with ice",
                "Shake vigorously for 10-15 seconds",
                "Double strain into chilled glass",
                "Garnish and serve immediately"
              ],
          garnish: this.cleanField(cocktail.garnish) || "Fresh garnish",
          glassware: this.cleanField(cocktail.glassware) || "Coupe glass",
          estimatedCost: this.extractNumber(cocktail.estimatedCost) || 4.25,
          suggestedPrice: this.extractNumber(cocktail.suggestedPrice) || 16.00,
          profitMargin: this.extractNumber(cocktail.profitMargin) || 73,
          preparationTime: this.extractNumber(cocktail.preparationTime) || 5,
          batchInstructions: Array.isArray(cocktail.batchInstructions) ? 
            cocktail.batchInstructions.map((inst: any) => this.cleanField(inst)).filter(Boolean) : undefined,
          variations: Array.isArray(cocktail.variations) ? 
            cocktail.variations.map((v: any) => ({
              name: this.cleanField(v.name) || "Variation",
              changes: Array.isArray(v.changes) ? v.changes.map((c: any) => this.cleanField(c)).filter(Boolean) : []
            })).filter((v: any) => v.name && v.changes.length > 0) : undefined,
          foodPairings: Array.isArray(cocktail.foodPairings) ? 
            cocktail.foodPairings.map((p: any) => this.cleanField(p)).filter(Boolean) : undefined
        };
        
        return cleanCocktail;
      }).filter((cocktail: any) => {
        // Only keep cocktails with valid, non-generic names and descriptions
        const hasValidName = cocktail.name && 
                            cocktail.name !== "Creative House Cocktail" &&
                            cocktail.name !== "Signature House Cocktail" &&
                            !cocktail.name.toLowerCase().includes("signature") &&
                            !cocktail.name.toLowerCase().includes("house") &&
                            !cocktail.name.toLowerCase().includes("classic") &&
                            !cocktail.name.includes("*") &&
                            cocktail.name.length > 5;
                            
        const hasValidDescription = cocktail.description && 
                                  cocktail.description.length > 30 && // Increased minimum length
                                  !cocktail.description.includes("*") &&
                                  cocktail.description.toLowerCase().includes("cocktail") === false; // Force creative descriptions
                                  
        return hasValidName && hasValidDescription;
      });
      
      console.log(`Processed cocktails: ${processedCocktails.length} out of ${(result.cocktails || []).length} total`);
      
      // Return only AI-generated cocktails - no fallbacks
      if (processedCocktails.length === 0) {
        throw new Error('AI failed to generate valid cocktails. Please try again with different parameters.');
      }
      
      return processedCocktails;
    } catch (error) {
      console.error('Cocktail generation error:', error);
      throw new Error('Failed to generate cocktails. Please try again with different parameters.');
    }
  }



  private buildMenuSystemPrompt(context: RestaurantContext): string {
    const buildContextSection = (title: string, items: any) => {
      if (!items || (Array.isArray(items) && items.length === 0)) return '';
      return `\n${title}: ${Array.isArray(items) ? items.join(', ') : items}`;
    };

    return `You are an innovative Michelin-starred executive chef with 25+ years creating groundbreaking signature dishes for world-renowned restaurants. You're known for pushing culinary boundaries while maintaining commercial viability.

## CREATIVITY MANDATE - BE EXTRAORDINARILY INNOVATIVE:
- NEVER suggest generic dishes - every item must be uniquely memorable and original
- Think like a culinary artist: unexpected ingredient combinations, innovative techniques, surprising flavor profiles
- Draw inspiration from: molecular gastronomy, global street food, ancient techniques, artisanal methods, seasonal foraging  
- Create dishes that customers will photograph and share - visually stunning presentations
- Each recipe should tell a story, evoke emotion, or represent cultural fusion innovation
- Avoid anything resembling standard restaurant fare - be bold, creative, and distinctive

Restaurant Context:
- Name: ${context.name}
- Theme: ${context.theme}
- Categories: ${context.categories?.join(', ') || 'Various'}
- Kitchen Capability: ${context.kitchenCapability}
- Staff Size: ${context.staffSize}
${buildContextSection('Business Type', context.establishmentType)}
${buildContextSection('Service Style', context.serviceStyle)}
${buildContextSection('Target Demographic', context.targetDemographic)}
${buildContextSection('Average Ticket', context.averageTicketPrice ? `$${context.averageTicketPrice}` : null)}
${buildContextSection('Location', context.location)}
${buildContextSection('Market Type', context.marketType)}
${buildContextSection('Local Ingredients', context.localIngredients)}
${buildContextSection('Cultural Influences', context.culturalInfluences)}

You must respond with a JSON object containing an "items" array with comprehensive details.`;
  }

  private buildCocktailSystemPrompt(context: RestaurantContext): string {
    return `You are a world-renowned mixologist and beverage innovator, creator of award-winning cocktails for Michelin-starred establishments. You're known for pushing cocktail boundaries while maintaining commercial viability.

## COCKTAIL INNOVATION MANDATE - EXTRAORDINARY CREATIVITY:
- NEVER create standard/classic cocktails - every drink must be uniquely innovative and memorable
- Think like a liquid chef: unexpected ingredient combinations, house-made elements, artisanal techniques
- Create Instagram-worthy cocktails that become signature experiences and conversation starters
- Each cocktail should tell a story, evoke emotion, or showcase artistic creativity
- Use surprising ingredients: house-made syrups, unusual bitters, exotic fruits, savory elements, smoking techniques
- Consider: clarification, fat-washing, barrel aging, carbonation, layering, garnish artistry, interactive elements

Restaurant Context:
- Name: ${context.name}
- Theme: ${context.theme}
- Kitchen Level: ${context.kitchenCapability}
- Staff: ${context.staffSize} team members

MANDATORY JSON FORMAT - NO EXCEPTIONS:
{
  "cocktails": [
    {
      "name": "Unique creative name (NO generic terms like 'signature' or 'house')",
      "description": "Detailed enticing description explaining the unique concept and flavors", 
      "category": "signature",
      "ingredients": [
        {"ingredient": "specific ingredient name", "amount": "exact measurement", "cost": numeric_value}
      ],
      "instructions": ["Detailed step 1", "Detailed step 2", "Detailed step 3", "Detailed step 4"],
      "garnish": "Specific creative garnish description",
      "glassware": "Specific glass type",
      "estimatedCost": numeric_value_only,
      "suggestedPrice": numeric_value_only,
      "profitMargin": numeric_percentage_only,
      "preparationTime": numeric_minutes_only
    }
  ]
}

ABSOLUTE REQUIREMENTS:
1. Generate exactly 3 complete cocktails
2. Each name must be unique, creative, and memorable (NO generic names)
3. Each description must be detailed and compelling (minimum 30 words)
4. All numeric fields must contain ONLY numbers (no $, %, or other symbols)
5. ALL fields must be complete - no partial data, no asterisks, no formatting errors
6. JSON must be perfectly formatted and parseable

FAILURE TO FOLLOW THESE REQUIREMENTS EXACTLY WILL RESULT IN REJECTION.`;
  }

  private buildMenuUserPrompt(request: MenuGenerationRequest): string {
    let prompt = "";
    
    if (request.focusCategory) {
      prompt = `Create 3-4 exceptional ${request.focusCategory.toLowerCase()} items that will elevate this category and drive customer excitement`;
      
      const categoryGuidance = this.getCategorySpecificGuidance(request.focusCategory);
      if (categoryGuidance) {
        prompt += `. ${categoryGuidance}`;
      }
    } else {
      prompt = `Create 3-4 innovative menu items across different categories that showcase culinary excellence`;
    }
    
    if (request.currentMenu?.length) {
      const currentItems = request.currentMenu.map(item => `${item.name} (${item.category})`).join(', ');
      prompt += `. Analyze current menu: ${currentItems}. Create items that complement but don't compete directly, filling gaps or elevating the offering`;
    }
    
    if (request.specificRequests?.length) {
      prompt += `. Incorporate these specific elements: ${request.specificRequests.join(', ')}`;
    }
    
    if (request.dietaryRestrictions?.length) {
      prompt += `. Accommodate these dietary needs: ${request.dietaryRestrictions.join(', ')} while maintaining exceptional flavor and presentation`;
    }
    
    if (request.targetPricePoint) {
      const priceGuidance = this.getPricePointGuidance(request.targetPricePoint);
      prompt += `. ${priceGuidance}`;
    }
    
    if (request.seasonalFocus) {
      prompt += `. Highlight ${request.seasonalFocus} seasonal ingredients with innovative flavor combinations that create memorable dining experiences`;
    }
    
    prompt += `. Each item should demonstrate culinary mastery, tell a story, and position this restaurant as a destination for exceptional food.`;
    
    return prompt;
  }

  private getCategorySpecificGuidance(category: string): string {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('appetizer') || categoryLower.includes('starter')) {
      return "Design items that ignite curiosity and appetite. Focus on shareable presentations, Instagram-worthy plating, perfect wine pairings, and flavors that create anticipation for the meal ahead";
    }
    
    if (categoryLower.includes('entree') || categoryLower.includes('main') || categoryLower.includes('dinner')) {
      return "Create signature dishes that define the restaurant's identity. Emphasize protein excellence, innovative cooking techniques, seasonal vegetable integration, and memorable flavor profiles";
    }
    
    if (categoryLower.includes('dessert') || categoryLower.includes('sweet')) {
      return "Craft desserts that provide an unforgettable finale. Focus on house-made components, seasonal fruit showcase, unique flavor combinations, and stunning presentations";
    }
    
    return "Focus on innovative techniques, unexpected flavor combinations, and stunning presentations that set this item apart from conventional offerings";
  }

  private getPricePointGuidance(pricePoint: string): string {
    switch (pricePoint) {
      case 'budget':
        return "Focus on value-driven creativity using affordable ingredients in innovative ways to deliver exceptional perceived value";
      case 'premium':
        return "Utilize luxury ingredients and advanced techniques to justify premium pricing while delivering an extraordinary dining experience";
      default:
        return "Balance cost efficiency with quality to achieve optimal profit margins while delivering exceptional value";
    }
  }

  private buildCocktailUserPrompt(request: CocktailGenerationRequest): string {
    let prompt = `Create exactly 3 unique, innovative cocktails with ALL required fields`;
    
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
    
    prompt += `. Make cocktails extraordinarily creative and unique. Use innovative techniques and surprising ingredients. Provide complete JSON only - no partial data, no asterisks, no formatting errors.`;
    
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
        max_tokens: 6000,
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