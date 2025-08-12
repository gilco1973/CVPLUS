import React from 'react';

interface LogoProps {
  className?: string;
  showSlogan?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  showSlogan = false, 
  size = 'medium'
}) => {
  const sizeMap = {
    small: { height: 'h-10', textSize: 'text-xl' },
    medium: { height: 'h-12', textSize: 'text-2xl' },
    large: { height: 'h-16', textSize: 'text-3xl' }
  };
  
  const { height, textSize } = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img 
        src="/images/2.png"
        alt="CVPlus Logo"
        className={`${height} w-auto object-contain`}
      />
      <div className="flex flex-col">
        <span className={`font-bold text-gray-100 ${textSize}`}>CVPlus</span>
        {showSlogan && (
          <span className="text-xs text-gray-400">From Paper to Powerful: Your CV, Reinvented</span>
        )}
      </div>
    </div>
  );
};