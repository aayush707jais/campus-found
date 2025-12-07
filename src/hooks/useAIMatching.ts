import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AIMatchResult {
  itemId: string;
  matchedItemId: string;
  score: number;
  reasoning: string;
}

export interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  date: string;
  type: "lost" | "found";
  image_url: string | null;
  user_id: string;
}

// Track rate limit state across hook instances
let isRateLimited = false;
let rateLimitResetTime = 0;
let pendingRequest = false; // Prevent concurrent requests

export function useAIMatching() {
  const [loading, setLoading] = useState(false);
  const [matchScores, setMatchScores] = useState<Map<string, AIMatchResult>>(new Map());
  const [hasShownError, setHasShownError] = useState(false);
  const { toast } = useToast();

  const findMatchesForItem = useCallback(async (item: Item): Promise<AIMatchResult[]> => {
    // Skip if currently rate limited
    if (isRateLimited && Date.now() < rateLimitResetTime) {
      console.log("Skipping AI call - rate limited");
      return [];
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-match-items", {
        body: { action: "find_matches", item },
      });

      if (error) {
        console.error("AI matching error:", error);
        // Set rate limit flag for 2 minutes
        isRateLimited = true;
        rateLimitResetTime = Date.now() + 120000;
        toast({
          title: "AI Matching Error",
          description: error.message || "Failed to find AI matches",
          variant: "destructive",
        });
        return [];
      }

      // Reset rate limit on success
      isRateLimited = false;

      const matches = data?.matches || [];
      
      // Store matches in state
      const newScores = new Map(matchScores);
      matches.forEach((m: AIMatchResult) => {
        newScores.set(m.matchedItemId, m);
      });
      setMatchScores(newScores);

      if (matches.length > 0) {
        toast({
          title: "Potential Matches Found!",
          description: `AI found ${matches.length} potential match${matches.length > 1 ? "es" : ""} for your item.`,
        });
      }

      return matches;
    } catch (err) {
      console.error("Error finding AI matches:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [matchScores, toast]);

  const batchMatchItems = useCallback(async (
    targetItem: Item,
    candidateItems: Item[]
  ): Promise<AIMatchResult[]> => {
    if (candidateItems.length === 0) return [];
    
    // Skip if currently rate limited - don't make more calls
    if (isRateLimited && Date.now() < rateLimitResetTime) {
      console.log("Skipping AI batch call - rate limited, using ML only");
      return [];
    }

    // Skip if another request is already in flight (prevents duplicate calls)
    if (pendingRequest) {
      console.log("Skipping AI batch call - request already in flight");
      return [];
    }
    
    pendingRequest = true;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-match-items", {
        body: { 
          action: "batch_match", 
          targetItem,
          items: candidateItems 
        },
      });

      if (error) {
        console.error("Batch matching error:", error);
        // Set rate limit flag for 2 minutes to avoid repeated calls
        isRateLimited = true;
        rateLimitResetTime = Date.now() + 120000;
        
        // Show toast only once per session to avoid spam
        if (!hasShownError) {
          setHasShownError(true);
          toast({
            title: "AI matching unavailable",
            description: "Using ML image matching only. AI will retry in 2 minutes.",
            variant: "destructive",
          });
        }
        return [];
      }

      // Check if data contains an error (edge function returned error body)
      if (data?.error) {
        console.error("AI service error:", data.error);
        isRateLimited = true;
        rateLimitResetTime = Date.now() + 120000;
        
        if (!hasShownError) {
          setHasShownError(true);
          toast({
            title: "AI matching unavailable",
            description: "Using ML image matching only. AI will retry in 2 minutes.",
            variant: "destructive",
          });
        }
        return [];
      }

      // Reset rate limit on success
      isRateLimited = false;

      const matches = data?.matches || [];
      
      // Update state with new scores
      const newScores = new Map(matchScores);
      matches.forEach((m: AIMatchResult) => {
        newScores.set(m.matchedItemId, m);
      });
      setMatchScores(newScores);

      return matches;
    } catch (err) {
      console.error("Error in batch matching:", err);
      // Silently fail - ML matching will still work
      return [];
    } finally {
      pendingRequest = false;
      setLoading(false);
    }
  }, [matchScores, toast, hasShownError]);

  const getMatchScore = useCallback(async (
    item1: Item,
    item2: Item
  ): Promise<{ score: number; reasoning: string } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("ai-match-items", {
        body: { action: "get_match_score", item: item1, targetItem: item2 },
      });

      if (error) {
        console.error("Get match score error:", error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Error getting match score:", err);
      return null;
    }
  }, []);

  const getStoredMatch = useCallback((itemId: string): AIMatchResult | undefined => {
    return matchScores.get(itemId);
  }, [matchScores]);

  const clearMatches = useCallback(() => {
    setMatchScores(new Map());
  }, []);

  return {
    loading,
    matchScores,
    findMatchesForItem,
    batchMatchItems,
    getMatchScore,
    getStoredMatch,
    clearMatches,
  };
}
