import { Link } from 'react-router-dom';
import { Flame } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showBadge?: boolean;
  className?: string;
  href?: string;
}

export function Logo({
  size = 'md',
  showText = true,
  showBadge = true,
  className = '',
  href = '/',
}: LogoProps) {
  const containerSizes = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-14 h-14 rounded-2xl',
  };

  const innerRadius = {
    sm: 'rounded-[7px]',
    md: 'rounded-[11px]',
    lg: 'rounded-[14px]',
  };

  const flameSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-8 h-8',
  };

  const textClasses = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-3xl',
  };

  const content = (
    <div className={`flex items-center gap-3 group ${className}`}>
      {/* Original Agni Flame Gradient Badge */}
      <div className={`relative flex items-center justify-center ${containerSizes[size]} bg-gradient-to-br from-orange-500 via-amber-600 to-red-600 p-[1px] shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-all duration-300`}>
        <div className={`w-full h-full bg-card ${innerRadius[size]} flex items-center justify-center transition-colors group-hover:bg-muted`}>
          <Flame className={`${flameSizes[size]} text-orange-500 fill-orange-500/20 group-hover:scale-110 transition-transform duration-300`} />
        </div>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className={`font-extrabold tracking-tight text-foreground font-mono ${textClasses[size]}`}>
              AGNI
            </span>
            {showBadge && (
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-orange-500/10 text-orange-500 border border-orange-500/30">
                MCP
              </span>
            )}
          </div>
          {size !== 'sm' && (
            <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline-block -mt-1">
              v0.1.0-beta
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  return content;
}
