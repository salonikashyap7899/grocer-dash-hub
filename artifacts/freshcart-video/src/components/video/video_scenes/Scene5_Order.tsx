import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sceneTransitions } from '@/lib/video/animations';
import { CheckCircle } from 'lucide-react';

export function Scene5_Order() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 4500),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 bg-primary flex flex-col items-center justify-center text-white"
      {...sceneTransitions.scaleFade}
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={phase >= 1 ? { scale: [0, 1.2, 1], opacity: 1 } : { scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      >
        <CheckCircle className="w-[15vw] h-[15vw] text-white" strokeWidth={1.5} />
      </motion.div>

      <motion.h1
        className="text-[6vw] font-extrabold mt-[3vw] tracking-tight text-center"
        style={{ fontFamily: 'var(--font-display)' }}
        initial={{ opacity: 0, y: 30 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      >
        Order Confirmed!
      </motion.h1>

      <motion.div
        className="mt-[2vw] text-[2.5vw] font-medium opacity-80"
        initial={{ opacity: 0 }}
        animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ delay: 0.3 }}
      >
        Preparing your fresh groceries...
      </motion.div>
    </motion.div>
  );
}
