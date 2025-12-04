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

export function useAIMatching() {
  const [loading, setLoading] = useState(false);
  const [matchScores, setMatchScores] = useState<Map<string, AIMatchResult>>(new Map());
  const { toast } = useToast();

  const findMatchesForItem = useCallback(async (item: Item): Promise<AIMatchResult[]> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-match-items", {
        body: { action: "find_matches", item },
      });

      if (error) {
        console.error("AI matching error:", error);
        toast({
          title: "AI Matching Error",
          description: error.message || "Failed to find AI matches",
          variant: "destructive",
        });
        return [];
      }

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
        return [];
      }

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
      return [];
    } finally {
      setLoading(false);
    }
  }, [matchScores]);

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
