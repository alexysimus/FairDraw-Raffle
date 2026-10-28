import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FAIRDRAW_COLORS } from '../constants';

interface SlotMachineProps {
  digits: (number | null)[];
  isSpinning: boolean;
}

export const SlotMachine: React.FC<SlotMachineProps> = ({ digits, isSpinning }) => {
  const count = digits.length || 4;

  // Responsive dimensions tailored to digit count to guarantee ZERO mobile overflow
  const sizeClasses = (() => {
    if (count >= 6) {
      return {
        box: 'w-10 h-16 sm:w-16 sm:h-28 rounded-xl sm:rounded-2xl',
        text: 'text-2xl sm:text-5xl',
        gap: 'gap-1 sm:gap-3',
      };
    }
    if (count === 5) {
      return {
        box: 'w-12 h-20 sm:w-20 sm:h-32 rounded-xl sm:rounded-2xl',
        text: 'text-3xl sm:text-6xl',
        gap: 'gap-1.5 sm:gap-3.5',
      };
    }
    // Default 4 digits
    return {
      box: 'w-13 h-24 sm:w-24 sm:h-36 rounded-2xl sm:rounded-3xl',
      text: 'text-4xl sm:text-7xl',
      gap: 'gap-2 sm:gap-4',
    };
  })();

  return (
    <div className={`flex ${sizeClasses.gap} justify-center items-center py-6 sm:py-10 max-w-full px-2 overflow-x-hidden select-none`}>
      {digits.map((digit, index) => (
        <DigitBox 
          key={index} 
          digit={digit} 
          isSpinning={isSpinning} 
          boxClass={sizeClasses.box}
          textClass={sizeClasses.text}
        />
      ))}
    </div>
  );
};

interface DigitBoxProps {
  digit: number | null;
  isSpinning: boolean;
  boxClass: string;
  textClass: string;
}

const DigitBox: React.FC<DigitBoxProps> = ({ digit, isSpinning, boxClass, textClass }) => {
  const [displayDigit, setDisplayDigit] = useState<number>(0);
  const isRevealed = digit !== null;

  // Rapid mechanical flicker animation during spin
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isRevealed && isSpinning) {
      interval = setInterval(() => {
        setDisplayDigit(Math.floor(Math.random() * 10));
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isRevealed, isSpinning]);

  return (
    <div 
      className={`${boxClass} flex items-center justify-center overflow-hidden border-2 relative shadow-2xl transition-all duration-300 bg-[#0B0F19]`}
      style={{ 
        borderColor: isRevealed ? FAIRDRAW_COLORS.GOLD : 'rgba(245, 197, 66, 0.18)',
        boxShadow: isRevealed 
          ? `0 0 35px rgba(245, 197, 66, 0.25), inset 0 0 15px rgba(245, 197, 66, 0.15)`
          : '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Ambient gold glow pulse upon lock */}
      {isRevealed && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.18 }}
          className="absolute inset-0 animate-pulse pointer-events-none"
          style={{ backgroundColor: FAIRDRAW_COLORS.GOLD }}
        />
      )}

      {/* Digit Motion with Apple Spring Physics */}
      <AnimatePresence mode="wait">
        <motion.div
          key={isRevealed ? `final-${digit}` : 'shuffling'}
          initial={isRevealed ? { y: 22, opacity: 0, scale: 0.85 } : { opacity: 0.6 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={isRevealed 
            ? { type: 'spring', damping: 15, stiffness: 170 } 
            : { duration: 0.08 }
          }
          className="z-10"
        >
          <span 
            className={`font-black ${textClass} tracking-tighter font-mono tabular-nums leading-none`}
            style={{ 
              color: FAIRDRAW_COLORS.GOLD,
              textShadow: isRevealed ? `0 0 25px ${FAIRDRAW_COLORS.GOLD}77` : 'none',
              filter: !isRevealed ? 'blur(0.5px)' : 'none',
            }}
          >
            {isRevealed ? digit : (isSpinning ? displayDigit : '-')}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* Cinematic top & bottom frosted depth gradients */}
      <div className="absolute inset-x-0 top-0 h-6 sm:h-8 bg-gradient-to-b from-black/80 to-transparent z-20 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-6 sm:h-8 bg-gradient-to-t from-black/80 to-transparent z-20 pointer-events-none" />
    </div>
  );
};
