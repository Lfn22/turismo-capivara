/**
 * Logo animada (SVG externo) para o hero. Com prefers-reduced-motion, mostra a logo estática.
 * A logo fica branca porque o hero é foto ou `surface-brand`.
 */
export default function HeroLogoAnimation() {
  return (
    <div className="w-[min(420px,80vw)]" style={{ filter: 'brightness(0) invert(1)', marginBottom: 'var(--space-8)' }}>
      <object
        data="/images/logo-animated.svg"
        type="image/svg+xml"
        className="pointer-events-none h-auto w-full motion-reduce:hidden"
        aria-label="CAPI"
      >
        {/* Fallback for browsers that don't support SVG object */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo.png" alt="CAPI" width={420} height={380} style={{ width: '100%', height: 'auto' }} />
      </object>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo.png"
        alt="CAPI"
        width={420}
        height={380}
        className="hidden motion-reduce:block"
        style={{ width: '100%', height: 'auto' }}
      />
    </div>
  );
}
