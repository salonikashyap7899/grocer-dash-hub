import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sceneTransitions } from '@/lib/video/animations';
import { Apple, Carrot, Milk, Fish } from 'lucide-react';

export function Scene2_Categories() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 6500),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const categories = [
    { name: 'Fruits', icon: Apple, color: 'text-red-500', bg: 'bg-red-50' },
    { name: 'Veggies', icon: Carrot, color: 'text-orange-500', bg: 'bg-orange-50' },
    { name: 'Dairy', icon: Milk, color: 'text-blue-500', bg: 'bg-blue-50' },
    { name: 'Meat', icon: Fish, color: 'text-rose-500', bg: 'bg-rose-50' },
  ];

  return (
    <motion.div
      className="absolute inset-0 bg-bg-muted flex flex-col items-center justify-center pt-[10vh]"
      {...sceneTransitions.slideLeft}
    >
      <div className="absolute top-[10vh] w-full px-[10vw]">
        <motion.h2
          className="text-[5vw] font-bold text-primary tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, x: -50 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
          transition={{ duration: 0.8, ease: 'circOut' }}
        >
          Fresh Aisles.
        </motion.h2>
        <motion.p
          className="text-[2.5vw] text-secondary mt-2"
          initial={{ opacity: 0 }}
          animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 0.2 }}
        >
          Everything you need, organized beautifully.
        </motion.p>
      </div>

      <div className="grid grid-cols-2 gap-[3vw] w-[80vw] mt-[5vh] perspective-1000">
        {categories.map((cat, i) => (
          <motion.div
            key={cat.name}
            className={`rounded-[2vw] p-[3vw] ${cat.bg} shadow-lg flex flex-col items-center justify-center transform-style-3d`}
            initial={{ opacity: 0, y: 100, rotateX: 45 }}
            animate={
              phase >= 2
                ? { opacity: 1, y: 0, rotateX: 0 }
                : { opacity: 0, y: 100, rotateX: 45 }
            }
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
              delay: phase >= 2 ? i * 0.15 : 0,
            }}
            whileHover={{ scale: 1.05 }}
          >
            <cat.icon className={`w-[8vw] h-[8vw] ${cat.color} mb-[2vw]`} />
            <span className="text-[2vw] font-bold text-text-primary">{cat.name}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
