"use client";

import { useCallback, useRef } from "react";

/** Returns ding(): a short pleasant chime via WebAudio (no audio file). Call after a successful save. */
export function useDing() {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback(() => {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = (ctxRef.current ??= new Ctx());
      const now = ctx.currentTime;
      [1318.5, 1760].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const t = now + i * 0.09;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
      });
    } catch {
      // audio not available; ignore
    }
  }, []);
}
