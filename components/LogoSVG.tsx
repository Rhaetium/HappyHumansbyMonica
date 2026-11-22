'use client'
import { useId } from 'react'

interface LogoSVGProps {
  size?: number
  className?: string
  showGradient?: boolean
}

export default function LogoSVG({ size = 44, className = '', showGradient = true }: LogoSVGProps) {
  const viewBox = 44
  // useId : identique côté serveur et client (Math.random() provoquait une erreur d'hydratation)
  const gradientId = `logoGradient-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={`0 0 ${viewBox} ${viewBox}`}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {showGradient && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--hh-primary)"/>
            <stop offset="50%" stopColor="var(--hh-primary)"/>
            <stop offset="100%" stopColor="#3d7a72"/>
          </linearGradient>
        </defs>
      )}
      <circle 
        cx={viewBox / 2} 
        cy={viewBox / 2} 
        r={viewBox / 2 - 2} 
        fill={showGradient ? `url(#${gradientId})` : 'var(--hh-primary)'}
      />
      
      {/* Calendar icon */}
      <g stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <rect x="11" y="13" width="22" height="20" rx="3"/>
        <line x1="11" y1="19" x2="33" y2="19"/>
        <line x1="16" y1="9" x2="16" y2="15"/>
        <line x1="28" y1="9" x2="28" y2="15"/>
        {/* Checkmark */}
        <path d="M17 26L20 29L27 22" strokeWidth="2"/>
      </g>
    </svg>
  )
}
