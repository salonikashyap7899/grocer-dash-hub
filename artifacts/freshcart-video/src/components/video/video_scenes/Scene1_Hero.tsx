import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sceneTransitions } from '@/lib/video/animations';

export function Scene1_Hero() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => setPhase(4), 5500),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center bg-primary"
      {...sceneTransitions.morphExpand}
    >
      <motion.div
        className="absolute inset-0 opacity-30 bg-cover bg-center mix-blend-overlay"
        style={{ backgroundImage: `url(${import.meta.env.BASE_URL}hero-bg.jpg)` }}
        animate={{ scale: [1.1, 1.0], opacity: phase >= 4 ? 0 : 0.3 }}
        transition={{ duration: 6, ease: 'easeOut' }}
      />
      <div className="text-center z-10">
        <motion.div
          className="overflow-hidden"
          initial={{ y: 50, opacity: 0 }}
          animate={phase >= 1 ? { y: 0, opacity: 1 } : { y: 50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <h1
            className="text-[12vw] font-extrabold text-white leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            FreshCart
          </h1>
        </motion.div>

        <motion.div
          className="mt-6 overflow-hidden"
          initial={{ height: 0, opacity: 0 }}
          animate={phase >= 2 ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          <p className="text-[3vw] font-medium text-accent">
            Farm to door in minutes.
          </p>
        </motion.div>

        <motion.div
          className="absolute left-0 right-0 h-1 bg-white/20 bottom-12 mx-[20vw] rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
        >
          <motion.div
            className="h-full bg-white"
            initial={{ width: '0%' }}
            animate={phase >= 3 ? { width: '100%' } : { width: '0%' }}
            transition={{ duration: 2.5, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
