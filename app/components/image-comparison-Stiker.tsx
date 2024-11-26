import React, { useState, useEffect, useRef } from 'react';

interface ImageComparisonProps {
  originalImage: string;
  enhancedImage: string;
}

const ImageComparison: React.FC<ImageComparisonProps> = ({ originalImage, enhancedImage }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      setSliderPosition(Math.min(Math.max(x, 0), 100));
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const x = ((touch.clientX - rect.left) / rect.width) * 100;
      setSliderPosition(Math.min(Math.max(x, 0), 100));
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove as any);
      container.addEventListener('touchmove', handleTouchMove as any);
    }
    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove as any);
        container.removeEventListener('touchmove', handleTouchMove as any);
      }
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-96 overflow-hidden rounded-lg shadow-xl"
    >
      <img
        src={enhancedImage}
        alt="Imagen mejorada"
        className="absolute top-0 left-0 w-full h-full object-cover"
      />
      <div
        style={{ width: `${sliderPosition}%` }}
        className="absolute top-0 left-0 h-full overflow-hidden"
      >
        <img
          src={originalImage}
          alt="Imagen original"
          className="absolute top-0 left-0 w-full h-full object-cover"
        />
      </div>
      <div
        style={{ left: `${sliderPosition}%` }}
        className="absolute top-0 w-0.5 h-full bg-white cursor-ew-resize"
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ImageComparison;

