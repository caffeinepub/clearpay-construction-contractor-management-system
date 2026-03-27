/**
 * receiptShare.ts
 * Generates a receipt as a PNG/JPEG image with a ClearPay watermark at 10% opacity,
 * then triggers download or Web Share API.
 *
 * Usage:
 *   shareReceiptAsImage({ title, borderColor, rows, type })
 *   rows: Array of [label, value] pairs
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

  // ── Canvas dimensions (A5 proportions at 96dpi) ──────────────────────────
  const W = 560;
  const ROW_H = 32;
  const HEADER_H = 70;
  const FOOTER_H = 36;
  const PADDING = 20;
  const H = HEADER_H + PADDING + rows.length * ROW_H + PADDING + FOOTER_H;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // ── Watermark (drawn first so content goes on top) ────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.1; // 10% opacity
  ctx.font = "bold 64px Arial, sans-serif";
  ctx.fillStyle = "#0078D7";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-Math.PI / 6); // -30 degrees
  ctx.fillText("ClearPay", 0, 0);
  ctx.restore();

  // ── Header ────────────────────────────────────────────────────────────────
  ctx.fillStyle = headerBg;
  ctx.fillRect(0, 0, W, HEADER_H);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px 'Century Gothic', Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("ClearPay", 20, HEADER_H / 2 - 8);

  ctx.font = "13px 'Century Gothic', Arial, sans-serif";
  ctx.globalAlpha = 0.85;
  ctx.fillText(subtitle, 20, HEADER_H / 2 + 14);
  ctx.globalAlpha = 1.0;

  // Receipt type label (right side)
  ctx.textAlign = "right";
  ctx.font = "bold 13px 'Century Gothic', Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.9;
  ctx.fillText(title, W - 20, HEADER_H / 2);
  ctx.globalAlpha = 1.0;

  // ── Border accent line ────────────────────────────────────────────────────
  ctx.fillStyle = borderColor;
  ctx.fillRect(0, HEADER_H, W, 4);

  // ── Rows ──────────────────────────────────────────────────────────────────
  const rowsY = HEADER_H + 4 + PADDING;
  ctx.font = "13px 'Century Gothic', Arial, sans-serif";

  rows.forEach(([label, value], i) => {
    const y = rowsY + i * ROW_H;
    // Alternating row background
    if (i % 2 === 0) {
      ctx.fillStyle = "#f5f5f5";
      ctx.fillRect(0, y, W, ROW_H);
    }
    // Label
    ctx.fillStyle = "#555555";
    ctx.font = "bold 12px 'Century Gothic', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 20, y + ROW_H / 2);
    // Value
    ctx.fillStyle = "#333333";
    ctx.font = "12px 'Century Gothic', Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(value || "–", W - 20, y + ROW_H / 2);
  });

  // ── Bottom border accent ──────────────────────────────────────────────────
  const footerY = rowsY + rows.length * ROW_H + PADDING;
  ctx.fillStyle = borderColor;
  ctx.fillRect(0, footerY, W, 2);

  // ── Footer ────────────────────────────────────────────────────────────────
  ctx.fillStyle = "#888888";
  ctx.font = "11px 'Century Gothic', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "© 2025 ClearPay. Powered by Seri AI.",
    W / 2,
    footerY + FOOTER_H / 2,
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
    // Fallback: download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
