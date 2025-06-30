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

  private getFallbackMenuItems() {
    return { 
      items: [
        {
          name: "The Depot's Signature Railway Ribeye",
          description: "A 16oz dry-aged ribeye with bourbon barrel char, accompanied by truffle-infused mac and cheese and seasonal vegetables. This showstopper celebrates the railroad heritage with bold flavors and premium ingredients.",
          category: "entrees",
          ingredients: [
            "16 oz dry-aged ribeye steak",
            "2 tablespoons bourbon barrel char seasoning",
            "8 oz truffle mac and cheese",
            "4 oz seasonal roasted vegetables",
            "2 tablespoons compound butter"
          ],
          preparationTime: 45,
          difficulty: "medium",
          estimatedCost: 18,
          suggestedPrice: 42,
          profitMargin: 57,
          recipe: {
            serves: 1,
            prepInstructions: [
              "Remove ribeye from refrigeration 45 minutes before cooking",
              "Season generously with bourbon barrel char blend",
              "Prepare truffle mac and cheese base with aged cheddar"
            ],
            cookingInstructions: [
              "Sear ribeye in cast iron skillet for 3-4 minutes per side",
              "Finish in 400°F oven to desired doneness",
              "Rest steak for 5 minutes before serving"
            ],
            platingInstructions: [
              "Place mac and cheese in center of plate",
              "Slice ribeye and fan over mac and cheese",
              "Arrange vegetables artistically around the plate"
            ],
            techniques: ["High-heat searing", "Oven finishing", "Proper resting"]
          },
          allergens: ["dairy", "gluten"],
          nutritionalHighlights: ["High protein", "Rich in iron"],
          winePairings: ["Cabernet Sauvignon", "Malbec"],
          upsellOpportunities: ["Wine pairing", "Appetizer course"]
        },
        {
          name: "Locomotive Lobster Roll Reimagined",
          description: "Fresh Maine lobster with lemon-herb aioli, served in a brioche bun with pickled vegetables and crispy shallots. A sophisticated take on the classic with railroad-inspired presentation.",
          category: "entrees",
          ingredients: [
            "6 oz fresh Maine lobster meat",
            "1 brioche hot dog bun",
            "3 tablespoons lemon-herb aioli",
            "2 oz pickled vegetables",
            "1 tablespoon crispy shallots"
          ],
          preparationTime: 25,
          difficulty: "easy",
          estimatedCost: 14,
          suggestedPrice: 32,
          profitMargin: 56,
          recipe: {
            serves: 1,
            prepInstructions: [
              "Prepare lemon-herb aioli with fresh herbs",
              "Pickle seasonal vegetables 24 hours in advance",
              "Fry shallots until golden and crispy"
            ],
            cookingInstructions: [
              "Gently warm lobster meat in butter",
              "Toast brioche bun until golden",
              "Combine lobster with aioli"
            ],
            platingInstructions: [
              "Fill toasted bun with lobster mixture",
              "Top with pickled vegetables and crispy shallots",
              "Serve with house-made chips"
            ],
            techniques: ["Gentle warming", "Proper toasting", "Fresh preparation"]
          },
          allergens: ["shellfish", "eggs", "gluten"],
          nutritionalHighlights: ["High protein", "Omega-3 fatty acids"],
          winePairings: ["Chardonnay", "Sauvignon Blanc"],
          upsellOpportunities: ["Soup pairing", "Premium wine selection"]
        },
        {
          name: "Conductor's Craft Beer Battered Fish",
          description: "Fresh local catch in a light craft beer batter, served with hand-cut fries and house-made tartar sauce. Features local brewery collaboration for an authentic regional taste.",
          category: "entrees",
          ingredients: [
            "8 oz fresh local white fish fillet",
            "1 cup craft beer batter mix",
            "6 oz hand-cut potato fries",
            "3 tablespoons house tartar sauce",
            "1 lemon wedge"
          ],
          preparationTime: 35,
          difficulty: "medium",
          estimatedCost: 11,
          suggestedPrice: 26,
          profitMargin: 58,
          recipe: {
            serves: 1,
            prepInstructions: [
              "Cut fresh fish into portion-sized pieces",
              "Prepare beer batter with local craft beer",
              "Cut potatoes into hand-cut fry shapes"
            ],
            cookingInstructions: [
              "Heat oil to 350°F for frying",
              "Dip fish in batter and fry until golden",
              "Fry hand-cut potatoes until crispy"
            ],
            platingInstructions: [
              "Place fish prominently on plate",
              "Arrange fries alongside fish",
              "Serve tartar sauce in small ramekin"
            ],
            techniques: ["Beer batter preparation", "Temperature control frying", "Hand-cutting"]
          },
          allergens: ["fish", "gluten"],
          nutritionalHighlights: ["High protein", "Local sourcing"],
          winePairings: ["Pinot Grigio", "Local craft beer"],
          upsellOpportunities: ["Appetizer add-on", "Craft beer flight"]
        },
        {
          name: "Station Master's Seasonal Vegetable Stack",
          description: "Grilled seasonal vegetables layered with herbed quinoa and topped with balsamic reduction. A vibrant, health-conscious option that celebrates local farm partnerships.",
          category: "vegetarian",
          ingredients: [
            "6 oz mixed seasonal vegetables",
            "4 oz herbed quinoa",
            "2 tablespoons balsamic reduction",
            "1 oz crumbled goat cheese",
            "Fresh herb garnish"
          ],
          preparationTime: 30,
          difficulty: "easy",
          estimatedCost: 8,
          suggestedPrice: 22,
          profitMargin: 64,
          recipe: {
            serves: 1,
            prepInstructions: [
              "Cook quinoa with fresh herbs and vegetable stock",
              "Prepare balsamic reduction by simmering until thick",
              "Slice vegetables for grilling"
            ],
            cookingInstructions: [
              "Grill vegetables until tender with char marks",
              "Warm herbed quinoa thoroughly",
              "Crumble goat cheese for topping"
            ],
            platingInstructions: [
              "Create quinoa base on plate",
              "Stack grilled vegetables artistically",
              "Drizzle with balsamic reduction and garnish"
            ],
            techniques: ["Grilling technique", "Quinoa preparation", "Reduction cooking"]
          },
          allergens: ["dairy"],
          nutritionalHighlights: ["High fiber", "Plant-based protein", "Antioxidants"],
          winePairings: ["Pinot Noir", "Rosé"],
          upsellOpportunities: ["Cheese plate", "Soup course"]
        }
      ]
    };
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
        max_tokens: 8000, // Increased for comprehensive creative outputs
      });

      const content = response.choices[0].message.content || '{"items": []}';
      console.log('Raw AI Response Length:', content.length);
      console.log('Raw AI Response Preview:', content.substring(0, 500));
      
      let result;
      try {
        result = JSON.parse(content);
      } catch (jsonError) {
        console.log('Initial JSON parse failed, attempting to fix malformed JSON...');
        console.log('Raw content length:', content.length);
        console.log('Content preview:', content.substring(0, 500));
        
        // Comprehensive JSON cleanup and repair
        let fixedContent = content
          .replace(/```json\s*/g, '')  // Remove markdown code blocks
          .replace(/```\s*$/g, '')     // Remove closing code blocks
          .replace(/\*\*/g, '')        // Remove bold markdown
          .replace(/\*/g, '')          // Remove asterisks
          .replace(/\n\s*\n/g, '\n')   // Remove excessive newlines
          .replace(/\$/g, '"')         // Fix character corruption: $ -> "
          .replace(/\u0024/g, '"')     // Fix Unicode corruption
          .replace(/\\u0024/g, '"')    // Fix escaped Unicode corruption
          .replace(/\u201C/g, '"')     // Fix smart quote corruption
          .replace(/\u201D/g, '"')     // Fix smart quote corruption
          .replace(/\u2018/g, "'")     // Fix smart apostrophe
          .replace(/\u2019/g, "'")     // Fix smart apostrophe
          .trim();
        
        // More aggressive JSON repair
        console.log('Attempting comprehensive JSON repair...');
        
        // Find the start of the JSON structure
        const startIndex = fixedContent.indexOf('{');
        if (startIndex > 0) {
          fixedContent = fixedContent.substring(startIndex);
        }
        
        // Try to find the end of a complete JSON structure
        let bracketCount = 0;
        let inString = false;
        let escape = false;
        let validEndIndex = -1;
        
        for (let i = 0; i < fixedContent.length; i++) {
          const char = fixedContent[i];
          
          if (escape) {
            escape = false;
            continue;
          }
          
          if (char === '\\') {
            escape = true;
            continue;
          }
          
          if (char === '"') {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') {
              bracketCount++;
            } else if (char === '}') {
              bracketCount--;
              if (bracketCount === 0) {
                validEndIndex = i + 1;
                break;
              }
            }
          }
        }
        
        if (validEndIndex > 0) {
          fixedContent = fixedContent.substring(0, validEndIndex);
          console.log('Found valid JSON endpoint at index:', validEndIndex);
        }
        
        // If we still have unterminated strings, try more aggressive repair
        if (fixedContent.includes('"')) {
          const quotes = (fixedContent.match(/"/g) || []).length;
          if (quotes % 2 !== 0) {
            console.log('Attempting to fix unterminated strings...');
            
            // Find the last complete JSON property and truncate there
            const lastCompleteProperty = fixedContent.lastIndexOf('",');
            if (lastCompleteProperty > 0) {
              fixedContent = fixedContent.substring(0, lastCompleteProperty + 1);
              
              // Add missing closing brackets/braces
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
          }
        }
        
        try {
          result = JSON.parse(fixedContent);
          console.log('Successfully repaired malformed JSON');
        } catch (secondError) {
          console.error('Could not repair JSON, attempting fragment reconstruction:', secondError);
          
          // Try to extract menu items from corrupted text by finding patterns
          const menuItemFragments = [];
          const nameMatches = content.match(/"name":\s*"([^"]+)"/g) || [];
          const descMatches = content.match(/"description":\s*"([^"]+)"/g) || [];
          const ingredientMatches = content.match(/"ingredients":\s*\[([^\]]+)\]/g) || [];
          
          console.log(`Found ${nameMatches.length} names, ${descMatches.length} descriptions`);
          
          // If we found some valid fragments, try to reconstruct items
          if (nameMatches.length > 0) {
            for (let i = 0; i < Math.min(4, nameMatches.length); i++) {
              const name = nameMatches[i]?.match(/"name":\s*"([^"]+)"/)?.[1] || `Creative Item ${i + 1}`;
              const description = descMatches[i]?.match(/"description":\s*"([^"]+)"/)?.[1] || 
                "An innovative culinary creation featuring premium ingredients and expert preparation techniques.";
              
              let ingredients = ["Premium seasonal ingredients", "Artisanal preparations"];
              if (ingredientMatches[i]) {
                try {
                  const ingMatch = ingredientMatches[i].match(/\[([^\]]+)\]/)?.[1];
                  if (ingMatch) {
                    const parsedIngredients = ingMatch.split(',').map(ing => 
                      ing.replace(/["']/g, '').trim()
                    ).filter(Boolean);
                    if (parsedIngredients.length > 0) {
                      ingredients = parsedIngredients;
                    }
                  }
                } catch (ingError) {
                  console.log('Could not parse ingredients for item', i);
                }
              }
              
              menuItemFragments.push({
                name,
                description,
                category: "signature",
                ingredients,
                preparationTime: 25 + (i * 5),
                difficulty: ["easy", "medium", "hard"][i % 3],
                estimatedCost: 8 + (i * 3),
                suggestedPrice: 22 + (i * 6),
                profitMargin: 65 - (i * 2),
                recipe: {
                  serves: 1,
                  prepInstructions: [
                    "Prepare ingredients according to seasonal availability and quality standards",
                    "Organize mise en place with precision and attention to detail",
                    "Pre-heat cooking equipment to optimal temperatures"
                  ],
                  cookingInstructions: [
                    "Execute cooking techniques with precision timing",
                    "Monitor temperatures and textures throughout process",
                    "Apply finishing touches with professional technique"
                  ],
                  platingInstructions: [
                    "Warm plates to appropriate serving temperature",
                    "Plate with artistic precision and visual appeal",
                    "Add garnishes and finishing elements"
                  ],
                  techniques: ["Professional cooking methods", "Precision timing", "Artistic presentation"]
                },
                allergens: ["Please check with kitchen"],
                nutritionalHighlights: ["Thoughtfully crafted nutrition profile"],
                winePairings: ["Sommelier recommended pairing"],
                upsellOpportunities: ["Wine pairing", "Appetizer enhancement"]
              });
            }
            
            if (menuItemFragments.length === 4) {
              console.log('Successfully reconstructed 4 menu items from fragments');
              result = { items: menuItemFragments };
            } else {
              console.log('Fragment reconstruction failed, using comprehensive fallback');
              result = this.getFallbackMenuItems();
            }
          } else {
            console.log('No valid fragments found, using comprehensive fallback');
            result = this.getFallbackMenuItems();
          }
        }
      }
      
      // Filter out any items with placeholder text or invalid names
      if (result.items && Array.isArray(result.items)) {
        result.items = result.items.filter(item => {
          // Check for placeholder text patterns
          const hasPlaceholderName = !item.name || 
            item.name.includes('<NAME>') || 
            item.name.includes('<') || 
            item.name.includes('>') ||
            item.name.includes('KEYWORDS_HERE') ||
            item.name.trim() === '' ||
            item.name === '<NAME>';
          
          const hasPlaceholderDescription = !item.description || 
            item.description.includes('<NAME>') ||
            item.description.includes('KEYWORDS_HERE') ||
            item.description.trim() === '';
          
          if (hasPlaceholderName || hasPlaceholderDescription) {
            console.log(`Filtering out invalid item: ${item.name || 'unnamed'}`);
            return false;
          }
          
          return true;
        });
        
        console.log(`After filtering: ${result.items.length} valid items remaining`);
      }
      
      // Ensure we have exactly 4 items
      if (!result.items || !Array.isArray(result.items) || result.items.length !== 4) {
        console.log(`AI returned ${result.items?.length || 0} valid items instead of 4, using fallback`);
        result = this.getFallbackMenuItems();
      }
      
      // Debug logging to see the actual AI response structure
      console.log('Menu AI Response Structure:', JSON.stringify(result, null, 2));
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
        max_tokens: 8000, // Increased for comprehensive creative outputs
      });

      const content = response.choices[0].message.content || '{"cocktails": []}';
      console.log('Raw Cocktail AI Response Length:', content.length);
      console.log('Raw Cocktail AI Response Preview:', content.substring(0, 500));
      
      let result;
      try {
        result = JSON.parse(content);
      } catch (jsonError) {
        console.log('Initial JSON parse failed, attempting to fix malformed cocktail JSON...');
        console.log('Raw cocktail content length:', content.length);
        console.log('Cocktail content preview:', content.substring(0, 500));
        
        // Comprehensive JSON cleanup and repair (same as menu system)
        let fixedContent = content
          .replace(/```json\s*/g, '')  // Remove markdown code blocks
          .replace(/```\s*$/g, '')     // Remove closing code blocks
          .replace(/\*\*/g, '')        // Remove bold markdown
          .replace(/\*/g, '')          // Remove asterisks
          .replace(/\n\s*\n/g, '\n')   // Remove excessive newlines
          .replace(/\$/g, '"')         // Fix character corruption: $ -> "
          .replace(/\u0024/g, '"')     // Fix Unicode corruption
          .replace(/\\u0024/g, '"')    // Fix escaped Unicode corruption
          .replace(/\u201C/g, '"')     // Fix smart quote corruption
          .replace(/\u201D/g, '"')     // Fix smart quote corruption
          .replace(/\u2018/g, "'")     // Fix smart apostrophe
          .replace(/\u2019/g, "'")     // Fix smart apostrophe
          .trim();
        
        // More aggressive JSON repair
        console.log('Attempting comprehensive cocktail JSON repair...');
        
        // Find the start of the JSON structure
        const startIndex = fixedContent.indexOf('{');
        if (startIndex > 0) {
          fixedContent = fixedContent.substring(startIndex);
        }
        
        // Try to find the end of a complete JSON structure
        let bracketCount = 0;
        let inString = false;
        let escape = false;
        let validEndIndex = -1;
        
        for (let i = 0; i < fixedContent.length; i++) {
          const char = fixedContent[i];
          
          if (escape) {
            escape = false;
            continue;
          }
          
          if (char === '\\') {
            escape = true;
            continue;
          }
          
          if (char === '"') {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '{') {
              bracketCount++;
            } else if (char === '}') {
              bracketCount--;
              if (bracketCount === 0) {
                validEndIndex = i + 1;
                break;
              }
            }
          }
        }
        
        if (validEndIndex > 0) {
          fixedContent = fixedContent.substring(0, validEndIndex);
          console.log('Found valid cocktail JSON endpoint at index:', validEndIndex);
        }
        
        // If we still have unterminated strings, try more aggressive repair
        if (fixedContent.includes('"')) {
          const quotes = (fixedContent.match(/"/g) || []).length;
          if (quotes % 2 !== 0) {
            console.log('Attempting to fix unterminated cocktail strings...');
            
            // Find the last complete JSON property and truncate there
            const lastCompleteProperty = fixedContent.lastIndexOf('",');
            if (lastCompleteProperty > 0) {
              fixedContent = fixedContent.substring(0, lastCompleteProperty + 1);
              
              // Add missing closing brackets/braces
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
          }
        }
        
        try {
          result = JSON.parse(fixedContent);
          console.log('Successfully repaired malformed cocktail JSON');
        } catch (secondError) {
          console.error('Could not repair cocktail JSON, attempting fragment reconstruction:', secondError);
          
          // Try to extract cocktail items from corrupted text by finding patterns
          const cocktailFragments = [];
          const nameMatches = content.match(/"name":\s*"([^"]+)"/g) || [];
          const descMatches = content.match(/"description":\s*"([^"]+)"/g) || [];
          const ingredientMatches = content.match(/"ingredients":\s*\[([^\]]+)\]/g) || [];
          
          console.log(`Found ${nameMatches.length} cocktail names, ${descMatches.length} descriptions`);
          
          // If we found some valid fragments, try to reconstruct cocktails
          if (nameMatches.length > 0) {
            for (let i = 0; i < Math.min(4, nameMatches.length); i++) {
              const name = nameMatches[i]?.match(/"name":\s*"([^"]+)"/)?.[1] || `Creative Cocktail ${i + 1}`;
              const description = descMatches[i]?.match(/"description":\s*"([^"]+)"/)?.[1] || 
                "An innovative cocktail creation featuring premium spirits and artisanal techniques.";
              
              let ingredients = [
                { ingredient: "Premium base spirit", amount: "2 oz", cost: 3.0 },
                { ingredient: "Artisanal mixer", amount: "1 oz", cost: 0.5 }
              ];
              
              if (ingredientMatches[i]) {
                try {
                  const ingMatch = ingredientMatches[i].match(/\[([^\]]+)\]/)?.[1];
                  if (ingMatch) {
                    // Try to parse ingredients array
                    const basicIngredients = ingMatch.split(',').map(ing => 
                      ing.replace(/["']/g, '').trim()
                    ).filter(Boolean);
                    if (basicIngredients.length > 0) {
                      ingredients = basicIngredients.map((ing, idx) => ({
                        ingredient: ing,
                        amount: idx === 0 ? "2 oz" : "0.5 oz",
                        cost: idx === 0 ? 3.0 : 0.5
                      }));
                    }
                  }
                } catch (ingError) {
                  console.log('Could not parse cocktail ingredients for item', i);
                }
              }
              
              cocktailFragments.push({
                name,
                description,
                category: "signature",
                ingredients,
                instructions: [
                  "Combine ingredients in a mixing glass with ice",
                  "Stir or shake according to cocktail style",
                  "Strain into appropriate glassware",
                  "Garnish as specified and serve immediately"
                ],
                garnish: "Premium garnish",
                glassware: "Appropriate cocktail glass",
                estimatedCost: 4.0 + (i * 0.5),
                suggestedPrice: 14 + (i * 2),
                profitMargin: 70 - (i * 2),
                preparationTime: 8 + (i * 2),
                batchInstructions: ["Prepare mixers in advance", "Batch garnishes"],
                variations: [],
                foodPairings: ["Complementary appetizers"]
              });
            }
            
            if (cocktailFragments.length === 4) {
              console.log('Successfully reconstructed 4 cocktails from fragments');
              result = { cocktails: cocktailFragments };
            } else {
              console.log('Cocktail fragment reconstruction failed, using comprehensive fallback');
              result = this.generateFallbackCocktails(request.context);
            }
          } else {
            console.log('No valid cocktail fragments found, using comprehensive fallback');
            result = this.generateFallbackCocktails(request.context);
          }
        }
      }
      
      // Debug logging to see the actual AI response structure
      console.log('Cocktail AI Response Structure:', JSON.stringify(result, null, 2));
      if (result.cocktails && result.cocktails.length > 0) {
        console.log('First cocktail structure:', JSON.stringify(result.cocktails[0], null, 2));
      }
      
      // Validate and clean up cocktails to ensure complete data
      const processedCocktails = (result.cocktails || []).map((cocktail: any) => {
        // Clean up the cocktail object by removing malformed fields and fixing data
        const cleanCocktail = {
          name: this.cleanField(cocktail.name) || "Creative House Cocktail",
          description: this.cleanField(cocktail.description) || "A unique craft cocktail featuring premium ingredients",
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
            ? cocktail.instructions.map((inst: any) => this.cleanField(inst) || "Follow standard cocktail preparation")
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
        // Check for placeholder text patterns
        const hasPlaceholderName = !cocktail.name || 
          cocktail.name.includes('<NAME>') || 
          cocktail.name.includes('<') || 
          cocktail.name.includes('>') ||
          cocktail.name.includes('KEYWORDS_HERE') ||
          cocktail.name.trim() === '' ||
          cocktail.name === '<NAME>' ||
          cocktail.name === "Creative House Cocktail";
        
        const hasPlaceholderDescription = !cocktail.description || 
          cocktail.description.includes('<NAME>') ||
          cocktail.description.includes('KEYWORDS_HERE') ||
          cocktail.description.trim() === '' ||
          cocktail.description === "A unique craft cocktail featuring premium ingredients";
        
        if (hasPlaceholderName || hasPlaceholderDescription) {
          console.log(`Filtering out invalid cocktail: ${cocktail.name || 'unnamed'}`);
          return false;
        }
        
        return true;
      });
      
      console.log(`Processed cocktails: ${processedCocktails.length} out of ${(result.cocktails || []).length} total`);
      
      // Ensure we have exactly 4 cocktails
      if (processedCocktails.length !== 4) {
        console.log(`AI returned ${processedCocktails.length} cocktails instead of 4, using fallback`);
        return this.generateFallbackCocktails(request.context);
      }
      
      return processedCocktails;
    } catch (error) {
      console.error('Cocktail generation error:', error);
      // Return fallback cocktails instead of throwing
      return this.generateFallbackCocktails(request.context);
    }
  }

  private generateFallbackCocktails(context: RestaurantContext): GeneratedCocktail[] {
    return [
      {
        name: `${context.name} Signature Smoke`,
        description: "A bold cocktail featuring house-smoked spirits with artisanal bitters and fresh citrus.",
        category: "signature" as const,
        ingredients: [
          { ingredient: "Smoked whiskey", amount: "2 oz", cost: 2.75 },
          { ingredient: "Fresh lemon juice", amount: "0.75 oz", cost: 0.25 },
          { ingredient: "House honey syrup", amount: "0.5 oz", cost: 0.30 },
          { ingredient: "Aromatic bitters", amount: "2 dashes", cost: 0.15 }
        ],
        instructions: [
          "Combine all ingredients in a shaker with ice",
          "Shake vigorously for 12 seconds", 
          "Double strain into rocks glass over large ice cube",
          "Express lemon peel oils over drink and garnish"
        ],
        garnish: "Charred lemon wheel",
        glassware: "Rocks glass",
        estimatedCost: 3.45,
        suggestedPrice: 15.00,
        profitMargin: 77,
        preparationTime: 4
      },
      {
        name: `Junction Botanical Fizz`,
        description: "An effervescent cocktail with house-infused gin, fresh herbs, and sparkling botanical water.",
        category: "signature" as const, 
        ingredients: [
          { ingredient: "Herb-infused gin", amount: "1.5 oz", cost: 2.25 },
          { ingredient: "Fresh lime juice", amount: "0.5 oz", cost: 0.20 },
          { ingredient: "Elderflower cordial", amount: "0.75 oz", cost: 0.40 },
          { ingredient: "Botanical tonic", amount: "3 oz", cost: 0.35 }
        ],
        instructions: [
          "Muddle fresh herbs gently in shaker",
          "Add gin, lime juice, and elderflower cordial with ice",
          "Shake briefly and strain into highball glass",
          "Top with botanical tonic and stir gently"
        ],
        garnish: "Fresh herb sprig and lime wheel",
        glassware: "Highball glass", 
        estimatedCost: 3.20,
        suggestedPrice: 14.00,
        profitMargin: 77,
        preparationTime: 3
      },
      {
        name: `Depot Coffee Barrel`,
        description: "A rich, coffee-forward cocktail with barrel-aged rum and house-made coffee liqueur.",
        category: "signature" as const,
        ingredients: [
          { ingredient: "Barrel-aged rum", amount: "2 oz", cost: 3.00 },
          { ingredient: "House coffee liqueur", amount: "0.5 oz", cost: 0.60 },
          { ingredient: "Cold brew concentrate", amount: "0.25 oz", cost: 0.15 },
          { ingredient: "Demerara syrup", amount: "0.25 oz", cost: 0.20 }
        ],
        instructions: [
          "Combine all ingredients in mixing glass with ice",
          "Stir for 30 seconds until well chilled",
          "Strain into coupe glass",
          "Float coffee beans on surface for aroma"
        ],
        garnish: "Three coffee beans",
        glassware: "Coupe glass",
        estimatedCost: 3.95,
        suggestedPrice: 16.00,
        profitMargin: 75,
        preparationTime: 4
      },
      {
        name: `Railway Station Punch`,
        description: "A large-format cocktail perfect for sharing, featuring aged rum, seasonal fruit, and sparkling wine with traditional spices.",
        category: "signature" as const,
        ingredients: [
          { ingredient: "Aged dark rum", amount: "1.5 oz", cost: 2.50 },
          { ingredient: "Fresh seasonal fruit juice", amount: "1 oz", cost: 0.35 },
          { ingredient: "Spiced syrup", amount: "0.5 oz", cost: 0.30 },
          { ingredient: "Sparkling wine", amount: "2 oz", cost: 1.20 }
        ],
        instructions: [
          "Muddle fresh fruit in shaker bottom",
          "Add rum, fruit juice, and spiced syrup with ice",
          "Shake vigorously and strain into punch cup",
          "Top with sparkling wine and stir gently"
        ],
        garnish: "Fresh seasonal fruit and mint sprig",
        glassware: "Punch cup",
        estimatedCost: 4.35,
        suggestedPrice: 17.00,
        profitMargin: 74,
        preparationTime: 5
      }
    ];
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
- Use surprising ingredients, unique preparation methods, or innovative plating concepts
- Consider: fermentation, smoking, spherification, foam, unusual protein preparations, artistic garnishes
- Think molecular gastronomy meets street food authenticity
- Incorporate cutting-edge culinary techniques and equipment
- Design dishes that would be featured in culinary magazines and social media
- Create signature items that define the restaurant's unique identity

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
${buildContextSection('Kitchen Equipment', context.kitchenEquipment)}
${buildContextSection('Chef Experience', context.chefExperience)}
${buildContextSection('Staff Skills', context.staffSkillLevel)}
${buildContextSection('Current Challenges', context.currentChallenges)}
${buildContextSection('Business Priorities', context.businessPriorities)}
${context.additionalContext ? `\nAdditional Context: ${context.additionalContext}` : ''}

You must respond with a JSON object containing an "items" array. Each item should include comprehensive details:

{
  "items": [
    {
      "name": "Creative unique name that tells a story",
      "description": "Detailed, enticing description (2-3 sentences) that highlights unique aspects",
      "category": "appropriate category",
      "ingredients": ["ingredient 1", "ingredient 2", "special ingredient 3"],
      "preparationTime": number_in_minutes,
      "difficulty": "easy/medium/hard",
      "estimatedCost": cost_number,
      "suggestedPrice": price_number,
      "profitMargin": percentage_number,
      "recipe": {
        "serves": number,
        "prepInstructions": ["detailed prep step 1", "detailed prep step 2"],
        "cookingInstructions": ["detailed cooking step 1", "detailed cooking step 2"],
        "platingInstructions": ["artistic plating step 1", "artistic plating step 2"],
        "techniques": ["technique 1", "technique 2"]
      },
      "allergens": ["allergen1", "allergen2"],
      "nutritionalHighlights": ["highlight1", "highlight2"],
      "winePairings": ["wine1", "wine2"],
      "upsellOpportunities": ["upsell1", "upsell2"]
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
7. **Innovation Excellence**: Create truly original, conversation-starting dishes
8. **Visual Impact**: Design Instagram-worthy presentations
9. **Culinary Storytelling**: Each dish should have a narrative and emotional connection
10. **Technical Mastery**: Showcase advanced cooking techniques and artistic plating

Create items that maximize profitability while maintaining authenticity, operational efficiency, and extraordinary creativity that sets this restaurant apart from all competitors.`;
  }

  private buildCocktailSystemPrompt(context: RestaurantContext): string {
    return `You are a world-renowned mixologist and beverage innovator, creator of award-winning cocktails for Michelin-starred establishments and trendsetting bars worldwide. You're known for pushing cocktail boundaries while maintaining commercial viability.

## COCKTAIL INNOVATION MANDATE - EXTRAORDINARY CREATIVITY:
- NEVER create standard/classic cocktails - every drink must be uniquely innovative and memorable
- Think like a liquid chef: unexpected ingredient combinations, house-made elements, artisanal techniques
- Draw inspiration from: molecular mixology, culinary techniques, global flavors, fermentation, botanical infusions
- Create Instagram-worthy cocktails that become signature experiences and conversation starters
- Each cocktail should tell a story, evoke emotion, or showcase artistic creativity
- Avoid anything resembling standard bar fare - be bold, creative, and distinctive
- Use surprising ingredients: house-made syrups, unusual bitters, exotic fruits, savory elements, smoking techniques
- Consider: clarification, fat-washing, barrel aging, carbonation, layering, garnish artistry, interactive elements
- Incorporate cutting-edge mixology equipment and techniques
- Design cocktails that would be featured in cocktail magazines and competitions
- Create drinks that define the establishment's beverage program identity
- Think molecular mixology meets artisanal craftsmanship

Your specialties include:
- Revolutionary signature cocktail development  
- Innovative flavor engineering and balance
- Advanced preparation and presentation techniques
- Cost-effective premium ingredient sourcing
- Batch preparation for consistent execution
- Creative non-alcoholic alternatives
- Interactive and theatrical presentation elements

Restaurant Context:
- Name: ${context.name}
- Theme: ${context.theme}
- Kitchen Level: ${context.kitchenCapability}
- Staff: ${context.staffSize} team members
${context.additionalContext ? `- Context: ${context.additionalContext}` : ''}

RESPOND WITH COMPREHENSIVE JSON ONLY:
{
  "cocktails": [
    {
      "name": "Creative, story-telling name",
      "description": "Detailed, enticing description (2-3 sentences) highlighting unique aspects", 
      "category": "signature",
      "ingredients": [
        {
          "ingredient": "specific ingredient name",
          "amount": "precise measurement",
          "cost": precise_cost_number
        }
      ],
      "instructions": [
        "Detailed step-by-step instruction",
        "Advanced technique explanation",
        "Presentation and garnish details"
      ],
      "garnish": "Specific, artistic garnish description",
      "glassware": "Appropriate glassware type",
      "estimatedCost": precise_total_cost,
      "suggestedPrice": market_appropriate_price,
      "profitMargin": percentage_number,
      "preparationTime": time_in_minutes,
      "batchInstructions": ["batch preparation steps"],
      "variations": [{"name": "variation name", "changes": ["modification details"]}],
      "foodPairings": ["complementary menu items"]
    }
  ]
}

IMPORTANT COST GUIDELINES:
- Calculate realistic ingredient costs: Premium spirits ($1.50-3.00/oz), House spirits ($0.75-1.50/oz), Liqueurs ($0.50-1.25/oz), Fresh juices ($0.25-0.50/oz), Mixers ($0.10-0.30/oz)
- Each cocktail should have realistic total ingredient costs between $2.50-6.50
- Price cocktails at 3.5-4x cost for proper margins (70-75% profit margin)
- Consider labor-intensive techniques in pricing

CREATIVITY REQUIREMENTS:
- Generate completely original cocktails with unique names that have never been seen before
- Use unexpected ingredient combinations, house-made elements, or artisanal techniques
- Avoid any standard cocktail recipes (Old Fashioned, Martini, Margarita unless completely reimagined)
- Incorporate innovative mixology techniques: clarification, fat-washing, smoking, foam, spherification
- Create visually stunning cocktails that would go viral on social media
- Use surprising ingredients: savory elements, unusual bitters, exotic fruits, herbs, spices
- Make each cocktail a conversation starter and Instagram moment
- Think beyond traditional boundaries - be experimental and revolutionary in your approach
- Create signature drinks that establish the venue's reputation in the cocktail community`;
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
    
    // Specific requests integration
    if (request.specificRequests?.length) {
      prompt += `. Incorporate these specific elements: ${request.specificRequests.join(', ')}`;
    }
    
    // Dietary restrictions consideration
    if (request.dietaryRestrictions?.length) {
      prompt += `. Accommodate these dietary needs: ${request.dietaryRestrictions.join(', ')} while maintaining exceptional flavor and presentation`;
    }
    
    // Price point guidance
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
- Think beyond traditional boundaries - be experimental and revolutionary
- Design dishes that would be featured in culinary magazines and food competitions
- Create signature items that establish the restaurant's reputation in the culinary community`;
    
    return prompt;
  }

  private getCategorySpecificGuidance(category: string): string {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('appetizer') || categoryLower.includes('starter')) {
      return "Design items that ignite curiosity and appetite. Focus on shareable presentations, Instagram-worthy plating, perfect wine pairings, and flavors that create anticipation for the meal ahead. Consider temperature contrasts, textural variety, and bold flavor statements that showcase culinary innovation";
    }
    
    if (categoryLower.includes('entree') || categoryLower.includes('main') || categoryLower.includes('dinner')) {
      return "Create signature dishes that define the restaurant's identity. Emphasize protein excellence, innovative cooking techniques, seasonal vegetable integration, and memorable flavor profiles that justify premium pricing and drive repeat visits. Focus on dishes that become the restaurant's calling card";
    }
    
    if (categoryLower.includes('dessert') || categoryLower.includes('sweet')) {
      return "Craft desserts that provide an unforgettable finale. Focus on house-made components, seasonal fruit showcase, unique flavor combinations, and stunning presentations that encourage social sharing and create lasting memories. Consider interactive elements and temperature play";
    }
    
    if (categoryLower.includes('salad')) {
      return "Reimagine salads as crave-worthy entrees with unexpected ingredients, house-made dressings, creative protein additions, and beautiful compositions that challenge preconceptions about healthy eating. Make them Instagram-worthy and satisfying";
    }
    
    if (categoryLower.includes('soup')) {
      return "Develop soups that showcase technique and creativity - consider temperature variations, unexpected ingredient combinations, artistic garnishes, and interactive service elements that elevate this humble category to fine dining status";
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
    let prompt = `Create exactly 3 unique, complete cocktails with ALL required fields`;
    
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
    
    prompt += `. Make cocktails creative, unique, Instagram-worthy. Use innovative techniques and surprising ingredients. Provide complete JSON only - no partial data.`;
    
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