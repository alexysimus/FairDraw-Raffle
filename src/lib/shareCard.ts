/**
 * FairDraw VIP Winner Card Generator & Social Share Utility
 * 
 * Generates an ultra-crisp, high-DPI (1080x1080) Apple Wallet style VIP Winner Pass
 * using native HTML5 Canvas 2D API (zero external dependencies).
 * Triggers native mobile share sheet (Instagram Stories, WhatsApp, Photos, Telegram)
 * with graceful desktop fallback (automatic PNG download + link copied to clipboard).
 */

export interface ShareWinnerOptions {
  roomTitle: string;
  roomCode: string;
  winnerName: string;
  winnerCode: string;
}

export interface ShareResult {
  shared: boolean;
  downloaded: boolean;
  copied: boolean;
  cancelled?: boolean;
}

/**
 * Procedurally draws the 1080x1080 VIP Winner Pass on an offscreen canvas
 */
export async function generateWinnerCardBlob(options: ShareWinnerOptions): Promise<Blob> {
  const { roomTitle, roomCode, winnerName, winnerCode } = options;
  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { alpha: false });

  if (!ctx) {
    throw new Error('Unable to acquire 2D canvas context');
  }

  // 1. Background: Clean Apple Studio Soft Luminous Slate Surface
  const bgGrad = ctx.createLinearGradient(0, 0, 0, size);
  bgGrad.addColorStop(0, '#F8FAFC');
  bgGrad.addColorStop(0.5, '#F1F5F9');
  bgGrad.addColorStop(1, '#E2E8F0');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // 2. Apple Wallet Pass Floating Card Dimensions
  const cardX = 90;
  const cardY = 70;
  const cardW = size - cardX * 2; // 900px
  const cardH = size - cardY * 2; // 940px
  const cornerRadius = 40;

  // Helper: Rounded rectangle path
  const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  // Card Outer Diffuse Shadow (Apple HIG depth)
  ctx.save();
  ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 20;
  drawRoundedRect(cardX, cardY, cardW, cardH, cornerRadius);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.restore();

  // Subtle Card Outline Border
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.07)';
  ctx.lineWidth = 1.5;
  drawRoundedRect(cardX, cardY, cardW, cardH, cornerRadius);
  ctx.stroke();
  ctx.restore();

  // Card Base Clip for Internal Drawing
  ctx.save();
  drawRoundedRect(cardX, cardY, cardW, cardH, cornerRadius);
  ctx.clip();

  // Card Inner Gradient (Ultra-clean pure white to crisp off-white)
  const cardBgGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  cardBgGrad.addColorStop(0, '#FFFFFF');
  cardBgGrad.addColorStop(0.7, '#FFFFFF');
  cardBgGrad.addColorStop(1, '#FAFAFA');
  ctx.fillStyle = cardBgGrad;
  ctx.fillRect(cardX, cardY, cardW, cardH);

  // Top Gold Metallic Foil Bar
  const foilGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY);
  foilGrad.addColorStop(0, '#F59E0B');
  foilGrad.addColorStop(0.25, '#FBBF24');
  foilGrad.addColorStop(0.5, '#F5C542');
  foilGrad.addColorStop(0.75, '#FBBF24');
  foilGrad.addColorStop(1, '#D97706');
  ctx.fillStyle = foilGrad;
  ctx.fillRect(cardX, cardY, cardW, 14);

  // Top Section Padding
  const contentX = cardX + 54;
  const contentW = cardW - 108;
  let cursorY = cardY + 54;

  // Header Row: Room Chip + Verified Pass Badge
  // Room Code Chip
  ctx.font = 'bold 22px "Google Sans", monospace, system-ui';
  const cleanCode = roomCode.toUpperCase().startsWith('FD-') ? roomCode.toUpperCase() : `FD-${roomCode.toUpperCase()}`;
  const codeChipW = ctx.measureText(`#${cleanCode}`).width + 32;
  
  ctx.fillStyle = '#F1F5F9';
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  drawRoundedRect(contentX, cursorY, codeChipW, 40, 20);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#334155';
  ctx.fillText(`#${cleanCode}`, contentX + 16, cursorY + 28);

  // Verified Badge on Right
  const verifiedBadgeText = '✓ VERIFIED PASS';
  ctx.font = 'bold 20px "Google Sans", "Plus Jakarta Sans", system-ui, sans-serif';
  const verifiedW = ctx.measureText(verifiedBadgeText).width + 36;
  const verifiedX = cardX + cardW - 54 - verifiedW;

  ctx.fillStyle = '#ECFDF5';
  ctx.strokeStyle = '#A7F3D0';
  ctx.lineWidth = 1.5;
  drawRoundedRect(verifiedX, cursorY, verifiedW, 40, 20);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#065F46';
  ctx.fillText(verifiedBadgeText, verifiedX + 18, cursorY + 28);

  cursorY += 76;

  // Event Title (Uppercase tracked small header)
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 20px "Google Sans", "Plus Jakarta Sans", system-ui, sans-serif';
  const displayTitle = roomTitle.length > 44 ? `${roomTitle.slice(0, 42)}...` : roomTitle;
  ctx.fillText(displayTitle.toUpperCase(), contentX, cursorY);

  cursorY += 56;

  // Winner Display Name (Large, bold, high-contrast)
  ctx.fillStyle = '#090D16';
  let nameFontSize = 52;
  ctx.font = `900 ${nameFontSize}px "Google Sans", "Plus Jakarta Sans", system-ui, sans-serif`;
  while (ctx.measureText(winnerName).width > contentW && nameFontSize > 34) {
    nameFontSize -= 4;
    ctx.font = `900 ${nameFontSize}px "Google Sans", "Plus Jakarta Sans", system-ui, sans-serif`;
  }
  ctx.fillText(winnerName, contentX, cursorY);

  cursorY += 46;

  // Perforated Ticket Divider with Circular Punchouts
  const perfY = cursorY + 14;
  const punchoutRadius = 24;

  // Left punchout (colored to match the canvas background outside the card)
  ctx.fillStyle = '#F1F5F9';
  ctx.beginPath();
  ctx.arc(cardX, perfY, punchoutRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Right punchout
  ctx.beginPath();
  ctx.arc(cardX + cardW, perfY, punchoutRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Dashed perforation line
  ctx.save();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(cardX + punchoutRadius + 18, perfY);
  ctx.lineTo(cardX + cardW - punchoutRadius - 18, perfY);
  ctx.stroke();
  ctx.restore();

  cursorY = perfY + 50;

  // Lucky Number Section Label
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = 'bold 21px "Google Sans", "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('OFFICIAL LUCKY NUMBER', size / 2, cursorY);

  cursorY += 24;

  // Obsidian Lucky Number Box
  const numBoxW = 440;
  const numBoxH = 150;
  const numBoxX = (size - numBoxW) / 2;
  const numBoxY = cursorY;

  ctx.save();
  ctx.shadowColor = 'rgba(245, 197, 66, 0.35)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 6;
  drawRoundedRect(numBoxX, numBoxY, numBoxW, numBoxH, 32);
  ctx.fillStyle = '#080C14';
  ctx.fill();
  ctx.strokeStyle = '#F5C542';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  // Draw Gold Numerals with Mathematical & Optical Centering
  ctx.fillStyle = '#F5C542';
  const codeLen = winnerCode.length || 4;
  const codeFontSize = codeLen >= 6 ? 78 : codeLen === 5 ? 88 : 96;
  ctx.font = `900 ${codeFontSize}px "Google Sans", "Plus Jakarta Sans", monospace, system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const numBoxCenterX = numBoxX + numBoxW / 2;
  const numBoxCenterY = numBoxY + numBoxH / 2;
  const metrics = ctx.measureText(winnerCode);
  const opticalY = numBoxCenterY + ((metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2);
  ctx.fillText(winnerCode, numBoxCenterX, opticalY);

  cursorY = numBoxY + numBoxH + 42;

  // Dynamic Auto-Expanding Winner Pill Badge
  const pillText = '★ YOU WON! • STAGE CHAMPION ★';
  ctx.font = '900 21px "Google Sans", "Plus Jakarta Sans", system-ui, sans-serif';
  const pillTextWidth = ctx.measureText(pillText).width;
  const celebPillW = Math.round(pillTextWidth + 60); // 30px padding on each side for stars
  const celebPillH = 48;
  const celebPillX = (size - celebPillW) / 2;
  
  const celebGrad = ctx.createLinearGradient(celebPillX, cursorY, celebPillX + celebPillW, cursorY);
  celebGrad.addColorStop(0, '#F59E0B');
  celebGrad.addColorStop(1, '#FBBF24');
  ctx.fillStyle = celebGrad;
  drawRoundedRect(celebPillX, cursorY, celebPillW, celebPillH, celebPillH / 2);
  ctx.fill();

  ctx.fillStyle = '#0F172A';
  ctx.textBaseline = 'middle';
  ctx.fillText(pillText, size / 2, cursorY + celebPillH / 2);

  cursorY += celebPillH + 46;

  // Simulated Barcode
  const barcodeY = cursorY;
  const barPattern = [3, 6, 2, 5, 8, 3, 7, 2, 6, 4, 8, 3, 5, 2, 7, 4, 3, 6, 2, 8, 4, 3, 7, 2, 5, 3];
  const barTotalWidth = barPattern.reduce((acc, w) => acc + w * 2.2 + 4, 0);
  let barCurrentX = (size - barTotalWidth) / 2;

  ctx.fillStyle = 'rgba(15, 23, 42, 0.20)';
  for (const barW of barPattern) {
    ctx.fillRect(barCurrentX, barcodeY, barW * 2.2, 32);
    barCurrentX += barW * 2.2 + 4;
  }

  cursorY += 56;

  // Brand Footer Integrated DIRECTLY inside the White Pass
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // FAIRDRAW Bold Brand Title
  ctx.fillStyle = '#0F172A';
  ctx.font = '900 26px "Google Sans", "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('FAIRDRAW', size / 2, cursorY);

  cursorY += 28;

  // Subtitle / URL
  ctx.fillStyle = '#64748B';
  ctx.font = '600 16px "Google Sans", "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('fairdraw.daocongthanh.com • Free Live Lucky Draws', size / 2, cursorY);

  ctx.restore(); // Restore base clip

  // Return PNG Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas toBlob conversion failed'));
    }, 'image/png');
  });
}

/**
 * Executes the seamless mobile native share or desktop download fallback
 */
export async function shareWinnerCard(options: ShareWinnerOptions): Promise<ShareResult> {
  const { roomTitle, roomCode, winnerName, winnerCode } = options;
  const cleanCode = winnerCode || 'WINNER';
  const fileName = `FairDraw-Winner-${cleanCode}.png`;
  const shareText = `🎉 I just won at "${roomTitle}" with lucky ticket #${cleanCode} on FairDraw! 🏆✨\nRun your own free live lucky draw: https://fairdraw.daocongthanh.com`;
  const shareUrl = 'https://fairdraw.daocongthanh.com';

  try {
    const blob = await generateWinnerCardBlob(options);
    const file = new File([blob], fileName, { type: 'image/png' });

    // Check if the browser supports sharing image files via Web Share API
    const canShareFiles = typeof navigator !== 'undefined' && 
      navigator.canShare && 
      navigator.canShare({ files: [file] });

    if (canShareFiles && navigator.share) {
      try {
        await navigator.share({
          title: `FairDraw Winner - ${winnerName}`,
          text: shareText,
          files: [file],
        });
        return { shared: true, downloaded: false, copied: false };
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // User intentionally closed the share sheet
          return { shared: false, downloaded: false, copied: false, cancelled: true };
        }
        // Fall back to download if share throws non-abort error
        console.warn('Web Share API error, falling back to download:', err);
      }
    }

    // Desktop or non-file share fallback:
    // 1. Download the generated PNG
    const fileUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(fileUrl), 5000);

    // 2. Copy the victory message + link to clipboard
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
        copied = true;
      }
    } catch {
      // Clipboard write optional
    }

    return { shared: false, downloaded: true, copied };
  } catch (err) {
    console.error('Failed to generate or share winner card:', err);
    // Ultimate fallback: copy text only
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareText);
        return { shared: false, downloaded: false, copied: true };
      }
    } catch {}
    throw err;
  }
}
