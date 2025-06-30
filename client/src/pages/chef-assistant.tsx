import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ComprehensiveRestaurantContext } from "@/components/ComprehensiveRestaurantContext";
import { ChatInterface } from "@/components/ChatInterface";
import { RecommendationsList } from "@/components/RecommendationsList";
import { MenuCocktailGenerator } from "@/components/MenuCocktailGenerator";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Utensils, MessageSquare, Settings, LogOut } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import depotLogoPath from "@assets/depot logo_1751085413672.png";
import jsPDF from 'jspdf';
import type { Restaurant, Recommendation } from "@shared/schema";

interface ChefAssistantProps {
  restaurantId: number;
}

export default function ChefAssistant({ restaurantId }: ChefAssistantProps) {
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const { logout, user } = useAuth();

  const { data: restaurant } = useQuery<Restaurant>({
    queryKey: [`/api/restaurants/${restaurantId}`],
    enabled: !!restaurantId,
  });

  const { data: recommendations = [] } = useQuery<Recommendation[]>({
    queryKey: [`/api/restaurants/${restaurantId}/recommendations`],
    enabled: !!restaurantId,
  });

  const handleLogout = () => {
    logout();
    queryClient.clear();
  };

  const handleExport = async () => {
    if (!restaurant || !recommendations.length) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const maxWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Helper function to add text with word wrapping
    const addText = (text: string, fontSize = 10, isBold = false) => {
      pdf.setFont("helvetica", isBold ? "bold" : "normal");
      pdf.setFontSize(fontSize);
      
      const lines = pdf.splitTextToSize(text, maxWidth);
      for (const line of lines) {
        if (yPosition > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(line, margin, yPosition);
        yPosition += fontSize * 0.5;
      }
      yPosition += 5; // Add some space after text block
    };

    // Header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text(`${restaurant.name} - AI Chef Recommendations`, margin, yPosition);
    yPosition += 25;

    // Date and summary
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 15;
    pdf.text(`Total Recommendations: ${recommendations.length}`, margin, yPosition);
    yPosition += 10;
    pdf.text(`Implemented: ${stats.recommendationsUsed}`, margin, yPosition);
    yPosition += 20;

    // Group recommendations by category
    const categorizedRecs = recommendations.reduce((acc, rec) => {
      const category = rec.category || 'general';
      if (!acc[category]) acc[category] = [];
      acc[category].push(rec);
      return acc;
    }, {} as Record<string, typeof recommendations>);

    // Add recommendations by category
    for (const [category, recs] of Object.entries(categorizedRecs)) {
      // Category header
      addText(`${category.toUpperCase()} RECOMMENDATIONS`, 14, true);
      
      recs.forEach((rec, index) => {
        // Recommendation title
        addText(`${index + 1}. ${rec.title}`, 12, true);
        
        // Description
        if (rec.description) {
          addText(`Description: ${rec.description}`, 10);
        }
        
        // Recipe details if available
        if (rec.recipe) {
          try {
            const recipe = typeof rec.recipe === 'string' ? JSON.parse(rec.recipe) : rec.recipe;
            
            if (recipe.ingredients && Array.isArray(recipe.ingredients)) {
              addText("Ingredients:", 10, true);
              recipe.ingredients.forEach((ingredient: any) => {
                const ingredientText = typeof ingredient === 'string' ? ingredient : 
                  `${ingredient.ingredient || ingredient.name || ''}: ${ingredient.amount || ''}`;
                addText(`• ${ingredientText}`, 10);
              });
            }
            
            if (recipe.instructions && Array.isArray(recipe.instructions)) {
              addText("Instructions:", 10, true);
              recipe.instructions.forEach((instruction: string, idx: number) => {
                addText(`${idx + 1}. ${instruction}`, 10);
              });
            }
            
            if (recipe.prepInstructions && Array.isArray(recipe.prepInstructions)) {
              addText("Preparation:", 10, true);
              recipe.prepInstructions.forEach((instruction: string, idx: number) => {
                addText(`${idx + 1}. ${instruction}`, 10);
              });
            }
            
            if (recipe.estimatedCost) {
              addText(`Estimated Cost: $${recipe.estimatedCost}`, 10);
            }
            
            if (recipe.suggestedPrice) {
              addText(`Suggested Price: $${recipe.suggestedPrice}`, 10);
            }
          } catch (e) {
            addText(`Recipe: ${rec.recipe}`, 10);
          }
        }
        
        // Implementation status
        addText(`Status: ${rec.implemented ? 'Implemented ✓' : 'Pending'}`, 10, Boolean(rec.implemented));
        
        yPosition += 10; // Space between recommendations
      });
      
      yPosition += 10; // Extra space between categories
    }

    // Save the PDF
    const fileName = `${restaurant.name.replace(/\s+/g, '_')}_AI_Chef_Recommendations.pdf`;
    pdf.save(fileName);
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
              <p className="text-xs text-slate-500">{restaurant.name}</p>
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
            <div className="flex items-center space-x-2">
              <ProfilePictureUpload 
                currentPicture={user?.profilePicture}
                userName={user?.username || "User"}
                className="scale-75"
              />
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
