'use client';

interface Props {
  price: string;
  label: string;
  href: string;
}

export default function FloatingCTA({ price, label, href }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center gap-6 md:hidden"
      style={{
        padding: '12px 20px env(safe-area-inset-bottom, 24px)',
        background: 'rgba(250,250,249,0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--stone-200)',
      }}>
      <div className="flex-1">
        <div className="font-[family-name:var(--font-display)] font-bold text-xl"
          style={{ color: 'var(--ochre)' }}>
          {price}
        </div>
        <div className="text-xs" style={{ color: 'var(--stone-500)' }}>{label}</div>
      </div>
      <a href={href}
        className="px-7 py-6 font-semibold text-sm rounded-md no-underline"
        style={{ background: 'var(--ochre)', color: 'white' }}>
        Reservar
      </a>
    </div>
  );
}
