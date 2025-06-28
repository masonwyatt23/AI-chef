import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Send, Bot, User, Lightbulb, ChevronDown, ChevronUp, Utensils, BarChart3, Users, Zap, DollarSign, Target, Plus, MessageSquare } from "lucide-react";
import type { Message, Conversation } from "@shared/schema";

interface ChatInterfaceProps {
  restaurantId: number;
  conversationId: number | null;
  onConversationChange: (id: number | null) => void;
}

export function ChatInterface({ restaurantId, conversationId, onConversationChange }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [showPromptBank, setShowPromptBank] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Comprehensive Prompt Bank
  const promptCategories = {
    menu: {
      icon: Utensils,
      title: "Menu Development",
      prompts: [
        {
          title: "Seasonal Menu Planning",
          prompt: "Help me create a seasonal menu for [season] that incorporates local ingredients and appeals to our target demographic. Consider our kitchen capabilities and pricing strategy."
        },
        {
          title: "Signature Dish Creation",
          prompt: "I want to develop 3 signature dishes that showcase our restaurant's unique theme and culinary style. Please suggest dishes with detailed recipes, cost analysis, and pricing recommendations."
        },
        {
          title: "Menu Engineering Analysis",
          prompt: "Analyze my current menu and suggest which items to promote, modify, or remove based on profitability, popularity, and kitchen efficiency."
        },
        {
          title: "Cross-Category Pairings",
          prompt: "Suggest appetizer and dessert pairings for our most popular entrees that would increase average ticket size and enhance the dining experience."
        },
        {
          title: "Dietary Accommodation Strategy",
          prompt: "Help me expand our menu to better accommodate vegetarian, vegan, and gluten-free diners without compromising our core offerings or overwhelming the kitchen."
        }
      ]
    },
    operations: {
      icon: BarChart3,
      title: "Operations & Efficiency",
      prompts: [
        {
          title: "Kitchen Workflow Optimization",
          prompt: "Analyze our current kitchen operations and suggest improvements to reduce ticket times, minimize waste, and increase efficiency during peak hours."
        },
        {
          title: "Prep Schedule Planning",
          prompt: "Create an optimal prep schedule for our kitchen that ensures food quality while minimizing labor costs and reducing food waste."
        },
        {
          title: "Inventory Management Strategy",
          prompt: "Help me develop a better inventory management system that reduces waste, ensures freshness, and optimizes our food costs."
        },
        {
          title: "Service Speed Analysis",
          prompt: "Our service is too slow during busy periods. Analyze our operations and suggest specific changes to improve speed without sacrificing quality."
        }
      ]
    },
    profitability: {
      icon: DollarSign,
      title: "Cost & Profitability",
      prompts: [
        {
          title: "Food Cost Reduction",
          prompt: "Our food costs are running high at [current percentage]%. Analyze our menu and suggest specific strategies to reduce costs while maintaining quality and customer satisfaction."
        },
        {
          title: "Pricing Strategy Review",
          prompt: "Review our current pricing strategy and suggest adjustments that could improve profitability while remaining competitive in our market."
        },
        {
          title: "Portion Control Analysis",
          prompt: "Help me standardize portion sizes across our menu to control costs while ensuring customer satisfaction and value perception."
        },
        {
          title: "Profit Margin Optimization",
          prompt: "Identify our highest and lowest margin items and suggest menu modifications to improve overall profitability."
        }
      ]
    },
    marketing: {
      icon: Target,
      title: "Marketing & Customer Experience",
      prompts: [
        {
          title: "Customer Retention Strategy",
          prompt: "Suggest menu and service strategies to increase customer loyalty and repeat visits, considering our restaurant's unique positioning."
        },
        {
          title: "Upselling Opportunities",
          prompt: "Identify specific opportunities to increase average ticket size through strategic menu design and staff training recommendations."
        },
        {
          title: "Social Media Content Ideas",
          prompt: "Suggest creative menu items and presentations that would be highly shareable on social media and attract new customers."
        },
        {
          title: "Special Event Menus",
          prompt: "Help me create special menu offerings for holidays and events that would drive traffic and increase revenue."
        }
      ]
    },
    staff: {
      icon: Users,
      title: "Staff & Training",
      prompts: [
        {
          title: "Kitchen Training Program",
          prompt: "Develop a comprehensive training program for new kitchen staff that ensures consistency and efficiency while reducing onboarding time."
        },
        {
          title: "Server Education Plan",
          prompt: "Create a server training program focused on menu knowledge, upselling techniques, and customer service excellence."
        },
        {
          title: "Cross-Training Strategy",
          prompt: "Suggest a cross-training program that would make our staff more versatile and reduce scheduling challenges."
        }
      ]
    },
    innovation: {
      icon: Zap,
      title: "Innovation & Trends",
      prompts: [
        {
          title: "Food Trend Integration",
          prompt: "Analyze current food trends and suggest how we can incorporate relevant ones into our menu while staying true to our restaurant concept."
        },
        {
          title: "Technology Integration",
          prompt: "Suggest technology solutions that could improve our kitchen operations, customer experience, or business efficiency."
        },
        {
          title: "Competitive Analysis",
          prompt: "Help me analyze what our competitors are doing well and suggest ways we can differentiate ourselves in the market."
        }
      ]
    }
  };

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: [`/api/restaurants/${restaurantId}/conversations`],
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: [`/api/conversations/${conversationId}/messages`],
    enabled: !!conversationId,
  });

  const chatMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const response = await apiRequest("POST", "/api/chat", {
        message: userMessage,
        restaurantId,
        conversationId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Update conversation ID if this was the first message
      if (!conversationId && data.conversationId) {
        onConversationChange(data.conversationId);
      }
      
      // Invalidate relevant queries
      if (data.conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/conversations/${data.conversationId}/messages`] 
        });
      }
      queryClient.invalidateQueries({ 
        queryKey: [`/api/restaurants/${restaurantId}/recommendations`] 
      });
      queryClient.invalidateQueries({ 
        queryKey: [`/api/restaurants/${restaurantId}/conversations`] 
      });
      
      setMessage("");
    },
    onError: () => {
      toast({
        title: "Message failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    chatMutation.mutate(message);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getCategoryColor = (category: string | null) => {
    switch (category) {
      case 'cocktails': return 'bg-purple-100 text-purple-700';
      case 'menu': return 'bg-blue-100 text-blue-700';
      case 'efficiency': return 'bg-green-100 text-green-700';
      case 'flavor-pairing': return 'bg-amber-100 text-amber-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const formatMessageContent = (content: string) => {
    // Enhanced formatting for better readability
    return content
      .split('\n')
      .map((line, index) => {
        const trimmed = line.trim();
        
        // Bold headings
        if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
          return <div key={index} className="font-bold text-base mt-3 mb-2">{trimmed.slice(2, -2)}</div>;
        }
        
        // Bullet points with better styling
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          return (
            <div key={index} className="flex items-start mt-1 mb-1">
              <span className="text-primary mr-2 mt-1">•</span>
              <span className="flex-1">{trimmed.replace(/^[-•]\s*/, '')}</span>
            </div>
          );
        }
        
        // Numbered lists
        if (/^\d+\./.test(trimmed)) {
          const match = trimmed.match(/^(\d+\.)\s*(.*)$/);
          if (match) {
            return (
              <div key={index} className="flex items-start mt-1 mb-1">
                <span className="text-primary mr-2 mt-1 font-medium">{match[1]}</span>
                <span className="flex-1">{match[2]}</span>
              </div>
            );
          }
        }
        
        // Empty lines for spacing
        if (trimmed === '') {
          return <div key={index} className="h-2"></div>;
        }
        
        // Regular text with better spacing
        return <div key={index} className="leading-relaxed mb-1">{trimmed}</div>;
      });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">AI Chef Assistant</h2>
              <p className="text-sm text-slate-500">Get expert culinary advice tailored to your restaurant</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">Connected</span>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex items-center space-x-2">
            <Select
              value={conversationId?.toString() || ""}
              onValueChange={(value) => onConversationChange(parseInt(value))}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select conversation">
                  {conversationId ? 
                    conversations.find(c => c.id === conversationId)?.title || "Current Chat" 
                    : "Start new conversation"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {conversations.map((conv) => (
                  <SelectItem key={conv.id} value={conv.id.toString()}>
                    {conv.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onConversationChange(null)}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Chat
            </Button>
          </div>

          <Button
            variant={showPromptBank ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPromptBank(!showPromptBank)}
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            {showPromptBank ? "Hide" : "Show"} Prompt Bank
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${showPromptBank ? 'w-2/3' : 'w-full'}`}>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-600 mb-2">Welcome to your AI Chef Assistant!</h3>
                  <p className="text-slate-500 mb-4">I'm here to help with menu development, kitchen operations, cost optimization, and more.</p>
                  <p className="text-sm text-slate-400">
                    {showPromptBank ? "Choose a prompt from the bank on the right, or" : "Click 'Show Prompt Bank' for expert questions, or"} type your own question below.
                  </p>
                </div>
              )}
              
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-start space-x-3">
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  
                  <div className={`rounded-lg p-4 flex-1 max-w-3xl ${
                    msg.role === 'user' 
                      ? 'bg-primary text-white ml-12' 
                      : 'bg-slate-50 mr-12 border border-slate-200'
                  }`}>
                    {msg.category && msg.role === 'assistant' && (
                      <Badge 
                        variant="secondary" 
                        className={`mb-2 ${getCategoryColor(msg.category)} text-xs`}
                      >
                        {msg.category.replace('-', ' ')}
                      </Badge>
                    )}
                    <div className={msg.role === 'user' ? 'text-white' : 'text-slate-800'}>
                      {formatMessageContent(msg.content)}
                    </div>
                    <div className="text-xs opacity-70 mt-2">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {chatMutation.isPending && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Chat Input */}
          <div className="border-t border-slate-200 bg-white p-4">
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
              <div className="flex space-x-3">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask about menu development, kitchen operations, cost optimization, or anything culinary..."
                  className="flex-1 text-base"
                  disabled={chatMutation.isPending}
                />
                <Button 
                  type="submit" 
                  disabled={!message.trim() || chatMutation.isPending}
                  size="lg"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Prompt Bank Sidebar */}
        {showPromptBank && (
          <div className="w-1/3 border-l border-slate-200 bg-slate-50">
            <ScrollArea className="h-full">
              <div className="p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  <h3 className="font-semibold text-slate-900">Expert Prompt Bank</h3>
                </div>
                <p className="text-sm text-slate-600 mb-6">
                  Choose from curated questions designed to get the best AI responses for your restaurant needs.
                </p>

                <Tabs defaultValue="menu" className="space-y-4">
                  <TabsList className="grid grid-cols-2 w-full text-xs">
                    <TabsTrigger value="menu">Menu</TabsTrigger>
                    <TabsTrigger value="operations">Operations</TabsTrigger>
                  </TabsList>
                  
                  <TabsList className="grid grid-cols-2 w-full text-xs">
                    <TabsTrigger value="profitability">Profits</TabsTrigger>
                    <TabsTrigger value="marketing">Marketing</TabsTrigger>
                  </TabsList>
                  
                  <TabsList className="grid grid-cols-2 w-full text-xs">
                    <TabsTrigger value="staff">Staff</TabsTrigger>
                    <TabsTrigger value="innovation">Innovation</TabsTrigger>
                  </TabsList>

                  {Object.entries(promptCategories).map(([key, category]) => (
                    <TabsContent key={key} value={key} className="space-y-3">
                      <div className="flex items-center space-x-2 mb-3">
                        <category.icon className="h-4 w-4 text-primary" />
                        <h4 className="font-medium text-slate-800">{category.title}</h4>
                      </div>
                      
                      {category.prompts.map((prompt, index) => (
                        <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                          <CardContent className="p-3">
                            <h5 className="font-medium text-sm text-slate-800 mb-1">
                              {prompt.title}
                            </h5>
                            <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                              {prompt.prompt.substring(0, 80)}...
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setMessage(prompt.prompt)}
                              className="w-full text-xs"
                            >
                              Use This Prompt
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
