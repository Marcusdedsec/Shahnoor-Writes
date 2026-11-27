import React, { useState } from 'react';
import { ChinarLeafMark } from './KashmiriOrnaments';

interface EditorialImageProps {
  src?: string;
  alt: string;
  className?: string;
  aspectClass?: string;
  priority?: boolean;
}

export const EditorialImage: React.FC<EditorialImageProps> = ({
  src,
  alt,
  className = '',
  aspectClass = 'aspect-[4/3]',
  priority = false,
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`${aspectClass} w-full bg-[#E9DFC9] border border-[#493528]/15 flex flex-col items-center justify-center p-8 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <ChinarLeafMark className="w-10 h-10 text-[#9C443B]/60 mb-3" />
        <p className="font-display italic text-lg text-[#493528]/80 max-w-xs line-clamp-2">
          {alt}
        </p>
      </div>
    );
  }

  return (
    <div className={`${aspectClass} w-full overflow-hidden bg-[#E9DFC9] ${className}`}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        loading={priority ? 'eager' : 'lazy'}
        onError={() => setFailed(true)}
        className="w-full h-full object-cover transition-transform duration-700 ease-out"
      />
    </div>
  );
};
