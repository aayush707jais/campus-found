import { useState, useCallback } from 'react';
import { useAIMatching, AIMatchResult, Item } from './useAIMatching';
import { useMLImageMatching, MLMatchResult } from './useMLImageMatching';

export interface CombinedMatchResult {
  itemId: string;
  matchedItemId: string;
  combinedScore: number;
  aiScore: number;
  imageScore: number;
  reasoning: string;
}

// Weights for combining scores
const AI_WEIGHT = 0.6;
const IMAGE_WEIGHT = 0.4;

// Toggle to disable AI matching temporarily (set to true to skip AI calls)
const AI_MATCHING_DISABLED = true;

export function useCombinedMatching() {
  const [loading, setLoading] = useState(false);
  const { batchMatchItems, loading: aiLoading } = useAIMatching();
  const { 
    batchComputeSimilarity, 
    loading: mlLoading, 
    modelProgress, 
    modelReady 
  } = useMLImageMatching();

  const combinedBatchMatch = useCallback(async (
    targetItem: Item,
    candidates: Item[],
    onProgress?: (stage: string, progress: number) => void
  ): Promise<CombinedMatchResult[]> => {
    if (candidates.length === 0) return [];
    
    setLoading(true);
    
    try {
      // Stage 1: Run ML image matching
      onProgress?.('image', 0);
      const mlResults = await batchComputeSimilarity(
        targetItem,
        candidates,
        (completed, total) => onProgress?.('image', Math.round((completed / total) * 100))
      );
      
      // Create a map for quick lookup
      const mlScoreMap = new Map<string, number>();
      mlResults.forEach(r => mlScoreMap.set(r.matchedItemId, r.imageSimilarity));
      
      // Stage 2: Run AI context matching (skip if disabled)
      onProgress?.('ai', 0);
      let aiResults: AIMatchResult[] = [];
      
      if (!AI_MATCHING_DISABLED) {
        try {
          aiResults = await batchMatchItems(targetItem, candidates);
        } catch (aiError) {
          console.warn('AI matching failed, using ML results only:', aiError);
        }
      } else {
        console.log('AI matching disabled - using ML only');
      }
      
      // Create map for AI scores
      const aiScoreMap = new Map<string, AIMatchResult>();
      aiResults.forEach(r => aiScoreMap.set(r.matchedItemId, r));
      
      onProgress?.('ai', 100);

      // Stage 3: Combine results
      onProgress?.('combining', 50);
      const combinedResults: CombinedMatchResult[] = [];
      
      // Get all unique item IDs from both result sets
      const allItemIds = new Set([
        ...mlResults.map(r => r.matchedItemId),
        ...aiResults.map(r => r.matchedItemId),
      ]);
      
      allItemIds.forEach(itemId => {
        const aiResult = aiScoreMap.get(itemId);
        const imageScore = mlScoreMap.get(itemId) || 0;
        const aiScore = aiResult?.score || 0;
        
        // Calculate combined score with weights
        let combinedScore: number;
        
        if (imageScore > 0 && aiScore > 0) {
          // Both scores available - use weighted average
          combinedScore = Math.round(aiScore * AI_WEIGHT + imageScore * IMAGE_WEIGHT);
        } else if (aiScore > 0) {
          // Only AI score available
          combinedScore = aiScore;
        } else if (imageScore > 0) {
          // Only image score available
          combinedScore = imageScore;
        } else {
          return; // Skip items with no scores
        }
        
        combinedResults.push({
          itemId: targetItem.id,
          matchedItemId: itemId,
          combinedScore,
          aiScore,
          imageScore,
          reasoning: aiResult?.reasoning || 
            (imageScore > 60 ? 'High visual similarity detected' : 'Moderate visual similarity'),
        });
      });
      
      onProgress?.('combining', 100);

      // Sort by combined score
      return combinedResults
        .filter(r => r.combinedScore >= 30)
        .sort((a, b) => b.combinedScore - a.combinedScore);
        
    } catch (error) {
      console.error('Error in combined matching:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [batchMatchItems, batchComputeSimilarity]);

  return {
    loading: loading || aiLoading || mlLoading,
    modelProgress,
    modelReady,
    combinedBatchMatch,
  };
}
