import { useState, useRef, useEffect } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  Utensils,
  FileText,
  Eye,
  AlertCircle,
  Trash2,
  History,
  X
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';

interface MenuCocktailGeneratorProps {
  restaurantId: number;
}

// Helper function to safely format currency
const formatCurrency = (value: any): string => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  return isNaN(num) ? '$0.00' : `$${num.toFixed(2)}`;
};

// Helper function to safely format percentage
const formatPercentage = (value: any): string => {
  const num = typeof value === 'number' ? value : parseFloat(value);
  return isNaN(num) ? '0%' : `${num.toFixed(0)}%`;
};

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
  
  // Generated content state
  const [generatedMenuItems, setGeneratedMenuItems] = useState<any[]>([]);
  const [generatedCocktails, setGeneratedCocktails] = useState<any[]>([]);
  
  // Cocktail generation state
  const [cocktailTheme, setCocktailTheme] = useState("");
  const [baseSpirits, setBaseSpirits] = useState<string[]>([]);
  const [cocktailComplexity, setCocktailComplexity] = useState<string>("");
  const [batchable, setBatchable] = useState(false);
  const [cocktailSeasonality, setCocktailSeasonality] = useState("");
  const [cocktailMenuText, setCocktailMenuText] = useState("");

  // Mutations for API calls
  const menuMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/menu-items/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (data) => {
      setGeneratedMenuItems(data.items || []);
      toast({
        title: "Menu items generated!",
        description: `Generated ${data.items?.length || 0} new menu items`,
      });
    },
    onError: (error) => {
      console.error('Menu generation error:', error);
      toast({
        title: "Generation failed",
        description: "Failed to generate menu items. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cocktailMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/cocktails/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: (data) => {
      setGeneratedCocktails(data.cocktails || []);
      toast({
        title: "Cocktails generated!",
        description: `Generated ${data.cocktails?.length || 0} new cocktails`,
      });
    },
    onError: (error) => {
      console.error('Cocktail generation error:', error);
      toast({
        title: "Generation failed",
        description: "Failed to generate cocktails. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Copy to clipboard function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "Content has been copied to your clipboard.",
      });
    });
  };

  // Generate menu items
  const handleGenerateMenu = () => {
    menuMutation.mutate({
      restaurantId,
      specificRequests: menuRequests,
      dietaryRestrictions: menuDietaryRestrictions,
      targetPricePoint: menuPricePoint,
      seasonalFocus: menuSeasonalFocus,
      currentMenu: parsedMenuItems,
      focusCategory: selectedCategory !== "all" ? selectedCategory : undefined,
    });
  };

  // Generate cocktails
  const handleGenerateCocktails = () => {
    cocktailMutation.mutate({
      restaurantId,
      theme: cocktailTheme,
      baseSpirits,
      complexity: cocktailComplexity,
      batchable,
      seasonality: cocktailSeasonality,
      existingCocktails: cocktailMenuText ? cocktailMenuText.split('\n').filter(line => line.trim()) : [],
    });
  };

  const addMenuRequest = () => {
    if (newMenuRequest.trim()) {
      setMenuRequests([...menuRequests, newMenuRequest.trim()]);
      setNewMenuRequest("");
    }
  };

  const addDietaryRestriction = () => {
    if (newDietaryRestriction.trim()) {
      setMenuDietaryRestrictions([...menuDietaryRestrictions, newDietaryRestriction.trim()]);
      setNewDietaryRestriction("");
    }
  };

  // Analyze menu text function that can work with any text
  const analyzeMenuText = (menuText: string) => {
    if (!menuText || !menuText.trim()) {
      toast({
        title: "No menu provided",
        description: "Please paste your existing menu to analyze.",
        variant: "destructive",
      });
      return;
    }
    
    setIsAnalyzingMenu(true);
    
    try {
      const lines = menuText.split('\n').filter(line => line.trim());
      const categories: string[] = [];
      const items: Array<{name: string; category: string; price?: number}> = [];
      let currentCategory = "";

      lines.forEach(line => {
        const trimmedLine = line.trim();
        
        // Skip empty lines or lines with just dashes/equals
        if (!trimmedLine || /^[-=]+$/.test(trimmedLine)) {
          return;
        }
        
        // Check if this is a category header (all caps, no dollar sign, not too long)
        if (trimmedLine.length < 50 && trimmedLine.toUpperCase() === trimmedLine && !trimmedLine.includes('$')) {
          currentCategory = trimmedLine;
          if (!categories.includes(currentCategory)) {
            categories.push(currentCategory);
          }
        } else if (currentCategory && trimmedLine.includes('-')) {
          // This looks like a menu item
          const parts = trimmedLine.split('-');
          if (parts.length >= 2) {
            const name = parts[0].trim();
            const description = parts.slice(1).join('-').trim();
            
            // Try to extract price
            const priceMatch = description.match(/\$(\d+(?:\.\d{2})?)/);
            const price = priceMatch ? parseFloat(priceMatch[1]) : undefined;
            
            items.push({
              name,
              category: currentCategory,
              price
            });
          }
        }
      });

      setParsedCategories(categories);
      setParsedMenuItems(items);
      
      toast({
        title: "Menu analyzed successfully!",
        description: `Found ${categories.length} categories and ${items.length} items`,
      });
    } catch (error) {
      console.error("Menu analysis error:", error);
      toast({
        title: "Analysis failed",
        description: "Failed to analyze menu. Please check the format.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingMenu(false);
    }
  };

  // Get all categories including common ones
  const getAllCategories = () => {
    const commonCategories = [
      "APPETIZERS", "ENTREES", "MAINS", "DESSERTS", "BEVERAGES", 
      "SOUPS", "SALADS", "SANDWICHES", "PASTA", "SEAFOOD", 
      "STEAKS", "SIDES", "SPECIALS", "BREAKFAST", "LUNCH"
    ];
    return [...new Set([...parsedCategories, ...commonCategories])];
  };

  // Get category focus description
  const getCategoryFocusDescription = (category: string) => {
    const descriptions: Record<string, string> = {
      "APPETIZERS": "Generate creative starters that complement your current offerings",
      "ENTREES": "Develop signature main dishes that enhance your menu portfolio", 
      "DESSERTS": "Create memorable sweet endings to complete the dining experience",
      "BEVERAGES": "Craft unique drinks that pair well with your food menu",
      "SOUPS": "Design comforting soups using seasonal ingredients",
      "SALADS": "Develop fresh, creative salads with interesting combinations",
      "SANDWICHES": "Create innovative sandwiches and wraps",
      "PASTA": "Generate authentic and creative pasta dishes",
      "SEAFOOD": "Design fresh seafood preparations",
      "STEAKS": "Develop premium steak preparations and accompaniments",
      "SIDES": "Create complementary side dishes",
      "SPECIALS": "Generate unique seasonal or chef specials"
    };
    
    return descriptions[category] || `Generate targeted items for the ${category} category`;
  };

  // Export menu items to PDF
  const exportMenuItemsToPDF = (items: any[]) => {
    const doc = new jsPDF();
    let yPosition = 20;
    
    doc.setFontSize(18);
    doc.text('Generated Menu Items', 20, yPosition);
    yPosition += 20;
    
    items.forEach((item, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.text(`${index + 1}. ${item.name}`, 20, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.text(`Category: ${item.category}`, 25, yPosition);
      yPosition += 6;
      doc.text(`Price: ${formatCurrency(item.suggestedPrice)}`, 25, yPosition);
      yPosition += 6;
      doc.text(`Description: ${item.description}`, 25, yPosition);
      yPosition += 10;
    });
    
    doc.save('generated-menu-items.pdf');
  };

  // Export cocktails to PDF
  const exportCocktailsToPDF = (cocktails: any[]) => {
    const doc = new jsPDF();
    let yPosition = 20;
    
    doc.setFontSize(18);
    doc.text('Generated Cocktails', 20, yPosition);
    yPosition += 20;
    
    cocktails.forEach((cocktail, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.text(`${index + 1}. ${cocktail.name}`, 20, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.text(`Category: ${cocktail.category}`, 25, yPosition);
      yPosition += 6;
      doc.text(`Price: ${formatCurrency(cocktail.suggestedPrice)}`, 25, yPosition);
      yPosition += 6;
      doc.text(`Description: ${cocktail.description}`, 25, yPosition);
      yPosition += 10;
    });
    
    doc.save('generated-cocktails.pdf');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">Menu & Cocktail Generator</h1>
          <p className="text-slate-600">AI-powered menu development and cocktail creation</p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "menu" | "cocktails")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="menu" className="flex items-center space-x-2">
              <Utensils className="h-4 w-4" />
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
                    <Label className="text-base font-semibold">Current Menu Analysis</Label>
                    <p className="text-sm text-slate-600 mb-4">
                      Paste your existing menu to help the AI understand what you currently offer and generate strategic additions that complement your current items.
                    </p>
                    
                    <div className="space-y-3">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h4 className="text-sm font-medium text-blue-800 mb-2">💡 Tips for best results:</h4>
                        <ul className="text-xs text-blue-700 space-y-1">
                          <li>• <strong>Include categories:</strong> APPETIZERS, ENTREES, DESSERTS, etc.</li>
                          <li>• <strong>Show structure:</strong> Use dashes, prices, and descriptions</li>
                          <li>• <strong>Be complete:</strong> Include as many current items as possible</li>
                          <li>• <strong>Add details:</strong> Ingredients, cooking methods help AI understand your style</li>
                        </ul>
                      </div>
                      
                      <Textarea
                        placeholder="Example format:

APPETIZERS
-----------
Bruschetta - Fresh Roma tomatoes, basil, garlic on toasted baguette - $12
Calamari Rings - Crispy fried with marinara and lemon aioli - $15
Spinach Artichoke Dip - Creamy blend with tortilla chips - $11

ENTREES
-------
Grilled Atlantic Salmon - Herb-crusted with seasonal vegetables - $24  
Ribeye Steak - 12oz prime cut with garlic mashed potatoes - $32
Chicken Parmesan - Breaded cutlet with pasta marinara - $19

DESSERTS
--------
Tiramisu - Classic Italian with espresso and mascarpone - $8
Chocolate Lava Cake - Warm cake with vanilla ice cream - $9

(Copy this format and replace with your actual menu items)"
                        value={existingMenu}
                        onChange={(e) => setExistingMenu(e.target.value)}
                        rows={10}
                        className="mb-3 text-sm"
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => analyzeMenuText(existingMenu)} 
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
              <Card className="flex flex-col h-full">
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
                        onClick={() => exportMenuItemsToPDF(generatedMenuItems)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {generatedMenuItems.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 flex-1 flex flex-col justify-center">
                      <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No menu items generated yet</p>
                      <p className="text-sm">Configure your preferences and generate items</p>
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1 overflow-y-auto">
                      {generatedMenuItems.map((item, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between flex-wrap gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-900 break-words">{item.name}</h4>
                              <p className="text-sm text-slate-600 mt-1 break-words">{item.description}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                {item.category}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span>{formatCurrency(item.suggestedPrice)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4 text-blue-600" />
                              <span>{item.preparationTime}min</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 text-amber-600" />
                              <span>{formatPercentage(item.profitMargin)} margin</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between flex-wrap gap-2">
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
                              onClick={() => copyToClipboard(JSON.stringify(item.recipe || {}, null, 2))}
                              className="shrink-0"
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
                  {/* Existing Cocktail Menu */}
                  <div>
                    <Label>Current Cocktail Menu (Optional)</Label>
                    <Textarea
                      placeholder="Paste your existing cocktail menu here...
Old Fashioned - Bourbon, sugar, bitters
Mojito - White rum, mint, lime
Margarita - Tequila, lime, triple sec"
                      value={cocktailMenuText}
                      onChange={(e) => setCocktailMenuText(e.target.value)}
                      rows={4}
                    />
                  </div>

                  {/* Cocktail Theme */}
                  <div>
                    <Label>Theme/Style</Label>
                    <Input
                      placeholder="e.g., tropical, classic, modern, tiki"
                      value={cocktailTheme}
                      onChange={(e) => setCocktailTheme(e.target.value)}
                    />
                  </div>

                  {/* Base Spirits */}
                  <div>
                    <Label>Preferred Base Spirits</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {['Vodka', 'Gin', 'Rum', 'Whiskey', 'Tequila', 'Bourbon'].map((spirit) => (
                        <div key={spirit} className="flex items-center space-x-2">
                          <Checkbox
                            id={spirit}
                            checked={baseSpirits.includes(spirit)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setBaseSpirits([...baseSpirits, spirit]);
                              } else {
                                setBaseSpirits(baseSpirits.filter(s => s !== spirit));
                              }
                            }}
                          />
                          <Label htmlFor={spirit} className="text-sm">{spirit}</Label>
                        </div>
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

                  {/* Batch Production */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="batchable"
                      checked={batchable}
                      onCheckedChange={setBatchable}
                    />
                    <Label htmlFor="batchable">Include batch-friendly cocktails</Label>
                  </div>

                  {/* Seasonality */}
                  <div>
                    <Label>Seasonal Focus</Label>
                    <Input
                      placeholder="e.g., summer refreshing, winter warming"
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
              <Card className="flex flex-col h-full">
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
                        onClick={() => exportCocktailsToPDF(generatedCocktails)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  {generatedCocktails.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 flex-1 flex flex-col justify-center">
                      <Wine className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No cocktails generated yet</p>
                      <p className="text-sm">Configure your preferences and generate cocktails</p>
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1 overflow-y-auto">
                      {generatedCocktails.map((cocktail, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between flex-wrap gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-900 break-words">{cocktail.name}</h4>
                              <p className="text-sm text-slate-600 mt-1 break-words">{cocktail.description}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                {cocktail.category}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-4 w-4 text-green-600" />
                              <span>{formatCurrency(cocktail.suggestedPrice)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4 text-blue-600" />
                              <span>{cocktail.preparationTime}min</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 text-amber-600" />
                              <span>{formatPercentage(cocktail.profitMargin)} margin</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="text-xs text-slate-600">
                              Glass: {cocktail.glassware}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(JSON.stringify(cocktail, null, 2))}
                              className="shrink-0"
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
    </div>
  );
}