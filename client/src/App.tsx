import React, { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import ChefAssistant from "@/pages/chef-assistant";
import LoginPage from "@/pages/login";

interface Restaurant {
  id: number;
  name: string;
  theme: string;
  userId: number;
}

function Router() {
  const { user, isLoading: authLoading } = useAuth();
  
  // Fetch user's restaurants when authenticated
  const { data: restaurants, isLoading: restaurantsLoading } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
    enabled: !!user,
    retry: false,
  });

  // Show loading state while checking authentication or fetching restaurants
  if (authLoading || (user && restaurantsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  // If not authenticated, show login page
  if (!user) {
    return (
      <LoginPage 
        onLogin={() => {
          // Refresh auth state after login
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        }} 
      />
    );
  }

  // Get the user's first restaurant (or create default if none exist)
  const userRestaurant = restaurants && restaurants.length > 0 ? restaurants[0] : null;
  
  if (!userRestaurant) {
    // If no restaurants found, create one automatically
    const createDefaultRestaurant = async () => {
      try {
        const response = await fetch("/api/restaurants/create-default", {
          method: "POST",
          credentials: "include",
        });
        if (response.ok) {
          // Refresh the restaurants data
          queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
        }
      } catch (error) {
        console.error("Failed to create default restaurant:", error);
      }
    };

    // Automatically create restaurant on component mount
    React.useEffect(() => {
      createDefaultRestaurant();
    }, []);

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Setting up your restaurant...</h2>
          <p className="text-muted-foreground">Creating your personalized AI Chef Assistant.</p>
        </div>
      </div>
    );
  }

  // All authenticated users go directly to their first restaurant
  // This eliminates the multi-restaurant dashboard and provides single-restaurant access
  return (
    <Switch>
      <Route path="/">
        {() => (
          <ChefAssistant 
            restaurantId={userRestaurant.id}
          />
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
