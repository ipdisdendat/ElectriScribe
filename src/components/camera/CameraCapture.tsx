/**
 * CameraCapture Component
 *
 * Provides camera UI for capturing electrical panel photos.
 * Features:
 * - Live video preview
 * - Camera switching (front/back)
 * - Photo capture
 * - Error handling and permissions
 *
 * Usage:
 * ```tsx
 * <CameraCapture
 *   onCapture={(photo) => console.log(photo)}
 *   onError={(error) => console.error(error)}
 * />
 * ```
 */

import { useEffect, useState } from 'react';
import { useCamera } from '../../hooks/useCamera';
import type { CapturedPhoto } from '../../services/camera';

interface CameraCaptureProps {
  onCapture: (photo: CapturedPhoto) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
  autoStart?: boolean;
}

export default function CameraCapture({
  onCapture,
  onError,
  onClose,
  autoStart = true,
}: CameraCaptureProps) {
  const {
    isActive,
    error,
    capabilities,
    currentFacingMode,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    videoRef,
  } = useCamera();

  const [isCaptured, setIsCaptured] = useState(false);

  // Auto-start camera on mount
  useEffect(() => {
    if (autoStart) {
      startCamera();
    }

    return () => {
      stopCamera();
    };
  }, [autoStart, startCamera, stopCamera]);

  // Notify parent of errors
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const handleCapture = async () => {
    if (!videoRef.current) return;

    const photo = await capturePhoto(videoRef.current);
    if (photo) {
      setIsCaptured(true);
      onCapture(photo);
    }
  };

  const handleRetake = () => {
    setIsCaptured(false);
  };

  const handleSwitchCamera = async () => {
    await switchCamera();
  };

  const handleClose = () => {
    stopCamera();
    if (onClose) {
      onClose();
    }
  };

  // Show error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 bg-base-200">
        <div className="alert alert-error max-w-md">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-current shrink-0 h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="font-bold">Camera Error</h3>
            <div className="text-xs">{error}</div>
          </div>
        </div>

        <div className="mt-6 flex gap-2">
          <button className="btn btn-primary" onClick={() => startCamera()}>
            Retry
          </button>
          {onClose && (
            <button className="btn btn-ghost" onClick={handleClose}>
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show loading state
  if (!capabilities || !isActive) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 bg-base-200">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-4 text-base-content/60">Starting camera...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-base-300">
      {/* Header */}
      <div className="navbar bg-base-100 shadow-lg">
        <div className="flex-1">
          <h2 className="text-lg font-bold">Capture Panel Photo</h2>
        </div>
        <div className="flex-none">
          {onClose && (
            <button className="btn btn-ghost btn-sm" onClick={handleClose}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Video Preview */}
      <div className="flex-1 relative bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />

        {/* Camera Controls Overlay */}
        {!isCaptured && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-4">
              {/* Switch Camera Button */}
              {capabilities.cameras.length > 1 && (
                <button
                  className="btn btn-circle btn-outline border-white text-white hover:bg-white hover:text-black"
                  onClick={handleSwitchCamera}
                  title="Switch Camera"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              )}

              {/* Capture Button */}
              <button
                className="btn btn-circle btn-lg btn-primary shadow-lg"
                onClick={handleCapture}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>

              {/* Spacer for symmetry */}
              {capabilities.cameras.length > 1 && (
                <div className="btn btn-circle btn-ghost opacity-0" />
              )}
            </div>

            {/* Camera Info */}
            <div className="text-center mt-2 text-white/80 text-sm">
              {currentFacingMode === 'environment' ? 'Back Camera' : 'Front Camera'}
            </div>
          </div>
        )}

        {/* Retake Option */}
        {isCaptured && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-4">
              <button className="btn btn-outline border-white text-white" onClick={handleRetake}>
                Retake Photo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="bg-base-100 p-4 border-t border-base-300">
        <div className="text-sm text-base-content/70">
          <strong>Tips for best results:</strong>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Ensure good lighting on the panel</li>
            <li>Hold camera steady and parallel to panel</li>
            <li>Include entire panel in frame</li>
            <li>Avoid glare and shadows</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
