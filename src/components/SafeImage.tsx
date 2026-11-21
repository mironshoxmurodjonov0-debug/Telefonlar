import { useState } from 'react';
import { Smartphone } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  darkSurface?: boolean;
}

export function SafeImage({ src, alt, className = '', darkSurface = false }: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 p-6 text-center ${
          darkSurface
            ? 'bg-gradient-to-br from-[#111714] to-[#0A0D0B] text-white/70'
            : 'bg-gradient-to-br from-[#F3F6F4] to-[#E8EEEA] text-[#4C5951]'
        } ${className}`}
        role="img"
        aria-label={alt}
      >
        <Smartphone className="h-10 w-10 text-[#16A34A]" strokeWidth={1.5} />
        <span className="max-w-[20ch] text-xs font-medium">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
