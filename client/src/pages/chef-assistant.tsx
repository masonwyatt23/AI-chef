import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ComprehensiveRestaurantContext } from "@/components/ComprehensiveRestaurantContext";
import { ChatInterface } from "@/components/ChatInterface";
import { RecommendationsList } from "@/components/RecommendationsList";
import { MenuCocktailGenerator } from "@/components/MenuCocktailGenerator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Utensils, MessageSquare, Settings } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Restaurant, Recommendation } from "@shared/schema";

export default function ChefAssistant() {
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);

  // Initialize with default restaurant
  useEffect(() => {
    const initializeRestaurant = async () => {
      try {
        const response = await apiRequest("POST", "/api/restaurants", {
          name: "The Train Station Steakhouse",
          theme: "Family-friendly steak and seafood restaurant in an old train depot with vintage train theme",
          categories: ["Steaks", "Seafood", "Sandwiches", "Salads", "Appetizers"],
          kitchenCapability: "intermediate",
          staffSize: 8,
          additionalContext: "Located in a historic train depot building with a family-friendly atmosphere"
        });
        const restaurant = await response.json();
        setRestaurantId(restaurant.id);
      } catch (error) {
        console.error("Failed to initialize restaurant:", error);
      }
    };

    initializeRestaurant();
  }, []);

  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: [`/api/restaurants/${restaurantId}`],
    enabled: !!restaurantId,
  });

  const { data: recommendations = [] } = useQuery<Recommendation[]>({
    queryKey: [`/api/restaurants/${restaurantId}/recommendations`],
    enabled: !!restaurantId,
  });

  const handleExport = async () => {
    if (!restaurant || !recommendations.length) return;

    const exportData = {
      restaurant: restaurant.name,
      exportDate: new Date().toISOString(),
      recommendations: recommendations.map(rec => ({
        title: rec.title,
        description: rec.description,
        category: rec.category,
        recipe: rec.recipe,
        createdAt: rec.createdAt
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${restaurant.name.replace(/\s+/g, '_')}_recommendations.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stats = {
    recommendationsUsed: recommendations.filter(r => r.implemented).length,
    menuItemsCreated: recommendations.filter(r => r.category === 'menu').length,
    efficiencyGains: Math.round((recommendations.filter(r => r.category === 'efficiency').length / Math.max(recommendations.length, 1)) * 100)
  };

  if (!restaurantId || !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing AI Chef Assistant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface border-b border-slate-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Utensils className="text-white text-sm" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">AI Chef Assistant</h1>
              <p className="text-xs text-slate-500">Restaurant Intelligence Platform</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!recommendations.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">M</span>
              </div>
              <span className="text-sm font-medium text-slate-700">{restaurant.name}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Main Navigation Tabs */}
        <Tabs defaultValue="generator" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="generator" className="flex items-center space-x-2">
              <Utensils className="h-4 w-4" />
              <span>Menu & Cocktail Generator</span>
            </TabsTrigger>
            <TabsTrigger value="ai-chef" className="flex items-center space-x-2">
              <MessageSquare className="h-4 w-4" />
              <span>AI Chef Assistant</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Restaurant Setup</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator">
            <MenuCocktailGenerator restaurantId={restaurantId} />
          </TabsContent>

          <TabsContent value="ai-chef">
            <div className="h-[calc(100vh-200px)] flex flex-col">
              {/* Full-Width Chat Interface */}
              <div className="flex-1">
                <ChatInterface 
                  restaurantId={restaurantId}
                  conversationId={activeConversationId}
                  onConversationChange={setActiveConversationId}
                />
              </div>

              {/* Collapsible Recommendations Panel */}
              <div className="border-t border-slate-200 max-h-64 overflow-y-auto bg-slate-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700">Recent AI Recommendations</h3>
                    <div className="flex space-x-4 text-xs">
                      <span className="text-green-600 font-medium">{stats.recommendationsUsed} Implemented</span>
                      <span className="text-blue-600 font-medium">{stats.menuItemsCreated} Menu Items</span>
                      <span className="text-purple-600 font-medium">{stats.efficiencyGains}% Efficiency Focus</span>
                    </div>
                  </div>
                  <RecommendationsList 
                    recommendations={recommendations}
                    restaurantId={restaurantId}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="max-w-2xl mx-auto">
              <ComprehensiveRestaurantContext 
                restaurant={restaurant} 
                restaurantId={restaurantId}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
