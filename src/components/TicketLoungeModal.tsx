import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { markSessionAdSeen } from '../hooks/useTicketAd';

interface TicketLoungeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  ticketCode?: string;
  attendeeName?: string;
}

const isAdEnabled = Boolean(import.meta.env.VITE_ADSENSE_CLIENT_ID && import.meta.env.VITE_ADSENSE_SLOT_ID);
const COUNTDOWN_SECONDS = isAdEnabled ? 5 : 3;
const CIRCLE_RADIUS = 18;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

export const TicketLoungeModal: React.FC<TicketLoungeModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  ticketCode,
  attendeeName,
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(COUNTDOWN_SECONDS);
  const adPushedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(COUNTDOWN_SECONDS);
      adPushedRef.current = false;
      return;
    }

    // Push Google AdSense ad once per modal mount if ad unit configured
    if (isAdEnabled && !adPushedRef.current) {
      adPushedRef.current = true;
      try {
        // @ts-expect-error adsbygoogle is an external script global
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.debug('[AdSense] Push initialization note:', e);
      }
    }

    const startTime = Date.now();
    const durationMs = COUNTDOWN_SECONDS * 1000;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingSec = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));
      
      setTimeLeft(prev => (prev !== remainingSec ? remainingSec : prev));

      if (elapsed >= durationMs) {
        clearInterval(interval);
        markSessionAdSeen();
        onComplete();
        onClose();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [isOpen, onClose, onComplete]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Frosted Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-[340px] bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 flex flex-col items-center select-none"
          >
            {/* Header / Ticket Status */}
            <div className="w-full flex flex-col items-center text-center space-y-2 mb-3">
              {/* Radial Countdown Progress Indicator */}
              <div className="relative w-11 h-11 flex items-center justify-center">
                <svg className="w-11 h-11 -rotate-90" viewBox="0 0 44 44">
                  <circle
                    cx="22"
                    cy="22"
                    r={CIRCLE_RADIUS}
                    className="stroke-slate-100 fill-none"
                    strokeWidth="3.5"
                  />
                  <motion.circle
                    cx="22"
                    cy="22"
                    r={CIRCLE_RADIUS}
                    className="stroke-amber-500 fill-none"
                    strokeWidth="3.5"
                    strokeDasharray={CIRCUMFERENCE}
                    initial={{ strokeDashoffset: 0 }}
                    animate={{ strokeDashoffset: CIRCUMFERENCE }}
                    transition={{ duration: COUNTDOWN_SECONDS, ease: 'linear' }}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute font-mono font-bold text-xs sm:text-sm text-slate-800">
                  {timeLeft}
                </span>
              </div>

              <div className="px-2">
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight leading-snug">
                  {attendeeName ? `Minting Pass for ${attendeeName}...` : 'Minting Your Lucky Pass...'}
                </h3>
                {ticketCode && (
                  <p className="text-xs font-mono font-bold text-amber-600 mt-0.5">
                    Ticket #{ticketCode}
                  </p>
                )}
              </div>

              {/* Status Pill */}
              <div className="px-3 py-1 rounded-full bg-amber-50/80 border border-amber-200/70 text-amber-900 text-[11px] font-semibold leading-tight mt-0.5 max-w-[290px]">
                {isAdEnabled 
                  ? 'Only 1 ad for this event • Unlimited entries after'
                  : '✨ 100% Free & Open-Source • Zero Tracking'}
              </div>
            </div>

            {/* Content Container (300x250) */}
            {isAdEnabled ? (
              <div className="relative w-full max-w-[300px] h-[250px] rounded-2xl overflow-hidden bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0 mx-auto shadow-inner">
                {/* Fallback card for when AdSense is blocked by ad blocker */}
                <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center bg-gradient-to-b from-amber-50/70 via-white to-amber-50/40 select-none">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center mb-2 shadow-xs">
                    <Sparkles className="w-5 h-5 animate-pulse text-amber-500" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                    AdBlocker active? Perfect. 🚀
                  </h4>
                  <p className="text-[11px] text-slate-600 mt-1 leading-snug max-w-[230px]">
                    We honor your free will - zero friction, zero guilt! Your Lucky Pass is minting right now anyway.
                  </p>
                  <span className="text-[10px] font-semibold text-amber-700 mt-2">
                    ✨ Highest excitement incoming
                  </span>
                </div>

                {/* Google AdSense Display Unit */}
                <ins
                  className="adsbygoogle relative z-10"
                  style={{ display: 'inline-block', width: '300px', height: '250px' }}
                  data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT_ID}
                  data-ad-slot={import.meta.env.VITE_ADSENSE_SLOT_ID}
                  data-ad-format="auto"
                  data-full-width-responsive="false"
                />
              </div>
            ) : (
              /* Open-Source Community Card */
              <div className="relative w-full max-w-[300px] h-[250px] rounded-2xl overflow-hidden bg-gradient-to-br from-[#0B0F19] via-[#121826] to-[#1E293B] border border-white/[0.08] p-5 flex flex-col items-center justify-center text-center text-white shadow-xl mx-auto shrink-0">
                <div className="h-10 w-10 rounded-full bg-[#F5C542]/15 text-[#F5C542] flex items-center justify-center mb-3 border border-[#F5C542]/20 shadow-[0_0_12px_rgba(245,197,66,0.15)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-sm mb-1 text-white tracking-tight">FairDraw Community Edition</h4>
                <p className="text-xs text-slate-300 leading-relaxed mb-4 px-2">
                  Zero-friction live lucky draws for meetups, streams, and hackathons.
                </p>
                <a
                  href="https://github.com/alexysimus/FairDraw-Raffle"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-[#F5C542] border border-[#F5C542]/30 transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                >
                  <span>⭐ Star on GitHub</span>
                </a>
              </div>
            )}

            {/* Footer Note */}
            <div className="mt-2.5 w-full max-w-[300px] bg-slate-50/80 border border-slate-200/60 rounded-xl p-2 flex items-center justify-center gap-1.5 text-center">
              <Sparkles className="h-3 w-3 text-amber-600 shrink-0" />
              <p className="text-[11px] text-slate-600 leading-normal">
                {isAdEnabled 
                  ? 'Ads keep FairDraw 100% free with zero user accounts.'
                  : 'Open-source live event raffle platform.'}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
