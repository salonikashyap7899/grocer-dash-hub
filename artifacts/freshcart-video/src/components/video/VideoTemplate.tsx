import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useVideoPlayer } from '@/lib/video';
import { Scene1_Hero } from './video_scenes/Scene1_Hero';
import { Scene2_Categories } from './video_scenes/Scene2_Categories';
import { Scene3_Product } from './video_scenes/Scene3_Product';
import { Scene4_Cart } from './video_scenes/Scene4_Cart';
import { Scene5_Order } from './video_scenes/Scene5_Order';
import { Scene6_Delivery } from './video_scenes/Scene6_Delivery';
import { Scene7_Outro } from './video_scenes/Scene7_Outro';

export const SCENE_DURATIONS: Record<string, number> = {
  hero: 7000,
  categories: 8000,
  product: 8000,
  cart: 7000,
  order: 6000,
  delivery: 8000,
  outro: 5000,
};

const SCENE_COMPONENTS: Record<string, React.ComponentType> = {
  hero: Scene1_Hero,
  categories: Scene2_Categories,
  product: Scene3_Product,
  cart: Scene4_Cart,
  order: Scene5_Order,
  delivery: Scene6_Delivery,
  outro: Scene7_Outro,
};

const SCENE_START_SEC: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let cumulativeMs = 0;
  for (const [key, ms] of Object.entries(SCENE_DURATIONS)) {
    out[key] = cumulativeMs / 1000;
    cumulativeMs += ms;
  }
  return out;
})();

const AUDIO_SEEK_EPSILON_SEC = 0.18;

export default function VideoTemplate({
  durations = SCENE_DURATIONS,
  loop = true,
  muted = false,
  onSceneChange,
}: {
  durations?: Record<string, number>;
  loop?: boolean;
  muted?: boolean;
  onSceneChange?: (sceneKey: string) => void;
} = {}) {
  const { currentScene, currentSceneKey } = useVideoPlayer({ durations, loop });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    onSceneChange?.(currentSceneKey);
  }, [currentSceneKey, onSceneChange]);

  const baseSceneKey = currentSceneKey.replace(/_r[12]$/, '');
  const sceneIndex = Object.keys(SCENE_DURATIONS).indexOf(baseSceneKey);
  const SceneComponent = SCENE_COMPONENTS[baseSceneKey];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.45;
    const targetTime = SCENE_START_SEC[baseSceneKey] ?? 0;
    if (Math.abs(audio.currentTime - targetTime) > AUDIO_SEEK_EPSILON_SEC) {
      audio.currentTime = targetTime;
    }
    audio.play().catch(() => {});
  }, [currentSceneKey, baseSceneKey, muted]);

  return (
    <>
      <div
        className="w-full h-screen overflow-hidden relative bg-bg-light"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {/* Persistent Background Layer */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <motion.div
            className="absolute w-[80vw] h-[80vw] rounded-full blur-[100px] opacity-20"
            style={{ background: 'radial-gradient(circle, var(--color-primary), transparent)' }}
            animate={{
              x: ['-20vw', '40vw', '-10vw', '30vw', '-20vw'],
              y: ['-10vh', '-30vh', '40vh', '10vh', '-10vh'],
              scale: [1, 1.2, 0.8, 1.1, 1],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute w-[60vw] h-[60vw] rounded-full blur-[120px] opacity-15 right-0 bottom-0"
            style={{ background: 'radial-gradient(circle, var(--color-accent), transparent)' }}
            animate={{
              x: ['20vw', '-30vw', '10vw', '-20vw', '20vw'],
              y: ['20vh', '10vh', '-40vh', '-10vh', '20vh'],
              scale: [1, 0.9, 1.3, 0.8, 1],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        <AnimatePresence mode="popLayout">
          {SceneComponent && <SceneComponent key={currentSceneKey} />}
        </AnimatePresence>
      </div>

      <audio
        ref={audioRef}
        src={`${import.meta.env.BASE_URL}audio/bg_music.mp3`}
        preload="auto"
        autoPlay
        muted={muted}
      />
    </>
  );
}
