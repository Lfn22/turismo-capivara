export default function HeroLogoAnimation() {
  return (
    <div className="mb-4 w-[min(420px,80vw)]">
      <object
        data="/images/logo-animated.svg"
        type="image/svg+xml"
        className="w-full h-auto pointer-events-none"
        aria-label="Logo CAPI animada"
      >
        {/* Fallback for browsers that don't support SVG object */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/logo.png" alt="CAPI" width={420} height={380}
          style={{ filter: 'brightness(0) invert(1)', width: '100%', height: 'auto' }} />
      </object>
    </div>
  );
}
