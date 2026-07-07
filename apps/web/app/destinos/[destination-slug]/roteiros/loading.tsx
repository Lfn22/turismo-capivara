export default function Loading() {
  return (
    <>
      <style>{`
        .droteiros-loading {
          min-height: 100dvh;
          background: var(--stone-50, #fafaf9);
        }

        .droteiros-loading__header {
          background: var(--stone-900, #1c1917);
          padding: clamp(48px, 8vw, 80px) clamp(16px, 5vw, 64px) clamp(32px, 5vw, 48px);
        }

        .droteiros-loading__skel {
          border-radius: 3px;
          background: var(--stone-800, #292524);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .droteiros-loading__body {
          max-width: 1120px;
          margin: 0 auto;
          padding: clamp(24px, 5vw, 48px) clamp(16px, 5vw, 64px);
        }

        .droteiros-loading__grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }

        .droteiros-loading__card {
          background: #fff;
          border: 1px solid var(--stone-200, #e7e5e4);
          border-radius: 3px;
          overflow: hidden;
        }

        .droteiros-loading__photo {
          width: 100%;
          aspect-ratio: 4/3;
          background: var(--stone-200, #e7e5e4);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .droteiros-loading__card-body {
          padding: 1rem 1.1rem 1.1rem;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .droteiros-loading__line {
          border-radius: 2px;
          background: var(--stone-200, #e7e5e4);
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 480px) {
          .droteiros-loading__grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="droteiros-loading">
        {/* Header skeleton */}
        <div className="droteiros-loading__header">
          <div className="droteiros-loading__skel" style={{ width: 90, height: 32, marginBottom: 20 }} />
          <div className="droteiros-loading__skel" style={{ width: 120, height: 14, marginBottom: 20 }} />
          <div className="droteiros-loading__skel" style={{ width: 180, height: 11, marginBottom: 10 }} />
          <div className="droteiros-loading__skel" style={{ width: '50%', maxWidth: 360, height: 40, marginBottom: 10 }} />
          <div className="droteiros-loading__skel" style={{ width: '35%', maxWidth: 260, height: 15 }} />
        </div>

        {/* Body skeleton */}
        <div className="droteiros-loading__body">
          <div className="droteiros-loading__line" style={{ width: 120, height: 13, marginBottom: 24 }} />
          <div className="droteiros-loading__grid">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="droteiros-loading__card">
                <div className="droteiros-loading__photo" />
                <div className="droteiros-loading__card-body">
                  <div className="droteiros-loading__line" style={{ width: '80%', height: 18 }} />
                  <div className="droteiros-loading__line" style={{ width: 70, height: 22, borderRadius: 2 }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <div className="droteiros-loading__line" style={{ width: 55, height: 18 }} />
                    <div className="droteiros-loading__line" style={{ width: 55, height: 18 }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="droteiros-loading__line" style={{ width: 90, height: 14 }} />
                    <div className="droteiros-loading__line" style={{ width: 50, height: 14 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
