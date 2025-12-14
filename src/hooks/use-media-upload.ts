import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UploadResult {
  url: string;
  path: string;
}

export function useMediaUpload() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (
    file: File,
    folder: string = "general"
  ): Promise<UploadResult | null> => {
    setIsUploading(true);
    setProgress(0);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("media-uploads")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("media-uploads")
        .getPublicUrl(data.path);

      setProgress(100);

      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível fazer o upload do arquivo.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from("media-uploads")
        .remove([path]);

      if (error) {
        throw error;
      }

      return true;
    } catch (error: any) {
      console.error("Delete error:", error);
      return false;
    }
  };

  return {
    uploadFile,
    deleteFile,
    isUploading,
    progress,
  };
}
