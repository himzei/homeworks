"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
  size: number;
};

type VoteFireworksProps = {
  /** true 이면 폭죽 재생 */
  isActive: boolean;
  /** 애니메이션 종료 시 */
  onComplete?: () => void;
};

/** 투표 종료 시 전체 화면 폭죽 효과 (canvas) */
export default function VoteFireworks({
  isActive,
  onComplete,
}: VoteFireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const particles: Particle[] = [];
    const durationMs = 3200;
    const startedAt = performance.now();
    let lastBurstAt = 0;

    const spawnBurst = (centerX: number, centerY: number) => {
      const particleCount = 48 + Math.floor(Math.random() * 24);
      for (let index = 0; index < particleCount; index += 1) {
        const angle = (Math.PI * 2 * index) / particleCount + Math.random() * 0.4;
        const speed = 2.5 + Math.random() * 5.5;
        particles.push({
          x: centerX,
          y: centerY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: 55 + Math.random() * 35,
          hue: 15 + Math.random() * 320,
          size: 2 + Math.random() * 2.5,
        });
      }
    };

    // 초기 + 주기적 폭발
    spawnBurst(canvas.width * 0.5, canvas.height * 0.42);
    spawnBurst(canvas.width * 0.28, canvas.height * 0.55);
    spawnBurst(canvas.width * 0.72, canvas.height * 0.5);

    const drawFrame = (now: number) => {
      const elapsed = now - startedAt;
      context.clearRect(0, 0, canvas.width, canvas.height);

      if (elapsed - lastBurstAt > 380) {
        lastBurstAt = elapsed;
        spawnBurst(
          canvas.width * (0.2 + Math.random() * 0.6),
          canvas.height * (0.3 + Math.random() * 0.35),
        );
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        particle.life += 1;
        particle.vx *= 0.985;
        particle.vy = particle.vy * 0.985 + 0.06;
        particle.x += particle.vx;
        particle.y += particle.vy;

        const alpha = 1 - particle.life / particle.maxLife;
        if (alpha <= 0) {
          particles.splice(index, 1);
          continue;
        }

        context.beginPath();
        context.fillStyle = `hsla(${particle.hue}, 90%, 60%, ${alpha})`;
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }

      if (elapsed < durationMs) {
        animationFrameRef.current = requestAnimationFrame(drawFrame);
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      onComplete?.();
    };

    animationFrameRef.current = requestAnimationFrame(drawFrame);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60]"
      aria-hidden
    />
  );
}
