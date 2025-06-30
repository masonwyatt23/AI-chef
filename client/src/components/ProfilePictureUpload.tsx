import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Camera, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ProfilePictureUploadProps {
  currentPicture?: string;
  userName?: string;
  className?: string;
}

export function ProfilePictureUpload({ 
  currentPicture, 
  userName = "User",
  className = ""
}: ProfilePictureUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profilePicture', file);
      
      const response = await fetch('/api/auth/profile-picture', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload profile picture');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate auth query to refetch user data with new profile picture
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setPreviewUrl(null);
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
      setPreviewUrl(null);
    },
    onSettled: () => {
      setUploading(false);
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload the file
    setUploading(true);
    uploadMutation.mutate(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const displayPicture = previewUrl || currentPicture;

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div className="relative group">
        <Avatar className="w-12 h-12 border-2 border-slate-200">
          <AvatarImage 
            src={displayPicture} 
            alt={`${userName}'s profile`}
            className="object-cover"
          />
          <AvatarFallback className="bg-slate-100">
            <User className="h-6 w-6 text-slate-400" />
          </AvatarFallback>
        </Avatar>
        
        {/* Upload overlay */}
        <div 
          className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          onClick={triggerFileInput}
        >
          {uploading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </div>
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium text-slate-700">{userName}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={triggerFileInput}
          disabled={uploading}
          className="h-auto p-0 text-xs text-slate-500 hover:text-slate-700"
        >
          {uploading ? "Uploading..." : "Change photo"}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}