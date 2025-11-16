/**
 * Photo Storage Service
 *
 * Handles photo compression, thumbnail generation, and storage optimization.
 * Reduces storage space while maintaining quality for electrical panel photos.
 *
 * Features:
 * - Image compression (JPEG quality adjustment)
 * - Thumbnail generation (for list views)
 * - Size optimization (target sizes for panels)
 * - Blob/URL conversion utilities
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  targetSizeKB?: number; // Target file size in KB (approximate)
}

export interface ResizeResult {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

class PhotoStorageService {
  /**
   * Compress and resize image
   */
  async compressImage(blob: Blob, options: CompressionOptions = {}): Promise<ResizeResult> {
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.92,
    } = options;

    // Load image
    const img = await this.blobToImage(blob);

    // Calculate new dimensions while maintaining aspect ratio
    let { width, height } = this.calculateDimensions(
      img.width,
      img.height,
      maxWidth,
      maxHeight
    );

    // Create canvas and draw resized image
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Use better image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw image
    ctx.drawImage(img, 0, 0, width, height);

    // Convert to blob
    const compressedBlob = await this.canvasToBlob(canvas, 'image/jpeg', quality);
    const dataUrl = canvas.toDataURL('image/jpeg', quality);

    return {
      blob: compressedBlob,
      dataUrl,
      width,
      height,
      originalSize: blob.size,
      compressedSize: compressedBlob.size,
      compressionRatio: compressedBlob.size / blob.size,
    };
  }

  /**
   * Generate thumbnail from image
   */
  async generateThumbnail(
    blob: Blob,
    size: number = 200,
    quality: number = 0.8
  ): Promise<ResizeResult> {
    return this.compressImage(blob, {
      maxWidth: size,
      maxHeight: size,
      quality,
    });
  }

  /**
   * Optimize panel photo for storage
   * - Original: 1920x1080 at 92% quality
   * - Thumbnail: 400x300 at 80% quality
   */
  async optimizePanelPhoto(blob: Blob): Promise<{
    original: ResizeResult;
    thumbnail: ResizeResult;
  }> {
    const [original, thumbnail] = await Promise.all([
      this.compressImage(blob, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.92,
      }),
      this.generateThumbnail(blob, 400, 0.8),
    ]);

    return { original, thumbnail };
  }

  /**
   * Calculate dimensions maintaining aspect ratio
   */
  private calculateDimensions(
    srcWidth: number,
    srcHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    let width = srcWidth;
    let height = srcHeight;

    // Scale down if needed
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    return { width, height };
  }

  /**
   * Convert blob to Image element
   */
  private async blobToImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);

      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };

      img.src = url;
    });
  }

  /**
   * Convert canvas to blob
   */
  private async canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string = 'image/jpeg',
    quality: number = 0.92
  ): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        type,
        quality
      );
    });
  }

  /**
   * Convert blob to data URL
   */
  async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read blob'));
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Convert data URL to blob
   */
  async dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const response = await fetch(dataUrl);
    return response.blob();
  }

  /**
   * Estimate storage size for panel photos
   */
  estimateStorageSize(panelCount: number): {
    originalMB: number;
    thumbnailMB: number;
    totalMB: number;
  } {
    // Average sizes based on typical electrical panel photos
    const avgOriginalKB = 350; // ~350 KB per original at 1920x1080, 92% quality
    const avgThumbnailKB = 25; // ~25 KB per thumbnail at 400x300, 80% quality

    const originalMB = (panelCount * avgOriginalKB) / 1024;
    const thumbnailMB = (panelCount * avgThumbnailKB) / 1024;

    return {
      originalMB: Math.round(originalMB * 10) / 10,
      thumbnailMB: Math.round(thumbnailMB * 10) / 10,
      totalMB: Math.round((originalMB + thumbnailMB) * 10) / 10,
    };
  }

  /**
   * Format bytes to human-readable size
   */
  formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Rotate image (for orientation correction)
   */
  async rotateImage(blob: Blob, degrees: 90 | 180 | 270): Promise<Blob> {
    const img = await this.blobToImage(blob);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Swap dimensions for 90/270 degree rotations
    if (degrees === 90 || degrees === 270) {
      canvas.width = img.height;
      canvas.height = img.width;
    } else {
      canvas.width = img.width;
      canvas.height = img.height;
    }

    // Rotate
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((degrees * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);

    return this.canvasToBlob(canvas);
  }

  /**
   * Crop image to specific dimensions
   */
  async cropImage(
    blob: Blob,
    cropArea: { x: number; y: number; width: number; height: number }
  ): Promise<Blob> {
    const img = await this.blobToImage(blob);

    const canvas = document.createElement('canvas');
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(
      img,
      cropArea.x,
      cropArea.y,
      cropArea.width,
      cropArea.height,
      0,
      0,
      cropArea.width,
      cropArea.height
    );

    return this.canvasToBlob(canvas);
  }
}

// Export singleton instance
export const photoStorage = new PhotoStorageService();
