import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, BookmarkCheck, Clock, Eye, Copy, CheckCircle } from "lucide-react";
import type { Recommendation } from "@shared/schema";

interface RecommendationsListProps {
  recommendations: Recommendation[];
  restaurantId: number;
}

export function RecommendationsList({ recommendations, restaurantId }: RecommendationsListProps) {
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleImplementedMutation = useMutation({
    mutationFn: async ({ id, implemented }: { id: number; implemented: boolean }) => {
      const response = await apiRequest("PUT", `/api/recommendations/${id}`, {
        implemented: !implemented,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/restaurants/${restaurantId}/recommendations`] 
      });
      toast({
        title: "Recommendation updated",
        description: "The recommendation status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update recommendation status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cocktails': return 'bg-purple-100 text-purple-700';
      case 'menu': return 'bg-blue-100 text-blue-700';
      case 'efficiency': return 'bg-green-100 text-green-700';
      case 'flavor-pairing': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cocktails': return '🍹';
      case 'menu': return '🍽️';
      case 'efficiency': return '📊';
      case 'flavor-pairing': return '🎨';
      default: return '💡';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const days = Math.floor(diffInHours / 24);
    return days === 1 ? '1 day ago' : `${days} days ago`;
  };

  const handleToggleImplemented = (recommendation: Recommendation) => {
    toggleImplementedMutation.mutate({
      id: recommendation.id,
      implemented: !!(recommendation.implemented),
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Recipe copied to clipboard successfully.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Recommendations</CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🍽️</div>
            <p className="text-muted-foreground">No recommendations yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start a conversation with your AI Chef to get personalized recommendations
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((recommendation) => (
              <div 
                key={recommendation.id}
                className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge 
                        variant="secondary" 
                        className={`${getCategoryColor(recommendation.category)} text-xs`}
                      >
                        <span className="mr-1">{getCategoryIcon(recommendation.category)}</span>
                        {recommendation.category.replace('-', ' ')}
                      </Badge>
                      <div className="flex items-center text-sm text-slate-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTimeAgo(new Date(recommendation.createdAt))}
                      </div>
                      {recommendation.implemented && (
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          ✓ Implemented
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-slate-900 mb-1">
                      {recommendation.title}
                    </h4>
                    <p className="text-sm text-slate-600 mb-3">
                      {recommendation.description}
                    </p>
                    
                    {recommendation.recipe && (
                      <div className="bg-white rounded-lg p-3 border border-slate-200 text-sm">
                        {(recommendation.recipe as any)?.ingredients && (
                          <div className="mb-2">
                            <h5 className="font-medium text-slate-900 mb-1">Ingredients:</h5>
                            <ul className="text-slate-700 space-y-1">
                              {((recommendation.recipe as any).ingredients as string[]).map((ingredient: string, index: number) => (
                                <li key={index}>• {ingredient}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {(recommendation.recipe as any)?.instructions && (
                          <div>
                            <h5 className="font-medium text-slate-900 mb-1">Instructions:</h5>
                            <ol className="text-slate-700 space-y-1">
                              {((recommendation.recipe as any).instructions as string[]).map((instruction: string, index: number) => (
                                <li key={index}>{index + 1}. {instruction}</li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{recommendation.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Badge variant="secondary" className={getCategoryColor(recommendation.category)}>
                              <span className="mr-1">{getCategoryIcon(recommendation.category)}</span>
                              {recommendation.category.replace('-', ' ')}
                            </Badge>
                          </div>
                          <p className="text-slate-700">{recommendation.description}</p>
                          
                          {recommendation.recipe && (
                            <div className="bg-slate-50 rounded-lg p-4 space-y-4">
                              {(recommendation.recipe as any)?.ingredients && (
                                <div>
                                  <h4 className="font-semibold text-slate-900 mb-2">Ingredients:</h4>
                                  <ul className="space-y-1">
                                    {((recommendation.recipe as any).ingredients as string[]).map((ingredient: string, index: number) => (
                                      <li key={index} className="text-slate-700">• {ingredient}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {(recommendation.recipe as any)?.instructions && (
                                <div>
                                  <h4 className="font-semibold text-slate-900 mb-2">Instructions:</h4>
                                  <ol className="space-y-1">
                                    {((recommendation.recipe as any).instructions as string[]).map((instruction: string, index: number) => (
                                      <li key={index} className="text-slate-700">{index + 1}. {instruction}</li>
                                    ))}
                                  </ol>
                                </div>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(JSON.stringify(recommendation.recipe, null, 2))}
                              >
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Recipe
                              </Button>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleImplemented(recommendation)}
                      disabled={toggleImplementedMutation.isPending}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      {recommendation.implemented ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Bookmark className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
