import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Crosshair, ArrowUpRight, Circle, SunMoon, Maximize2 } from 'lucide-react';
import type { SpotterPin } from '../../types';

interface SpecimenViewerProps {
  imageUrl: string;
  altText?: string;
  spotterPin?: SpotterPin;
  interactivePinPlacement?: boolean;
  onPinPlaced?: (pin: SpotterPin) => void;
  selectedPointerType?: 'arrow' | 'ring' | 'crosshair';
  selectedPointerLabel?: string;
  className?: string;
  showControls?: boolean;
}

export const SpecimenViewer: React.FC<SpecimenViewerProps> = ({
  imageUrl,
  altText = 'Medical specimen image',
  spotterPin,
  interactivePinPlacement = false,
  onPinPlaced,
  selectedPointerType = 'arrow',
  selectedPointerLabel = 'Pointer A',
  className = '',
  showControls = true,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomLevel((prev) => Math.min(prev + 0.4, 3.5));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomLevel((prev) => {
      const next = Math.max(prev - 0.4, 1);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetZoom = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoomLevel > 1) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactivePinPlacement || !onPinPlaced || !imageRef.current) return;
    if (isDragging) return;

    const rect = imageRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (
      clientX < rect.left ||
      clientX > rect.right ||
      clientY < rect.top ||
      clientY > rect.bottom
    ) {
      return;
    }

    const x = Math.round(((clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((clientY - rect.top) / rect.height) * 100);

    onPinPlaced({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
      label: selectedPointerLabel || 'Pointer A',
      pointerType: selectedPointerType || 'arrow',
    });
  };

  // Wheel zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          setZoomLevel((z) => Math.min(z + 0.2, 3.5));
        } else {
          setZoomLevel((z) => {
            const next = Math.max(z - 0.2, 1);
            if (next === 1) setPanOffset({ x: 0, y: 0 });
            return next;
          });
        }
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-slate-950 rounded-xl border border-slate-800 select-none flex flex-col items-center justify-center ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : className
      }`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : interactivePinPlacement ? 'crosshair' : 'default' }}
    >
      {/* Specimen Surface */}
      <div
        onClick={handleImageClick}
        className="relative inline-block transition-transform duration-75 origin-center max-w-full max-h-full"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
        }}
      >
        <img
          ref={imageRef}
          src={imageUrl}
          alt={altText}
          referrerPolicy="no-referrer"
          className={`block max-h-[500px] w-auto object-contain mx-auto transition-filter ${
            highContrast ? 'contrast-150 brightness-110 saturate-125' : ''
          }`}
          draggable={false}
        />

        {/* Spotter Pointer Marker Overlay */}
        {spotterPin && (
          <div
            className="absolute z-10 pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${spotterPin.x}%`, top: `${spotterPin.y}%` }}
          >
            {/* 1. Arrow Pointer */}
            {spotterPin.pointerType === 'arrow' && (
              <div className="relative flex flex-col items-center -translate-x-3 -translate-y-9">
                <div className="bg-rose-950/95 text-white text-[11px] font-bold px-2 py-0.5 rounded shadow-lg border border-rose-700 whitespace-nowrap">
                  {spotterPin.label || 'Pointer'}
                </div>
                <svg width="24" height="24" viewBox="0 0 24 24" className="drop-shadow-md">
                  <polygon points="12,24 4,6 20,6" fill="#e11d48" stroke="#ffffff" strokeWidth="1.5" />
                </svg>
              </div>
            )}

            {/* 2. Ring Target */}
            {spotterPin.pointerType === 'ring' && (
              <div className="relative flex flex-col items-center">
                <div className="w-10 h-10 rounded-full border-2 border-rose-500 bg-rose-500/20 shadow-md flex items-center justify-center animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-rose-600"></div>
                </div>
                {spotterPin.label && (
                  <span className="absolute -top-6 bg-rose-950 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-rose-800 whitespace-nowrap">
                    {spotterPin.label}
                  </span>
                )}
              </div>
            )}

            {/* 3. Optical Crosshair */}
            {spotterPin.pointerType === 'crosshair' && (
              <div className="relative flex flex-col items-center">
                <div className="w-12 h-12 relative flex items-center justify-center">
                  <div className="absolute w-full h-[1.5px] bg-emerald-400 drop-shadow"></div>
                  <div className="absolute h-full w-[1.5px] bg-emerald-400 drop-shadow"></div>
                  <div className="w-4 h-4 rounded-full border border-emerald-300"></div>
                </div>
                {spotterPin.label && (
                  <span className="absolute -top-5 bg-emerald-950 text-emerald-200 text-[10px] font-mono px-1.5 py-0.5 rounded border border-emerald-600 whitespace-nowrap">
                    {spotterPin.label}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Viewport Toolbars */}
      {showControls && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-700 text-slate-200 text-xs shadow-lg">
          <span className="font-mono text-[11px] text-slate-400 mr-1.5">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          {zoomLevel > 1 && (
            <button
              onClick={handleResetZoom}
              title="Reset Zoom"
              className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <div className="w-[1px] h-4 bg-slate-700 mx-0.5"></div>
          <button
            onClick={() => setHighContrast(!highContrast)}
            title="Toggle Stain Contrast Enhancement"
            className={`p-1 rounded transition-colors ${
              highContrast ? 'text-amber-400 bg-slate-800' : 'hover:text-white hover:bg-slate-800'
            }`}
          >
            <SunMoon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Toggle Fullscreen"
            className="p-1 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Helper guidance overlay when in pin placement authoring mode */}
      {interactivePinPlacement && (
        <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md border border-rose-800/60 text-slate-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></div>
          <span>Click anywhere on specimen to place <strong>{selectedPointerLabel}</strong></span>
          {spotterPin && (
            <span className="font-mono text-slate-400 ml-1">
              ({spotterPin.x}%, {spotterPin.y}%)
            </span>
          )}
        </div>
      )}
    </div>
  );
};
