import BottomNav from './BottomNav';

interface Props {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: Props) {
  return (
    <>
      {children}
      <BottomNav />
      {/* Spacer for bottom nav on mobile */}
      <div className="h-16 md:hidden" aria-hidden="true" />
    </>
  );
}
