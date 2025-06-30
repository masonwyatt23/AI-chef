import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  Upload,
  FileText,
  Eye,
  AlertCircle,
  Trash2,
  History
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import type { SavedMenu } from "@shared/schema";

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
  return isNaN(num) ? '0.0%' : `${num.toFixed(1)}%`;
};

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

  // Fetch saved menus
  const { data: savedMenus = [], refetch: refetchSavedMenus } = useQuery<SavedMenu[]>({
    queryKey: [`/api/restaurants/${restaurantId}/saved-menus`],
  });

  // Save menu mutation
  const saveMenuMutation = useMutation({
    mutationFn: async (menuData: { name: string; menuText: string; menuType: string }) => {
      return await apiRequest("POST", '/api/saved-menus', {
        restaurantId,
        name: menuData.name,
        menuText: menuData.menuText,
        menuType: menuData.menuType,
      });
    },
    onSuccess: () => {
      refetchSavedMenus();
      setIsSavingMenu(false);
      setShowSaveDialog(false);
      setSaveMenuName("");
      toast({
        title: "Menu saved successfully",
        description: "Your menu has been saved and can be loaded later",
      });
    },
    onError: () => {
      setIsSavingMenu(false);
      toast({
        title: "Error saving menu",
        description: "Failed to save menu. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete saved menu mutation
  const deleteMenuMutation = useMutation({
    mutationFn: async (menuId: number) => {
      return await apiRequest("DELETE", `/api/saved-menus/${menuId}`);
    },
    onSuccess: () => {
      refetchSavedMenus();
      toast({
        title: "Menu deleted",
        description: "Saved menu has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error deleting menu",
        description: "Failed to delete menu. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Menu generation state
  const [menuRequests, setMenuRequests] = useState<string[]>([]);
  const [menuDietaryRestrictions, setMenuDietaryRestrictions] = useState<string[]>([]);
  const [menuPricePoint, setMenuPricePoint] = useState<string>("");
  const [menuSeasonalFocus, setMenuSeasonalFocus] = useState("");
  const [newMenuRequest, setNewMenuRequest] = useState("");
  const [newDietaryRestriction, setNewDietaryRestriction] = useState("");
  const [batchProduction, setBatchProduction] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  
  // Enhanced menu parsing and category-specific generation
  const [existingMenu, setExistingMenu] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [parsedCategories, setParsedCategories] = useState<string[]>([]);
  const [parsedMenuItems, setParsedMenuItems] = useState<Array<{name: string; category: string; price?: number}>>([]);
  const [isAnalyzingMenu, setIsAnalyzingMenu] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  
  // PDF upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cocktailMenuText, setCocktailMenuText] = useState("");
  
  // Saved menu state
  const [saveMenuName, setSaveMenuName] = useState("");
  const [isSavingMenu, setIsSavingMenu] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  
  // Database-backed recipe history queries
  const { data: menuHistoryData = [] } = useQuery<any[]>({
    queryKey: [`/api/restaurants/${restaurantId}/menu-history`],
    retry: false,
  });

  const { data: cocktailHistoryData = [] } = useQuery<any[]>({
    queryKey: [`/api/restaurants/${restaurantId}/cocktail-history`],
    retry: false,
  });

  // Extract item data from database records
  const menuHistory = menuHistoryData.map((record: any) => record.itemData);
  const cocktailHistory = cocktailHistoryData.map((record: any) => record.cocktailData);
  
  // Enhanced category options with common restaurant categories
  const commonCategories = [
    "Appetizers", "Starters", "Small Plates", "Shareables",
    "Salads", "Soups", "Entrees", "Main Courses", "Mains",
    "Pasta", "Pizza", "Burgers", "Sandwiches", "Wraps", "Sandwiches & Lite Bites",
    "Seafood", "Seafood and Fish", "Steaks", "Steaks, Ribs and Chicken", "Chicken", "Pork", "Beef", "Ribs", "Vegetarian", "Vegan",
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

  // Database mutations for recipe history
  const addMenuItemMutation = useMutation({
    mutationFn: async (itemData: GeneratedMenuItem) => {
      return apiRequest("POST", `/api/restaurants/${restaurantId}/menu-history`, { itemData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${restaurantId}/menu-history`] });
    },
  });

  const addCocktailMutation = useMutation({
    mutationFn: async (cocktailData: GeneratedCocktail) => {
      return apiRequest("POST", `/api/restaurants/${restaurantId}/cocktail-history`, { cocktailData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${restaurantId}/cocktail-history`] });
    },
  });

  const clearMenuHistoryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/restaurants/${restaurantId}/menu-history`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${restaurantId}/menu-history`] });
    },
  });

  const clearCocktailHistoryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/restaurants/${restaurantId}/cocktail-history`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${restaurantId}/cocktail-history`] });
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return apiRequest("DELETE", `/api/restaurants/${restaurantId}/menu-history/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${restaurantId}/menu-history`] });
    },
  });

  const deleteCocktailMutation = useMutation({
    mutationFn: async (itemId: number) => {
      return apiRequest("DELETE", `/api/restaurants/${restaurantId}/cocktail-history/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${restaurantId}/cocktail-history`] });
    },
  });

  const menuMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/generate/menu-items", data);
      return response.json();
    },
    onSuccess: (data) => {
      const newItems = data.menuItems || [];
      setGeneratedMenuItems(newItems);
      // Add new items to database history
      newItems.forEach((item: GeneratedMenuItem) => {
        addMenuItemMutation.mutate(item);
      });
      toast({
        title: "Menu items generated!",
        description: `Generated ${newItems.length} customized menu items`,
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
      const newCocktails = data.cocktails || [];
      setGeneratedCocktails(newCocktails);
      // Add new cocktails to database history
      newCocktails.forEach((cocktail: GeneratedCocktail) => {
        addCocktailMutation.mutate(cocktail);
      });
      toast({
        title: "Cocktails generated!",
        description: `Generated ${newCocktails.length} signature cocktails`,
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
      currentMenu: parsedMenuItems,
      batchProduction,
      batchSize
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
      existingCocktails: cocktailMenuText ? cocktailMenuText.split('\n').filter(line => line.trim()) : [],
    });
  };

  const addMenuRequest = () => {
    if (newMenuRequest.trim()) {
      setMenuRequests([...menuRequests, newMenuRequest.trim()]);
      setNewMenuRequest("");
    }
  };

  // Handle PDF upload
  const handlePdfUpload = async (file: File) => {
    if (!file.type.includes('pdf')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('menuPdf', file);

    try {
      const response = await fetch('/api/parse-menu-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      if (result.text && result.text.trim()) {
        setExistingMenu(result.text);
        toast({
          title: "PDF uploaded successfully",
          description: `Extracted text from ${result.filename}`,
        });
        
        // Auto-analyze the extracted text after state update
        setTimeout(() => {
          // Call the analysis function directly with the extracted text
          analyzeMenuText(result.text);
        }, 100);
      } else {
        toast({
          title: "PDF uploaded",
          description: result.message || "PDF uploaded but no text extracted yet",
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      handlePdfUpload(file);
    }
  };

  // Handle cocktail PDF upload
  const handleCocktailPdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('menuPdf', file);

    try {
      const response = await fetch('/api/parse-menu-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      if (result.text) {
        setCocktailMenuText(result.text);
        toast({
          title: "Drink menu uploaded successfully",
          description: `Extracted text from ${result.filename}`,
        });
      } else {
        toast({
          title: "PDF uploaded",
          description: result.message || "PDF uploaded but no text extracted yet",
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (event.target) {
        event.target.value = '';
      }
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
      

      
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        // Skip empty lines
        if (!trimmedLine) return;
        
        // Check if line is likely a category header
        const isAllCaps = trimmedLine.toUpperCase() === trimmedLine && trimmedLine.length > 2;
        const isAlphaOnly = /^[A-Za-z\s&-]+$/.test(trimmedLine);
        const hasNoPrice = !trimmedLine.includes('$') && !/\d+\s*$/.test(trimmedLine);
        const isCategoryWord = /^(appetizer|starter|salad|soup|entree|main|pasta|pizza|dessert|beverage|drink|side|steak|rib|chicken|seafood|fish|sandwich|lite bite|steaks,?\s*ribs\s*(and|&)?\s*chicken|sandwiches\s*&\s*lite\s*bites)s?$/i.test(trimmedLine);
        const isShortLine = trimmedLine.length < 40;
        const nextLineIsDashes = /^[-=]{3,}/.test(lines[index + 1] || '');
        
        // Check for simple depot-style categories (single words like "Appetizers", "Salads")
        const isSimpleCategory = /^[A-Za-z\s&]+$/.test(trimmedLine) && 
                                 trimmedLine.length < 30 && 
                                 hasNoPrice && 
                                 (isCategoryWord || /^(appetizers|salads|sandwiches|pasta|seafood|fish|entrees|mains|sides|desserts|beverages|drinks)$/i.test(trimmedLine));
        
        const isCategoryHeader = 
          hasNoPrice && (
            (isAllCaps && isShortLine) ||
            (isAlphaOnly && (isCategoryWord || isShortLine)) ||
            nextLineIsDashes ||
            isSimpleCategory
          );
        
        if (isCategoryHeader) {
          // Clean up category name
          currentCategory = trimmedLine
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          if (!categories.includes(currentCategory)) {
            categories.push(currentCategory);
          }
        } 
        // Check if line is a menu item
        else if (trimmedLine && currentCategory) {
          // Look for price patterns at the end of the line - handle both $X.XX and just X formats
          const priceMatch = trimmedLine.match(/(?:\$?(\d+(?:\.\d{2})?)|(\d+))\s*$/);
          const price = priceMatch ? parseFloat(priceMatch[1] || priceMatch[2]) : undefined;
          
          // Clean item name by removing price and common formatting
          let itemName = trimmedLine
            .replace(/\s+\d+(?:\.\d{2})?\s*$/, '') // Remove trailing price (like "16" or "12.99")
            .replace(/\$\d+(?:\.\d{2})?/g, '') // Remove any $ prices
            .replace(/\.{2,}/g, '') // Remove dotted lines
            .replace(/\s+\.\s+/g, ' ') // Remove spaced dots
            .trim();
          
          // Split on first occurrence of descriptive text (usually after the name)
          const parts = itemName.split(/\s+(?=with|served|topped|crispy|batter|slow|char|pan|grilled|fried|sautéed|mixed)/i);
          if (parts.length > 1) {
            itemName = parts[0].trim();
          }
          
          if (itemName && itemName.length > 2 && !itemName.match(/^\d+$/)) {
            const item = {
              name: itemName,
              category: currentCategory,
              price
            };
            items.push(item);
          }
        }
      });
      
      // Fallback: if no clear categories found, use common patterns
      if (categories.length === 0) {
        const menuTextLower = menuText.toLowerCase();
        commonCategories.forEach(cat => {
          if (menuTextLower.includes(cat.toLowerCase())) {
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

  // Load Depot menu data
  const loadDepotMenu = () => {
    // Clear previous parsed data first
    setParsedCategories([]);
    setParsedMenuItems([]);
    
    const depotMenuText = `Appetizers
Wings buffalo, BBQ, bourbon or dry rub 16
Batter-Fried Mushrooms with ranch and horseradish sauce 12
Crispy Fried Oysters with cocktail sauce 15
Cheese Fries crispy bacon, melted blue cheese and queso with ranch for dipping 12
Hot Crab Dip flavorful crab with fresh garlic and a blend of seasonings folded into cream cheese served with crackers 15
Chips and Queso 8
Loaded Flat Beds crispy potato skins with BBQ, bacon and cheese served with sour cream 12
Spinach Artichoke Dip served with tortilla chips 10
House-Made Crab Bisque 8 cup/10 bowl

Salads
DPO Tender Salad batter-fried tenders with shredded cheddar, crumbled bacon and tomatoes 14
Cobb Salad grilled chicken with bacon, shredded cheese, blue cheese crumbles, tomatoes, cucumbers and hardboiled egg 16
Grilled Steak Salad mixed greens with tomatoes, mushrooms, blue cheese crumbles, red onion, applewood smoked bacon and herb croutons 16
Toosday Chicken Salad mixed greens, Granny Smith apples, candied pecans, feta cheese and mesquite grilled chicken with poppyseed dressing 14

Sandwiches & Lite Bites
Classic Burger char-grilled on a Brioche bun with lettuce and tomato 14
Bacon/Cheddar Burger 15
Mushroom/Swiss Burger 15
French Dip slow-roasted shaved prime rib with melted mozzarella on a hoagie roll served with au jus 13
DPO Chicken Sandwich grilled chicken breast with bacon, BBQ and melted mozzarella on a brioche bun 12
Lump Crabcake Sandwich on a Brioche bun with lettuce, tomato and remoulade 17
Chicken Tender Wrap (traditional or buffalo) flour tortilla with lettuce, tomato, cheddar and red onion 11
Bourbon Salmon BLT on toasted whole wheat with lettuce, tomato and Applewood Smoked bacon 18
Club On Wheat smoked turkey, honey ham, Swiss cheese, applewood smoked bacon, lettuce, tomato and mayo on thick sliced, toasted whole wheat 13
Our Famous Chicken Tenders batter-dipped and crispy fried 13
Fried Oysters plump select oysters golden fried and served with cocktail sauce 16

Pasta
Chicken Tender Parmesan crispy chicken tenders over penne pasta tossed with house-made marinara topped with melted mozzarella and parmesan 18
Fettuccini Middlebrook sautéed shrimp, bacon and broccoli tossed with alfredo sauce and topped with grilled chicken 24
Chessie's Veggie Pasta sauteed mushrooms, sweet corn, diced tomatoes, broccoli and capers with fresh garlic and basil then tossed with penne pasta 15

Seafood and Fish
Fish 'n Chips batter dipped, crispy fried fish served with tartar sauce 19
Lump Crab Cakes pan seared and served with remoulade 29
Fried Shrimp crispy, batter fried jumbo shrimp 24
Fried Oyster Platter plump select oysters golden fried and served with cocktail sauce 24
Bourbon Glazed Atlantic Salmon 24

Steaks, Ribs and Chicken
Hand-Cut Ribeye premium beef, well marbled 32
Center Cut Sirloin char-grilled to order 22
Marinated Steak Medallions char-grilled and sliced to order 22
Slow Roasted Baby Back Ribs dry rubbed with our signature spices or finished with Sweet Baby Ray's BBQ sauce 1/2 rack 19 whole rack 26
Our Famous Chicken Tenders batter-dipped and crispy fried 18
Smothered Chicken char-grilled chicken breast with bacon, sautéed mushrooms and melted mozzarella 16
Prime Rib Au Jus (limited quantities available) served after 5pm Friday, all day Saturday-Sunday 9 ounce 22 14 ounce 28

Sides
Crispy Fries, Baked Potato, Steamed Broccoli, Sautéed Mushrooms, Country Style Green Beans 4
Applesauce or Coleslaw 3`;

    setExistingMenu(depotMenuText);
    toast({
      title: "Depot menu loaded",
      description: "Menu content has been loaded for analysis",
    });
    
    // Auto-analyze the menu text
    setTimeout(() => {
      analyzeMenuText(depotMenuText);
    }, 100);
  };

  // Load Junction Catering menu data
  const loadJunctionMenu = () => {
    // Clear previous parsed data first
    setParsedCategories([]);
    setParsedMenuItems([]);
    
    const junctionCateringMenuText = `THE JUNCTION CATERING MENU

Food & Beverage Service
Selection of pre-ordered appetizers due two weeks before the event
Full bar service available
All drinks are billed per order; guests will be charged only for what is consumed
Our full bar features a selection of beer, wine, cocktails, and non-alcoholic options
Custom drink selection is available upon request
Separate checks can be provided for all alcohol purchases upon request

APPETIZERS

Crudité with house-made ranch - $1.50 per person
Fresh fruit tray - $1.75 per person
Cheese & fruit tray with crackers - $2.50 per person
Mini crab cakes with house remoulade - $3.00 per piece
Fried Virginia oysters with house cocktail sauce - Market Price
Hot crab dip with crackers - $3.00 per person
Spinach artichoke dip with tortilla chips - $2.50 per person
Smoked salmon dip with bagel chips - $2.75 per person
DPO chicken tenders with dipping sauce - $2.25 per piece
Pulled pork or smoked brisket sliders - $4.00 per piece

DESSERTS

Brownie bite - 30 pieces | $30.00
Lemon bars - 20 pieces | $35.00
Assorted cheesecake bites - 21 pieces | $32.00

CATERING DETAILS

Private Event Package:
- Room rental for 3 hours: $350
- Each additional hour: $100
- Private use of The Junction
- Bartender & service staff included
- House sound system for background music
- Cleaning included
- Existing setup included

Capacity: 55 people maximum
Availability: Tuesday & Wednesday 11am-9:30pm, Friday-Sunday 11am-4pm
Deposit: $100 required to confirm booking (applied to final bill)
Final payment due at conclusion of event
Cancellation policy: Seven days in advance for full refund
State & local sales tax: 12.3% (subject to change)
Gratuity not included`;

    setExistingMenu(junctionCateringMenuText);
    toast({
      title: "Junction Catering menu loaded",
      description: "Catering menu content has been loaded for analysis",
    });
    
    // Auto-analyze the menu text
    setTimeout(() => {
      analyzeMenuText(junctionCateringMenuText);
    }, 100);
  };

  // Load Junction cocktail menu data
  const loadJunctionCocktailMenu = () => {
    const junctionCocktailText = `Cocktails
Cherry Bourbon Smash Makers Mark Kentucky Bourbon Whisky | tart cherry juice | sour 12
Junction Old Fashion Whisky | Maraschino liqueur | orange bitters | Luxardo cherries Maker's Mark 13 Copper Fox Chestnut American Whisky 17
Blackberry Lemonade Margarita Teremana Blanco Tequilla | blackberry syrup | lemonade | sour | sugar rim 11
Strawberry Ginger Moscow Mule Tito's handmade vodka | strawberry ginger syrup | ginger beer 12
Espresso Martini Tito's handmade vodka | cold brew | cream 12
Raspberry Sour Tito's | strawberry | raspberry puree | sour | Sprite 12

Mocktails
Tart Cherry Temple Tart cherry syrup and sprite
The Mermaid Pineapple Pineapple, sour, blue curacao syrup and a splash of soda
Strawberry Ginger Mule strawberry ginger syrup and ginger beer in a copper mug

Wine
WHITE
Ant Moore Sauvignon Blanc (New Zealand) Elegant and refreshing with lemon sorbet and lime zest, revealing hints of dried pineapple, toasted herbs and sea salt 12/35
Highway 12 Chardonnay (CA) The nose presents tropical hints of charred pineapples and bright citrus. The fruit and floral notes are balanced by light acidity and a rich toasty vanilla oak warmth 11/32
Cavazza Pinot Grigio (Italy) hints of almond tree flowers and golden apple with a citrus aftertaste 9/29

RED
Serena Sweet Red (Italy) Aromas of rose and an accent of rhubarb-strawberry pie. On the palate the wine has raspberry and cherry flavors 11/32
Trumpeter Malbec (Argentina) The palate features zippy cherry and red plum fruit, while the finish is dry, properly oaky and smooth. The acid-driven fruit successfully fights through any overt wood or tannins 10/32
Frey Organic Pinot Noir (CA) Flavors of cassis and black cherry are balanced by a spicy herbal finish 40
Trumpeter Cabernet Sauvignon (Argentina) An intense ruby red wine with juicy berry aromas. It has flavors of blackberry and red currant, with hints of vanilla, cocoa and sweet oak on the finish 10/32

BUBBLES
Bricco Riella Moscato D'Asti (Italy) Aromatic and charming with candied citrus, peach and honeysuckle, creamy bubbles, ripe tropical notes and hints of lemon drops 9/30
Zardetto Prosecco (Italy) Fresh and fragrant on the palate with flavors of citrus, apples, orange blossoms and stone fruits supported by creamy bubbles 27

Beer
Benchtop Brewing Proven Theory IPA (Norfolk, VA) 7.0% Brewed with Citra and Mosaic hops
The Veil Brewing Thrown IPA (Richmond, VA) 6.3% 60 IBU West Coast Style
Triple Crossing Falcon Smash IPA (Richmond, VA) 7% This flagship IPA delivers on balanced hop and yeast character of brighter citrus, orange pine marmalade, and stone fruit cohesion
Hi-Wire Brewing Double Hi-Pitch IPA (Asheville, NC) 9% 65 IBU Classic West coast hops
Alesmith Brewing Speedway Stout (San Diego, CA) 12% Imperial Stout with coffee
Smuttynose Old Brown Dog (Hampton, NH) 6.5% 30 IBU American Brown Ale
Virginia Beer Co. Saving Daylight Citrus Wheat (Williamsburg, VA) 5% Citrusy sweet Orange peels packed into this American Wheat ale
Bingo Beer Company Lager (Richmond, VA) 4.8% German style lager
1911 Cherry Pie Cider (East Boston, MA) 6.9% Premium small batch cider- 4 out of 6 sweetness
Bold Rock Vodka Bay Crush (Nellysford, VA) 7.5% Real vodka with pineapple and cranberry
Cutwater Tequila Paloma (San Diego, CA) 7% Real Tequila with refreshing grapefruit soda
Cutwater Whiskey Mule (San Diego, CA) 7% ginger beer, a hint of lime and aromatic bitters with Cutwater award winning bourbon`;

    setCocktailMenuText(junctionCocktailText);
    toast({
      title: "Junction drink menu loaded",
      description: "Cocktail and drink menu content has been loaded",
    });
  };

  // Save current menu functions
  const handleSaveMenu = () => {
    if (!existingMenu.trim()) {
      toast({
        title: "No menu to save",
        description: "Please paste or load a menu first",
        variant: "destructive",
      });
      return;
    }
    setShowSaveDialog(true);
  };

  const handleSaveCocktailMenu = () => {
    if (!cocktailMenuText.trim()) {
      toast({
        title: "No cocktail menu to save",
        description: "Please paste or load a cocktail menu first",
        variant: "destructive",
      });
      return;
    }
    setShowSaveDialog(true);
  };

  const confirmSaveMenu = () => {
    if (!saveMenuName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your saved menu",
        variant: "destructive",
      });
      return;
    }

    const menuText = activeTab === "menu" ? existingMenu : cocktailMenuText;
    const menuType = activeTab === "menu" ? "food" : "cocktail";

    setIsSavingMenu(true);
    saveMenuMutation.mutate({
      name: saveMenuName,
      menuText,
      menuType,
    });
  };

  const loadSavedMenu = (savedMenu: SavedMenu) => {
    if (savedMenu.menuType === "food") {
      setExistingMenu(savedMenu.menuText);
      setActiveTab("menu");
      // Auto-analyze the menu text
      setTimeout(() => {
        analyzeMenuText(savedMenu.menuText);
      }, 100);
    } else {
      setCocktailMenuText(savedMenu.menuText);
      setActiveTab("cocktails");
    }
    
    toast({
      title: "Menu loaded",
      description: `${savedMenu.name} has been loaded successfully`,
    });
  };
  
  const deleteSavedMenu = (menuId: number, menuName: string) => {
    if (confirm(`Are you sure you want to delete "${menuName}"?`)) {
      deleteMenuMutation.mutate(menuId);
    }
  };

  // History management functions
  const deleteMenuItemFromHistory = (indexToDelete: number) => {
    const historyRecord = (menuHistoryData as any[])[indexToDelete];
    if (historyRecord?.id) {
      deleteMenuItemMutation.mutate(historyRecord.id);
    }
  };

  const deleteCocktailFromHistory = (indexToDelete: number) => {
    const historyRecord = (cocktailHistoryData as any[])[indexToDelete];
    if (historyRecord?.id) {
      deleteCocktailMutation.mutate(historyRecord.id);
    }
  };

  const clearMenuHistory = () => {
    clearMenuHistoryMutation.mutate();
  };

  const clearCocktailHistory = () => {
    clearCocktailHistoryMutation.mutate();
  };

  const clearAllHistory = () => {
    clearMenuHistoryMutation.mutate();
    clearCocktailHistoryMutation.mutate();
    toast({
      title: "History cleared",
      description: "All recipe history has been removed",
    });
  };



  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Recipe copied to clipboard",
    });
  };

  const exportCocktailsToPDF = (cocktails: GeneratedCocktail[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = margin;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Cocktail Recipe Collection', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    cocktails.forEach((cocktail, index) => {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = margin;
      }

      // Cocktail Name
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(cocktail.name, margin, yPosition);
      yPosition += 8;

      // Category and pricing info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Category: ${cocktail.category} | Price: ${formatCurrency(cocktail.suggestedPrice)} | Prep: ${cocktail.preparationTime}min`, margin, yPosition);
      yPosition += 6;

      // Description
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      const splitDescription = doc.splitTextToSize(cocktail.description || '', pageWidth - (margin * 2));
      doc.text(splitDescription, margin, yPosition);
      yPosition += (splitDescription.length * 4) + 5;

      // Ingredients
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Ingredients:', margin, yPosition);
      yPosition += 5;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      (cocktail.ingredients || []).forEach((ingredient) => {
        const ingredientText = `• ${ingredient.ingredient} - ${ingredient.amount} (${formatCurrency(ingredient.cost)})`;
        doc.text(ingredientText, margin + 5, yPosition);
        yPosition += 4;
      });
      yPosition += 3;

      // Instructions
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Instructions:', margin, yPosition);
      yPosition += 5;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const instructions = Array.isArray(cocktail.instructions) ? cocktail.instructions : [];
      instructions.forEach((instruction, i) => {
        const instructionText = `${i + 1}. ${instruction}`;
        const splitInstruction = doc.splitTextToSize(instructionText, pageWidth - (margin * 2) - 10);
        doc.text(splitInstruction, margin + 5, yPosition);
        yPosition += (splitInstruction.length * 4) + 2;
      });

      // Cost Analysis
      yPosition += 3;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Cost Analysis:', margin, yPosition);
      yPosition += 4;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Cost: ${formatCurrency(cocktail.estimatedCost)} | Price: ${formatCurrency(cocktail.suggestedPrice)} | Profit: ${typeof cocktail.profitMargin === 'number' ? cocktail.profitMargin.toFixed(0) : '0'}%`, margin + 5, yPosition);
      yPosition += 6;

      // Glassware and Garnish
      doc.text(`Glassware: ${cocktail.glassware} | Garnish: ${cocktail.garnish}`, margin + 5, yPosition);
      yPosition += 10;

      // Add separator line between cocktails
      if (index < cocktails.length - 1) {
        doc.setLineWidth(0.1);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 8;
      }
    });

    // Save the PDF
    doc.save(`cocktail-recipes-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportMenuItemsToPDF = (items: GeneratedMenuItem[]) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPosition = margin;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Menu Item Collection', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    items.forEach((item, index) => {
      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = margin;
      }

      // Item Name
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(item.name, margin, yPosition);
      yPosition += 8;

      // Category and pricing info
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Category: ${item.category} | Price: ${formatCurrency(item.suggestedPrice)} | Prep: ${item.preparationTime}min | Difficulty: ${item.difficulty}`, margin, yPosition);
      yPosition += 6;

      // Description
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      const splitDescription = doc.splitTextToSize(item.description || '', pageWidth - (margin * 2));
      doc.text(splitDescription, margin, yPosition);
      yPosition += (splitDescription.length * 4) + 5;

      // Ingredients
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Ingredients:', margin, yPosition);
      yPosition += 5;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      (item.ingredients || []).forEach((ingredient) => {
        doc.text(`• ${ingredient}`, margin + 5, yPosition);
        yPosition += 4;
      });
      yPosition += 5;

      // Cost Analysis
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Cost Analysis:', margin, yPosition);
      yPosition += 4;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Cost: ${formatCurrency(item.estimatedCost)} | Price: ${formatCurrency(item.suggestedPrice)} | Profit: ${typeof item.profitMargin === 'number' ? item.profitMargin.toFixed(0) : '0'}%`, margin + 5, yPosition);
      yPosition += 10;

      // Add separator line between items
      if (index < items.length - 1) {
        doc.setLineWidth(0.1);
        doc.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 8;
      }
    });

    // Save the PDF
    doc.save(`menu-items-${new Date().toISOString().split('T')[0]}.pdf`);
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
                  <p className="text-sm text-slate-600 mb-3">Upload a PDF menu or paste your current menu text to analyze categories and generate targeted improvements</p>
                  


                  {/* Saved Menus */}
                  <div className="mb-4 p-3 border rounded-lg bg-white">
                    <div className="flex justify-between items-center mb-2">
                      <Label className="text-sm font-medium">Your Saved Menus</Label>
                      <Button
                        onClick={handleSaveMenu}
                        size="sm"
                        variant="outline"
                        disabled={!existingMenu.trim()}
                        className="flex items-center"
                      >
                        <History className="h-4 w-4 mr-1" />
                        Save Current
                      </Button>
                    </div>
                    
                    {savedMenus.filter(menu => menu.menuType === 'food').length === 0 ? (
                      <p className="text-sm text-gray-500 italic">No saved food menus yet</p>
                    ) : (
                      <div className="space-y-2">
                        {savedMenus.filter(menu => menu.menuType === 'food').map((menu) => (
                          <div key={menu.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{menu.name}</p>
                              <p className="text-xs text-gray-500">
                                Saved {new Date(menu.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                onClick={() => loadSavedMenu(menu)}
                                size="sm"
                                variant="outline"
                                className="flex items-center"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Load
                              </Button>
                              <Button
                                onClick={() => deleteSavedMenu(menu.id, menu.name)}
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center text-sm text-gray-500 mb-3">or paste your own</div>
                  
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

                {/* Batch Production */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <div className="flex items-center space-x-2 mb-3">
                    <Checkbox
                      id="batch-production"
                      checked={batchProduction}
                      onCheckedChange={(checked) => setBatchProduction(checked as boolean)}
                    />
                    <Label htmlFor="batch-production" className="font-semibold">Include batch production instructions</Label>
                  </div>
                  
                  {batchProduction && (
                    <div>
                      <Label>Batch Size (servings)</Label>
                      <Select value={batchSize.toString()} onValueChange={(value) => setBatchSize(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select batch size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 servings</SelectItem>
                          <SelectItem value="20">20 servings</SelectItem>
                          <SelectItem value="50">50 servings</SelectItem>
                          <SelectItem value="100">100 servings</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-slate-600 mt-1">
                        Generate scaled recipes and batch preparation instructions for volume production
                      </p>
                    </div>
                  )}
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
                      <Dialog key={index}>
                        <DialogTrigger asChild>
                          <div className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between flex-wrap gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-slate-900 break-words">{item.name}</h4>
                                <p className="text-sm text-slate-600 mt-1 break-words">{item.description}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                  {item.category}
                                </Badge>
                                <Eye className="h-4 w-4 text-slate-400" />
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-4 text-sm">
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(JSON.stringify(item.recipe || {}, null, 2));
                                }}
                                className="shrink-0"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Recipe
                              </Button>
                            </div>

                            {item.allergens && item.allergens.length > 0 && (
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
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                              <Utensils className="h-6 w-6 text-green-600" />
                              {item.name}
                            </DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-6">
                            {/* Header Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                              <div className="text-center">
                                <div className="flex items-center justify-center space-x-1 text-green-600 font-semibold">
                                  <DollarSign className="h-5 w-5" />
                                  <span>${item.suggestedPrice}</span>
                                </div>
                                <p className="text-xs text-slate-500">Suggested Price</p>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center space-x-1 text-blue-600 font-semibold">
                                  <Clock className="h-5 w-5" />
                                  <span>{item.preparationTime} min</span>
                                </div>
                                <p className="text-xs text-slate-500">Prep Time</p>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center space-x-1 text-amber-600 font-semibold">
                                  <Star className="h-5 w-5" />
                                  <span>{item.profitMargin}%</span>
                                </div>
                                <p className="text-xs text-slate-500">Profit Margin</p>
                              </div>
                            </div>

                            {/* Description */}
                            <div>
                              <h3 className="font-semibold text-lg mb-2">Description</h3>
                              <p className="text-slate-700">{item.description}</p>
                            </div>

                            {/* Financial Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 border rounded-lg">
                                <h4 className="font-semibold text-green-600 mb-2">Cost Analysis</h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span>Estimated Cost:</span>
                                    <span>${item.estimatedCost}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Suggested Price:</span>
                                    <span>${item.suggestedPrice}</span>
                                  </div>
                                  <div className="flex justify-between font-semibold">
                                    <span>Profit Margin:</span>
                                    <span>{item.profitMargin}%</span>
                                  </div>
                                </div>
                              </div>
                              <div className="p-4 border rounded-lg">
                                <h4 className="font-semibold text-purple-600 mb-2">Details</h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span>Category:</span>
                                    <Badge variant="outline">{item.category}</Badge>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Difficulty:</span>
                                    <Badge 
                                      variant="secondary" 
                                      className={
                                        item.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                                        item.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-red-100 text-red-700'
                                      }
                                    >
                                      {item.difficulty}
                                    </Badge>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Serves:</span>
                                    <span>{item.recipe?.serves || 1} portions</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Ingredients */}
                            <div>
                              <h3 className="font-semibold text-lg mb-3">Ingredients</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {(item.ingredients || []).map((ingredient, i) => (
                                  <div key={i} className="flex items-center p-2 bg-slate-50 rounded">
                                    <span className="text-sm">{ingredient}</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Recipe Instructions */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              <div>
                                <h4 className="font-semibold text-blue-600 mb-3">Preparation</h4>
                                <ol className="space-y-2 text-sm">
                                  {(item.recipe?.prepInstructions || []).map((step, i) => (
                                    <li key={i} className="flex">
                                      <span className="font-semibold text-blue-600 mr-2">{i + 1}.</span>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-orange-600 mb-3">Cooking</h4>
                                <ol className="space-y-2 text-sm">
                                  {(item.recipe?.cookingInstructions || []).map((step, i) => (
                                    <li key={i} className="flex">
                                      <span className="font-semibold text-orange-600 mr-2">{i + 1}.</span>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-purple-600 mb-3">Plating</h4>
                                <ol className="space-y-2 text-sm">
                                  {(item.recipe?.platingInstructions || []).map((step, i) => (
                                    <li key={i} className="flex">
                                      <span className="font-semibold text-purple-600 mr-2">{i + 1}.</span>
                                      <span>{step}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                            </div>

                            {/* Techniques & Additional Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-semibold mb-3">Cooking Techniques</h4>
                                <div className="flex flex-wrap gap-2">
                                  {(item.recipe?.techniques || []).map((technique, i) => (
                                    <Badge key={i} variant="outline" className="bg-blue-50">
                                      {technique}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              
                              {item.allergens && item.allergens.length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                    Allergens
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {item.allergens.map((allergen, i) => (
                                      <Badge key={i} variant="outline" className="bg-red-50 text-red-700">
                                        {allergen}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Wine Pairings & Upsells */}
                            {(item.winePairings && item.winePairings.length > 0) && (
                              <div>
                                <h4 className="font-semibold mb-3">Wine Pairings</h4>
                                <div className="flex flex-wrap gap-2">
                                  {item.winePairings.map((wine, i) => (
                                    <Badge key={i} variant="outline" className="bg-purple-50">
                                      {wine}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {(item.upsellOpportunities && item.upsellOpportunities.length > 0) && (
                              <div>
                                <h4 className="font-semibold mb-3">Upsell Opportunities</h4>
                                <div className="space-y-2">
                                  {item.upsellOpportunities.map((upsell, i) => (
                                    <div key={i} className="p-2 bg-green-50 rounded text-sm">
                                      {upsell}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex justify-end space-x-2 pt-4 border-t">
                              <Button
                                variant="outline"
                                onClick={() => copyToClipboard(JSON.stringify(item.recipe || {}, null, 2))}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Recipe
                              </Button>
                              <Button
                                onClick={() => exportMenuItemsToPDF([item])}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Export as PDF
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
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


                {/* Saved Cocktail Menus */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Your Saved Cocktail Menus</Label>
                    <Button
                      onClick={handleSaveCocktailMenu}
                      size="sm"
                      variant="outline"
                      disabled={!cocktailMenuText.trim()}
                      className="flex items-center"
                    >
                      <History className="h-4 w-4 mr-1" />
                      Save Current
                    </Button>
                  </div>
                  
                  {savedMenus.filter(menu => menu.menuType === 'cocktail').length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No saved cocktail menus yet</p>
                  ) : (
                    <div className="space-y-2">
                      {savedMenus.filter(menu => menu.menuType === 'cocktail').map((menu) => (
                        <div key={menu.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{menu.name}</p>
                            <p className="text-xs text-gray-500">
                              Saved {new Date(menu.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              onClick={() => loadSavedMenu(menu)}
                              size="sm"
                              variant="outline"
                              className="flex items-center"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Load
                            </Button>
                            <Button
                              onClick={() => deleteSavedMenu(menu.id, menu.name)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {cocktailMenuText && (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-700 mb-2 font-medium">✓ Drink menu loaded successfully</p>
                      <details className="text-sm">
                        <summary className="cursor-pointer text-green-600 hover:text-green-800">
                          View loaded menu text
                        </summary>
                        <div className="mt-2 p-2 bg-white border rounded text-xs max-h-32 overflow-y-auto whitespace-pre-wrap">
                          {cocktailMenuText}
                        </div>
                      </details>
                    </div>
                  )}
                </div>

                <div className="text-center text-sm text-gray-500 mb-3">or paste your own</div>
                
                {/* Drink Menu Text Input */}
                <div className="border rounded-lg p-4 bg-slate-50">
                  <Label className="text-base font-semibold">Existing Drink Menu Analysis</Label>
                  <p className="text-sm text-slate-600 mb-3">Paste your current drink menu text to analyze and generate complementary cocktails</p>
                  
                  <Textarea
                    placeholder="Paste your existing drink menu here...
COCKTAILS
---
Old Fashioned - Whiskey, bitters, sugar $12
Margarita - Tequila, lime, triple sec $10

WINE
---
Chardonnay - California $8/28
Cabernet - Napa Valley $12/42
..."
                    value={cocktailMenuText}
                    onChange={(e) => setCocktailMenuText(e.target.value)}
                    rows={6}
                    className="mb-3"
                  />
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        // You can add analysis logic here later if needed
                        if (cocktailMenuText.trim()) {
                          toast({
                            title: "Menu loaded",
                            description: "Drink menu text has been loaded for analysis",
                          });
                        }
                      }} 
                      disabled={!cocktailMenuText.trim()}
                      size="sm"
                      variant="outline"
                    >
                      Load Menu Text
                    </Button>
                    {cocktailMenuText && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700">
                        Menu text loaded
                      </Badge>
                    )}
                  </div>
                </div>

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
                      <Dialog key={index}>
                        <DialogTrigger asChild>
                          <div className="border rounded-lg p-4 space-y-3 cursor-pointer hover:bg-slate-50 transition-colors">
                            <div className="flex items-start justify-between flex-wrap gap-2">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-slate-900 break-words">{cocktail.name}</h4>
                                <p className="text-sm text-slate-600 mt-1 break-words">{cocktail.description}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className="bg-purple-50 text-purple-700">
                                  {cocktail.category}
                                </Badge>
                                <Eye className="h-4 w-4 text-slate-400" />
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
                                <span>{typeof cocktail.profitMargin === 'number' ? cocktail.profitMargin.toFixed(0) : '0'}% margin</span>
                              </div>
                            </div>

                            <div className="text-sm flex flex-wrap gap-4">
                              <p className="font-medium text-slate-700">Glassware: {cocktail.glassware}</p>
                              <p className="font-medium text-slate-700">Garnish: {cocktail.garnish}</p>
                            </div>

                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                {formatCurrency(cocktail.estimatedCost)} cost
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(JSON.stringify(cocktail, null, 2));
                                }}
                                className="shrink-0"
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Recipe
                              </Button>
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby={`cocktail-description-${index}`}>
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-xl">
                              <Wine className="h-6 w-6 text-purple-600" />
                              {cocktail.name}
                            </DialogTitle>
                          </DialogHeader>
                          
                          <div className="space-y-6">
                            {/* Header Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
                              <div className="text-center">
                                <div className="flex items-center justify-center space-x-1 text-green-600 font-semibold">
                                  <DollarSign className="h-5 w-5" />
                                  <span>{formatCurrency(cocktail.suggestedPrice)}</span>
                                </div>
                                <p className="text-xs text-slate-500">Suggested Price</p>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center space-x-1 text-blue-600 font-semibold">
                                  <Clock className="h-5 w-5" />
                                  <span>{cocktail.preparationTime} min</span>
                                </div>
                                <p className="text-xs text-slate-500">Prep Time</p>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center space-x-1 text-amber-600 font-semibold">
                                  <Star className="h-5 w-5" />
                                  <span>{typeof cocktail.profitMargin === 'number' ? cocktail.profitMargin.toFixed(0) : '0'}%</span>
                                </div>
                                <p className="text-xs text-slate-500">Profit Margin</p>
                              </div>
                            </div>

                            {/* Description */}
                            <div>
                              <h3 className="font-semibold text-lg mb-2">Description</h3>
                              <p id={`cocktail-description-${index}`} className="text-slate-700">{cocktail.description}</p>
                            </div>

                            {/* Financial Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-4 border rounded-lg">
                                <h4 className="font-semibold text-green-600 mb-2">Cost Analysis</h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span>Estimated Cost:</span>
                                    <span>{formatCurrency(cocktail.estimatedCost)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Suggested Price:</span>
                                    <span>{formatCurrency(cocktail.suggestedPrice)}</span>
                                  </div>
                                  <div className="flex justify-between font-semibold">
                                    <span>Profit Margin:</span>
                                    <span>{typeof cocktail.profitMargin === 'number' ? cocktail.profitMargin.toFixed(0) : '0'}%</span>
                                  </div>
                                </div>
                              </div>
                              <div className="p-4 border rounded-lg">
                                <h4 className="font-semibold text-purple-600 mb-2">Details</h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex justify-between">
                                    <span>Category:</span>
                                    <Badge variant="outline">{cocktail.category}</Badge>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Glassware:</span>
                                    <span>{cocktail.glassware}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Garnish:</span>
                                    <span>{cocktail.garnish}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Ingredients */}
                            <div>
                              <h3 className="font-semibold text-lg mb-3">Ingredients</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(cocktail.ingredients || []).map((ingredient, i) => (
                                  <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded">
                                    <span className="font-medium">{ingredient.ingredient}</span>
                                    <div className="text-right text-sm">
                                      <div>{ingredient.amount}</div>
                                      <div className="text-slate-500">{formatCurrency(ingredient.cost)}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Instructions */}
                            <div>
                              <h3 className="font-semibold text-lg mb-3">Instructions</h3>
                              <ol className="space-y-2">
                                {(Array.isArray(cocktail.instructions) ? cocktail.instructions : []).map((step, i) => (
                                  <li key={i} className="flex">
                                    <span className="font-semibold text-purple-600 mr-3 mt-1">{i + 1}.</span>
                                    <span className="text-sm leading-relaxed">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>

                            {/* Variations & Food Pairings */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {(Array.isArray(cocktail.variations) && cocktail.variations.length > 0) && (
                                <div>
                                  <h4 className="font-semibold mb-3">Variations</h4>
                                  <div className="space-y-3">
                                    {cocktail.variations.map((variation, i) => (
                                      <div key={i} className="p-3 border rounded-lg">
                                        <h5 className="font-medium text-purple-600">{variation.name}</h5>
                                        <ul className="text-sm mt-1 space-y-1">
                                          {(Array.isArray(variation.changes) ? variation.changes : []).map((change, j) => (
                                            <li key={j} className="text-slate-600">• {change}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {(Array.isArray(cocktail.foodPairings) && cocktail.foodPairings.length > 0) && (
                                <div>
                                  <h4 className="font-semibold mb-3">Food Pairings</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {cocktail.foodPairings.map((pairing, i) => (
                                      <Badge key={i} variant="outline" className="bg-orange-50">
                                        {pairing}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Batch Instructions */}
                            {(Array.isArray(cocktail.batchInstructions) && cocktail.batchInstructions.length > 0) && (
                              <div>
                                <h4 className="font-semibold mb-3">Batch Preparation</h4>
                                <div className="bg-blue-50 p-4 rounded-lg">
                                  <ol className="space-y-2">
                                    {cocktail.batchInstructions.map((instruction, i) => (
                                      <li key={i} className="flex">
                                        <span className="font-semibold text-blue-600 mr-3">{i + 1}.</span>
                                        <span className="text-sm">{instruction}</span>
                                      </li>
                                    ))}
                                  </ol>
                                </div>
                              </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex justify-end space-x-2 pt-4 border-t">
                              <Button
                                variant="outline"
                                onClick={() => copyToClipboard(Array.isArray(cocktail.instructions) ? cocktail.instructions.join('\n') : cocktail.instructions || '')}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Instructions
                              </Button>
                              <Button
                                onClick={() => exportCocktailsToPDF([cocktail])}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Export as PDF
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recipe History Section */}
      {(menuHistory.length > 0 || cocktailHistory.length > 0) && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recipe History
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Previously generated items you can reference
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearAllHistory}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All History
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="menu-history" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="menu-history" className="flex items-center gap-2">
                    <Utensils className="h-4 w-4" />
                    Menu Items ({menuHistory.length})
                  </TabsTrigger>
                  <TabsTrigger value="cocktail-history" className="flex items-center gap-2">
                    <Wine className="h-4 w-4" />
                    Cocktails ({cocktailHistory.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="menu-history" className="space-y-4">
                  {menuHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No menu items in history yet
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          {menuHistory.length} menu items saved
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={clearMenuHistory}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Clear All
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {menuHistory.map((item, index) => (
                          <Card key={index} className="relative">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{item.name}</CardTitle>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteMenuItemFromHistory(index)}
                                  className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <Badge variant="secondary">{item.category}</Badge>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {item.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {item.preparationTime}min
                                </span>
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ${item.suggestedPrice}
                                </span>
                              </div>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="w-full">
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                      <Utensils className="h-5 w-5" />
                                      {item.name}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    {/* Same detailed view as current generated items */}
                                    <div>
                                      <h4 className="font-semibold mb-2">Description</h4>
                                      <p className="text-sm">{item.description}</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <h4 className="font-semibold mb-2">Category</h4>
                                        <Badge variant="outline">{item.category}</Badge>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold mb-2">Difficulty</h4>
                                        <Badge variant={item.difficulty === "easy" ? "default" : item.difficulty === "medium" ? "secondary" : "destructive"}>
                                          {item.difficulty}
                                        </Badge>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-4">
                                      <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-1">
                                          <Clock className="h-4 w-4" />
                                          Prep Time
                                        </h4>
                                        <p className="text-sm">{item.preparationTime} minutes</p>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-1">
                                          <DollarSign className="h-4 w-4" />
                                          Cost
                                        </h4>
                                        <p className="text-sm">{formatCurrency(item.estimatedCost)}</p>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-1">
                                          <Star className="h-4 w-4" />
                                          Price
                                        </h4>
                                        <p className="text-sm">{formatCurrency(item.suggestedPrice)}</p>
                                      </div>
                                    </div>
                                    
                                    {item.ingredients && item.ingredients.length > 0 && (
                                      <div>
                                        <h4 className="font-semibold mb-2">Ingredients</h4>
                                        <ul className="text-sm space-y-1">
                                          {item.ingredients.map((ingredient, idx) => (
                                            <li key={idx} className="flex items-center gap-2">
                                              <div className="w-2 h-2 bg-primary rounded-full" />
                                              {ingredient}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="cocktail-history" className="space-y-4">
                  {cocktailHistory.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No cocktails in history yet
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          {cocktailHistory.length} cocktails saved
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={clearCocktailHistory}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Clear All
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {cocktailHistory.map((cocktail, index) => (
                          <Card key={index} className="relative">
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{cocktail.name}</CardTitle>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteCocktailFromHistory(index)}
                                  className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <Badge variant="secondary">{cocktail.category}</Badge>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {cocktail.description}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {cocktail.preparationTime}min
                                </span>
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ${cocktail.suggestedPrice}
                                </span>
                              </div>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="w-full">
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                      <Wine className="h-5 w-5" />
                                      {cocktail.name}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-semibold mb-2">Description</h4>
                                      <p className="text-sm">{cocktail.description}</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <h4 className="font-semibold mb-2">Category</h4>
                                        <Badge variant="outline">{cocktail.category}</Badge>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold mb-2">Glassware</h4>
                                        <p className="text-sm">{cocktail.glassware}</p>
                                      </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-4">
                                      <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-1">
                                          <Clock className="h-4 w-4" />
                                          Prep Time
                                        </h4>
                                        <p className="text-sm">{cocktail.preparationTime} minutes</p>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-1">
                                          <DollarSign className="h-4 w-4" />
                                          Cost
                                        </h4>
                                        <p className="text-sm">{formatCurrency(cocktail.estimatedCost)}</p>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold mb-2 flex items-center gap-1">
                                          <Star className="h-4 w-4" />
                                          Price
                                        </h4>
                                        <p className="text-sm">{formatCurrency(cocktail.suggestedPrice)}</p>
                                      </div>
                                    </div>
                                    
                                    {cocktail.ingredients && cocktail.ingredients.length > 0 && (
                                      <div>
                                        <h4 className="font-semibold mb-2">Ingredients</h4>
                                        <ul className="text-sm space-y-1">
                                          {cocktail.ingredients.map((ingredient, idx) => (
                                            <li key={idx} className="flex items-center gap-2">
                                              <div className="w-2 h-2 bg-primary rounded-full" />
                                              {typeof ingredient === 'string' ? ingredient : `${ingredient.ingredient} - ${ingredient.amount}`}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    
                                    {Array.isArray(cocktail.instructions) && cocktail.instructions.length > 0 && (
                                      <div>
                                        <h4 className="font-semibold mb-2">Instructions</h4>
                                        <ol className="text-sm space-y-1">
                                          {cocktail.instructions.map((instruction, idx) => (
                                            <li key={idx} className="flex gap-2">
                                              <span className="text-primary font-medium">{idx + 1}.</span>
                                              {instruction}
                                            </li>
                                          ))}
                                        </ol>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Save Menu Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Menu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="menu-name">Menu Name</Label>
              <Input
                id="menu-name"
                placeholder="Enter a name for this menu"
                value={saveMenuName}
                onChange={(e) => setSaveMenuName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && confirmSaveMenu()}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmSaveMenu}
                disabled={isSavingMenu || !saveMenuName.trim()}
              >
                {isSavingMenu ? "Saving..." : "Save Menu"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}