/**
 * receiptShare.ts
 * Generates a receipt as a PNG image with the ClearPay logo watermark at 10% opacity.
 * Canvas size: 2480 × 1754 px (A4 landscape @ 300 DPI)
 */

export interface ReceiptShareOptions {
  title: string;
  subtitle?: string;
  borderColor: string;
  headerBg?: string;
  rows: Array<[string, string]>;
  filename?: string;
}

export async function shareReceiptAsImage(
  options: ReceiptShareOptions,
): Promise<void> {
  const {
    title,
    subtitle = "MKT Constructions",
    borderColor,
    headerBg = "#0078D7",
    rows,
    filename = "receipt.png",
  } = options;

  // A4 landscape @ 300 DPI
  const W = 2480;
  const HEADER_H = 220;
  const ROW_H = 80;
  const PADDING = 60;
  const minH = 1754;
  const H = Math.max(
    minH,
    HEADER_H + 14 + PADDING + rows.length * ROW_H + PADDING + 8 + 100,
  );

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // ── Logo Watermark (drawn first, behind everything) ───────────────────────
  await new Promise<void>((resolve) => {
    const logoImg = new Image();
    logoImg.onload = () => {
      ctx.save();
      ctx.globalAlpha = 0.2;
      const logoSize = 600;
      ctx.drawImage(
        logoImg,
        (W - logoSize) / 2,
        (H - logoSize) / 2,
        logoSize,
        logoSize,
      );
      ctx.restore();
      resolve();
    };
    logoImg.onerror = () => resolve(); // skip if logo not found
    logoImg.src = "/assets/bms_logo-019d48b5-0b82-7546-891d-f56bd7c931f7.png";
  });

  // ── Header ────────────────────────────────────────────────────────────────
  ctx.fillStyle = headerBg;
  ctx.fillRect(0, 0, W, HEADER_H);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 80px 'Century Gothic', Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("BMS", 80, HEADER_H / 2 - 25);

  ctx.font = "46px 'Century Gothic', Arial, sans-serif";
  ctx.globalAlpha = 0.85;
  ctx.fillText(subtitle, 80, HEADER_H / 2 + 45);
  ctx.globalAlpha = 1.0;

  ctx.textAlign = "right";
  ctx.font = "bold 52px 'Century Gothic', Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.9;
  ctx.fillText(title, W - 80, HEADER_H / 2);
  ctx.globalAlpha = 1.0;

  // ── Border accent below header ────────────────────────────────────────────
  ctx.fillStyle = borderColor;
  ctx.fillRect(0, HEADER_H, W, 14);

  // ── Rows ──────────────────────────────────────────────────────────────────
  const rowsY = HEADER_H + 14 + PADDING;

  rows.forEach(([label, value], i) => {
    const y = rowsY + i * ROW_H;
    if (i % 2 === 0) {
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(0, y, W, ROW_H);
    }
    ctx.fillStyle = "#555555";
    ctx.font = "bold 36px 'Century Gothic', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 80, y + ROW_H / 2);

    ctx.fillStyle = "#333333";
    ctx.font = "36px 'Century Gothic', Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(value || "\u2013", W - 80, y + ROW_H / 2);
  });

  // ── Bottom border accent ──────────────────────────────────────────────────
  const footerY = rowsY + rows.length * ROW_H + PADDING;
  ctx.fillStyle = borderColor;
  ctx.fillRect(0, footerY, W, 8);

  // ── Footer ────────────────────────────────────────────────────────────────
  ctx.fillStyle = "#888888";
  ctx.font = "34px 'Century Gothic', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "\u00A9 2025 BMS. Powered by Seri AI.",
    W / 2,
    Math.min(footerY + 60, H - 40),
  );

  // ── Export ────────────────────────────────────────────────────────────────
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    const file = new File([blob], filename, { type: "image/png" });
    if (
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({ title, files: [file] });
        return;
      } catch (_) {
        // fall through to download
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
