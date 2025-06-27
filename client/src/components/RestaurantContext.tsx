import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Edit, Utensils, Palette, TrendingUp, Wine } from "lucide-react";
import type { Restaurant, InsertRestaurant } from "@shared/schema";

interface RestaurantContextProps {
  restaurant: Restaurant;
  restaurantId: number;
}

export function RestaurantContext({ restaurant, restaurantId }: RestaurantContextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertRestaurant>({
    defaultValues: {
      name: restaurant.name,
      theme: restaurant.theme,
      categories: restaurant.categories,
      kitchenCapability: restaurant.kitchenCapability,
      staffSize: restaurant.staffSize,
      additionalContext: restaurant.additionalContext || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: InsertRestaurant) => {
      const response = await apiRequest("PUT", `/api/restaurants/${restaurantId}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${restaurantId}`] });
      setIsEditing(false);
      toast({
        title: "Restaurant updated",
        description: "Your restaurant context has been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update restaurant context. Please try again.",
        variant: "destructive",
      });
    },
  });

  const quickActionMutation = useMutation({
    mutationFn: async (action: string) => {
      const endpoint = `/api/quick-actions/${action}`;
      const payload = action === 'flavor-pairing' 
        ? { restaurantId, ingredient: "beef" }
        : { restaurantId };
      
      const response = await apiRequest("POST", endpoint, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/restaurants/${restaurantId}/recommendations`] });
      toast({
        title: "Analysis complete",
        description: "New recommendations have been generated for you.",
      });
    },
    onError: () => {
      toast({
        title: "Analysis failed",
        description: "Failed to generate recommendations. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertRestaurant) => {
    updateMutation.mutate(data);
  };

  const handleQuickAction = (action: string) => {
    quickActionMutation.mutate(action);
  };

  return (
    <div className="space-y-6">
      {/* Restaurant Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Restaurant Context</CardTitle>
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="kitchenCapability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kitchen Capabilities</FormLabel>
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
                  name="staffSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff Size</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                        />
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
                        <Textarea {...field} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="submit" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
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
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-slate-700 mb-2">Current Menu Categories</h3>
                <div className="flex flex-wrap gap-2">
                  {restaurant.categories.map((category) => (
                    <Badge key={category} variant="secondary">
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium text-sm text-slate-700 mb-1">Kitchen Capability</h3>
                <p className="text-sm text-slate-600 capitalize">{restaurant.kitchenCapability}</p>
              </div>

              <div>
                <h3 className="font-medium text-sm text-slate-700 mb-1">Staff Size</h3>
                <p className="text-sm text-slate-600">{restaurant.staffSize} team members</p>
              </div>

              {restaurant.additionalContext && (
                <div>
                  <h3 className="font-medium text-sm text-slate-700 mb-1">Additional Context</h3>
                  <p className="text-sm text-slate-600">{restaurant.additionalContext}</p>
                </div>
              )}
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
