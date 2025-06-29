import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import ChefAssistant from "@/pages/chef-assistant";
import LoginPage from "@/pages/login";
import Dashboard from "@/pages/dashboard";

function Router() {
  const { user, isLoading } = useAuth();
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);

  // Show loading state while checking authentication
  if (isLoading) {
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

  // If authenticated but no restaurant selected, show dashboard
  if (!selectedRestaurantId) {
    return (
      <Dashboard 
        onRestaurantSelect={setSelectedRestaurantId}
        onLogout={() => {
          setSelectedRestaurantId(null);
          queryClient.clear();
        }}
      />
    );
  }

  // If restaurant selected, show chef assistant
  return (
    <Switch>
      <Route path="/">
        {() => (
          <ChefAssistant 
            restaurantId={selectedRestaurantId}
            onBackToDashboard={() => setSelectedRestaurantId(null)}
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
