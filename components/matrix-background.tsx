'use client';

import React, { useEffect, useRef } from 'react';

interface MatrixBackgroundProps {
  opacity?: number;
  showCenterRing?: boolean;
}

export default function MatrixBackground({
  opacity = 0.85,
  showCenterRing = true,
}: MatrixBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Font size & column setup
    const fontSize = 16;
    let columns = Math.floor(width / fontSize);
    let drops: number[] = new Array(columns).fill(1).map(() => Math.floor(Math.random() * -50));
    // Array to hold speed variation for different columns to give 3D depth
    let speeds: number[] = new Array(columns).fill(1).map(() => 0.8 + Math.random() * 0.8);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      columns = Math.floor(width / fontSize);
      drops = new Array(columns).fill(1).map(() => Math.floor(Math.random() * -50));
      speeds = new Array(columns).fill(1).map(() => 0.8 + Math.random() * 0.8);
    };

    window.addEventListener('resize', handleResize);

    // Timing throttle for 35fps (smooth yet extremely light on CPU/battery)
    let lastTime = 0;
    const interval = 1000 / 35;

    const render = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(render);

      const delta = currentTime - lastTime;
      if (delta < interval) return;
      lastTime = currentTime - (delta % interval);

      // Faint black trail fade effect
      ctx.fillStyle = 'rgba(7, 11, 20, 0.12)';
      ctx.fillRect(0, 0, width, height);

      ctx.font = `bold ${fontSize}px "Courier New", Courier, monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Binary numbers 0 and 1, with occasional rare hex/cyber glyph
        const rand = Math.random();
        let char = rand > 0.5 ? '1' : '0';
        
        // Occasional rare glitch character or red pixel like the reference image
        const isGlitchRed = rand < 0.008;

        const x = i * fontSize;
        const y = drops[i] * fontSize;

        if (isGlitchRed) {
          ctx.fillStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 8;
        } else {
          // Leading drop is ultra-bright glowing white-green
          if (Math.random() > 0.85) {
            ctx.fillStyle = '#dcfce7';
            ctx.shadowColor = '#00ff88';
            ctx.shadowBlur = 10;
          } else {
            // Main binary matrix green stream
            ctx.fillStyle = '#00ff66';
            ctx.shadowColor = '#00ff66';
            ctx.shadowBlur = 4;
          }
        }

        ctx.fillText(char, x, y);
        ctx.shadowBlur = 0; // reset for performance

        // Reset drop to top with randomized staggered delay
        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
          speeds[i] = 0.8 + Math.random() * 0.8;
        }

        drops[i] += speeds[i];
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0"
      style={{ opacity }}
    >
      {/* HTML5 Matrix Binary Rain Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />

      {/* Cybernetic Radial Vignette (darker edges for content contrast) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(7,11,20,0.4) 0%, rgba(5,8,17,0.85) 75%, #050811 100%)',
        }}
      />

      {/* Neon Center Cyber Ring (as seen in the uploaded reference image) */}
      {showCenterRing && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          {/* Main glowing circular ring */}
          <div
            className="w-[280px] h-[280px] sm:w-[420px] sm:h-[420px] rounded-full border border-emerald-400/50"
            style={{
              boxShadow:
                '0 0 40px rgba(0,255,136,0.35), inset 0 0 40px rgba(0,255,136,0.2), 0 0 80px rgba(0,212,255,0.15)',
              animation: 'spinRing 30s linear infinite',
            }}
          />
          {/* Outer pulsed glow halo */}
          <div
            className="absolute inset-0 -m-6 rounded-full border border-dashed border-cyan-400/20"
            style={{
              animation: 'spinRingReverse 45s linear infinite',
            }}
          />
        </div>
      )}

      {/* CSS Animations for Ring */}
      <style>{`
        @keyframes spinRing {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes spinRingReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
