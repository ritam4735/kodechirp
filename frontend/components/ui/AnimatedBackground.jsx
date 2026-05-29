'use client';

/**
 * AnimatedBackground — shared cinematic dark background used across all pages.
 * Renders purely decorative layered glows + stars, pointer-events-none.
 */
export function AnimatedBackground({ variant = 'default' }) {
  const glows = {
    default: (
      <>
        <div className="absolute top-[-10%] left-[15%] w-[700px] h-[600px] bg-[#58a6ff]/8 rounded-full blur-[130px] mix-blend-screen animate-pulse-soft" />
        <div className="absolute bottom-[-5%] right-[10%] w-[600px] h-[500px] bg-[#a371f7]/8 rounded-full blur-[110px] mix-blend-screen animate-pulse-soft" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[45%] w-[400px] h-[400px] bg-[#22c55e]/4 rounded-full blur-[150px] mix-blend-screen" />
      </>
    ),
    coming_soon: (
      <>
        <div className="absolute top-[-5%] left-[20%] w-[600px] h-[600px] bg-[#a371f7]/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-soft" />
        <div className="absolute bottom-[10%] right-[15%] w-[500px] h-[400px] bg-[#58a6ff]/8 rounded-full blur-[100px] mix-blend-screen animate-pulse-soft" style={{ animationDelay: '1.5s' }} />
      </>
    ),
    questions: (
      <>
        <div className="absolute top-0 left-0 w-[500px] h-[400px] bg-[#58a6ff]/6 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-[#a371f7]/6 rounded-full blur-[100px] mix-blend-screen" />
      </>
    ),
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,_#0e1420_0%,_#06090e_70%)]" />
      {/* Variant glows */}
      {glows[variant] ?? glows.default}
      {/* Subtle grain overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}
      />
    </div>
  );
}
