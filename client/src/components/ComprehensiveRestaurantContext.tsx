import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Edit, Building, MapPin, ChefHat, Users, Target, AlertCircle, Utensils, Palette, TrendingUp, Wine, Menu, Plus, X } from "lucide-react";
import type { Restaurant, InsertRestaurant } from "@shared/schema";

interface ComprehensiveRestaurantContextProps {
  restaurant: Restaurant;
  restaurantId: number;
}

// Helper function to create array field handler
const createArrayFieldHandler = (field: any, currentValues: string[]) => ({
  addValue: (value: string) => {
    if (!currentValues.includes(value)) {
      field.onChange([...currentValues, value]);
    }
  },
  removeValue: (value: string) => {
    field.onChange(currentValues.filter(v => v !== value));
  },
  toggleValue: (value: string) => {
    if (currentValues.includes(value)) {
      field.onChange(currentValues.filter(v => v !== value));
    } else {
      field.onChange([...currentValues, value]);
    }
  }
});

// Multi-select field component
const MultiSelectField = ({ field, options, placeholder }: { field: any, options: { value: string, label: string }[], placeholder: string }) => {
  const currentValues = field.value || [];
  const handler = createArrayFieldHandler(field, currentValues);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {currentValues.map((value: string) => (
          <Badge key={value} variant="secondary" className="cursor-pointer" onClick={() => handler.removeValue(value)}>
            {options.find(opt => opt.value === value)?.label || value} ×
          </Badge>
        ))}
      </div>
      <Select onValueChange={handler.addValue}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.filter(opt => !currentValues.includes(opt.value)).map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// Category Selector Component
const CategorySelector = ({ field }: { field: any }) => {
  const [newCategory, setNewCategory] = useState("");
  const categories = field.value || [];
  
  const commonCategories = [
    "Appetizers", "Salads", "Soups", "Entrees", "Steaks", "Seafood", 
    "Chicken", "Pasta", "Pizza", "Burgers", "Sandwiches", "Wraps",
    "Desserts", "Beverages", "Wine", "Beer", "Cocktails", "Sides",
    "Vegetarian", "Vegan", "Gluten-Free", "Kids Menu", "Specials",
    "Breakfast", "Brunch", "Lunch", "Dinner", "Late Night"
  ];
  
  const addCategory = (category: string) => {
    if (category && !categories.includes(category)) {
      field.onChange([...categories, category]);
    }
  };
  
  const removeCategory = (category: string) => {
    field.onChange(categories.filter((c: string) => c !== category));
  };
  
  const handleAddCustom = () => {
    if (newCategory.trim()) {
      addCategory(newCategory.trim());
      setNewCategory("");
    }
  };
  
  return (
    <div className="space-y-3">
      {/* Selected Categories */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categories.map((category: string) => (
            <Badge key={category} variant="secondary" className="flex items-center gap-1">
              {category}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-red-500" 
                onClick={() => removeCategory(category)}
              />
            </Badge>
          ))}
        </div>
      )}
      
      {/* Common Categories */}
      <div>
        <p className="text-sm text-slate-600 mb-2">Common Categories:</p>
        <div className="flex flex-wrap gap-2">
          {commonCategories
            .filter(cat => !categories.includes(cat))
            .map((category) => (
              <Button
                key={category}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addCategory(category)}
                className="h-8 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                {category}
              </Button>
            ))}
        </div>
      </div>
      
      {/* Custom Category Input */}
      <div className="flex gap-2">
        <Input
          placeholder="Add custom category..."
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustom())}
          className="flex-1"
        />
        <Button 
          type="button" 
          onClick={handleAddCustom}
          disabled={!newCategory.trim()}
          size="sm"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// Helper function to convert null values to proper defaults
