import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sceneTransitions } from '@/lib/video/animations';
import { ShoppingCart } from 'lucide-react';

export function Scene3_Product() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 5000),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 bg-white flex items-center justify-center"
      {...sceneTransitions.clipPolygon}
    >
      <div className="flex w-[80vw] items-center justify-between">
        <motion.div
          className="w-[40vw] flex justify-center"
          initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1, rotate: 0 } : { opacity: 0, scale: 0.5, rotate: -20 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          <img
            src={`${import.meta.env.BASE_URL}avocado.png`}
            alt="Avocado"
            className="w-[30vw] h-[30vw] object-contain drop-shadow-2xl"
          />
        </motion.div>

        <div className="w-[35vw] flex flex-col items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          >
            <span className="bg-accent/20 text-secondary px-[1.5vw] py-[0.5vw] rounded-full text-[1.5vw] font-bold uppercase tracking-wider mb-[2vw] inline-block">
              Organic
            </span>
            <h2 className="text-[5vw] font-extrabold text-text-primary leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
              Hass Avocado
            </h2>
            <p className="text-[3vw] font-bold text-primary mt-[1vw]">
              $2.99 <span className="text-[1.5vw] text-text-muted font-normal">/ ea</span>
            </p>
          </motion.div>

          <motion.div
            className="mt-[4vw] relative"
            initial={{ opacity: 0, y: 20 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <motion.button
              className="bg-primary text-white rounded-[1.5vw] flex items-center justify-center font-bold text-[2vw] overflow-hidden relative shadow-xl"
              animate={{
                width: phase >= 4 ? '12vw' : '20vw',
                height: '5vw',
                backgroundColor: phase >= 4 ? 'var(--color-success)' : 'var(--color-primary)',
              }}
            >
              <AnimatePresence mode="wait">
                {phase < 4 ? (
                  <motion.div
                    key="add"
                    className="flex items-center gap-[1vw]"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <ShoppingCart className="w-[2vw] h-[2vw]" /> Add to Cart
                  </motion.div>
                ) : (
                  <motion.div
                    key="added"
                    className="flex items-center"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    Added!
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
