# ClearPay – Receipt Sharing, Print Format, Shortcuts & Seri AI Enhancements

## Current State
ClearPay has receipt view modals across all modules with basic text-based share (navigator.share / clipboard copy). Print uses A5 sizing in popup windows. Keyboard Alt+S maps to Seri AI, Alt+C to Contractors, no Alt+I. Seri AI shows Outstanding and GST Outstanding as separate values.

## Requested Changes (Diff)

### Add
- `src/frontend/src/utils/receiptShare.ts` — Canvas-based receipt image generator with ClearPay watermark at 10% opacity (diagonal text). Shares as PNG via Web Share API or downloads as fallback.
- Share icon on Seri AI project summary messages (bottom-right of assistant message bubble) that exports the summary as a watermarked PNG.
- Alt+I keyboard shortcut → Seri AI module.
- Alt+S keyboard shortcut → SFT module.
- Outstanding (Including GST) line in Seri AI project summaries: Outstanding + GST Outstanding.

### Modify
- `ShortcutContext.tsx` — navMap: Alt+S changed from "seri-ai" to "sft"; Alt+I added for "seri-ai".
- `KeyboardShortcutsModal.tsx` — Updated cheatsheet entries: Alt+C=Contractors, Alt+I=Seri AI, Alt+S=SFT Module.
- `ContractorsPage.tsx` — `shareReceipt()` now calls `shareReceiptAsImage()` (canvas+watermark). Print window CSS updated to A4 with max-height 148mm (50% of A4) and ClearPay watermark.
- `SFTPage.tsx` — Share handler uses `shareReceiptAsImage()`. Print CSS updated to A4 with watermark.
- `BillViewPage.tsx` — `handleShare()` uses `shareReceiptAsImage()` with bill data.
- `PaymentViewPage.tsx` — `handleShare()` uses `shareReceiptAsImage()` with payment data.
- `index.css` — Print CSS: `@page { size: A4 portrait; margin: 20mm 15mm }`, `.print-area::after` watermark at 10% opacity, content max-height 148mm.
- `SeriAIPage.tsx` — GST included in Outstanding formula; Share2 icon on project summary messages.

### Remove
- Old text-based share fallback (clipboard copy) replaced by image download.

## Implementation Plan
1. Create `receiptShare.ts` utility with canvas drawing, watermark, PNG export.
2. Update ShortcutContext navMap.
3. Update KeyboardShortcutsModal cheatsheet.
4. Update ContractorsPage, SFTPage, BillViewPage, PaymentViewPage share handlers.
5. Update print CSS in index.css.
6. Update SeriAI GST formula and add Share icon on summary messages.
