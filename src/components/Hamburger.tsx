interface HamburgerProps {
  open: boolean;
  onClick: () => void;
}

export function Hamburger({ open, onClick }: HamburgerProps) {
  return (
    <button
      type="button"
      className={`hamburger ${open ? 'is-open' : ''}`}
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      onClick={onClick}
    >
      <span />
      <span />
      <span />
    </button>
  );
}
