import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  ChefHat, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Clock, 
  AlertTriangle,
  Star,
  Package,
  BarChart3,
  Target,
  Zap,
  CheckCircle
} from "lucide-react";

interface RestaurantDashboardProps {
  restaurantId: number;
}

export function RestaurantDashboard({ restaurantId }: RestaurantDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<"today" | "week" | "month">("today");

  // Mock data for demonstration - in real app this would come from APIs
  const dashboardData = {
    today: {
      revenue: 2847,
      orders: 127,
      averageTicket: 22.40,
      customerSatisfaction: 4.6,
      kitchenEfficiency: 87,
      popularItems: ["Train Conductor's Ribeye", "Station Master's Salmon", "Caboose Burger"],
      lowStock: ["Ribeye Steaks", "Fresh Salmon", "Tomatoes"],
      staffOnDuty: 8,
      expectedCover: 150,
      actualCover: 127,
      peakHours: "7:00 PM - 9:00 PM"
    },
    week: {
      revenue: 18340,
      orders: 892,
      averageTicket: 20.56,
      customerSatisfaction: 4.5,
      kitchenEfficiency: 85,
      topPerformers: ["Sarah (Server)", "Mike (Chef)", "Lisa (Host)"],
      improvements: ["Reduce ticket times", "Update wine menu", "Staff training"]
    },
    month: {
      revenue: 78520,
      orders: 3847,
      averageTicket: 20.41,
      customerSatisfaction: 4.4,
      kitchenEfficiency: 83,
      goals: ["Increase average ticket to $25", "Reduce food waste by 15%", "Improve customer ratings to 4.7"]
    }
  };

  const currentData = dashboardData[selectedPeriod];

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Restaurant Operations Dashboard</h2>
        <div className="flex space-x-2">
          {(["today", "week", "month"] as const).map((period) => (
            <Button
              key={period}
              variant={selectedPeriod === period ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
              className="capitalize"
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Revenue</p>
                <p className="text-2xl font-bold text-slate-900">${currentData.revenue.toLocaleString()}</p>
                <p className="text-xs text-green-600">↗ 12% vs last {selectedPeriod}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Orders</p>
                <p className="text-2xl font-bold text-slate-900">{currentData.orders}</p>
                <p className="text-xs text-blue-600">↗ 8% vs last {selectedPeriod}</p>
              </div>
              <ChefHat className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Avg Ticket</p>
                <p className="text-2xl font-bold text-slate-900">${currentData.averageTicket}</p>
                <p className="text-xs text-purple-600">→ Steady</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Satisfaction</p>
                <p className="text-2xl font-bold text-slate-900">{currentData.customerSatisfaction}/5</p>
                <p className="text-xs text-amber-600">↗ 0.2 vs last {selectedPeriod}</p>
              </div>
              <Star className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="menu">Menu Performance</TabsTrigger>
          <TabsTrigger value="staff">Staff & Labor</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kitchen Efficiency */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-orange-600" />
                  <span>Kitchen Efficiency</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Efficiency</span>
                  <span className="text-2xl font-bold text-orange-600">{currentData.kitchenEfficiency}%</span>
                </div>
                <Progress value={currentData.kitchenEfficiency} className="h-2" />
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Average Ticket Time</span>
                    <span className="font-medium">12 min</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Orders on Time</span>
                    <span className="font-medium text-green-600">94%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Food Waste</span>
                    <span className="font-medium text-red-600">3.2%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Today's Service */}
            {selectedPeriod === "today" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    <span>Today's Service</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Staff on Duty</p>
                      <p className="text-xl font-bold">{currentData.staffOnDuty}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Cover Progress</p>
                      <p className="text-xl font-bold">{currentData.actualCover}/{currentData.expectedCover}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-slate-500 mb-2">Peak Hours</p>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">
                      {currentData.peakHours}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Quick Actions</p>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">86 Table</Button>
                      <Button size="sm" variant="outline">Update Menu</Button>
                      <Button size="sm" variant="outline">Call Staff</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="menu" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Popular Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Top Performing Items</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentData.popularItems?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant="secondary" className="bg-green-200 text-green-800">
                          #{index + 1}
                        </Badge>
                        <span className="font-medium text-slate-900">{item}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{Math.floor(Math.random() * 50) + 20} sold</p>
                        <p className="text-xs text-green-600">↗ {Math.floor(Math.random() * 30) + 5}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Menu Optimization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  <span>Menu Optimization</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Slow-Moving Items</p>
                      <p className="text-sm text-slate-600">3 items need attention</p>
                    </div>
                    <Button size="sm" variant="outline">Review</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Profit Margin Analysis</p>
                      <p className="text-sm text-slate-600">Avg margin: 68%</p>
                    </div>
                    <Button size="sm" variant="outline">Details</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">Seasonal Opportunities</p>
                      <p className="text-sm text-slate-600">4 recommendations ready</p>
                    </div>
                    <Button size="sm" variant="outline">View</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Staff Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span>Staff Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Labor Cost</p>
                    <p className="text-xl font-bold">28.5%</p>
                    <p className="text-xs text-green-600">↓ 1.2% vs target</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Productivity</p>
                    <p className="text-xl font-bold">$142/hr</p>
                    <p className="text-xs text-blue-600">↗ 8% vs last week</p>
                  </div>
                </div>

                {selectedPeriod === "week" && currentData.topPerformers && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Top Performers</p>
                    <div className="space-y-2">
                      {currentData.topPerformers.map((performer, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800">★</Badge>
                          <span className="text-sm">{performer}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Scheduling & Training */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span>Scheduling & Development</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Schedule Compliance</span>
                    <span className="text-sm font-medium text-green-600">96%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Training Completion</span>
                    <span className="text-sm font-medium text-blue-600">87%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Open Shifts</span>
                    <span className="text-sm font-medium text-amber-600">3</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button size="sm" className="w-full">Manage Schedule</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inventory Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span>Inventory Alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currentData.lowStock?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-slate-900">{item}</span>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                        <p className="text-xs text-slate-600 mt-1">Reorder needed</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-4" size="sm">
                  Generate Purchase Orders
                </Button>
              </CardContent>
            </Card>

            {/* Inventory Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  <span>Inventory Overview</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Total Value</p>
                    <p className="text-xl font-bold">$12,847</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Items Tracked</p>
                    <p className="text-xl font-bold">247</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Food Cost %</span>
                    <span className="font-medium text-green-600">31.2%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Waste %</span>
                    <span className="font-medium text-red-600">3.1%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Turn Rate</span>
                    <span className="font-medium text-blue-600">4.2x/month</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full" size="sm">
                  View Full Inventory
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}