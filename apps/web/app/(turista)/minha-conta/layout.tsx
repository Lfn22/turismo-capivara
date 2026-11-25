import TuristaTopNav from '@/src/components/turista/TuristaTopNav'
import TuristaBottomNav from '@/src/components/turista/TuristaBottomNav'

export default function MinhaContaLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .minhaconta-shell {
          min-height: 100dvh;
          background: var(--bg-page);
          display: flex;
          flex-direction: column;
        }
        .minhaconta-body {
          flex: 1;
          display: flex;
          min-width: 0;
        }
        .minhaconta-sidebar {
          display: none;
        }
        .minhaconta-main {
          flex: 1;
          min-width: 0;
          padding: var(--space-6) var(--gutter-mobile);
          padding-bottom: calc(56px + env(safe-area-inset-bottom, 0px) + var(--space-6));
        }
        .minhaconta-main__inner {
          width: 100%;
          max-width: 800px;
          margin-inline: auto;
        }
        @media (min-width: 1024px) {
          .minhaconta-sidebar {
            display: flex;
            flex-direction: column;
            width: 220px;
            flex-shrink: 0;
            padding: var(--space-6) var(--space-4);
            border-right: 1px solid var(--border);
          }
          .minhaconta-main {
            padding: var(--space-8) var(--gutter-tablet);
            padding-bottom: var(--space-8);
          }
          /* Hide the mobile fixed bottom nav on desktop */
          .minhaconta-mobile-nav {
            display: none;
          }
        }
      `}</style>
      <div className="minhaconta-shell">
        <TuristaTopNav />
        <div className="minhaconta-body">
          <aside className="minhaconta-sidebar">
            <TuristaBottomNav />
          </aside>
          <main className="minhaconta-main">
            <div className="minhaconta-main__inner">{children}</div>
          </main>
        </div>
        <div className="minhaconta-mobile-nav">
          <TuristaBottomNav />
        </div>
      </div>
    </>
  )
}
