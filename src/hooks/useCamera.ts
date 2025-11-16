/**
 * useCamera Hook
 *
 * React hook for camera access and photo capture.
 * Handles camera permissions, stream management, and cleanup.
 *
 * Usage:
 * ```tsx
 * const { startCamera, capturePhoto, stopCamera, isActive, error } = useCamera();
 *
 * const handleStart = async () => {
 *   const stream = await startCamera();
 *   videoRef.current.srcObject = stream;
 * };
 *
 * const handleCapture = async () => {
 *   const photo = await capturePhoto(videoRef.current);
 *   // Use photo.blob or photo.dataUrl
 * };
 * ```
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  cameraService,
  type CameraCapabilities,
  type CaptureOptions,
  type CapturedPhoto,
} from '../services/camera';

export interface UseCameraReturn {
  // State
  isActive: boolean;
  error: string | null;
  capabilities: CameraCapabilities | null;
  currentFacingMode: 'user' | 'environment';

  // Actions
  startCamera: (options?: CaptureOptions) => Promise<MediaStream | null>;
  stopCamera: () => void;
  capturePhoto: (videoElement: HTMLVideoElement) => Promise<CapturedPhoto | null>;
  switchCamera: () => Promise<void>;
  checkCapabilities: () => Promise<void>;

  // Refs
  videoRef: React.RefObject<HTMLVideoElement>;
}

export function useCamera(): UseCameraReturn {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<CameraCapabilities | null>(null);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);

  /**
   * Check camera capabilities on mount
   */
  const checkCapabilities = useCallback(async () => {
    try {
      const caps = await cameraService.checkCapabilities();
      setCapabilities(caps);

      if (!caps.hasCamera) {
        setError('No camera detected on this device');
      } else if (caps.permissions === 'denied') {
        setError('Camera permission denied. Please enable camera access in browser settings.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check camera capabilities');
    }
  }, []);

  /**
   * Start camera stream
   */
  const startCamera = useCallback(async (options?: CaptureOptions): Promise<MediaStream | null> => {
    try {
      setError(null);
      const stream = await cameraService.startCamera(options || { facingMode: currentFacingMode });

      // Attach to video element if available
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsActive(true);
      return stream;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start camera';
      setError(errorMessage);
      setIsActive(false);
      return null;
    }
  }, [currentFacingMode]);

  /**
   * Stop camera stream
   */
  const stopCamera = useCallback(() => {
    cameraService.stopCamera();

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsActive(false);
    setError(null);
  }, []);

  /**
   * Capture photo from video stream
   */
  const capturePhoto = useCallback(async (videoElement: HTMLVideoElement): Promise<CapturedPhoto | null> => {
    try {
      setError(null);
      const photo = await cameraService.capturePhoto(videoElement);
      return photo;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to capture photo';
      setError(errorMessage);
      return null;
    }
  }, []);

  /**
   * Switch between front and back camera
   */
  const switchCamera = useCallback(async () => {
    try {
      setError(null);
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
      const stream = await cameraService.switchCamera(currentFacingMode);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCurrentFacingMode(newFacingMode);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch camera';
      setError(errorMessage);
    }
  }, [currentFacingMode]);

  /**
   * Check capabilities on mount
   */
  useEffect(() => {
    checkCapabilities();
  }, [checkCapabilities]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cameraService.cleanup();
    };
  }, []);

  return {
    isActive,
    error,
    capabilities,
    currentFacingMode,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    checkCapabilities,
    videoRef,
  };
}
