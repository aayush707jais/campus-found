import { Progress } from "@/components/ui/progress";
import { Loader2, Cpu } from "lucide-react";

interface ModelLoadingIndicatorProps {
  progress: number;
  isLoading: boolean;
  modelReady: boolean;
}

export const ModelLoadingIndicator = ({ 
  progress, 
  isLoading, 
  modelReady 
}: ModelLoadingIndicatorProps) => {
  if (modelReady) return null;
  
  if (!isLoading && progress === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Cpu className="h-4 w-4" />
        <span>ML model ready to load</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 bg-muted/50 rounded-lg border">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
        <span className="font-medium">Loading ML Image Model...</span>
        <span className="text-muted-foreground">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
      <p className="text-xs text-muted-foreground">
        First-time download ~150MB. Cached for future visits.
      </p>
    </div>
  );
};
