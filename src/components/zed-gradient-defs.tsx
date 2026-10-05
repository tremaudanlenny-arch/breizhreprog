// Identité visuelle Breizh Reprog.
export function BreizhFileIcon({ className, barColor = "#ffffff" }: { className?: string; barColor?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" stroke="url(#breizhIconGradient)" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" stroke="url(#breizhIconGradient)" />
      <path d="M10 9H8" stroke={barColor} />
      <path d="M16 13H8" stroke={barColor} />
      <path d="M16 17H8" stroke={barColor} />
    </svg>
  );
}

export function BreizhClipboardIcon({ className, barColor = "#ffffff" }: { className?: string; barColor?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" stroke="url(#breizhIconGradient)" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="url(#breizhIconGradient)" />
      <path d="M12 11h4" stroke={barColor} />
      <path d="M12 16h4" stroke={barColor} />
      <path d="M8 11h.01" stroke={barColor} />
      <path d="M8 16h.01" stroke={barColor} />
    </svg>
  );
}

export default function BreizhGradientDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <defs>
        <linearGradient id="breizhIconGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Compatibilité interne avec les imports existants pendant le rebranding.
export const ZedFileIcon = BreizhFileIcon;
export const ZedClipboardIcon = BreizhClipboardIcon;
