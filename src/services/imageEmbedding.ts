import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = true;

let featureExtractor: any = null;
let modelLoading = false;
let loadingProgress = 0;
let onProgressCallback: ((progress: number) => void) | null = null;

export interface ImageEmbedding {
  imageUrl: string;
  embedding: number[];
}

export const setProgressCallback = (callback: (progress: number) => void) => {
  onProgressCallback = callback;
};

export const getLoadingProgress = () => loadingProgress;

export const isModelLoading = () => modelLoading;

const initializeModel = async (): Promise<any> => {
  if (featureExtractor) return featureExtractor;
  if (modelLoading) {
    // Wait for existing loading to complete
    while (modelLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return featureExtractor;
  }

  modelLoading = true;
  loadingProgress = 0;

  try {
    console.log('Initializing CLIP model for image embeddings...');
    
    featureExtractor = await pipeline(
      'image-feature-extraction',
      'Xenova/clip-vit-base-patch32',
      {
        progress_callback: (progress: any) => {
          if (progress.status === 'progress' && progress.progress) {
            loadingProgress = Math.round(progress.progress);
            onProgressCallback?.(loadingProgress);
          }
        },
      }
    );
    
    loadingProgress = 100;
    onProgressCallback?.(100);
    console.log('CLIP model loaded successfully');
    
    return featureExtractor;
  } catch (error) {
    console.error('Error loading CLIP model:', error);
    throw error;
  } finally {
    modelLoading = false;
  }
};

export const generateImageEmbedding = async (imageUrl: string): Promise<number[]> => {
  const extractor = await initializeModel();
  
  try {
    // Handle both URL and base64 images
    const output = await extractor(imageUrl, { pooling: 'mean', normalize: true });
    
    // Convert to regular array
    const embedding = Array.from(output.data) as number[];
    return embedding;
  } catch (error) {
    console.error('Error generating embedding for image:', imageUrl, error);
    throw error;
  }
};

export const generateBatchEmbeddings = async (
  imageUrls: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, number[]>> => {
  const extractor = await initializeModel();
  const embeddings = new Map<string, number[]>();
  
  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    try {
      const output = await extractor(url, { pooling: 'mean', normalize: true });
      embeddings.set(url, Array.from(output.data) as number[]);
      onProgress?.(i + 1, imageUrls.length);
    } catch (error) {
      console.error('Error generating embedding for:', url, error);
    }
  }
  
  return embeddings;
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const isModelReady = () => featureExtractor !== null;
