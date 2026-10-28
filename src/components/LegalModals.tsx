import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  Trash2, 
  Cookie, 
  Scale, 
  Sparkles, 
  ExternalLink, 
  FileText, 
  CheckCircle2,
  Tv,
  Code2
} from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Apple HIG Privacy Policy Modal (Zero-PII, Open-Source & 7-Day Purge)
 */
export const PrivacyPolicyModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 flex items-start sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 max-h-[85vh] flex flex-col z-10 my-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950 tracking-tight">Privacy & Zero-PII Policy</h3>
                  <p className="text-xs text-slate-500">Last updated: October 2026 • Open-Source Edition</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close Privacy Modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto py-5 pr-1 space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
              {/* Section 1: Zero PII */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Lock size={16} className="text-emerald-600" />
                  <h4>1. Zero Personal Data (Zero-PII) Collection</h4>
                </div>
                <p>
                  FairDraw is built from the ground up to protect attendee privacy. We <strong>never collect, require, or store</strong>:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-700">
                  <li>Email addresses or phone numbers</li>
                  <li>Real legal names, dates of birth, or home addresses</li>
                  <li>Social logins (Google, Apple, Facebook) or tracking profiles</li>
                </ul>
                <p>
                  The name you enter is purely a transient display handle shown on the stage projector during the live draw.
                </p>
              </div>

              {/* Section 2: 7-Day Purge */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Trash2 size={16} className="text-amber-600" />
                  <h4>2. 7-Day Ephemeral Self-Destruction (TTL Policy)</h4>
                </div>
                <p>
                  We believe event data should not linger on servers forever. When hosted on Cloud Firestore, every event room, ticket stub, 
                  attendee entry, and winner log is configured with automated <strong>7-Day Time-to-Live (TTL) deletion policies</strong>. 
                  Once an event concludes, all associated records permanently self-destruct within 7 days of the host&apos;s last activity.
                </p>
              </div>

              {/* Section 3: Open-Source & Self-Hosting Scope */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Code2 size={16} className="text-blue-600" />
                  <h4>3. Open-Source &amp; Self-Hosting Data Sovereignty</h4>
                </div>
                <p>
                  FairDraw is open-source software licensed under the MIT License. When running FairDraw locally in 
                  <strong> Local Preview (Mock) Mode</strong> or deployed onto your own cloud infrastructure, all room data remains 
                  strictly within your local browser or private database. Zero event data is dispatched to any external maintainers.
                </p>
              </div>

              {/* Section 4: Cryptographic Web Security */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Sparkles size={16} className="text-purple-600" />
                  <h4>4. Client-Side Cryptographic Hashing</h4>
                </div>
                <p>
                  Room secret PINs and pass restoration codes are hashed directly inside your browser using the 
                  native <strong>Web Cryptography API (SHA-256)</strong> before any network transmission. Plaintext passwords are never sent to or stored on servers.
                </p>
              </div>

              {/* Section 5: Cookieless Operation */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Cookie size={16} className="text-teal-600" />
                  <h4>5. Cookieless Operation</h4>
                </div>
                <p>
                  FairDraw operates without intrusive cookie consent banners by enforcing privacy-first defaults. 
                  No persistent tracking cookies, fingerprinting, or cross-site tracking profiles are written to your device.
                </p>
              </div>

              {/* Section 6: Advertising Transparency */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Tv size={16} className="text-slate-700" />
                  <h4>6. Advertising Transparency</h4>
                </div>
                <p>
                  This open-source community edition is <strong>completely ad-free by default</strong>. If a self-hosting administrator 
                  chooses to configure optional monetization, any served units operate under non-personalized privacy parameters.
                </p>
              </div>

              {/* Section 7: Data Controller */}
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">Project Maintainer &amp; Governance:</p>
                <p>
                  FairDraw is engineered and maintained by{' '}
                  <a href="https://daocongthanh.com/" target="_blank" rel="noopener noreferrer" className="font-bold text-slate-900 hover:text-amber-700 underline inline-flex items-center gap-0.5">
                    Đào Công Thành
                    <ExternalLink size={10} className="inline" />
                  </a>{' '}
                  in Helsinki, Finland, operating under European digital privacy ethics.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-full bg-slate-950 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Understood &amp; Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

/**
 * Apple HIG Terms of Service Modal (MIT Licensed Free Event Utility)
 */
export const TermsOfServiceModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 flex items-start sm:items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/80 max-h-[85vh] flex flex-col z-10 my-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 flex items-center justify-center">
                  <Scale size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-950 tracking-tight">Terms of Service</h3>
                  <p className="text-xs text-slate-500">Effective: October 2026 • MIT Licensed Event Utility</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close Terms Modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto py-5 pr-1 space-y-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
              {/* Section 1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Sparkles size={16} className="text-amber-600" />
                  <h4>1. Open Source License &amp; Free Availability</h4>
                </div>
                <p>
                  FairDraw is open-source software licensed under the <strong>MIT License</strong>. It is provided free of charge 
                  as a digital utility for live events, meetups, tournaments, classroom draws, and creator giveaways. 
                  No payment or credit card is required to use or self-host this software.
                </p>
              </div>

              {/* Section 2 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <h4>2. Cryptographic Fairness</h4>
                </div>
                <p>
                  Winner ticket selection utilizes cryptographically secure pseudorandom numbers generated via the browser&apos;s 
                  native <strong>Web Cryptography API (CSPRNG)</strong>. All active tickets have an equal mathematical probability of selection.
                </p>
              </div>

              {/* Section 3 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <FileText size={16} className="text-blue-600" />
                  <h4>3. Event Host Discretion &amp; Claim Windows</h4>
                </div>
                <p>
                  The room creator (Host) exercises full operational control over their event room, including setting the secret PIN, 
                  enabling Streamer Mode (1-ticket anti-bot lockdown), configuring repeat-winner allowances, and validating prize claims. 
                  FairDraw acts solely as a technological tool and does not manage, sponsor, or guarantee physical prize fulfillment.
                </p>
              </div>

              {/* Section 4 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Scale size={16} className="text-purple-600" />
                  <h4>4. Prohibited Uses</h4>
                </div>
                <p>
                  FairDraw is strictly intended for promotional giveaways, raffle entertainment, and prize draws. It may not be used for 
                  unlicensed real-money gambling, unlawful lotteries, or transmitting abusive, harmful, or fraudulent content.
                </p>
              </div>

              {/* Section 5 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
                  <Trash2 size={16} className="text-rose-600" />
                  <h4>5. Limitation of Liability</h4>
                </div>
                <p>
                  FairDraw is provided &ldquo;as is&rdquo; without warranties of any kind under the terms of the MIT License. 
                  When hosted on cloud servers, rooms and data automatically expire 7 days after the event. 
                  Users are advised to save their ticket numbers and take screenshots of winning passes.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-full bg-slate-950 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Accept &amp; Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
