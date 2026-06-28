import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sceneTransitions } from '@/lib/video/animations';
import { MapPin, Home } from 'lucide-react';

export function Scene6_Delivery() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 6000),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 bg-bg-muted flex flex-col items-center justify-center"
      {...sceneTransitions.slideUp}
    >
      <div className="absolute top-[10vh] flex flex-col items-center">
        <motion.h2
          className="text-[5vw] font-bold text-text-primary tracking-tight"
          style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, y: -20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        >
          Out for Delivery
        </motion.h2>
        <motion.p
          className="text-[2vw] text-secondary mt-[1vw] bg-accent/20 px-[2vw] py-[0.5vw] rounded-full font-bold uppercase tracking-widest"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ delay: 0.2 }}
        >
          Arriving in 8 mins
        </motion.p>
      </div>

      <div className="relative w-[60vw] h-[30vw] mt-[10vh] flex items-center justify-between">
        {/* Store Node */}
        <motion.div
          className="z-10 flex flex-col items-center"
          initial={{ opacity: 0, scale: 0 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
        >
          <div className="w-[6vw] h-[6vw] bg-white border-[0.5vw] border-primary rounded-full flex items-center justify-center shadow-xl">
            <MapPin className="w-[3vw] h-[3vw] text-primary" />
          </div>
          <span className="text-[1.5vw] font-bold mt-[1vw] text-text-secondary">Store</span>
        </motion.div>

        {/* Route Line */}
        <div className="absolute inset-0 flex items-center px-[3vw]">
          <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <motion.path
              d="M 30,150 Q 200,50 400,200 T 800,150"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="1vw"
              strokeLinecap="round"
              strokeDasharray="20 20"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={phase >= 2 ? { pathLength: 1, opacity: 0.3 } : { pathLength: 0, opacity: 0 }}
              transition={{ duration: 3, ease: 'easeInOut' }}
            />
            {/* Animated dot on path */}
            {phase >= 2 && (
              <motion.circle
                r="1.5vw"
                fill="var(--color-accent)"
                initial={{ offsetDistance: '0%' }}
                animate={{ offsetDistance: '100%' }}
                transition={{ duration: 3, ease: 'easeInOut' }}
                style={{ offsetPath: "path('M 30,150 Q 200,50 400,200 T 800,150')" }}
              />
            )}
          </svg>
        </div>

        {/* Home Node */}
        <motion.div
          className="z-10 flex flex-col items-center"
          initial={{ opacity: 0, scale: 0 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="w-[6vw] h-[6vw] bg-white border-[0.5vw] border-secondary rounded-full flex items-center justify-center shadow-xl">
            <Home className="w-[3vw] h-[3vw] text-secondary" />
          </div>
          <span className="text-[1.5vw] font-bold mt-[1vw] text-text-secondary">Home</span>
        </motion.div>
      </div>
      
      {/* Delivery Bag pop */}
      <motion.div
        className="absolute bottom-[5vh]"
        initial={{ opacity: 0, y: 100, scale: 0.5 }}
        animate={phase >= 3 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 100, scale: 0.5 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      >
        <img
          src={`${import.meta.env.BASE_URL}bag.png`}
          alt="Grocery Bag"
          className="w-[20vw] h-[20vw] object-contain drop-shadow-2xl"
        />
      </motion.div>
    </motion.div>
  );
}
