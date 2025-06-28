import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  ChefHat, 
  Wine, 
  DollarSign, 
  Clock, 
  Users, 
  Lightbulb,
  Copy,
  Download,
  Star,
  Utensils
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MenuCocktailGeneratorProps {
  restaurantId: number;
}

interface GeneratedMenuItem {
  name: string;
  description: string;
  category: string;
  ingredients: string[];
  preparationTime: number;
  difficulty: string;
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
  winePairings?: string[];
  upsellOpportunities?: string[];
}

interface GeneratedCocktail {
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
  batchInstructions?: string[];
  variations?: Array<{
    name: string;
    changes: string[];
  }>;
  foodPairings?: string[];
}

export function MenuCocktailGenerator({ restaurantId }: MenuCocktailGeneratorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"menu" | "cocktails">("menu");
  
  // Menu generation state
  const [menuRequests, setMenuRequests] = useState<string[]>([]);
  const [menuDietaryRestrictions, setMenuDietaryRestrictions] = useState<string[]>([]);
  const [menuPricePoint, setMenuPricePoint] = useState<string>("");
  const [menuSeasonalFocus, setMenuSeasonalFocus] = useState("");
  const [newMenuRequest, setNewMenuRequest] = useState("");
  const [newDietaryRestriction, setNewDietaryRestriction] = useState("");
  
  // Enhanced menu parsing and category-specific generation
  const [existingMenu, setExistingMenu] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [parsedCategories, setParsedCategories] = useState<string[]>([]);
  const [parsedMenuItems, setParsedMenuItems] = useState<Array<{name: string; category: string; price?: number}>>([]);
  const [isAnalyzingMenu, setIsAnalyzingMenu] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  
  // Enhanced category options with common restaurant categories
  const commonCategories = [
    "Appetizers", "Starters", "Small Plates", "Shareables",
    "Salads", "Soups", "Entrees", "Main Courses", "Mains",
    "Pasta", "Pizza", "Burgers", "Sandwiches", "Wraps",
    "Seafood", "Steaks", "Chicken", "Pork", "Beef", "Vegetarian", "Vegan",
    "Desserts", "Sweets", "Ice Cream", "Pastries",
    "Breakfast", "Brunch", "Lunch Specials", "Dinner Specials",
    "Kids Menu", "Sides", "Beverages", "Hot Drinks", "Cold Drinks"
  ];
  
  // Get all available categories (parsed + common + custom)
  const getAllCategories = () => {
    const allCategories = new Set([...parsedCategories, ...commonCategories]);
    return Array.from(allCategories).sort();
  };

  // Get AI focus description for selected category
  const getCategoryFocusDescription = (category: string): string => {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('appetizer') || categoryLower.includes('starter')) {
      return "Creating shareable, Instagram-worthy appetizers with bold flavors that ignite curiosity and appetite.";
    }
    if (categoryLower.includes('entree') || categoryLower.includes('main')) {
      return "Designing signature dishes that define your restaurant's identity with premium ingredients and memorable flavor profiles.";
    }
    if (categoryLower.includes('dessert') || categoryLower.includes('sweet')) {
      return "Crafting unforgettable desserts with house-made components and stunning presentations that encourage social sharing.";
    }
    if (categoryLower.includes('salad')) {
      return "Reimagining salads as crave-worthy entrees with unexpected ingredients and beautiful compositions.";
    }
    if (categoryLower.includes('pasta') || categoryLower.includes('noodle')) {
      return "Elevating pasta with house-made noodles, innovative sauces, and expert techniques that showcase Italian traditions.";
    }
    if (categoryLower.includes('pizza')) {
      return "Redefining pizza with artisanal doughs, unexpected toppings, and gourmet preparations.";
    }
    if (categoryLower.includes('seafood') || categoryLower.includes('fish')) {
      return "Celebrating ocean-to-table freshness with sustainable sourcing and precise cooking techniques.";
    }
    if (categoryLower.includes('breakfast') || categoryLower.includes('brunch')) {
      return "Transforming morning classics into Instagram-worthy experiences with creative preparations.";
    }
    return "Focusing on ingredients that tell a story and techniques that showcase culinary skill and creativity.";
  };
  
  // Cocktail generation state
  const [cocktailTheme, setCocktailTheme] = useState("");
  const [baseSpirits, setBaseSpirits] = useState<string[]>([]);
  const [cocktailComplexity, setCocktailComplexity] = useState<string>("");
  const [batchable, setBatchable] = useState(false);
  const [cocktailSeasonality, setCocktailSeasonality] = useState("");
  const [newBaseSpirit, setNewBaseSpirit] = useState("");
  
  // Generated results
  const [generatedMenuItems, setGeneratedMenuItems] = useState<GeneratedMenuItem[]>([]);
  const [generatedCocktails, setGeneratedCocktails] = useState<GeneratedCocktail[]>([]);

  const menuMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/generate/menu-items", data);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedMenuItems(data.menuItems || []);
      toast({
        title: "Menu items generated!",
        description: `Generated ${data.menuItems?.length || 0} customized menu items`,
      });
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "Failed to generate menu items. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cocktailMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/generate/cocktails", data);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedCocktails(data.cocktails || []);
      toast({
        title: "Cocktails generated!",
        description: `Generated ${data.cocktails?.length || 0} signature cocktails`,
      });
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "Failed to generate cocktails. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateMenu = () => {
    menuMutation.mutate({
      restaurantId,
      specificRequests: menuRequests,
      dietaryRestrictions: menuDietaryRestrictions,
      targetPricePoint: menuPricePoint,
      seasonalFocus: menuSeasonalFocus,
      focusCategory: selectedCategory === "all" ? "" : selectedCategory,
      currentMenu: parsedMenuItems
    });
  };

  const handleGenerateCocktails = () => {
    cocktailMutation.mutate({
      restaurantId,
      theme: cocktailTheme,
      baseSpirits,
      complexity: cocktailComplexity,
      batchable,
      seasonality: cocktailSeasonality,
    });
  };

  const addMenuRequest = () => {
    if (newMenuRequest.trim()) {
      setMenuRequests([...menuRequests, newMenuRequest.trim()]);
      setNewMenuRequest("");
    }
  };

  // Smart menu parsing function
  const parseExistingMenu = () => {
    if (!existingMenu.trim()) {
      toast({
        title: "No menu provided",
        description: "Please paste your existing menu to analyze.",
        variant: "destructive",
      });
      return;
    }
    
    setIsAnalyzingMenu(true);
    
    try {
      const lines = existingMenu.split('\n').filter(line => line.trim());
      const categories: string[] = [];
      const items: Array<{name: string; category: string; price?: number}> = [];
      let currentCategory = "";
      
      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        // Check if line is likely a category header (all caps, contains key category words, or followed by dashes/equals)
        const isCategoryHeader = 
          trimmedLine.toUpperCase() === trimmedLine && trimmedLine.length > 2 ||
          /^[A-Z\s&-]+$/g.test(trimmedLine) && (
            /appetizer|starter|salad|soup|entree|main|pasta|pizza|dessert|beverage|drink|side/i.test(trimmedLine) ||
            trimmedLine.length < 30
          ) ||
          /^[-=]{3,}/.test(lines[lines.indexOf(line) + 1] || '');
        
        if (isCategoryHeader && !trimmedLine.includes('$') && !trimmedLine.includes('.')) {
          currentCategory = trimmedLine.charAt(0).toUpperCase() + trimmedLine.slice(1).toLowerCase();
          if (!categories.includes(currentCategory)) {
            categories.push(currentCategory);
          }
        } 
        // Check if line is a menu item (contains price indicators or formatted like an item)
        else if (trimmedLine && currentCategory) {
          const priceMatch = trimmedLine.match(/\$?(\d+\.?\d*)/);
          const price = priceMatch ? parseFloat(priceMatch[1]) : undefined;
          
          // Clean item name by removing price and common formatting
          const itemName = trimmedLine
            .replace(/\$?\d+\.?\d*\s*$/, '')
            .replace(/\.{2,}/, '')
            .replace(/\s+\.\s+/, ' ')
            .trim();
          
          if (itemName && itemName.length > 2) {
            items.push({
              name: itemName,
              category: currentCategory,
              price
            });
          }
        }
      });
      
      // Fallback: if no clear categories found, use common patterns
      if (categories.length === 0) {
        const menuText = existingMenu.toLowerCase();
        commonCategories.forEach(cat => {
          if (menuText.includes(cat.toLowerCase())) {
            categories.push(cat);
          }
        });
      }
      
      setParsedCategories(categories);
      setParsedMenuItems(items);
      
      toast({
        title: "Menu analyzed!",
        description: `Found ${categories.length} categories and ${items.length} items`,
      });
      
    } catch (error) {
      console.error('Menu parsing error:', error);
      toast({
        title: "Analysis failed",
        description: "Could not parse menu. Please check the format and try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingMenu(false);
    }
  };

  const addDietaryRestriction = () => {
    if (newDietaryRestriction.trim()) {
      setMenuDietaryRestrictions([...menuDietaryRestrictions, newDietaryRestriction.trim()]);
      setNewDietaryRestriction("");
    }
  };

  const addBaseSpirit = () => {
    if (newBaseSpirit.trim()) {
      setBaseSpirits([...baseSpirits, newBaseSpirit.trim()]);
      setNewBaseSpirit("");
    }
  };

  // Parse existing menu to extract categories and items
  const parseMenu = () => {
    if (!existingMenu.trim()) {
      toast({ title: "Please enter your existing menu first", variant: "destructive" });
      return;
    }

    setIsAnalyzingMenu(true);
    const lines = existingMenu.split('\n').filter(line => line.trim());
    const categories = new Set<string>();
    const items: Array<{name: string; category: string; price?: number}> = [];
    
    let currentCategory = "";
    
    for (const line of lines) {
      const trimmed = line.trim();
      // Detect category headers (usually capitalized, may have decorative elements)
      if (trimmed.match(/^[A-Z][A-Z\s&-]+$/) || trimmed.includes('---') || trimmed.includes('===')) {
        currentCategory = trimmed.replace(/[-=]/g, '').trim();
        if (currentCategory && !categories.has(currentCategory)) {
          categories.add(currentCategory);
        }
      }
      // Detect menu items (usually have prices or descriptive text)
      else if (trimmed.match(/\$\d+/) || (currentCategory && trimmed.length > 3)) {
        const priceMatch = trimmed.match(/\$(\d+(?:\.\d{2})?)/);
        const price = priceMatch ? parseFloat(priceMatch[1]) : undefined;
        const name = trimmed.replace(/\$\d+(?:\.\d{2})?/, '').trim();
        
        if (name && currentCategory) {
          items.push({
            name: name.split(' - ')[0].trim(), // Remove descriptions after dash
            category: currentCategory,
            price
          });
        }
      }
    }

    setParsedCategories(Array.from(categories));
    setParsedMenuItems(items);
    setIsAnalyzingMenu(false);
    
    toast({ 
      title: `Menu analyzed successfully!`, 
      description: `Found ${categories.size} categories and ${items.length} items` 
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Recipe copied to clipboard",
    });
  };

  const exportData = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Smart Menu & Cocktail Generator</h2>
        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
          AI-Powered Creation
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "menu" | "cocktails")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="menu" className="flex items-center space-x-2">
            <ChefHat className="h-4 w-4" />
            <span>Menu Items</span>
          </TabsTrigger>
          <TabsTrigger value="cocktails" className="flex items-center space-x-2">
            <Wine className="h-4 w-4" />
            <span>Cocktails</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="menu" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Menu Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Lightbulb className="h-5 w-5 text-amber-600" />
                  <span>Menu Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing Menu Analysis */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <Label className="text-base font-semibold">Existing Menu Analysis</Label>
                  <p className="text-sm text-slate-600 mb-3">Paste your current menu to analyze categories and generate targeted improvements</p>
                  <Textarea
                    placeholder="Paste your existing menu here...
