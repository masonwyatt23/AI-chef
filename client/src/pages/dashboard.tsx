import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertRestaurantSchema, type Restaurant } from "@shared/schema";
import { ChefHat, Plus, Settings, MessageSquare, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface DashboardProps {
  onRestaurantSelect: (restaurantId: number) => void;
  onLogout: () => void;
}

export default function Dashboard({ onRestaurantSelect, onLogout }: DashboardProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const { data: restaurants = [], isLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
  });

  const form = useForm({
    resolver: zodResolver(insertRestaurantSchema.pick({
      name: true,
      theme: true,
      kitchenCapability: true,
      staffSize: true,
      additionalContext: true,
    })),
    defaultValues: {
      name: "",
      theme: "",
      kitchenCapability: "intermediate",
      staffSize: 5,
      additionalContext: "",
    },
  });

  const createRestaurantMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/restaurants", data);
      return await response.json();
    },
    onSuccess: (restaurant) => {
      toast({
        title: "Restaurant created!",
        description: `${restaurant.name} has been added to your account.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create restaurant",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createRestaurantMutation.mutate(data);
  };

  const handleLogout = () => {
    logout();
    onLogout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="h-12 w-12 mx-auto mb-4 text-orange-600 animate-pulse" />
          <p className="text-muted-foreground">Loading your restaurants...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <ChefHat className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  AI Chef Assistant
                </h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {user?.username}
                </p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Your Restaurants
            </h2>
            <p className="text-muted-foreground">
              Manage your restaurant operations and AI assistance
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Restaurant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Restaurant</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Restaurant Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. The Depot Grille" {...field} />
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
                        <FormLabel>Theme/Cuisine</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Contemporary American" {...field} />
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
                          <Textarea 
                            placeholder="Tell us about your restaurant's unique characteristics..."
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={createRestaurantMutation.isPending}
                  >
                    {createRestaurantMutation.isPending ? "Creating..." : "Create Restaurant"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Restaurant Grid */}
        {restaurants.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <ChefHat className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No restaurants yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first restaurant to start using the AI Chef Assistant
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Restaurant
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant) => (
              <Card 
                key={restaurant.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{restaurant.name}</span>
                    <Badge variant="secondary">{restaurant.theme}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-muted-foreground">
                      Kitchen: <span className="capitalize">{restaurant.kitchenCapability}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Staff: {restaurant.staffSize} members
                    </p>
                    {restaurant.additionalContext && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {restaurant.additionalContext}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => onRestaurantSelect(restaurant.id)}
                      className="flex-1"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Open Chat
                    </Button>
                    <Button variant="outline" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}