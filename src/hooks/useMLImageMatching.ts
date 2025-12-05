import { useState, useCallback, useRef } from 'react';
import {
  generateImageEmbedding,
  cosineSimilarity,
  setProgressCallback,
  isModelLoading,
  isModelReady,
} from '@/services/imageEmbedding';

export interface MLMatchResult {
  itemId: string;
  matchedItemId: string;
  imageSimilarity: number;
}

export interface ItemWithImage {
  id: string;
  image_url: string | null;
}

export function useMLImageMatching() {
  const [loading, setLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState(0);
  const [modelReady, setModelReady] = useState(isModelReady());
  const embeddingCache = useRef<Map<string, number[]>>(new Map());

  // Set up progress callback
  setProgressCallback((progress) => {
    setModelProgress(progress);
    if (progress === 100) {
      setModelReady(true);
    }
  });

  const getEmbedding = useCallback(async (imageUrl: string): Promise<number[] | null> => {
    // Skip local/placeholder images
    if (!imageUrl || imageUrl.startsWith('/') || imageUrl.startsWith('src/')) {
      return null;
    }

    // Check cache
    if (embeddingCache.current.has(imageUrl)) {
      return embeddingCache.current.get(imageUrl)!;
    }

    try {
      const embedding = await generateImageEmbedding(imageUrl);
      embeddingCache.current.set(imageUrl, embedding);
      return embedding;
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      return null;
    }
  }, []);

  const computeImageSimilarity = useCallback(async (
    sourceItem: ItemWithImage,
    targetItem: ItemWithImage
  ): Promise<number> => {
    if (!sourceItem.image_url || !targetItem.image_url) {
      return 0;
    }

    const [sourceEmbedding, targetEmbedding] = await Promise.all([
      getEmbedding(sourceItem.image_url),
      getEmbedding(targetItem.image_url),
    ]);

    if (!sourceEmbedding || !targetEmbedding) {
      return 0;
    }

    const similarity = cosineSimilarity(sourceEmbedding, targetEmbedding);
    // Convert from [-1, 1] range to [0, 100] percentage
    return Math.round(((similarity + 1) / 2) * 100);
  }, [getEmbedding]);

  const batchComputeSimilarity = useCallback(async (
    sourceItem: ItemWithImage,
    candidates: ItemWithImage[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<MLMatchResult[]> => {
    if (!sourceItem.image_url) {
      return [];
    }

    setLoading(true);
    const results: MLMatchResult[] = [];

    try {
      // Get source embedding first
      const sourceEmbedding = await getEmbedding(sourceItem.image_url);
      if (!sourceEmbedding) {
        setLoading(false);
        return [];
      }

      // Process candidates
      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        
        if (candidate.image_url) {
          const candidateEmbedding = await getEmbedding(candidate.image_url);
          
          if (candidateEmbedding) {
            const similarity = cosineSimilarity(sourceEmbedding, candidateEmbedding);
            const score = Math.round(((similarity + 1) / 2) * 100);
            
            results.push({
              itemId: sourceItem.id,
              matchedItemId: candidate.id,
              imageSimilarity: score,
            });
          }
        }
        
        onProgress?.(i + 1, candidates.length);
      }

      return results.sort((a, b) => b.imageSimilarity - a.imageSimilarity);
    } catch (error) {
      console.error('Error in batch similarity computation:', error);
      return results;
    } finally {
      setLoading(false);
    }
  }, [getEmbedding]);

  const clearCache = useCallback(() => {
    embeddingCache.current.clear();
  }, []);

  return {
    loading,
    modelProgress,
    modelReady,
    isModelLoading: isModelLoading(),
    computeImageSimilarity,
    batchComputeSimilarity,
    clearCache,
  };
}
