import { X } from "lucide-react";
import { useEffect } from "react";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

type ShortcutRow = { keys: string[]; action: string };
type Section = { title: string; rows: ShortcutRow[] };

const SECTIONS: Section[] = [
  {
    title: "Navigation",
    rows: [
      { keys: ["Alt", "D"], action: "Dashboard" },
      { keys: ["Alt", "P"], action: "Projects" },
      { keys: ["Alt", "B"], action: "Bills" },
      { keys: ["Alt", "M"], action: "Payments" },
      { keys: ["Alt", "U"], action: "Users (Admin only)" },
      { keys: ["Alt", "C"], action: "Clients" },
      { keys: ["Alt", "A"], action: "Analytics" },
      { keys: ["Alt", "R"], action: "Reports" },
      { keys: ["Alt", "S"], action: "Seri AI" },
    ],
  },
  {
    title: "Global Actions",
    rows: [
      { keys: ["Ctrl", "N"], action: "New form" },
      { keys: ["Ctrl", "S"], action: "Save form" },
      { keys: ["Ctrl", "P"], action: "Print" },
      { keys: ["Ctrl", "F"], action: "Focus search" },
      { keys: ["Ctrl", "R"], action: "Refresh list" },
      { keys: ["Esc"], action: "Close modal" },
      { keys: ["Ctrl", "E"], action: "Edit selected" },
      { keys: ["Ctrl", "D"], action: "Delete selected" },
      { keys: ["Ctrl", "A"], action: "Select all rows" },
      { keys: ["Ctrl", "Shift", "D"], action: "Bulk delete" },
      { keys: ["Ctrl", "I"], action: "Import CSV" },
      { keys: ["Ctrl", "Shift", "E"], action: "Export CSV" },
      { keys: ["Ctrl", "Shift", "P"], action: "Export PDF" },
      { keys: ["Ctrl", "Shift", "F"], action: "Download Format" },
      { keys: ["Ctrl", "Shift", "C"], action: "Clear Filters" },
      { keys: ["Ctrl", "Shift", "R"], action: "Reset Filters" },
    ],
  },
  {
    title: "Table Navigation",
    rows: [
      { keys: ["\u2191", "\u2193"], action: "Move row selection" },
      { keys: ["Spacebar"], action: "Select / deselect row" },
      { keys: ["Shift", "\u2193"], action: "Multi-select rows" },
      { keys: ["Ctrl", "Click"], action: "Individual row select" },
      { keys: ["Ctrl", "Home"], action: "Jump to first row" },
      { keys: ["Ctrl", "End"], action: "Jump to last row" },
    ],
  },
  {
    title: "Form Shortcuts",
    rows: [
      { keys: ["Ctrl", "Enter"], action: "Save form" },
      { keys: ["Tab"], action: "Next field" },
      { keys: ["Shift", "Tab"], action: "Previous field" },
      { keys: ["Ctrl", "Backspace"], action: "Clear current field" },
      { keys: ["Ctrl", "Shift", "S"], action: "Save & close" },
      { keys: ["Ctrl", "Shift", "N"], action: "Save & new" },
    ],
  },
];

function KbdTag({ label }: { label: string }) {
  return (
    <kbd
      style={{
        display: "inline-block",
        padding: "2px 7px",
        fontSize: "11px",
        fontFamily: "Consolas, monospace",
        fontWeight: 600,
        color: "#444",
        background: "#F2F2F2",
        border: "1px solid #ccc",
        borderRadius: "4px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.12)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </kbd>
  );
}

export function KeyboardShortcutsModal({
  open,
  onClose,
}: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click-to-close, keyboard handled via useEffect
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "10px",
          width: "min(90vw, 780px)",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
          fontFamily: "'Century Gothic', Arial, sans-serif",
          overflow: "hidden",
        }}
        data-ocid="shortcuts.modal"
      >
        {/* Header */}
        <div
          style={{
            background: "#0078D7",
            color: "#fff",
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>&#9000;</span>
            <span
              style={{
                fontWeight: 700,
                fontSize: "17px",
                letterSpacing: "0.01em",
              }}
            >
              Keyboard Shortcuts
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-ocid="shortcuts.close_button"
            style={{
              background: "transparent",
              border: "none",
              color: "#fff",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              borderRadius: "4px",
            }}
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tip bar */}
        <div
          style={{
            background: "#E3F2FD",
            padding: "7px 20px",
            fontSize: "12px",
            color: "#555",
            borderBottom: "1px solid #dce8f5",
            flexShrink: 0,
          }}
        >
          Press <KbdTag label="?" /> anytime (outside a text field) to open this
          panel &middot; <KbdTag label="Esc" /> to close
        </div>

        {/* Body */}
        <div
          style={{
            overflowY: "auto",
            padding: "18px 20px 20px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "24px 32px",
          }}
        >
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "#0078D7",
                  marginBottom: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  borderBottom: "2px solid #E3F2FD",
                  paddingBottom: "5px",
                }}
              >
                {section.title}
              </h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {section.rows.map((row, i) => (
                    <tr
                      key={row.action}
                      style={{
                        background: i % 2 === 0 ? "#fff" : "#F8FBFF",
                      }}
                    >
                      <td
                        style={{
                          padding: "5px 0 5px 4px",
                          minWidth: "140px",
                          verticalAlign: "middle",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            gap: "4px",
                            flexWrap: "wrap",
                          }}
                        >
                          {row.keys.map((k, ki) => (
                            <span
                              key={k}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "3px",
                              }}
                            >
                              {ki > 0 && (
                                <span
                                  style={{
                                    color: "#aaa",
                                    fontSize: "11px",
                                    marginTop: "-1px",
                                  }}
                                >
                                  +
                                </span>
                              )}
                              <KbdTag label={k} />
                            </span>
                          ))}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: "5px 4px",
                          fontSize: "13px",
                          color: "#333",
                          verticalAlign: "middle",
                        }}
                      >
                        {row.action}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
