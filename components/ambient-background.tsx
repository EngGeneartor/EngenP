"use client"

export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Primary purple orb - top left area */}
      <div
        className="absolute animate-[float-1_20s_ease-in-out_infinite]"
        style={{
          width: '700px',
          height: '700px',
          top: '-15%',
          left: '15%',
          background: 'radial-gradient(circle, oklch(0.45 0.22 280 / 0.18), oklch(0.35 0.15 280 / 0.06) 50%, transparent 70%)',
          filter: 'blur(80px)',
          borderRadius: '50%',
        }}
      />

      {/* Secondary magenta orb - bottom right */}
      <div
        className="absolute animate-[float-2_28s_ease-in-out_infinite]"
        style={{
          width: '550px',
          height: '550px',
          bottom: '-10%',
          right: '5%',
          background: 'radial-gradient(circle, oklch(0.4 0.2 320 / 0.14), oklch(0.3 0.12 310 / 0.04) 50%, transparent 70%)',
          filter: 'blur(80px)',
          borderRadius: '50%',
        }}
      />

      {/* Tertiary indigo orb - center */}
      <div
        className="absolute animate-[float-3_24s_ease-in-out_infinite]"
        style={{
          width: '400px',
          height: '400px',
          top: '40%',
          left: '40%',
          background: 'radial-gradient(circle, oklch(0.38 0.18 260 / 0.1), transparent 65%)',
          filter: 'blur(90px)',
          borderRadius: '50%',
        }}
      />

      {/* Subtle warm accent orb - top right */}
      <div
        className="absolute animate-[float-4_32s_ease-in-out_infinite]"
        style={{
          width: '300px',
          height: '300px',
          top: '10%',
          right: '20%',
          background: 'radial-gradient(circle, oklch(0.42 0.12 340 / 0.08), transparent 60%)',
          filter: 'blur(70px)',
          borderRadius: '50%',
        }}
      />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      {/* Subtle vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 50%, oklch(0.05 0.02 280 / 0.4) 100%)',
        }}
      />
    </div>
  )
}
