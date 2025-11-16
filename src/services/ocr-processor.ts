/**
 * OCR Processor Service (Scaffolding)
 *
 * Placeholder for PaddleOCR integration.
 * For MVP, this provides the interface that will be filled in with actual OCR.
 *
 * Integration Options (for later implementation):
 * 1. ONNX Runtime in browser (complex, but fully offline)
 * 2. Cloud API endpoint (simpler, requires internet)
 * 3. Hybrid approach (local if available, cloud fallback)
 *
 * For now, this returns mock data and allows manual entry fallback.
 */

export interface OCRResult {
  success: boolean;
  confidence: number; // 0-100
  text: string;
  structuredData?: PanelOCRData;
  rawText: string;
  processingTime: number; // milliseconds
  error?: string;
}

export interface PanelOCRData {
  manufacturer?: string;
  model?: string;
  amperage?: number;
  voltage?: number;
  circuits: CircuitOCRData[];
}

export interface CircuitOCRData {
  position: number;
  amperage?: number;
  label?: string;
  confidence: number;
}

export interface OCRProcessOptions {
  language?: 'en' | 'fr'; // English or French
  mode?: 'fast' | 'accurate';
  enhanceImage?: boolean; // Pre-process image for better OCR
}

class OCRProcessorService {
  private isInitialized = false;

  /**
   * Initialize OCR engine
   * (Placeholder - will load ONNX model or connect to API)
   */
  async initialize(): Promise<void> {
    console.log('🔧 OCR Processor: Initializing (placeholder)');

    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, 500));

    this.isInitialized = true;
    console.log('✅ OCR Processor: Ready (mock mode)');
  }

  /**
   * Process panel photo with OCR
   * (Placeholder - returns mock data for now)
   */
  async processImage(
    imageBlob: Blob,
    options: OCRProcessOptions = {}
  ): Promise<OCRResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      // For MVP: Return mock data with instructions for manual entry
      const mockResult: OCRResult = {
        success: false, // Set to false to trigger manual entry
        confidence: 0,
        text: 'OCR integration pending - please enter panel data manually',
        rawText: 'Manual entry mode',
        processingTime: Date.now() - startTime,
        error: 'OCR processing not yet implemented. Using manual entry mode.',
      };

      console.log('📸 OCR Processor: Processed image (mock mode)', {
        size: imageBlob.size,
        type: imageBlob.type,
        result: mockResult,
      });

      return mockResult;
    } catch (error) {
      return {
        success: false,
        confidence: 0,
        text: '',
        rawText: '',
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'OCR processing failed',
      };
    }
  }

  /**
   * Process image from URL or File
   */
  async processImageFromSource(
    source: string | File | Blob,
    options: OCRProcessOptions = {}
  ): Promise<OCRResult> {
    let blob: Blob;

    if (typeof source === 'string') {
      // URL
      const response = await fetch(source);
      blob = await response.blob();
    } else if (source instanceof File) {
      blob = source;
    } else {
      blob = source;
    }

    return this.processImage(blob, options);
  }

  /**
   * Parse circuit labels from raw OCR text
   * (Helper for when OCR is implemented)
   */
  parseCircuitLabels(rawText: string): CircuitOCRData[] {
    // Placeholder - will implement pattern matching when OCR is available
    console.log('🔍 Parsing circuit labels (placeholder):', rawText);

    return [];
  }

  /**
   * Enhance image before OCR
   * (Placeholder - will implement pre-processing)
   */
  async enhanceImage(imageBlob: Blob): Promise<Blob> {
    // Placeholder - will implement:
    // - Contrast enhancement
    // - Noise reduction
    // - Rotation correction
    // - Perspective correction

    console.log('✨ Enhancing image (placeholder)');
    return imageBlob;
  }

  /**
   * Check if OCR is available
   */
  isAvailable(): boolean {
    // For MVP, return false to indicate OCR is not yet implemented
    return false;
  }

  /**
   * Get OCR capabilities
   */
  getCapabilities(): {
    available: boolean;
    languages: string[];
    modes: string[];
    features: string[];
  } {
    return {
      available: false,
      languages: ['en', 'fr'],
      modes: ['fast', 'accurate'],
      features: [
        'Pending PaddleOCR integration',
        'Manual entry fallback available',
        'Future: Automatic circuit detection',
        'Future: Handwriting recognition',
        'Future: Multi-language support',
      ],
    };
  }

  /**
   * Validate OCR result
   */
  validateResult(result: OCRResult): {
    valid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (result.confidence < 50) {
      issues.push('Low OCR confidence');
      suggestions.push('Retake photo with better lighting');
    }

    if (!result.structuredData) {
      issues.push('No structured data extracted');
      suggestions.push('Manual entry required');
    }

    return {
      valid: issues.length === 0,
      issues,
      suggestions,
    };
  }
}

// Export singleton instance
export const ocrProcessor = new OCRProcessorService();

/**
 * Integration Notes for Future Implementation:
 *
 * Option 1: PaddleOCR via ONNX Runtime
 * - Install: @microsoft/onnxruntime-web
 * - Load pre-trained PaddleOCR model
 * - Run inference in browser
 * - Pros: Fully offline, no API costs
 * - Cons: Large model size (~50MB), complex setup
 *
 * Option 2: Cloud API (Tesseract.js or Commercial API)
 * - Install: tesseract.js or use API like Google Vision
 * - Send image to API, receive text
 * - Pros: Simple, good accuracy
 * - Cons: Requires internet, API costs
 *
 * Option 3: Hybrid
 * - Try local OCR first (if model loaded)
 * - Fallback to cloud API if local fails or unavailable
 * - Fallback to manual entry as last resort
 * - Pros: Best user experience
 * - Cons: More complex implementation
 *
 * Recommended for MVP: Option 2 (Cloud API) or manual entry
 * Recommended for Production: Option 3 (Hybrid)
 */
