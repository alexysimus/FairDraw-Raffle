/**
 * FairDraw Open-Source Sync Engine (Core -> Public)
 * 
 * Safely pulls updates from the private production codebase (../FairDraw) into this public repository.
 * Guarantees:
 * 1. Zero touch on ../FairDraw (Strict read-only from parent).
 * 2. Automatic exclusion of forbidden files (.agents, .env*, scripts/generate-seo-static.js, private keys).
 * 3. Automatic preservation of Open-Source Community Card, Mock Mode, and MIT documentation.
 * 
 * Usage:
 *   node sync-from-core.js           # Execute sync
 *   node sync-from-core.js --dry-run # Preview changes without writing
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SRC_ROOT = path.resolve(__dirname, '../FairDraw');
const DEST_ROOT = path.resolve(__dirname);

const isDryRun = process.argv.includes('--dry-run');

console.log('----------------------------------------------------');
console.log('🔄 FairDraw Open-Source Sync Engine');
console.log(`Source:      ${SRC_ROOT}`);
console.log(`Destination: ${DEST_ROOT}`);
console.log(`Mode:        ${isDryRun ? 'DRY-RUN (Simulated)' : 'LIVE SYNC'}`);
console.log('----------------------------------------------------');

if (!fs.existsSync(SRC_ROOT)) {
  console.error(`❌ Source directory not found at: ${SRC_ROOT}`);
  process.exit(1);
}

// Strictly forbidden patterns - never copied into public repo
const FORBIDDEN_PATHS = [
  '.agents',
  '.env',
  '.env.local',
  'firebase-applet-config.json',
  '.firebaserc',
  '.firebase',
  'scripts',
  'dist',
  'node_modules',
  '.git',
  'ads.txt',
];

// Files strictly preserved in public repo (never overwritten by root)
const PRESERVED_PUBLIC_FILES = new Set([
  'README.md',
  'LICENSE',
  'ARCHITECTURE.md',
  'AI-AGENT-GUIDE.md',
  'UI-UX-DESIGN-SYSTEM.md',
  'ARCHITECTURE-DEEP-DIVE.md',
  'DEBUGGING-AND-TROUBLESHOOTING.md',
  'DEVELOPER-RECIPES.md',
  'sync-from-core.js',
  '.env.example',
  path.join('src', 'lib', 'mockFirebase.ts'),
  path.join('src', 'lib', 'formatters.ts'),
  path.join('scripts', 'test-formatters.mjs'),
]);

const copyDirectoryRecursive = (srcDir, destDir) => {
  if (!fs.existsSync(destDir) && !isDryRun) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    const relativeToDest = path.relative(DEST_ROOT, destPath);

    // Check blacklist
    if (FORBIDDEN_PATHS.some(f => relativeToDest.startsWith(f) || entry.name === f)) {
      continue;
    }

    // Check preserved public files
    if (PRESERVED_PUBLIC_FILES.has(relativeToDest)) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectoryRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      if (isDryRun) {
        console.log(`[DRY-RUN] Sync file: ${relativeToDest}`);
      } else {
        let content = fs.readFileSync(srcPath, 'utf8');

        // Apply automatic sanitization transformations
        if (entry.name === 'TicketLoungeModal.tsx') {
          content = sanitizeTicketLounge(content);
        } else if (entry.name === 'analytics.ts') {
          content = sanitizeAnalytics(content);
        } else if (entry.name === 'firebase.ts') {
          content = sanitizeFirebase(content);
        } else if (entry.name === 'App.tsx') {
          content = sanitizeApp(content);
        } else if (entry.name === 'index.html') {
          content = sanitizeIndexHtml(content);
        }

        fs.writeFileSync(destPath, content, 'utf8');
      }
    }
  }
};

function sanitizeIndexHtml(html) {
  // Strip hardcoded adsense and gtag
  return html
    .replace(/<!-- Google AdSense Verification & Script -->[\s\S]*?<!-- Google Sans/m, '<!-- Google Sans')
    .replace(/<meta name="google-adsense-account" content=".*?" \/>/g, '')
    .replace(/<script async src="https:\/\/pagead2\.googlesyndication\.com.*?<\/script>/g, '')
    .replace(/<!-- Google Analytics 4[\s\S]*?<\/script>\s*<\/script>/m, '');
}

function sanitizeAnalytics(code) {
  return code
    .replace(/send_to:\s*'G-[A-Za-z0-9]+'/g, 'send_to: import.meta.env.VITE_GA_MEASUREMENT_ID')
    .replace(/const cleanPath = `\/\?view=\${screenName\.toLowerCase\(\)}`;/g, 
      'const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID;\n    if (!gaId) return;\n    const cleanPath = `/?view=${screenName.toLowerCase()}`;');
}

function sanitizeTicketLounge(code) {
  if (code.includes('FairDraw Community Edition')) return code;
  return code.replace(
    /data-ad-client="ca-pub-[0-9]+"[\s\S]*?data-ad-slot="[0-9]+"/g,
    'data-ad-client={import.meta.env.VITE_ADSENSE_CLIENT_ID}\n                data-ad-slot={import.meta.env.VITE_ADSENSE_SLOT_ID}'
  );
}

function sanitizeFirebase(code) {
  if (code.includes('mockFirebaseService')) return code;
  return `import { mockFirebaseService, mockAuth, ensureMockAuth } from './mockFirebase';\nexport const isMockMode = !import.meta.env.VITE_FIREBASE_API_KEY;\n` + code;
}

function sanitizeApp(code) {
  if (code.includes('isMockMode')) return code;
  return code.replace(
    "import { firebaseService, ensureAuth } from './lib/firebase';",
    "import { firebaseService, ensureAuth, isMockMode } from './lib/firebase';"
  );
}

// 1. Copy public directory
console.log('📦 Syncing public assets...');
copyDirectoryRecursive(path.join(SRC_ROOT, 'public'), path.join(DEST_ROOT, 'public'));

// 2. Copy src directory
console.log('💻 Syncing application source code...');
copyDirectoryRecursive(path.join(SRC_ROOT, 'src'), path.join(DEST_ROOT, 'src'));

// 3. Copy top-level configs
const TOP_CONFIGS = ['tsconfig.json', 'vite.config.ts', 'firestore.rules'];
for (const file of TOP_CONFIGS) {
  const src = path.join(SRC_ROOT, file);
  const dest = path.join(DEST_ROOT, file);
  if (fs.existsSync(src) && !isDryRun) {
    fs.copyFileSync(src, dest);
  }
}

console.log('✅ Sync process completed successfully!');
console.log('🛡️  Parent repo (../FairDraw) remained 100% untouched.');
