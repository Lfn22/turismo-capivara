import Link from 'next/link';

interface Props {
  icon?: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function PainelEmptyState({
  icon = 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
  message,
  actionLabel,
  actionHref,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <svg className="w-24 h-24 mb-8" fill="none" stroke="currentColor"
        strokeWidth="1" viewBox="0 0 24 24" aria-hidden="true"
        style={{ color: 'var(--stone-300)' }}>
        <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="text-sm mb-8" style={{ color: 'var(--stone-400)' }}>
        {message}
      </p>
      {actionLabel && actionHref && (
        <Link href={actionHref}
          className="px-5 py-4 text-sm font-semibold rounded-md no-underline"
          style={{ background: 'var(--ochre)', color: 'white' }}>
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
