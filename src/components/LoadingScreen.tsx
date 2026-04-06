import React from 'react';
import { motion } from 'motion/react';
import { Glasses } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-surface-container-lowest">
      <div className="relative">
        {/* Outer Glow Effect */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute inset-0 bg-primary/20 blur-3xl rounded-full"
        />
        
        {/* Logo Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.8,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="relative flex flex-col items-center space-y-6"
        >
          <div className="relative">
            <motion.div
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center shadow-2xl shadow-primary/30"
            >
              <Glasses size={48} className="text-on-primary" />
            </motion.div>
            
            {/* Pulsing Rings */}
            {[1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 1, opacity: 0.5 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.6,
                  ease: "easeOut",
                }}
                className="absolute inset-0 border-2 border-primary rounded-[2rem]"
              />
            ))}
          </div>

          <div className="text-center space-y-2">
            <motion.h1
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-headline font-bold text-on-surface tracking-tight"
            >
              Optics <span className="text-primary">Manager</span>
            </motion.h1>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: 100 }}
              transition={{ delay: 0.5, duration: 1 }}
              className="h-1 bg-surface-container-high rounded-full mx-auto overflow-hidden"
            >
              <motion.div
                animate={{
                  x: [-100, 100],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "linear",
                }}
                className="w-full h-full bg-primary"
              />
            </motion.div>
            <p className="text-[10px] font-label uppercase tracking-[0.2em] text-outline font-bold">
              S4KIBX10 System
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default LoadingScreen;
