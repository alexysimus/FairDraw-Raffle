import React, { useState } from 'react';
import { 
  Sparkles, 
  Smartphone, 
  Tv, 
  ShieldCheck, 
  Timer, 
  Trophy, 
  ChevronDown, 
  Check, 
  X, 
  ExternalLink, 
  QrCode, 
  Flame, 
  Award,
  Globe,
  Lock,
  Trash2,
  Zap,
  MousePointerClick,
  FileText,
  Shield,
  Heart,
  Activity
} from 'lucide-react';
import { PrivacyPolicyModal, TermsOfServiceModal } from './LegalModals';
import { trackEvent } from '../lib/analytics';

export const SeoLandingSection: React.FC = () => {
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  return (
    <section className="mt-16 sm:mt-24 pt-12 border-t border-slate-200/80 text-left max-w-4xl mx-auto w-full px-4 sm:px-6">
      {/* Chapter 1: How FairDraw Works in 3 Steps */}
      <article className="mb-16 sm:mb-24">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-900 text-xs sm:text-sm font-bold mb-5 shadow-xs">
          <Sparkles size={14} className="text-blue-600" />
          Frictionless Workflow
        </div>

        <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight mb-8">
          How FairDraw Works in 3 Steps
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Step 1 */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-base flex items-center justify-center mb-4">
                1
              </div>
              <h3 className="font-black text-slate-950 text-lg sm:text-xl mb-2">
                Host Creates Room
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Enter event name &amp; 4-digit secret PIN in 5 seconds. Connect the Stage screen to your projector or TV.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500">
              <Tv size={15} className="text-slate-700" />
              <span>Projector ready</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 font-black text-base flex items-center justify-center mb-4">
                2
              </div>
              <h3 className="font-black text-slate-950 text-lg sm:text-xl mb-2">
                Audience Scans QR
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Guests scan the big screen QR code on their phone, type their name, and instantly receive their Digital Lucky Pass.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500">
              <Smartphone size={15} className="text-amber-600" />
              <span>Zero app install</span>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white font-black text-base flex items-center justify-center mb-4">
                3
              </div>
              <h3 className="font-black text-slate-950 text-lg sm:text-xl mb-2">
                Spin &amp; Claim Live
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Host taps spin from their pocket. Mechanical slot reels spin with synchronized stage reel animation, followed by a live 45s winner claim window.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500">
              <Trophy size={15} className="text-emerald-600" />
              <span>Verified winners</span>
            </div>
          </div>
        </div>
      </article>

      {/* Chapter 2: The Authentic VBE 2026 Origin Story (E-E-A-T) */}
      <article className="mb-16 sm:mb-24">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-900 text-xs sm:text-sm font-bold mb-5 shadow-xs">
          <Flame size={14} className="text-amber-600" />
          The Origin Story
        </div>
        
        <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight mb-5">
          Born at VBE 2026: The Sunday Evening Rescue
        </h2>

        <div className="space-y-5 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
          <p>
            At the after-party and gala dinner of the{' '}
            <a 
              href="https://www.vifinton.com/vietnamese-badminton-in-the-eu" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="font-bold text-amber-700 hover:text-amber-800 underline inline-flex items-center gap-1"
            >
              VBE 2026 (Vietnamese Badminton in the EU)
              <ExternalLink size={14} className="inline" />
            </a>{' '}
            tournament with about a hundred hungry, celebratory players, my friend was in charge of the lucky draw. Her plan? The timeless classic: print a sheet of numbers, spend hours slicing paper strips with scissors, fold them into a bowl, and hope nobody drops beer on them.
          </p>
          <p>
            I looked at the setup and immediately built a clean online raffle on my laptop. When I showed her, she gave me the classic polite nod - with a hundred tournament logistics on fire and zero volunteers to spare, she stuck with paper because habit is comfortable.
          </p>
          <p>
            Fast forward to Sunday evening. The gala is starting in fifteen minutes. Energy is peaking, volunteers are exhausted, and the paper raffle is hopelessly behind schedule. Panic in the eyes. She messaged me: <em>&quot;Hey... that raffle app you made? Can we actually use it right now?&quot;</em>
          </p>
          <p>
            The best part? I was still over on the badminton courts managing the final matches - I couldn&apos;t even be there to guide her! There wasn&apos;t even a QR code yet; she simply dropped the link into the tournament group chat. And with zero instructions from me, she ran the entire draw effortlessly. Every attendee grabbed a digital ticket on their phone, the reels spun on the screen, and the whole hall erupted. Flawless execution. Pure synchronicity.
          </p>
          <p className="bg-amber-50/70 border border-amber-200/80 rounded-3xl p-5 sm:p-6 text-amber-950 font-medium text-base sm:text-lg leading-relaxed shadow-xs">
            That electric moment was the revelation: if an organizer can run a 100-person raffle in a crisis with zero training while the developer is busy on the court, this experience belonged to the world. I took that raw prototype and elevated it into <strong>FairDraw</strong>: adding instant projector QR codes, multi-tenant isolation for thousands of concurrent events worldwide, zero participant passwords, zero downloads, zero cookie tracking, and 100% ad-free stage screens. Highest excitement, zero friction - exactly how life is supposed to work.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <a
              href="https://fairdraw.daocongthanh.com/stories/live-raffle-playbook/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm sm:text-base transition-all shadow-sm active:scale-[0.98]"
            >
              <span>Read the Full Origin Story &amp; Host Playbook</span>
              <span className="text-base font-mono">-&gt;</span>
            </a>
            <span className="text-xs text-slate-500 font-medium">Includes 5-step event checklist &amp; security teardown</span>
          </div>
        </div>
      </article>

      {/* Chapter 3: Solving the 6 Nightmares of Live Event Organizers */}
      <article className="mb-16 sm:mb-24">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-900 text-xs sm:text-sm font-bold mb-5 shadow-xs">
          <Zap size={14} className="text-rose-600" />
          Built for Event Masters
        </div>

        <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight mb-4">
          Solving the 6 Great Nightmares of Live Event Organizers
        </h2>
        <p className="text-base sm:text-lg text-slate-600 mb-8 leading-relaxed">
          Traditional raffles and amateur spinner apps are full of friction. Here is how FairDraw solves every pain point:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Pain Point 1 */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-rose-600 mb-2">
                Nightmare 1: Ticket Bottleneck
              </div>
              <h3 className="font-black text-slate-950 text-lg sm:text-xl mb-2.5">
                5-Second Smartphone Self-Registration
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                No volunteers cutting paper stubs or distributing tickets. Guests point their camera at the projector screen and register themselves in 5 seconds.
              </p>
            </div>
          </div>

          {/* Pain Point 2 */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-rose-600 mb-2">
                Nightmare 2: Lost Stubs &amp; Illegible Writing
              </div>
              <h3 className="font-black text-slate-950 text-lg sm:text-xl mb-2.5">
                Digital Pass &amp; 8-Char Recovery Key
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                No lost paper stubs or deciphering messy handwriting under dim lights. Every attendee holds an interactive digital pass with instant cryptographic pass restoration.
              </p>
            </div>
          </div>

          {/* Pain Point 3 */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-rose-600 mb-2">
                Nightmare 3: Absent Winners &amp; Dead Silence
              </div>
              <h3 className="font-black text-slate-950 text-lg sm:text-xl mb-2.5">
                Live 45-Second Stage Claim Window
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                When a winning ticket is selected, a thrilling 45s countdown begins. Winners tap &quot;Claim&quot; right on their phone, keeping the crowd hyped and eliminating ghost winners.
              </p>
            </div>
          </div>

          {/* Pain Point 4 */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-rose-600 mb-2">
                Nightmare 4: Spammers &amp; Multi-Entry Bots
              </div>
              <h3 className="font-black text-slate-950 text-lg sm:text-xl mb-2.5">
                Streamer Mode Anti-Bot Lockdown
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Hosting an online livestream? Enable Streamer Mode with 1 click to restrict each device to exactly 1 ticket, completely preventing multi-account ticket farming.
              </p>
            </div>
          </div>

          {/* Pain Point 5 */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-rose-600 mb-2">
                Nightmare 5: Tethered to the Stage Laptop
              </div>
              <h3 className="font-black text-slate-950 text-lg sm:text-xl mb-2.5">
                Dual-Surface Pocket Remote &amp; Clicker
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Control the big screen from your phone in your pocket, or walk the room with any wireless presentation slide clicker (Spacebar / Enter support built-in).
              </p>
            </div>
          </div>

          {/* Pain Point 6 */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-rose-600 mb-2">
                Nightmare 6: Flashing Projector Ads
              </div>
              <h3 className="font-black text-slate-950 text-lg sm:text-xl mb-2.5">
                100% Ad-Free Stage &amp; Host Screens
              </h3>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Nothing ruins an upscale gala like ugly banner ads projected across the wall. Stage and Host views are strictly 100% ad-free forever.
              </p>
            </div>
          </div>
        </div>
      </article>

      {/* Chapter 4: Multi-Cultural Formats & Search Synonyms */}
      <article className="mb-16 sm:mb-24">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-900 text-xs sm:text-sm font-bold mb-5 shadow-xs">
          <Globe size={14} className="text-cyan-600" />
          Universal Discovery
        </div>

        <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight mb-4">
          One Engine for Every Event Format
        </h2>
        <p className="text-base sm:text-lg text-slate-600 mb-6 leading-relaxed">
          Whether you call it a raffle, lucky draw, or tombola, FairDraw adapts to how your community celebrates across the globe:
        </p>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <span className="px-4 py-2 rounded-full bg-slate-100 border border-slate-200/80 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs">
            🎟️ Digital Raffle (US / UK / Australia)
          </span>
          <span className="px-4 py-2 rounded-full bg-slate-100 border border-slate-200/80 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs">
            🧧 Lucky Draw (Singapore / Vietnam / Asia)
          </span>
          <span className="px-4 py-2 rounded-full bg-slate-100 border border-slate-200/80 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs">
            🎁 Prize Giveaway (Twitch / YouTube Streams)
          </span>
          <span className="px-4 py-2 rounded-full bg-slate-100 border border-slate-200/80 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs">
            🎯 Random Name Picker (Schools &amp; Meetups)
          </span>
          <span className="px-4 py-2 rounded-full bg-slate-100 border border-slate-200/80 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs">
            🎪 Tombola / Bốc Thăm Trúng Thưởng (Europe &amp; VN)
          </span>
          <span className="px-4 py-2 rounded-full bg-slate-100 border border-slate-200/80 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs">
            🏆 Gala Dinner &amp; Dance (D&amp;D Lucky Draw)
          </span>
        </div>
      </article>

      {/* Chapter 5: 2026 Competitor Benchmark Matrix */}
      <article className="mb-16 sm:mb-24">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-900 text-xs sm:text-sm font-bold mb-5 shadow-xs">
          <Award size={14} className="text-emerald-600" />
          The Category Moat
        </div>

        <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight mb-4">
          FairDraw vs. Alternative Giveaway Tools
        </h2>
        <p className="text-base sm:text-lg text-slate-600 mb-8 leading-relaxed">
          How FairDraw compares against the dominant giveaway and lucky draw methods in 2026:
        </p>

        <div className="overflow-x-auto rounded-3xl border border-slate-200/80 shadow-xs bg-white">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold">
                <th className="py-4 px-4 sm:px-5">Feature</th>
                <th className="py-4 px-4 sm:px-5 text-amber-300">FairDraw</th>
                <th className="py-4 px-4 sm:px-5 text-slate-300">Wheel of Names</th>
                <th className="py-4 px-4 sm:px-5 text-slate-300">Gleam / SweepWidget</th>
                <th className="py-4 px-4 sm:px-5 text-slate-300">Paper Tickets</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3.5 px-4 sm:px-5 font-semibold text-slate-900">Dual-Surface Pocket Remote</td>
                <td className="py-3.5 px-4 sm:px-5 font-bold text-emerald-600 flex items-center gap-1.5"><Check size={16} /> Yes</td>
                <td className="py-3.5 px-4 sm:px-5 text-slate-400">No (1 screen)</td>
                <td className="py-3.5 px-4 sm:px-5 text-slate-400">No</td>
                <td className="py-3.5 px-4 sm:px-5 text-slate-400">No</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="py-3.5 px-4 sm:px-5 font-semibold text-slate-900">Audience Mobile Check-In</td>
                <td className="py-3.5 px-4 sm:px-5 font-bold text-emerald-600 flex items-center gap-1.5"><Check size={16} /> QR Pass</td>
                <td className="py-3.5 px-4 sm:px-5 text-slate-400">Host types manually</td>
                <td className="py-3.5 px-4 sm:px-5 text-slate-500">Social actions</td>
                <td className="py-3.5 px-4 sm:px-5 text-slate-400">Physical paper</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 sm:px-5 font-semibold text-slate-900">Live Stage Claim Window</td>
                <td className="py-3.5 px-4 sm:px-5 font-bold text-emerald-600 flex items-center gap-1.5"><Check size={16} /> 45s Timer</td>
                <td className="py-3.5 px-4 sm:px-5 text-slate-400">No</td>
                <td className="py-3.5 px-4 sm:px-5 text-slate-400">No</td>
                <td className="py-3.5 px-4 sm:px-5 text-slate-400">Manual shouting</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="py-3.5 px-4 sm:px-5 font-semibold text-slate-900">Zero Signup / Zero PII</td>
                <td className="py-3.5 px-4 sm:px-5 font-bold text-emerald-600 flex items-center gap-1.5"><Check size={16} /> 100% Private</td>
                <td className="py-3.5 px-4 sm:px-5 text-emerald-600">Yes</td>
                <td className="py-3.5 px-4 sm:px-5 text-slate-400">Requires emails</td>
                <td className="py-3.5 px-4 sm:px-5 text-emerald-600">Yes</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 sm:px-5 font-semibold text-slate-900">Ephemeral Self-Destruct</td>
                <td className="py-3.5 px-4 sm:px-5 font-bold text-emerald-600 flex items-center gap-1.5"><Check size={16} /> 7-Day TTL</td>
                <td className="py-3.5 px-4 sm:px-5 text-slate-400">Stored in browser</td>
                <td className="py-3.5 px-4 sm:px-5 text-slate-400">Permanent DB</td>
                <td className="py-3.5 px-4 sm:px-5 text-slate-400">Physical trash</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="py-3.5 px-4 sm:px-5 font-semibold text-slate-900">Ad-Free Big Screen Stage</td>
                <td className="py-3.5 px-4 sm:px-5 font-bold text-emerald-600 flex items-center gap-1.5"><Check size={16} /> 100% Ad-Free</td>
                <td className="py-3.5 px-4 sm:px-5 text-slate-400">Flashing banners</td>
                <td className="py-3.5 px-4 sm:px-5 text-slate-400">Promotions</td>
                <td className="py-3.5 px-4 sm:px-5 text-emerald-600">Yes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      {/* Chapter 6: Interactive Accessible FAQ Accordion */}
      <article className="mb-16 sm:mb-24">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-900 text-xs sm:text-sm font-bold mb-5 shadow-xs">
          <ShieldCheck size={14} className="text-purple-600" />
          Frequently Asked Questions
        </div>

        <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight leading-tight mb-8">
          Everything You Need to Know
        </h2>

        <div className="space-y-4">
          {/* FAQ 1 */}
          <details 
            onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) trackEvent('faq_accordion_toggled', { question_index: 1 }); }}
            className="group bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs transition-all [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex items-center justify-between font-black text-slate-950 cursor-pointer list-none text-base sm:text-lg">
              <span>Is FairDraw completely free to use?</span>
              <ChevronDown size={20} className="text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed pt-3 border-t border-slate-100">
              Yes, 100% free with no hidden fees, paywalls, or limits on participant counts. A single brief 5-second ad shown once to attendees upon registration keeps server infrastructure fully funded. The Stage screen and Host remote controller remain 100% ad-free forever.
            </p>
          </details>

          {/* FAQ 2 */}
          <details 
            onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) trackEvent('faq_accordion_toggled', { question_index: 2 }); }}
            className="group bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs transition-all [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex items-center justify-between font-black text-slate-950 cursor-pointer list-none text-base sm:text-lg">
              <span>How does the dual-surface remote control work?</span>
              <ChevronDown size={20} className="text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed pt-3 border-t border-slate-100">
              When creating a room, open the Stage view on your projector laptop. Then scan the Host Admin QR code with your phone. Your phone becomes a secret pocket remote control with lock/unlock, spin, reset, and repeat-winner toggles, completely detached from the projector screen.
            </p>
          </details>

          {/* FAQ 3 */}
          <details 
            onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) trackEvent('faq_accordion_toggled', { question_index: 3 }); }}
            className="group bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs transition-all [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex items-center justify-between font-black text-slate-950 cursor-pointer list-none text-base sm:text-lg">
              <span>Do attendees need to register or create accounts?</span>
              <ChevronDown size={20} className="text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed pt-3 border-t border-slate-100">
              Never. Attendees simply scan the room QR code or visit the room link, type their display name, and get their Digital Lucky Pass. An 8-character recovery password allows them to restore or switch tickets anytime without passwords or emails.
            </p>
          </details>

          {/* FAQ 4 */}
          <details 
            onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) trackEvent('faq_accordion_toggled', { question_index: 4 }); }}
            className="group bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs transition-all [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex items-center justify-between font-black text-slate-950 cursor-pointer list-none text-base sm:text-lg">
              <span>What is the 45-second Live Claim Window?</span>
              <ChevronDown size={20} className="text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed pt-3 border-t border-slate-100">
              When a winning ticket is selected, the Stage screen starts an exciting 45-second ticking countdown. The winner taps &quot;Claim My Prize&quot; directly on their smartphone pass, confirming their physical presence and protecting their win from accidental forfeiture.
            </p>
          </details>

          {/* FAQ 5 */}
          <details 
            onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) trackEvent('faq_accordion_toggled', { question_index: 5 }); }}
            className="group bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs transition-all [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex items-center justify-between font-black text-slate-950 cursor-pointer list-none text-base sm:text-lg">
              <span>How does FairDraw handle privacy and GDPR?</span>
              <ChevronDown size={20} className="text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed pt-3 border-t border-slate-100">
              FairDraw collects zero PII (Personally Identifiable Information) - no emails, phone numbers, or passwords. All rooms and attendee subcollections are strictly ephemeral and automatically self-destruct after 7 days via Firestore TTL rules.
            </p>
          </details>

          {/* FAQ 6 */}
          <details 
            onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) trackEvent('faq_accordion_toggled', { question_index: 6 }); }}
            className="group bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-xs transition-all [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex items-center justify-between font-black text-slate-950 cursor-pointer list-none text-base sm:text-lg">
              <span>Can I use a presentation clicker on stage?</span>
              <ChevronDown size={20} className="text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-4 text-sm sm:text-base text-slate-600 leading-relaxed pt-3 border-t border-slate-100">
              Yes! The Stage screen natively listens for hardware presenter clicker signals (Spacebar / Enter). You can walk around the auditorium with a wireless slide clicker and trigger spins hands-free.
            </p>
          </details>
        </div>
      </article>

      {/* Minimalist Apple-Style Ecosystem & Legal Footer */}
      <footer className="pt-12 pb-20 border-t border-slate-200/80 text-center">
        {/* Sleek Ecosystem Pill Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-xs sm:text-sm font-bold shadow-xs">
            <Sparkles size={14} className="text-amber-400" />
            FairDraw
          </div>

          <a 
            href="https://fairdraw.daocongthanh.com/stories/live-raffle-playbook/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-amber-950 text-xs sm:text-sm font-bold transition-colors shadow-xs"
          >
            <Flame size={14} className="text-amber-600" />
            <span>Stories &amp; Playbook</span>
          </a>

          <a 
            href="https://qr.daocongthanh.com/" 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={() => trackEvent('ecosystem_outbound_click', { project: 'pure_qr' })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 text-xs sm:text-sm font-semibold transition-colors shadow-xs"
          >
            <QrCode size={14} className="text-blue-600" />
            <span>Pure QR</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">• Vector Designer</span>
          </a>

          <a 
            href="https://velox.daocongthanh.com/" 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={() => trackEvent('ecosystem_outbound_click', { project: 'velox' })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 text-xs sm:text-sm font-semibold transition-colors shadow-xs"
          >
            <Trophy size={14} className="text-emerald-600" />
            <span>Velox</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">• Sports Video AI</span>
          </a>

          <a 
            href="https://strings.daocongthanh.com/" 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={() => trackEvent('ecosystem_outbound_click', { project: 'string_lab' })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 text-xs sm:text-sm font-semibold transition-colors shadow-xs"
          >
            <Activity size={14} className="text-purple-600" />
            <span>String Lab</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">• Racquet Physics</span>
          </a>

          <a 
            href="https://daocongthanh.com/" 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={() => trackEvent('ecosystem_outbound_click', { project: 'creator_portfolio' })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-800 text-xs sm:text-sm font-black transition-colors shadow-xs"
          >
            <span>Đào Công Thành</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">• Helsinki</span>
          </a>
        </div>

        {/* Legal & Trust Actions */}
        <div className="flex items-center justify-center gap-5 text-xs sm:text-sm font-semibold text-slate-500 mb-5">
          <button
            onClick={() => {
              trackEvent('legal_modal_opened', { type: 'privacy' });
              setIsPrivacyOpen(true);
            }}
            className="hover:text-slate-900 underline underline-offset-4 cursor-pointer transition-colors"
          >
            Privacy &amp; Zero-PII Policy
          </button>
          <span className="text-slate-300">•</span>
          <button
            onClick={() => {
              trackEvent('legal_modal_opened', { type: 'terms' });
              setIsTermsOpen(true);
            }}
            className="hover:text-slate-900 underline underline-offset-4 cursor-pointer transition-colors"
          >
            Terms of Service
          </button>
        </div>

        {/* High-Vibe Synchronicity Philosophy */}
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          Zero friction. Zero tracking. Maximum excitement. Everything unfolds in perfect synchronicity.
        </p>
      </footer>

      {/* Accessible Apple HIG Sheet Modals */}
      <PrivacyPolicyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsOfServiceModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </section>
  );
};

export default SeoLandingSection;
