import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sceneTransitions } from '@/lib/video/animations';
import { ShoppingBag } from 'lucide-react';

export function Scene4_Cart() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 4000),
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const items = [
    { name: 'Organic Hass Avocado', qty: 4, price: '$11.96' },
    { name: 'Whole Milk 1 Gallon', qty: 1, price: '$4.49' },
    { name: 'Fresh Spinach Bunch', qty: 2, price: '$5.98' },
  ];

  return (
    <motion.div
      className="absolute inset-0 bg-bg-muted flex items-center justify-center"
      {...sceneTransitions.pushLeft}
    >
      <div className="w-[60vw] bg-white rounded-[3vw] shadow-2xl p-[4vw] border border-gray-100 relative overflow-hidden">
        <motion.div
          className="flex items-center gap-[2vw] mb-[4vw]"
          initial={{ opacity: 0, x: -20 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
        >
          <div className="w-[5vw] h-[5vw] rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <ShoppingBag className="w-[2.5vw] h-[2.5vw]" />
          </div>
          <h2 className="text-[4vw] font-bold text-text-primary tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
            Your Cart
          </h2>
        </motion.div>

        <div className="space-y-[2vw]">
          {items.map((item, i) => (
            <motion.div
              key={item.name}
              className="flex justify-between items-center border-b border-gray-100 pb-[2vw]"
              initial={{ opacity: 0, x: 50 }}
              animate={phase >= 2 ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
              transition={{ delay: phase >= 2 ? i * 0.2 : 0, type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div>
                <p className="text-[2vw] font-bold text-text-primary">{item.name}</p>
                <p className="text-[1.5vw] text-text-muted">Qty: {item.qty}</p>
              </div>
              <p className="text-[2vw] font-bold text-text-secondary">{item.price}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-[4vw] pt-[2vw] flex justify-between items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        >
          <p className="text-[2.5vw] font-bold text-text-primary">Total</p>
          <p className="text-[3.5vw] font-extrabold text-primary" style={{ fontFamily: 'var(--font-display)' }}>
            $22.43
          </p>
        </motion.div>

        <motion.div
          className="absolute inset-0 bg-primary flex flex-col items-center justify-center"
          initial={{ y: '100%' }}
          animate={phase >= 4 ? { y: '0%' } : { y: '100%' }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >
          <h3 className="text-white text-[5vw] font-bold" style={{ fontFamily: 'var(--font-display)' }}>Placing Order...</h3>
        </motion.div>
      </div>
    </motion.div>
  );
}
