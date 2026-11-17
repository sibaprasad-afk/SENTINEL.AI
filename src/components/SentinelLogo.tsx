import React from 'react';

interface SentinelLogoProps {
  compact?: boolean;
  className?: string;
}

export const SentinelLogo: React.FC<SentinelLogoProps> = ({ compact = false, className = '' }) => {
  return (
    <span className={`inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 ${className}`}>
      <span className="relative flex h-8 w-8 items-center justify-center rounded-xl border border-[#19D6A0]/35 bg-[rgba(19,29,49,0.72)] shadow-[0_0_20px_-6px_rgba(25,214,160,0.45)] backdrop-blur-md">
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="text-[#19D6A0]"
        >
          <path
            d="M3 12h3.5l2.1-5.2 3.2 10.4 2.5-6.6 1.7 1.4H21"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="9.5" stroke="rgba(50,217,232,0.28)" strokeWidth="1" />
        </svg>
      </span>
      {!compact && (
        <span className="font-display text-base font-semibold tracking-tight text-[#F4F7FF]">
          SENTINEL <span className="text-[#19D6A0]">AI</span>
        </span>
      )}
    </span>
  );
};
