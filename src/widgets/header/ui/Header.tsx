import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@shared/ui';
import { cn } from '@shared/lib';

const SCROLL_THRESHOLD = 8;

function useIsScrolled(threshold = SCROLL_THRESHOLD): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handle = () => setScrolled(window.scrollY > threshold);
    handle();
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, [threshold]);

  return scrolled;
}

export function Header() {
  const scrolled = useIsScrolled();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-[background-color,border-color] duration-150 ease-out',
        scrolled
          ? 'border-b border-border-subtle bg-bg-0/90 backdrop-blur'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <Container className="flex h-12 items-center justify-between gap-4">
        <Link
          to="/"
          className="text-sm font-semibold tracking-tight text-fg-primary hover:text-fg-primary/90"
          aria-label="BMS Console — на главную"
        >
          BMS&nbsp;<span className="text-fg-muted">Console</span>
        </Link>
      </Container>
    </header>
  );
}
