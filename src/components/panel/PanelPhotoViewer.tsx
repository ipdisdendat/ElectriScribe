/**
 * PanelPhotoViewer Component
 *
 * Displays panel photos with zoom, pan, and fullscreen capabilities.
 * Shows both original and thumbnail versions.
 *
 * Usage:
 * ```tsx
 * <PanelPhotoViewer
 *   photos={panelPhotos}
 *   onClose={() => setViewerOpen(false)}
 * />
 * ```
 */

import { useState, useRef, useEffect } from 'react';
import type { OfflinePhoto } from '../../services/offline-database';

interface PanelPhotoViewerProps {
  photos: OfflinePhoto[];
  initialIndex?: number;
  onClose?: () => void;
  showThumbnails?: boolean;
}

export default function PanelPhotoViewer({
  photos,
  initialIndex = 0,
  onClose,
  showThumbnails = true,
}: PanelPhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const currentPhoto = photos[currentIndex];

  // Load current photo blob as URL
  useEffect(() => {
    if (currentPhoto) {
      const url = URL.createObjectURL(currentPhoto.blob);
      setPhotoUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [currentPhoto]);

  // Reset zoom when changing photos
  useEffect(() => {
    setZoom(1);
  }, [currentIndex]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoom(1);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case '+':
        case '=':
          handleZoomIn();
          break;
        case '-':
          handleZoomOut();
          break;
        case '0':
          handleResetZoom();
          break;
        case 'Escape':
          if (isFullscreen) {
            handleToggleFullscreen();
          } else if (onClose) {
            onClose();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onClose]);

  if (!currentPhoto) {
    return (
      <div className="flex items-center justify-center h-full bg-base-200">
        <div className="alert alert-warning">
          <span>No photos available</span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-base-300"
    >
      {/* Header */}
      <div className="navbar bg-base-100 shadow-lg">
        <div className="flex-1">
          <h2 className="text-lg font-bold">
            Panel Photo {currentIndex + 1} of {photos.length}
          </h2>
        </div>
        <div className="flex-none gap-2">
          {/* Zoom Controls */}
          <div className="join">
            <button
              className="btn btn-sm join-item"
              onClick={handleZoomOut}
              disabled={zoom <= 0.5}
              title="Zoom Out (-)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
                />
              </svg>
            </button>
            <button
              className="btn btn-sm join-item"
              onClick={handleResetZoom}
              title="Reset Zoom (0)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              className="btn btn-sm join-item"
              onClick={handleZoomIn}
              disabled={zoom >= 3}
              title="Zoom In (+)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
                />
              </svg>
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            className="btn btn-sm"
            onClick={handleToggleFullscreen}
            title="Toggle Fullscreen"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>

          {/* Close Button */}
          {onClose && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={onClose}
              title="Close (Esc)"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Image Viewer */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {/* Navigation Arrows */}
        {photos.length > 1 && (
          <>
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 btn btn-circle btn-lg z-10 bg-black/50 border-white/20 hover:bg-black/70"
              onClick={handlePrevious}
              title="Previous (←)"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 btn btn-circle btn-lg z-10 bg-black/50 border-white/20 hover:bg-black/70"
              onClick={handleNext}
              title="Next (→)"
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        {/* Image */}
        <div className="w-full h-full flex items-center justify-center overflow-auto">
          <img
            ref={imageRef}
            src={photoUrl}
            alt={`Panel photo ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
          />
        </div>
      </div>

      {/* Thumbnail Strip */}
      {showThumbnails && photos.length > 1 && (
        <div className="bg-base-100 p-2 border-t border-base-300">
          <div className="flex gap-2 overflow-x-auto">
            {photos.map((photo, index) => (
              <ThumbnailButton
                key={photo.id}
                photo={photo}
                isActive={index === currentIndex}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Photo Info */}
      <div className="bg-base-100 p-2 border-t border-base-300 text-sm">
        <div className="flex items-center justify-between text-base-content/70">
          <span>
            {currentPhoto.photo_type === 'original' ? 'Original' : 'Thumbnail'} •
            {currentPhoto.width && currentPhoto.height && ` ${currentPhoto.width}×${currentPhoto.height} • `}
            {(currentPhoto.file_size / 1024).toFixed(0)} KB
          </span>
          <span>
            {new Date(currentPhoto.created_at).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// Thumbnail Button Component
interface ThumbnailButtonProps {
  photo: OfflinePhoto;
  isActive: boolean;
  onClick: () => void;
}

function ThumbnailButton({ photo, isActive, onClick }: ThumbnailButtonProps) {
  const [thumbUrl, setThumbUrl] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(photo.blob);
    setThumbUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [photo]);

  return (
    <button
      className={`
        flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all
        ${isActive ? 'border-primary ring-2 ring-primary' : 'border-base-300 hover:border-primary/50'}
      `}
      onClick={onClick}
    >
      <img
        src={thumbUrl}
        alt="Thumbnail"
        className="w-full h-full object-cover"
      />
    </button>
  );
}
