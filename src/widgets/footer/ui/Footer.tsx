import { Container } from '@shared/ui';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-border-subtle bg-bg-0">
      <Container className="flex h-10 items-center justify-between">
        <p className="text-xs text-fg-muted">© {year} BMS Console</p>
      </Container>
    </footer>
  );
}
