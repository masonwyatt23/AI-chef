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
        max_tokens: 12000,
      });

      const rawContent = response.choices[0].message.content || '{"items": []}';
      console.log('Raw Menu AI Response Length:', rawContent.length);
      
      let result;
      try {
        result = JSON.parse(rawContent);
      } catch (jsonError) {
        console.error('Menu JSON Parse Error:', jsonError);
        console.log('Attempting to repair malformed menu JSON...');
        
        // Enhanced JSON repair logic for menu items
        let fixedContent = rawContent;
        
        // Remove asterisks and malformed field markers
        fixedContent = fixedContent.replace(/\*[^*]*\*/g, '');
        
        // Fix backtick issues (replace with proper quotes)
        fixedContent = fixedContent.replace(/`/g, '"');
        fixedContent = fixedContent.replace(/`([^`]*)`/g, '"$1"');
        fixedContent = fixedContent.replace(/:\s*`([^`]*)`/g, ': "$1"');
        
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
          console.log('Successfully repaired malformed menu JSON');
        } catch (secondError) {
          console.error('Could not repair menu JSON:', secondError);
          result = { items: [] };
        }
      }
      
      console.log('Menu AI Response Structure:', JSON.stringify(result, null, 2));
      
      // Ensure we have exactly 4 items - if not, log error and pad with generated items
      if (!result.items || result.items.length < 4) {
        console.error(`Expected 4 menu items, got ${result.items?.length || 0}. Will process available items.`);
      }
      
      // Clean and validate menu items
      const processedItems = (result.items || []).map((item: any) => {
        const cleanItem = {
          name: this.cleanField(item.name) || "Signature Dish",
          description: this.cleanField(item.description) || "A carefully crafted dish featuring premium ingredients",
          category: this.cleanField(item.category) || "Entree",
          ingredients: Array.isArray(item.ingredients) ? 
            item.ingredients.map((ing: any) => this.cleanField(ing)).filter(Boolean) : 
            ["Premium ingredients"],
          preparationTime: this.extractNumber(item.preparationTime) || 20,
          difficulty: (item.difficulty === 'easy' || item.difficulty === 'medium' || item.difficulty === 'hard') ? 
            item.difficulty : 'medium',
          estimatedCost: this.extractNumber(item.estimatedCost) || 8.50,
          suggestedPrice: this.extractNumber(item.suggestedPrice) || 24.00,
          profitMargin: this.extractNumber(item.profitMargin) || 65,
          recipe: {
            serves: this.extractNumber(item.recipe?.serves) || 1,
            prepInstructions: Array.isArray(item.recipe?.prepInstructions) ? 
              item.recipe.prepInstructions.map((inst: any) => this.cleanField(inst)).filter(Boolean) : 
              ["Prepare ingredients according to specification"],
            cookingInstructions: Array.isArray(item.recipe?.cookingInstructions) ? 
              item.recipe.cookingInstructions.map((inst: any) => this.cleanField(inst)).filter(Boolean) : 
              ["Cook according to technique"],
            platingInstructions: Array.isArray(item.recipe?.platingInstructions) ? 
              item.recipe.platingInstructions.map((inst: any) => this.cleanField(inst)).filter(Boolean) : 
              ["Plate with care and attention to presentation"],
            techniques: Array.isArray(item.recipe?.techniques) ? 
              item.recipe.techniques.map((tech: any) => this.cleanField(tech)).filter(Boolean) : 
              ["Traditional cooking methods"]
          },
          allergens: Array.isArray(item.allergens) ? 
            item.allergens.map((all: any) => this.cleanField(all)).filter(Boolean) : [],
          nutritionalHighlights: Array.isArray(item.nutritionalHighlights) ? 
            item.nutritionalHighlights.map((nh: any) => this.cleanField(nh)).filter(Boolean) : undefined,
          winePairings: Array.isArray(item.winePairings) ? 
            item.winePairings.map((wp: any) => this.cleanField(wp)).filter(Boolean) : undefined,
          upsellOpportunities: Array.isArray(item.upsellOpportunities) ? 
            item.upsellOpportunities.map((up: any) => this.cleanField(up)).filter(Boolean) : undefined
        };
        
        return cleanItem;
      }).filter((item: any) => {
        // Only keep items with valid, non-generic names and descriptions
        return item.name && 
               item.description && 
               item.name !== "Signature Dish" &&
               item.description !== "A carefully crafted dish featuring premium ingredients";
      });
      
      console.log(`Processed menu items: ${processedItems.length} out of ${(result.items || []).length} total`);
      
      if (processedItems.length === 0) {
        throw new Error('AI failed to generate valid menu items. Please try again with different parameters.');
      }
      
      return processedItems;
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

## MANDATORY COMPREHENSIVE RECIPE DETAILS:

**INGREDIENTS** - Provide DETAILED ingredient lists with exact measurements:
- Use professional measurements (oz, grams, cups, tablespoons, etc.)
- Include brand preferences for premium items when relevant
- Specify preparation notes (julienned, brunoise, rough chopped, etc.)
- List specialized ingredients and techniques
- Example: "8 oz wild-caught Atlantic salmon fillet, skin removed, pin bones checked", "2 tbsp Maldon sea salt flakes", "1/4 cup micro cilantro for garnish"

**PREPARATION INSTRUCTIONS** - Provide step-by-step prep work:
- Advance preparation tasks (day before, morning of)
- Mise en place organization
- Sauce/component preparation
- Example: "Day before: Cure duck breast with salt, thyme, orange zest for 24 hours", "Morning: Prepare duck fat confit at 140°F"

**COOKING INSTRUCTIONS** - Detailed cooking process:
- Exact temperatures, times, and techniques
- Professional cooking methods and equipment
- Doneness indicators and quality checks
- Example: "Sear duck breast skin-side down in cold pan, render fat slowly for 8 minutes until golden", "Flip and cook 3 minutes to 135°F internal temperature"

**PLATING INSTRUCTIONS** - Restaurant-quality presentation:
- Detailed plating techniques and visual composition
- Garnish placement and sauce application
- Temperature and timing considerations
- Example: "Warm plates to 140°F", "Place duck breast at 2 o'clock, fan slices to reveal pink interior", "Drizzle reduction in teardrop pattern"

**COOKING TECHNIQUES** - Professional methods used:
- Specific culinary techniques (sous-vide, confit, brunoise, etc.)
- Equipment requirements
- Advanced methods (molecular gastronomy, fermentation, etc.)
- Example: "Sous-vide", "Duck fat confit", "Gastrique reduction", "Microplane zesting"

## MANDATORY OUTPUT REQUIREMENTS:
- Generate EXACTLY 4 menu items
- NO backticks anywhere in JSON - use only proper double quotes
- Each ingredient MUST include exact measurements and specifications
- Every recipe section MUST be comprehensive and professional

RESPOND WITH VALID JSON (NO BACKTICKS):
{
  "items": [
    {
      "name": "Unique dish name",
      "description": "Compelling description explaining concept and flavors",
      "category": "Category name",
      "ingredients": [
        "8 oz wild-caught Atlantic salmon fillet, skin removed, pin bones checked",
        "2 tbsp Maldon sea salt flakes",
        "1/4 cup micro cilantro for garnish",
        "3 tbsp extra virgin olive oil (premium grade)",
        "1 lemon, zested and juiced",
        "2 cloves garlic, minced fine",
        "1 tsp freshly cracked black pepper"
      ],
      "preparationTime": 45,
      "difficulty": "medium",
      "estimatedCost": 12.50,
      "suggestedPrice": 32.00,
      "profitMargin": 61,
      "recipe": {
        "serves": 1,
        "prepInstructions": [
          "Day before: Cure salmon with salt mixture and herbs for 24 hours in refrigerator",
          "Morning of service: Prepare lemon-herb oil by combining olive oil, lemon zest, and minced garlic",
          "2 hours before service: Remove salmon from refrigeration to reach room temperature",
          "30 minutes before: Prepare garnish components and warm serving plates"
        ],
        "cookingInstructions": [
          "Preheat oven to 400°F and heat cast iron pan over medium-high heat for 3 minutes",
          "Pat salmon completely dry and season with fresh cracked pepper",
          "Sear salmon flesh-side down for 4-5 minutes until golden crust forms and easily releases",
          "Flip carefully and transfer pan to oven for 8-10 minutes until internal temperature reaches 135°F",
          "Rest salmon for 2 minutes before plating to allow juices to redistribute"
        ],
        "platingInstructions": [
          "Warm plates to 140°F in oven for proper temperature retention",
          "Place salmon at center of plate, slightly off-center for visual appeal",
          "Drizzle lemon-herb oil in artistic teardrop pattern around the fish",
          "Garnish with micro cilantro placed delicately on top and around plate",
          "Finish with a few flakes of Maldon salt for texture and visual contrast"
        ],
        "techniques": ["Dry-curing", "Pan-searing", "Oven-finishing", "Oil infusion", "Temperature monitoring"]
      },
      "allergens": ["Fish", "Garlic"],
      "nutritionalHighlights": ["High in omega-3 fatty acids", "Lean protein source"],
      "winePairings": ["Sauvignon Blanc", "Light Pinot Noir"],
      "upsellOpportunities": ["Add truffle oil drizzle +$8", "Pair with house white wine +$12"]
    },
    {
      "name": "Second dish name",
      "description": "Second dish description",
      "category": "Different category",
      "ingredients": ["Detailed ingredient list with measurements"],
      "preparationTime": 35,
      "difficulty": "hard",
      "estimatedCost": 15.75,
      "suggestedPrice": 38.00,
      "profitMargin": 59,
      "recipe": {
        "serves": 1,
        "prepInstructions": ["Detailed prep steps"],
        "cookingInstructions": ["Detailed cooking steps"],
        "platingInstructions": ["Detailed plating steps"],
        "techniques": ["Professional techniques used"]
      },
      "allergens": ["List allergens"],
      "nutritionalHighlights": ["Nutritional benefits"],
      "winePairings": ["Wine suggestions"],
      "upsellOpportunities": ["Upsell options"]
    },
    {
      "name": "Third dish name",
      "description": "Third dish description", 
      "category": "Third category",
      "ingredients": ["Detailed ingredients with measurements"],
      "preparationTime": 40,
      "difficulty": "medium",
      "estimatedCost": 10.25,
      "suggestedPrice": 28.00,
      "profitMargin": 63,
      "recipe": {
        "serves": 1,
        "prepInstructions": ["Comprehensive prep instructions"],
        "cookingInstructions": ["Detailed cooking process"],
        "platingInstructions": ["Professional plating techniques"],
        "techniques": ["Culinary methods used"]
      },
      "allergens": ["Allergen list"],
      "nutritionalHighlights": ["Health benefits"],
      "winePairings": ["Wine pairings"],
      "upsellOpportunities": ["Additional options"]
    },
    {
      "name": "Fourth dish name",
      "description": "Fourth dish description",
      "category": "Fourth category", 
      "ingredients": ["Complete ingredient specifications"],
      "preparationTime": 50,
      "difficulty": "hard",
      "estimatedCost": 18.00,
      "suggestedPrice": 42.00,
      "profitMargin": 57,
      "recipe": {
        "serves": 1,
        "prepInstructions": ["Thorough preparation steps"],
        "cookingInstructions": ["Professional cooking instructions"],
        "platingInstructions": ["Restaurant-quality plating"],
        "techniques": ["Advanced culinary techniques"]
      },
      "allergens": ["Complete allergen information"],
      "nutritionalHighlights": ["Nutritional advantages"],
      "winePairings": ["Recommended wines"],
      "upsellOpportunities": ["Revenue enhancement options"]
    }
  ]
}

CRITICAL REQUIREMENTS:
- EXACTLY 4 complete menu items
- NO backticks (`) - only double quotes (")
- Detailed ingredients with exact measurements
- Comprehensive recipe instructions for all sections
- Professional restaurant-quality details throughout`;
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
      prompt = `Create EXACTLY 4 exceptional ${request.focusCategory.toLowerCase()} items that will elevate this category and drive customer excitement`;
      
      const categoryGuidance = this.getCategorySpecificGuidance(request.focusCategory);
      if (categoryGuidance) {
        prompt += `. ${categoryGuidance}`;
      }
    } else {
      prompt = `Create EXACTLY 4 innovative menu items across different categories that showcase culinary excellence`;
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
    
    // Add comprehensive recipe requirements
    prompt += `

## CRITICAL REQUIREMENTS FOR COMPREHENSIVE RECIPES:

**INGREDIENTS**: Provide detailed ingredient lists with precise measurements, preparation notes, and quality specifications. Include exact quantities, brand preferences for premium items, and prep details like "brunoise," "julienned," etc.

**PREPARATION INSTRUCTIONS**: Include advance prep work, mise en place organization, sauce preparation, and timing considerations. Detail what can be done day-before vs. day-of service.

**COOKING INSTRUCTIONS**: Provide exact temperatures, cooking times, professional techniques, and doneness indicators. Include equipment specifications and quality checks throughout the process.

**PLATING INSTRUCTIONS**: Detail restaurant-quality presentation with specific plating techniques, garnish placement, sauce application, and visual composition guidelines.

**COOKING TECHNIQUES**: List all professional culinary methods used, including specialized equipment, molecular gastronomy techniques, and advanced preparation methods.

Generate recipes with the detail and precision of a Michelin-starred restaurant kitchen manual. Each recipe should be comprehensive enough for a professional chef to execute flawlessly.`;
    
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