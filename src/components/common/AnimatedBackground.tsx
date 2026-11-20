import React from 'react';

/**
 * AnimatedBackground renders subtle, elegant floating ambient gradient orbs.
 * - Deep burgundy (#881337) and soft slate/indigo hues
 * - Visually quiet, does not distract from medical examination content or slide imagery
 * - Completely hardware-accelerated, lightweight, respects prefers-reduced-motion
 */
export const AnimatedBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 overflow-hidden pointer-events-none -z-10 select-none"
      aria-hidden="true"
    >
      {/* Top right subtle burgundy/rose ambient orb */}
      <div
        className="anim-ambient-orb-1 absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-gradient-to-br from-rose-900/10 to-purple-800/8 dark:from-rose-950/25 dark:to-purple-950/20 blur-3xl opacity-70"
      />

      {/* Bottom left indigo/teal ambient orb */}
      <div
        className="anim-ambient-orb-2 absolute -bottom-40 -left-32 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-indigo-800/8 to-rose-900/6 dark:from-slate-800/30 dark:to-rose-950/20 blur-3xl opacity-60"
      />

      {/* Center ambient subtle pulse orb */}
      <div
        className="anim-ambient-orb-3 absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[360px] rounded-full bg-gradient-to-r from-purple-900/5 via-rose-800/4 to-transparent dark:from-purple-950/15 dark:via-rose-950/10 dark:to-transparent blur-3xl opacity-50"
      />
    </div>
  );
};
