import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Send, Bot, User, Paperclip, Mic } from "lucide-react";
import type { Message } from "@shared/schema";

interface ChatInterfaceProps {
  restaurantId: number;
  conversationId: number | null;
  onConversationChange: (id: number) => void;
}

export function ChatInterface({ restaurantId, conversationId, onConversationChange }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      if (conversationId) {
        queryClient.invalidateQueries({ 
          queryKey: [`/api/conversations/${conversationId}/messages`] 
        });
      }
      queryClient.invalidateQueries({ 
        queryKey: [`/api/restaurants/${restaurantId}/recommendations`] 
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
    // Simple formatting for better readability
    return content
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('**') && line.endsWith('**')) {
          return <div key={index} className="font-semibold mt-2 mb-1">{line.slice(2, -2)}</div>;
        }
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return <div key={index} className="ml-4 text-sm">{line}</div>;
        }
        if (line.trim() === '') {
          return <div key={index} className="h-2"></div>;
        }
        return <div key={index} className="text-sm">{line}</div>;
      });
  };

  return (
    <Card className="h-96 flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">AI Chef Conversation</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-muted-foreground">Connected</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.length === 0 && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="bg-slate-50 rounded-lg p-3 max-w-lg">
                <p className="text-sm text-slate-800">
                  Hello! I'm your AI Chef Assistant. I'm here to help you develop amazing menu items, 
                  optimize your kitchen operations, and create signature dishes that will delight your customers. 
                  What would you like to work on today?
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start space-x-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
              )}
              
              <div className={`rounded-lg p-3 max-w-lg ${
                msg.role === 'user' 
                  ? 'bg-primary text-white' 
                  : 'bg-slate-50'
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
              <div className="bg-slate-50 rounded-lg p-3">
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

        {/* Chat Input */}
        <div className="p-4 border-t border-slate-200">
          <form onSubmit={handleSubmit} className="flex space-x-3">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask your AI Chef anything..."
              className="flex-1"
              disabled={chatMutation.isPending}
            />
            <Button 
              type="submit" 
              disabled={!message.trim() || chatMutation.isPending}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="flex items-center space-x-4 mt-2">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              <Paperclip className="h-3 w-3 mr-1" />
              Attach Menu
            </Button>
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
              <Mic className="h-3 w-3 mr-1" />
              Voice
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
