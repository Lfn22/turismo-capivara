import { MapPin } from 'lucide-react';

interface Props {
  highlights: string[];
}

/** Lista de pontos de interesse do destino (ícone + texto, tokens do CAPI v2). */
export default function DestinationHighlights({ highlights }: Props) {
  if (!highlights.length) return null;
  return (
    <>
      <style>{`
        .dhl { display: flex; flex-direction: column; gap: var(--space-3); list-style: none; }
        .dhl__item { display: flex; align-items: flex-start; gap: var(--space-3); font-size: 15px; line-height: 1.5; color: var(--text); }
        .dhl__icon {
          flex: none; display: inline-flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; border-radius: var(--radius-round);
          background: var(--primary-subtle); color: var(--text-primary);
        }
        .dhl__text { padding-top: 3px; }
      `}</style>
      <ul className="dhl">
        {highlights.map((h) => (
          <li key={h} className="dhl__item">
            <span className="dhl__icon" aria-hidden="true">
              <MapPin size={16} strokeWidth={1.75} />
            </span>
            <span className="dhl__text">{h}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
