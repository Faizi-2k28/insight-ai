import React from 'react';

export function Logo({ width = 36, height = 36, className = "", style }: { width?: number | string, height?: number | string, className?: string, style?: React.CSSProperties }) {
    return (
        <svg 
            width={width} 
            height={height} 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg" 
            className={className}
            style={{ display: "block", flexShrink: 0, ...style }}
        >
            <defs>
                <mask id="brand-slash-mask">
                    <rect width="100" height="100" fill="white" />
                    {/* The diagonal slash: bottom left to top right */}
                    {/* The logo has a sharp diagonal cut separating the segments */}
                    <polygon points="25,95 85,15 97,22 35,105" fill="black" />
                </mask>
            </defs>
            <g mask="url(#brand-slash-mask)">
                {/* Left Bar */}
                <rect x="15" y="50" width="18" height="50" rx="4" fill="#1C2128" />
                
                {/* Middle Bar */}
                <rect x="40" y="30" width="18" height="70" rx="4" fill="#1C2128" />
                
                {/* Right Bar Background (Charcoal) */}
                <rect x="65" y="10" width="22" height="90" rx="6" fill="#1C2128" />
                
                {/* Right Bar Inner (Cyan Fill) */}
                <rect x="69" y="35" width="14" height="65" fill="#12B0E8" />
            </g>
        </svg>
    );
}
