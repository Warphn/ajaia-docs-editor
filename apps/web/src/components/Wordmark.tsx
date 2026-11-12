interface WordmarkProps {
  className?: string;
  /** Shows only the logo on small screens, leaving room for the document title. */
  compactOnMobile?: boolean;
}

export function Wordmark({ className = '', compactOnMobile = false }: WordmarkProps) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <img src="/favicon.svg" alt="" className="h-7 w-7" />
      <span className={`text-base font-semibold tracking-tight ${compactOnMobile ? 'hidden sm:inline' : ''}`}>
        Ajaia Docs
      </span>
    </span>
  );
}
