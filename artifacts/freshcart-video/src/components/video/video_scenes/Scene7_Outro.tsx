import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene7_Outro() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 bg-primary flex flex-col items-center justify-center text-white"
      {...sceneTransitions.clipCircle}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={phase >= 1 ? { scale: 1, opacity: 1 } : { scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <h1
          className="text-[10vw] font-extrabold tracking-tighter"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          FreshCart
        </h1>
      </motion.div>

      <motion.div
        className="mt-[3vw] border border-white/30 bg-white/10 backdrop-blur-md px-[4vw] py-[1.5vw] rounded-full"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <span className="text-[3vw] font-bold tracking-wide uppercase">Get the App Today</span>
      </motion.div>
    </motion.div>
  );
}
