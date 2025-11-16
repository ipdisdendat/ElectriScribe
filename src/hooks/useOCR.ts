/**
 * useOCR Hook
 *
 * React hook for OCR processing of panel photos.
 * Currently uses scaffolding/mock mode - will integrate PaddleOCR in Phase 5.
 *
 * Usage:
 * ```tsx
 * const { processPhoto, isProcessing, result, error } = useOCR();
 *
 * const handlePhoto = async (blob: Blob) => {
 *   const ocrResult = await processPhoto(blob);
 *   if (ocrResult.success) {
 *     // Use structured data
 *   }
 * };
 * ```
 */

import { useState, useCallback } from 'react';
import {
  ocrProcessor,
  type OCRResult,
  type OCRProcessOptions,
} from '../services/ocr-processor';

export interface UseOCRReturn {
  // State
  isProcessing: boolean;
  result: OCRResult | null;
  error: string | null;
  isAvailable: boolean;

  // Actions
  processPhoto: (imageBlob: Blob, options?: OCRProcessOptions) => Promise<OCRResult>;
  processPhotoFromSource: (source: string | File | Blob, options?: OCRProcessOptions) => Promise<OCRResult>;
  clearResult: () => void;
  clearError: () => void;
}

export function useOCR(): UseOCRReturn {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Process photo with OCR
   */
  const processPhoto = useCallback(async (
    imageBlob: Blob,
    options?: OCRProcessOptions
  ): Promise<OCRResult> => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const ocrResult = await ocrProcessor.processImage(imageBlob, options);

      setResult(ocrResult);

      if (!ocrResult.success) {
        setError(ocrResult.error || 'OCR processing failed');
      }

      return ocrResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OCR processing failed';
      setError(errorMessage);

      const failedResult: OCRResult = {
        success: false,
        confidence: 0,
        text: '',
        rawText: '',
        processingTime: 0,
        error: errorMessage,
      };

      setResult(failedResult);
      return failedResult;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Process photo from various sources (URL, File, Blob)
   */
  const processPhotoFromSource = useCallback(async (
    source: string | File | Blob,
    options?: OCRProcessOptions
  ): Promise<OCRResult> => {
    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const ocrResult = await ocrProcessor.processImageFromSource(source, options);

      setResult(ocrResult);

      if (!ocrResult.success) {
        setError(ocrResult.error || 'OCR processing failed');
      }

      return ocrResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'OCR processing failed';
      setError(errorMessage);

      const failedResult: OCRResult = {
        success: false,
        confidence: 0,
        text: '',
        rawText: '',
        processingTime: 0,
        error: errorMessage,
      };

      setResult(failedResult);
      return failedResult;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Clear OCR result
   */
  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isProcessing,
    result,
    error,
    isAvailable: ocrProcessor.isAvailable(),
    processPhoto,
    processPhotoFromSource,
    clearResult,
    clearError,
  };
}
