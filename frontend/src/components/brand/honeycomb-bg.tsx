"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui/cx";

export function HoneycombBackground({ 
  className, 
  variant = "light",
  animated = true,
  intensity = 1 
}: { 
  className?: string; 
  variant?: "light" | "dark" | "auto";
  animated?: boolean;
  intensity?: number;
}) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || prefersReducedMotion || !animated) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    const hexSize = 28;
    const hexHeight = hexSize * Math.sqrt(3);
    const horizontalSpacing = hexSize * 1.5;
    const verticalSpacing = hexHeight;

    let cols = 0;
    let rows = 0;
    let offsets: { x: number; y: number; phase: number }[] = [];

    const init = () => {
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      cols = Math.ceil(width / horizontalSpacing) + 2;
      rows = Math.ceil(height / verticalSpacing) + 2;
      
      offsets = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const phase = Math.random() * Math.PI * 2;
          offsets.push({ x: col, y: row, phase });
        }
      }
    };

    const drawHexagon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, opacity: number) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const hx = x + size * Math.cos(angle);
        const hy = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fillStyle = `rgba(20, 108, 90, ${opacity})`;
      ctx.fill();
    };

    const animate = (timestamp: number) => {
      if (!canvasRef.current) return;
      
      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;
      
      if (canvas.width !== width * (window.devicePixelRatio || 1) || 
          canvas.height !== height * (window.devicePixelRatio || 1)) {
        resize();
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const elapsed = (timestamp - timeRef.current) * 0.001;
      timeRef.current = timestamp;

      for (const { x: col, y: row, phase } of offsets) {
        const centerX = col * horizontalSpacing;
        const centerY = row * verticalSpacing + (col % 2) * (verticalSpacing / 2);
        
        if (centerX > width + hexSize || centerY > height + hexSize) continue;
        if (centerX < -hexSize || centerY < -hexSize) continue;

        const wave = Math.sin(elapsed * 0.5 + phase) * 0.5 + 0.5;
        const opacity = (0.015 + wave * 0.025) * intensity;
        
        drawHexagon(ctx, centerX, centerY, hexSize * 0.9, opacity);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    init();
    resize();
    window.addEventListener("resize", init);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", init);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [prefersReducedMotion, animated, intensity]);

  if (prefersReducedMotion || !animated) {
    return (
      <div 
        className={cx("fixed inset-0 -z-10 pointer-events-none", variant === "dark" ? "honeycomb-bg-dark" : "honeycomb-bg-light", className)} 
        aria-hidden="true"
      />
    );
  }

  return (
    <canvas 
      ref={canvasRef} 
      className={cx("fixed inset-0 -z-10 pointer-events-none w-full h-full", className)} 
      aria-hidden="true"
      style={{ opacity: 1 }}
    />
  );
}

export function GradientMeshBackground({ className }: { className?: string }) {
  return (
    <div className={cx("gradient-mesh", className ?? "")} aria-hidden="true" />
  );
}

export function GridPatternBackground({ className }: { className?: string }) {
  return (
    <div className={cx("grid-pattern", className ?? "")} aria-hidden="true" />
  );
}