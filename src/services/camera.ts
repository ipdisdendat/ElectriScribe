/**
 * Camera Service
 *
 * Provides access to device camera for capturing electrical panel photos.
 * Uses navigator.mediaDevices API for modern browser camera access.
 *
 * Features:
 * - Camera stream access
 * - Photo capture from video stream
 * - Camera selection (front/back)
 * - Error handling for permissions
 */

export interface CameraCapabilities {
  hasCamera: boolean;
  cameras: MediaDeviceInfo[];
  permissions: 'granted' | 'denied' | 'prompt' | 'unknown';
}

export interface CaptureOptions {
  width?: number;
  height?: number;
  quality?: number; // 0-1 for JPEG quality
  facingMode?: 'user' | 'environment'; // 'user' = front, 'environment' = back
}

export interface CapturedPhoto {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  timestamp: number;
  deviceId?: string;
}

class CameraService {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;

  /**
   * Check if camera is available and permissions
   */
  async checkCapabilities(): Promise<CameraCapabilities> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        hasCamera: false,
        cameras: [],
        permissions: 'unknown',
      };
    }

    try {
      // Check for camera devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === 'videoinput');

      // Check permissions
      let permissions: CameraCapabilities['permissions'] = 'unknown';
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          permissions = result.state as 'granted' | 'denied' | 'prompt';
        } catch {
          // Some browsers don't support camera permission query
          permissions = 'unknown';
        }
      }

      return {
        hasCamera: cameras.length > 0,
        cameras,
        permissions,
      };
    } catch (error) {
      console.error('Error checking camera capabilities:', error);
      return {
        hasCamera: false,
        cameras: [],
        permissions: 'unknown',
      };
    }
  }

  /**
   * Start camera stream
   */
  async startCamera(options: CaptureOptions = {}): Promise<MediaStream> {
    const {
      width = 1920,
      height = 1080,
      facingMode = 'environment', // Back camera by default for panel photos
    } = options;

    // Stop existing stream if any
    this.stopCamera();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: { ideal: facingMode },
        },
        audio: false,
      });

      return this.stream;
    } catch (error) {
      console.error('Error starting camera:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to access camera. Please check permissions.'
      );
    }
  }

  /**
   * Stop camera stream and release resources
   */
  stopCamera(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }
  }

  /**
   * Capture photo from video stream
   */
  async capturePhoto(
    videoElement: HTMLVideoElement,
    options: CaptureOptions = {}
  ): Promise<CapturedPhoto> {
    const { quality = 0.92 } = options;

    if (!videoElement.srcObject) {
      throw new Error('No active video stream');
    }

    // Create canvas to capture frame
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    // Draw current video frame to canvas
    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        },
        'image/jpeg',
        quality
      );
    });

    // Also create data URL for immediate display
    const dataUrl = canvas.toDataURL('image/jpeg', quality);

    // Get device ID from stream
    const stream = videoElement.srcObject as MediaStream;
    const videoTrack = stream.getVideoTracks()[0];
    const deviceId = videoTrack.getSettings().deviceId;

    return {
      blob,
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      timestamp: Date.now(),
      deviceId,
    };
  }

  /**
   * Switch between front and back camera
   */
  async switchCamera(currentFacingMode: 'user' | 'environment'): Promise<MediaStream> {
    const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    return this.startCamera({ facingMode: newFacingMode });
  }

  /**
   * Get list of available cameras
   */
  async getCameras(): Promise<MediaDeviceInfo[]> {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((device) => device.kind === 'videoinput');
  }

  /**
   * Select specific camera by device ID
   */
  async selectCamera(deviceId: string, options: CaptureOptions = {}): Promise<MediaStream> {
    this.stopCamera();

    const { width = 1920, height = 1080 } = options;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: deviceId },
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      });

      return this.stream;
    } catch (error) {
      console.error('Error selecting camera:', error);
      throw new Error('Failed to access selected camera');
    }
  }

  /**
   * Cleanup - call this when component unmounts
   */
  cleanup(): void {
    this.stopCamera();
  }
}

// Export singleton instance
export const cameraService = new CameraService();
