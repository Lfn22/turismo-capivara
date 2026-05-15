interface Props {
  highlights: string[];
}

export default function DestinationHighlights({ highlights }: Props) {
  if (!highlights.length) return null;
  return (
    <>
      <style precedence="default">{`
        .dhl {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .dhl__item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
          color: var(--stone-500, #78716c);
        }
        .dhl__dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--ochre, #c8961c);
          flex-shrink: 0;
        }
      `}</style>
      <div className="dhl">
        {highlights.map((h) => (
          <div key={h} className="dhl__item">
            <div className="dhl__dot" aria-hidden="true" />
            <span>{h}</span>
          </div>
        ))}
      </div>
    </>
  );
}