const cleanRestaurantData = (restaurant: Restaurant): InsertRestaurant => ({
  name: restaurant.name || "",
  theme: restaurant.theme || "",
  categories: restaurant.categories || [],
  kitchenCapability: restaurant.kitchenCapability || "intermediate",
  staffSize: restaurant.staffSize || 5,
  additionalContext: restaurant.additionalContext || "",
  
  // Business Context
  establishmentType: restaurant.establishmentType || "",
  serviceStyle: restaurant.serviceStyle || "",
  targetDemographic: restaurant.targetDemographic || "",
  averageTicketPrice: restaurant.averageTicketPrice || 0,
  diningCapacity: restaurant.diningCapacity || 0,
  operatingHours: restaurant.operatingHours || "",
  
  // Location & Market
  location: restaurant.location || "",
  marketType: restaurant.marketType || "",
  localIngredients: restaurant.localIngredients || [],
  culturalInfluences: restaurant.culturalInfluences || [],
  
  // Kitchen & Operations
  kitchenSize: restaurant.kitchenSize || "",
  kitchenEquipment: restaurant.kitchenEquipment || [],
  prepSpace: restaurant.prepSpace || "",
  storageCapacity: restaurant.storageCapacity || "",
  deliveryCapability: restaurant.deliveryCapability || false,
  
  // Staff & Skills
  chefExperience: restaurant.chefExperience || "",
  staffSkillLevel: restaurant.staffSkillLevel || "",
  specializedRoles: restaurant.specializedRoles || [],
  laborBudget: restaurant.laborBudget || "",
  
  // Menu & Business Goals
  currentMenuSize: restaurant.currentMenuSize || 0,
  menuChangeFrequency: restaurant.menuChangeFrequency || "",
  profitMarginGoals: restaurant.profitMarginGoals || 0,
  foodCostGoals: restaurant.foodCostGoals || 0,
  specialDietaryNeeds: restaurant.specialDietaryNeeds || [],
  
  // Competition & Positioning
  primaryCompetitors: restaurant.primaryCompetitors || [],
  uniqueSellingPoints: restaurant.uniqueSellingPoints || [],
  pricePosition: restaurant.pricePosition || "",
  
  // Challenges & Priorities
  currentChallenges: restaurant.currentChallenges || [],
  businessPriorities: restaurant.businessPriorities || [],
  seasonalConsiderations: restaurant.seasonalConsiderations || ""
});

export function ComprehensiveRestaurantContext({ restaurant, restaurantId }: ComprehensiveRestaurantContextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<InsertRestaurant>({
    defaultValues: cleanRestaurantData(restaurant)
  });

  // Reset form values when restaurant data changes
  useEffect(() => {
    if (restaurant) {
      form.reset(cleanRestaurantData(restaurant));
    }
  }, [restaurant, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: InsertRestaurant) => {
      const response = await fetch(`/api/restaurants/${restaurantId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Update failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${restaurantId}`] });
      toast({ title: "Restaurant context updated successfully" });
      setIsEditing(false);
    },
    onError: () => {
      toast({ title: "Failed to update restaurant context", variant: "destructive" });
    }
  });

  const quickActionMutation = useMutation({
    mutationFn: async (action: string) => {
      // Implementation for quick actions
      return { action };
    },
    onSuccess: () => {
      toast({ title: "Quick action completed" });
    }
  });

  const onSubmit = (data: InsertRestaurant) => {
    console.log('Submitting restaurant data:', data);
    
    // Transform array fields that might come as strings from textareas
    const transformedData = {
      ...data,
      categories: Array.isArray(data.categories) ? data.categories :
        (typeof data.categories === 'string' ? data.categories.split('\n').filter(Boolean) : []),
      localIngredients: Array.isArray(data.localIngredients) ? data.localIngredients : 
        (typeof data.localIngredients === 'string' ? data.localIngredients.split('\n').filter(Boolean) : []),
      culturalInfluences: Array.isArray(data.culturalInfluences) ? data.culturalInfluences :
        (typeof data.culturalInfluences === 'string' ? data.culturalInfluences.split('\n').filter(Boolean) : []),
      kitchenEquipment: Array.isArray(data.kitchenEquipment) ? data.kitchenEquipment :
        (typeof data.kitchenEquipment === 'string' ? data.kitchenEquipment.split('\n').filter(Boolean) : []),
      specializedRoles: Array.isArray(data.specializedRoles) ? data.specializedRoles :
        (typeof data.specializedRoles === 'string' ? data.specializedRoles.split('\n').filter(Boolean) : []),
      specialDietaryNeeds: Array.isArray(data.specialDietaryNeeds) ? data.specialDietaryNeeds :
        (typeof data.specialDietaryNeeds === 'string' ? data.specialDietaryNeeds.split('\n').filter(Boolean) : []),
      primaryCompetitors: Array.isArray(data.primaryCompetitors) ? data.primaryCompetitors :
        (typeof data.primaryCompetitors === 'string' ? data.primaryCompetitors.split('\n').filter(Boolean) : []),
      uniqueSellingPoints: Array.isArray(data.uniqueSellingPoints) ? data.uniqueSellingPoints :
        (typeof data.uniqueSellingPoints === 'string' ? data.uniqueSellingPoints.split('\n').filter(Boolean) : []),
      currentChallenges: Array.isArray(data.currentChallenges) ? data.currentChallenges :
        (typeof data.currentChallenges === 'string' ? data.currentChallenges.split('\n').filter(Boolean) : []),
      businessPriorities: Array.isArray(data.businessPriorities) ? data.businessPriorities :
        (typeof data.businessPriorities === 'string' ? data.businessPriorities.split('\n').filter(Boolean) : []),
    };
    
    console.log('Transformed data:', transformedData);
    updateMutation.mutate(transformedData);
  };

  const handleQuickAction = (action: string) => {
    quickActionMutation.mutate(action);
  };

  // Options for multi-select fields
  const establishmentTypes = [
    { value: "restaurant", label: "Restaurant" },
    { value: "cafe", label: "Cafe" },
    { value: "bar", label: "Bar" },
    { value: "food_truck", label: "Food Truck" },
    { value: "catering", label: "Catering" },
    { value: "bakery", label: "Bakery" }
  ];

  const dietaryNeeds = [
    { value: "vegan", label: "Vegan" },
    { value: "vegetarian", label: "Vegetarian" },
    { value: "gluten_free", label: "Gluten-Free" },
    { value: "keto", label: "Keto" },
    { value: "dairy_free", label: "Dairy-Free" },
    { value: "nut_free", label: "Nut-Free" },
    { value: "halal", label: "Halal" },
    { value: "kosher", label: "Kosher" }
  ];

  const kitchenEquipmentOptions = [
    { value: "wood_fire_oven", label: "Wood Fire Oven" },
    { value: "grill", label: "Grill" },
    { value: "fryer", label: "Fryer" },
    { value: "smoker", label: "Smoker" },
    { value: "pizza_oven", label: "Pizza Oven" },
    { value: "sous_vide", label: "Sous Vide" },
    { value: "steamer", label: "Steamer" },
    { value: "wok", label: "Wok Station" },
    { value: "plancha", label: "Plancha" },
    { value: "rotisserie", label: "Rotisserie" }
  ];

