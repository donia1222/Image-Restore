import { useState, useEffect, useRef } from 'react';

interface ImageComparisonProps {
  originalImage: string;
  enhancedImage: string;
}

export default function ImageComparison({ originalImage, enhancedImage }: ImageComparisonProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      setSliderPosition((x / rect.width) * 100);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSliderPosition((sliderPosition / 100) * rect.width);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sliderPosition]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[400px] overflow-hidden cursor-ew-resize"
      onMouseMove={handleMouseMove}
      onTouchMove={(e) => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const touch = e.touches[0];
          const x = Math.max(0, Math.min(touch.clientX - rect.left, rect.width));
          setSliderPosition((x / rect.width) * 100);
        }
      }}
    >
      <img 
        src={enhancedImage} 
        alt="Imagen mejorada" 
        className="absolute top-0 left-0 w-full h-full object-cover"
      />
      <div 
        className="absolute top-0 left-0 w-full h-full overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img 
          src={originalImage} 
          alt="Imagen original" 
          className="absolute top-0 left-0 w-full h-full object-cover"
        />
      </div>
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </div>
      </div>
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
        Original
      </div>
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
        Mejorada
      </div>
    </div>
  );
}