APPETIZERS
---
Bruschetta - Fresh tomatoes, basil $12
Calamari Rings - Crispy fried $15

ENTREES  
---
Grilled Salmon - With vegetables $24
Ribeye Steak - 12oz premium cut $32
..."
                    value={existingMenu}
                    onChange={(e) => setExistingMenu(e.target.value)}
                    rows={6}
                    className="mb-3"
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={parseExistingMenu} 
                      disabled={isAnalyzingMenu}
                      size="sm"
                      variant="outline"
                    >
                      {isAnalyzingMenu ? "Analyzing..." : "Analyze Menu"}
                    </Button>
                    {parsedCategories.length > 0 && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        {parsedCategories.length} categories found
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-3">
                    <Label className="text-sm">Focus on Category (Optional)</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select category to focus on" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {parsedCategories.length > 0 && (
                          <>
                            {parsedCategories.map((category) => (
                              <SelectItem key={`parsed-${category}`} value={category}>
                                🎯 {category} (from your menu)
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {getAllCategories().filter(cat => !parsedCategories.includes(cat)).map((category) => (
                          <SelectItem key={`common-${category}`} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCategory && selectedCategory !== "all" && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <p className="text-xs font-medium text-blue-800 mb-1">
                          AI Focus: {selectedCategory}
                        </p>
                        <p className="text-xs text-blue-700">
                          {getCategoryFocusDescription(selectedCategory)}
                        </p>
                      </div>
                    )}
                    
                    {/* Custom Category Input */}
                    <div className="mt-2">
                      <Label className="text-xs text-slate-600">Or create custom category:</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          placeholder="e.g., Signature Dishes, Weekend Specials"
                          value={customCategory}
                          onChange={(e) => setCustomCategory(e.target.value)}
                          className="text-sm"
                        />
                        <Button 
                          onClick={() => {
                            if (customCategory.trim()) {
                              setSelectedCategory(customCategory.trim());
                              setCustomCategory("");
                            }
                          }}
                          size="sm"
                          variant="outline"
                        >
                          Use
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {parsedMenuItems.length > 0 && (
                    <div className="mt-3">
                      <p className="text-sm text-slate-600 mb-2">Current menu items analyzed:</p>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {parsedMenuItems.slice(0, 10).map((item, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {item.name} ({item.category})
                          </Badge>
                        ))}
                        {parsedMenuItems.length > 10 && (
                          <Badge variant="outline" className="text-xs">
                            +{parsedMenuItems.length - 10} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Specific Requests */}
                <div>
                  <Label>Specific Requests</Label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      placeholder="e.g., gluten-free pasta, seafood special"
                      value={newMenuRequest}
                      onChange={(e) => setNewMenuRequest(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addMenuRequest()}
                    />
                    <Button onClick={addMenuRequest} size="sm">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {menuRequests.map((request, index) => (
                      <Badge key={index} variant="outline" className="bg-blue-50">
                        {request}
                        <button
                          onClick={() => setMenuRequests(menuRequests.filter((_, i) => i !== index))}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Dietary Restrictions */}
                <div>
                  <Label>Dietary Accommodations</Label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      placeholder="e.g., vegan, keto, nut-free"
                      value={newDietaryRestriction}
                      onChange={(e) => setNewDietaryRestriction(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addDietaryRestriction()}
                    />
                    <Button onClick={addDietaryRestriction} size="sm">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {menuDietaryRestrictions.map((restriction, index) => (
                      <Badge key={index} variant="outline" className="bg-green-50">
                        {restriction}
                        <button
                          onClick={() => setMenuDietaryRestrictions(menuDietaryRestrictions.filter((_, i) => i !== index))}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Price Point */}
                <div>
                  <Label>Target Price Point</Label>
                  <Select value={menuPricePoint} onValueChange={setMenuPricePoint}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select price range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budget">Budget-Friendly ($8-15)</SelectItem>
                      <SelectItem value="mid-range">Mid-Range ($15-25)</SelectItem>
                      <SelectItem value="premium">Premium ($25+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Seasonal Focus */}
                <div>
                  <Label>Seasonal Focus</Label>
                  <Input
                    placeholder="e.g., spring vegetables, summer fruits"
                    value={menuSeasonalFocus}
                    onChange={(e) => setMenuSeasonalFocus(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleGenerateMenu} 
                  disabled={menuMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {menuMutation.isPending ? "Generating..." : "Generate Menu Items"}
                </Button>
              </CardContent>
            </Card>

            {/* Generated Menu Items */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Utensils className="h-5 w-5 text-green-600" />
                    <span>Generated Menu Items</span>
                  </CardTitle>
                  {generatedMenuItems.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportData(generatedMenuItems, 'menu-items.json')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {generatedMenuItems.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No menu items generated yet</p>
                    <p className="text-sm">Configure your preferences and generate items</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {generatedMenuItems.map((item, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-slate-900">{item.name}</h4>
                            <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                          </div>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">
                            {item.category}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span>${item.suggestedPrice}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span>{item.preparationTime}min</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-amber-600" />
                            <span>{item.profitMargin}% margin</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <Badge 
                            variant="secondary" 
                            className={
                              item.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                              item.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }
                          >
                            {item.difficulty} difficulty
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(JSON.stringify(item.recipe, null, 2))}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Recipe
                          </Button>
                        </div>

                        {item.allergens.length > 0 && (
                          <div>
                            <p className="text-xs text-slate-500 mb-1">Allergens:</p>
                            <div className="flex flex-wrap gap-1">
                              {item.allergens.map((allergen, i) => (
                                <Badge key={i} variant="outline" className="text-xs bg-red-50 text-red-700">
                                  {allergen}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cocktails" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cocktail Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wine className="h-5 w-5 text-purple-600" />
                  <span>Cocktail Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Theme */}
                <div>
                  <Label>Theme or Concept</Label>
                  <Input
                    placeholder="e.g., tropical, vintage, holiday"
                    value={cocktailTheme}
                    onChange={(e) => setCocktailTheme(e.target.value)}
                  />
                </div>

                {/* Base Spirits */}
                <div>
                  <Label>Preferred Base Spirits</Label>
                  <div className="flex space-x-2 mt-1">
                    <Input
                      placeholder="e.g., whiskey, gin, rum"
                      value={newBaseSpirit}
                      onChange={(e) => setNewBaseSpirit(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addBaseSpirit()}
                    />
                    <Button onClick={addBaseSpirit} size="sm">Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {baseSpirits.map((spirit, index) => (
                      <Badge key={index} variant="outline" className="bg-purple-50">
                        {spirit}
                        <button
                          onClick={() => setBaseSpirits(baseSpirits.filter((_, i) => i !== index))}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Complexity */}
                <div>
                  <Label>Complexity Level</Label>
                  <Select value={cocktailComplexity} onValueChange={setCocktailComplexity}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select complexity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simple (3-4 ingredients)</SelectItem>
                      <SelectItem value="moderate">Moderate (5-6 ingredients)</SelectItem>
                      <SelectItem value="advanced">Advanced (7+ ingredients)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Batchable */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="batchable"
                    checked={batchable}
                    onCheckedChange={(checked) => setBatchable(checked as boolean)}
                  />
                  <Label htmlFor="batchable">Include batch preparation methods</Label>
                </div>

                {/* Seasonality */}
                <div>
                  <Label>Seasonal Focus</Label>
                  <Input
                    placeholder="e.g., winter spices, summer fruits"
                    value={cocktailSeasonality}
                    onChange={(e) => setCocktailSeasonality(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={handleGenerateCocktails} 
                  disabled={cocktailMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {cocktailMutation.isPending ? "Generating..." : "Generate Cocktails"}
                </Button>
              </CardContent>
            </Card>

            {/* Generated Cocktails */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <Wine className="h-5 w-5 text-purple-600" />
                    <span>Generated Cocktails</span>
                  </CardTitle>
                  {generatedCocktails.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportData(generatedCocktails, 'cocktails.json')}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {generatedCocktails.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Wine className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No cocktails generated yet</p>
                    <p className="text-sm">Configure your preferences and generate cocktails</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {generatedCocktails.map((cocktail, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-slate-900">{cocktail.name}</h4>
                            <p className="text-sm text-slate-600 mt-1">{cocktail.description}</p>
                          </div>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700">
                            {cocktail.category}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span>${cocktail.suggestedPrice}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span>{cocktail.preparationTime}min</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-amber-600" />
                            <span>{cocktail.profitMargin}% margin</span>
                          </div>
                        </div>

                        <div className="text-sm">
                          <p className="font-medium text-slate-700">Glassware: {cocktail.glassware}</p>
                          <p className="font-medium text-slate-700">Garnish: {cocktail.garnish}</p>
                        </div>

                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            ${cocktail.estimatedCost.toFixed(2)} cost
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(JSON.stringify(cocktail, null, 2))}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Recipe
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}