;

  const challengesOptions = [
    { value: "high_food_costs", label: "High Food Costs" },
    { value: "staff_turnover", label: "Staff Turnover" },
    { value: "inconsistent_quality", label: "Inconsistent Quality" },
    { value: "slow_service", label: "Slow Service" },
    { value: "limited_storage", label: "Limited Storage" },
    { value: "seasonal_variations", label: "Seasonal Variations" },
    { value: "competition", label: "Strong Competition" },
    { value: "customer_acquisition", label: "Customer Acquisition" }
  ];

  const prioritiesOptions = [
    { value: "increase_profit", label: "Increase Profit Margins" },
    { value: "expand_menu", label: "Expand Menu" },
    { value: "improve_efficiency", label: "Improve Kitchen Efficiency" },
    { value: "reduce_waste", label: "Reduce Food Waste" },
    { value: "enhance_quality", label: "Enhance Food Quality" },
    { value: "build_brand", label: "Build Brand Recognition" },
    { value: "expand_delivery", label: "Expand Delivery" },
    { value: "train_staff", label: "Train Staff" }
  ];

  return (
    <div className="space-y-6">
      {/* Restaurant Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Comprehensive Restaurant Profile</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="basic" className="flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      Basic
                    </TabsTrigger>
                    <TabsTrigger value="location" className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Location
                    </TabsTrigger>
                    <TabsTrigger value="kitchen" className="flex items-center gap-1">
                      <ChefHat className="h-3 w-3" />
                      Kitchen
                    </TabsTrigger>
                    <TabsTrigger value="staff" className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      Staff
                    </TabsTrigger>
                    <TabsTrigger value="business" className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Business
                    </TabsTrigger>
                    <TabsTrigger value="challenges" className="flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Challenges
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 mt-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Restaurant Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="theme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Theme & Concept</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} placeholder="Describe your restaurant's theme, atmosphere, and culinary concept..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="categories"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Menu Categories</FormLabel>
                          <FormControl>
                            <CategorySelector field={field} />
                          </FormControl>
                          <FormDescription>
                            Select common categories or add your own custom categories. These will be used for targeted menu generation.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="establishmentType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Establishment Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {establishmentTypes.map(type => (
                                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="serviceStyle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Service Style</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select style..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="fine_dining">Fine Dining</SelectItem>
                                <SelectItem value="casual">Casual Dining</SelectItem>
                                <SelectItem value="fast_casual">Fast Casual</SelectItem>
                                <SelectItem value="counter_service">Counter Service</SelectItem>
                                <SelectItem value="family_style">Family Style</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="averageTicketPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Average Ticket ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="diningCapacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dining Capacity</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="operatingHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Operating Hours</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., 11am-10pm daily" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="location" className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="City, neighborhood, or area" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="marketType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Market Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select market..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="urban">Urban</SelectItem>
                                <SelectItem value="suburban">Suburban</SelectItem>
                                <SelectItem value="rural">Rural</SelectItem>
                                <SelectItem value="tourist">Tourist Area</SelectItem>
                                <SelectItem value="business_district">Business District</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="targetDemographic"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Demographic</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., families with children, young professionals, tourists" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="localIngredients"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Local Ingredients & Specialties</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} placeholder="List local ingredients, seasonal specialties, regional products..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="culturalInfluences"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cultural Influences</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} placeholder="Cuisine styles, cultural influences, cooking traditions..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="kitchen" className="space-y-4 mt-6">
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="kitchenCapability"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kitchen Capability Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="basic">Basic - Simple prep only</SelectItem>
                                <SelectItem value="intermediate">Intermediate - Standard equipment</SelectItem>
                                <SelectItem value="advanced">Advanced - Full culinary equipment</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="kitchenSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kitchen Size</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select size..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="small">Small</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="large">Large</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="prepSpace"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Prep Space</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select space..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="limited">Limited</SelectItem>
                                <SelectItem value="adequate">Adequate</SelectItem>
                                <SelectItem value="spacious">Spacious</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="kitchenEquipment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Available Kitchen Equipment</FormLabel>
                          <FormControl>
                            <MultiSelectField 
                              field={field} 
                              options={kitchenEquipmentOptions} 
                              placeholder="Select equipment..." 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="storageCapacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Storage Capacity</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select capacity..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="limited">Limited</SelectItem>
                                <SelectItem value="reach_in">Reach-in Coolers</SelectItem>
                                <SelectItem value="walk_in">Walk-in Coolers</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deliveryCapability"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>
                                Delivery Capability
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="staff" className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="staffSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Staff Size</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="chefExperience"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Chef Experience Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select experience..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                                <SelectItem value="experienced">Experienced (3-7 years)</SelectItem>
                                <SelectItem value="senior">Senior (8-15 years)</SelectItem>
                                <SelectItem value="executive">Executive (15+ years)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="staffSkillLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Overall Staff Skill Level</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select skill level..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="entry">Entry Level</SelectItem>
                                <SelectItem value="experienced">Experienced</SelectItem>
                                <SelectItem value="professional">Professional</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="laborBudget"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Labor Budget</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select budget..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="tight">Tight</SelectItem>
                                <SelectItem value="moderate">Moderate</SelectItem>
                                <SelectItem value="flexible">Flexible</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="specializedRoles"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Specialized Staff Roles</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} placeholder="e.g., sommelier, pastry chef, bartender, sous chef..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="business" className="space-y-4 mt-6">
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="currentMenuSize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Menu Size</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                placeholder="Number of items"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="profitMarginGoals"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Profit Margin Goal (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                placeholder="Target %"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="foodCostGoals"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Food Cost Goal (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                placeholder="Target %"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="menuChangeFrequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Menu Change Frequency</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="How often..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="daily">Daily Specials</SelectItem>
                                <SelectItem value="weekly">Weekly Changes</SelectItem>
                                <SelectItem value="seasonal">Seasonal Updates</SelectItem>
                                <SelectItem value="rarely">Rarely Change</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="pricePosition"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price Position</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select position..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="budget">Budget-Friendly</SelectItem>
                                <SelectItem value="mid_range">Mid-Range</SelectItem>
                                <SelectItem value="premium">Premium</SelectItem>
                                <SelectItem value="luxury">Luxury</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="specialDietaryNeeds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Special Dietary Accommodations</FormLabel>
                          <FormControl>
                            <MultiSelectField 
                              field={field} 
                              options={dietaryNeeds} 
                              placeholder="Select dietary needs..." 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="uniqueSellingPoints"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unique Selling Points</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} placeholder="What makes your restaurant unique? Special techniques, signature dishes, unique atmosphere..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="challenges" className="space-y-4 mt-6">
                    <FormField
                      control={form.control}
                      name="currentChallenges"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Operational Challenges</FormLabel>
                          <FormControl>
                            <MultiSelectField 
                              field={field} 
                              options={challengesOptions} 
                              placeholder="Select challenges..." 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="businessPriorities"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Priorities</FormLabel>
                          <FormControl>
                            <MultiSelectField 
                              field={field} 
                              options={prioritiesOptions} 
                              placeholder="Select priorities..." 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="seasonalConsiderations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Seasonal Considerations</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} placeholder="How do seasons affect your business? Tourist seasons, local events, weather impacts..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="primaryCompetitors"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Primary Competitors</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={2} placeholder="List your main competitors and what they do well..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="additionalContext"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Additional Context</FormLabel>
                          <FormControl>
                            <Textarea {...field} rows={3} placeholder="Any other important information about your restaurant, goals, or specific needs..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>

                <div className="flex gap-2 pt-4 border-t">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Restaurant Profile"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    Restaurant Overview
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Type:</span>
                      <span className="font-medium capitalize">{restaurant.establishmentType || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Service Style:</span>
                      <span className="font-medium capitalize">{restaurant.serviceStyle?.replace('_', ' ') || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Target Market:</span>
                      <span className="font-medium">{restaurant.targetDemographic || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Average Ticket:</span>
                      <span className="font-medium">{restaurant.averageTicketPrice ? `$${restaurant.averageTicketPrice}` : 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Seating Capacity:</span>
                      <span className="font-medium">{restaurant.diningCapacity || 'Not specified'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location & Market
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Location:</span>
                      <span className="font-medium">{restaurant.location || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Market Type:</span>
                      <span className="font-medium capitalize">{restaurant.marketType || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Price Position:</span>
                      <span className="font-medium capitalize">{restaurant.pricePosition?.replace('_', ' ') || 'Not specified'}</span>
                    </div>
                    {restaurant.operatingHours && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Hours:</span>
                        <span className="font-medium">{restaurant.operatingHours}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Menu Categories */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Menu className="h-4 w-4" />
                  Menu Categories
                </h3>
                <div className="flex flex-wrap gap-2">
                  {restaurant.categories.map((category) => (
                    <Badge key={category} variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Kitchen & Operations */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <ChefHat className="h-4 w-4" />
                    Kitchen Operations
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Capability Level:</span>
                      <span className="font-medium capitalize">{restaurant.kitchenCapability}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Kitchen Size:</span>
                      <span className="font-medium capitalize">{restaurant.kitchenSize || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Prep Space:</span>
                      <span className="font-medium capitalize">{restaurant.prepSpace || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Storage:</span>
                      <span className="font-medium capitalize">{restaurant.storageCapacity?.replace('_', ' ') || 'Not specified'}</span>
                    </div>
                  </div>
                  {restaurant.kitchenEquipment && restaurant.kitchenEquipment.length > 0 && (
                    <div className="mt-3">
                      <p className="text-slate-600 text-sm mb-2">Equipment Available:</p>
                      <div className="flex flex-wrap gap-1">
                        {restaurant.kitchenEquipment.map((equipment) => (
                          <Badge key={equipment} variant="outline" className="text-xs">
                            {equipment}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Staff & Resources
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Team Size:</span>
                      <span className="font-medium">{restaurant.staffSize} members</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Chef Experience:</span>
                      <span className="font-medium capitalize">{restaurant.chefExperience?.replace('_', ' ') || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Staff Skill Level:</span>
                      <span className="font-medium capitalize">{restaurant.staffSkillLevel || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Labor Budget:</span>
                      <span className="font-medium capitalize">{restaurant.laborBudget || 'Not specified'}</span>
                    </div>
                  </div>
                  {restaurant.specializedRoles && restaurant.specializedRoles.length > 0 && (
                    <div className="mt-3">
                      <p className="text-slate-600 text-sm mb-2">Specialized Roles:</p>
                      <div className="flex flex-wrap gap-1">
                        {restaurant.specializedRoles.map((role) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Business Goals */}
              <div>
                <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Business Goals & Targets
                </h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Current Menu Size:</span>
                    <span className="font-medium">{restaurant.currentMenuSize || 'Not specified'} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Profit Margin Goal:</span>
                    <span className="font-medium">{restaurant.profitMarginGoals ? `${restaurant.profitMarginGoals}%` : 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Food Cost Goal:</span>
                    <span className="font-medium">{restaurant.foodCostGoals ? `${restaurant.foodCostGoals}%` : 'Not specified'}</span>
                  </div>
                </div>
                {restaurant.menuChangeFrequency && (
                  <div className="mt-2 text-sm">
                    <span className="text-slate-600">Menu Change Frequency: </span>
                    <span className="font-medium capitalize">{restaurant.menuChangeFrequency}</span>
                  </div>
                )}
              </div>

              {/* Local Specialties */}
              {(restaurant.localIngredients?.length > 0 || restaurant.culturalInfluences?.length > 0) && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-3">Local Market & Influences</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {restaurant.localIngredients?.length > 0 && (
                      <div>
                        <p className="text-slate-600 text-sm mb-2">Local Ingredients:</p>
                        <div className="flex flex-wrap gap-1">
                          {restaurant.localIngredients.map((ingredient) => (
                            <Badge key={ingredient} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              {ingredient}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {restaurant.culturalInfluences?.length > 0 && (
                      <div>
                        <p className="text-slate-600 text-sm mb-2">Cultural Influences:</p>
                        <div className="flex flex-wrap gap-1">
                          {restaurant.culturalInfluences.map((influence) => (
                            <Badge key={influence} variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                              {influence}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Challenges & Priorities */}
              {(restaurant.currentChallenges?.length > 0 || restaurant.businessPriorities?.length > 0) && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Current Focus Areas
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {restaurant.currentChallenges?.length > 0 && (
                      <div>
                        <p className="text-slate-600 text-sm mb-2">Current Challenges:</p>
                        <div className="flex flex-wrap gap-1">
                          {restaurant.currentChallenges.map((challenge) => (
                            <Badge key={challenge} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                              {challenge.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {restaurant.businessPriorities?.length > 0 && (
                      <div>
                        <p className="text-slate-600 text-sm mb-2">Business Priorities:</p>
                        <div className="flex flex-wrap gap-1">
                          {restaurant.businessPriorities.map((priority) => (
                            <Badge key={priority} variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                              {priority.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Context */}
              {restaurant.additionalContext && (
                <div>
                  <h3 className="font-semibold text-slate-800 mb-2">Additional Context</h3>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-md border">{restaurant.additionalContext}</p>
                </div>
              )}

              <div className="text-sm text-slate-500 italic">
                Click the edit button to access the comprehensive restaurant profile form
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start h-auto p-4"
              onClick={() => handleQuickAction('menu-suggestions')}
              disabled={quickActionMutation.isPending}
            >
              <div className="flex items-center space-x-3">
                <Utensils className="h-5 w-5 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Menu Development</div>
                  <div className="text-sm text-muted-foreground">Generate new menu items</div>
                </div>
              </div>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start h-auto p-4"
              onClick={() => handleQuickAction('flavor-pairing')}
              disabled={quickActionMutation.isPending}
            >
              <div className="flex items-center space-x-3">
                <Palette className="h-5 w-5 text-amber-600" />
                <div className="text-left">
                  <div className="font-medium">Flavor Pairing</div>
                  <div className="text-sm text-muted-foreground">Get ingredient combinations</div>
                </div>
              </div>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start h-auto p-4"
              onClick={() => handleQuickAction('efficiency-analysis')}
              disabled={quickActionMutation.isPending}
            >
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <div className="font-medium">Efficiency Analysis</div>
                  <div className="text-sm text-muted-foreground">Optimize operations</div>
                </div>
              </div>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start h-auto p-4"
              onClick={() => handleQuickAction('cocktail-creation')}
              disabled={quickActionMutation.isPending}
            >
              <div className="flex items-center space-x-3">
                <Wine className="h-5 w-5 text-purple-600" />
                <div className="text-left">
                  <div className="font-medium">Cocktail & Drinks</div>
                  <div className="text-sm text-muted-foreground">Create signature drinks</div>
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}