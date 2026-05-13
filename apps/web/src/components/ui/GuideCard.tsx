import Link from 'next/link';
import Image from 'next/image';

interface Guide {
  id: string;
  name: string;
  photo?: string;
  specialties: string[];
  packageCount: number;
}

interface GuideCardProps {
  guide: Guide;
  slug: string;
}

export default function GuideCard({ guide, slug }: GuideCardProps) {
  return (
    <Link
      href={`/${slug}/guias/${guide.id}`}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      <div
        style={{
          border: '1px solid #e7e5e4',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          transition: 'box-shadow 0.2s',
          cursor: 'pointer',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '180px',
            backgroundColor: '#f5f5f4',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {guide.photo ? (
            <Image
              src={guide.photo}
              alt={guide.name}
              fill
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#a8a29e"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          )}
        </div>
        <div style={{ padding: '1rem' }}>
          <h3
            style={{
              margin: '0 0 0.5rem',
              fontSize: '1rem',
              fontWeight: 600,
              color: '#1c1917',
            }}
          >
            {guide.name}
          </h3>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.375rem',
              marginBottom: '0.75rem',
            }}
          >
            {guide.specialties.map((specialty) => (
              <span
                key={specialty}
                style={{
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '999px',
                }}
              >
                {specialty}
              </span>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#78716c' }}>
            {guide.packageCount} {guide.packageCount === 1 ? 'roteiro' : 'roteiros'}
          </p>
        </div>
      </div>
    </Link>
  );
}
