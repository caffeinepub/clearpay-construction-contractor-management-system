import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  CreditCard,
  FileBarChart,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Trash2,
  UserCog,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Page, useNavigation } from "../context/NavigationContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useMasterAdmin } from "../hooks/useMasterAdmin";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import AnalyticsPage from "../pages/AnalyticsPage";
import BillsPage from "../pages/BillsPage";
import ClientsPage from "../pages/ClientsPage";
import DashboardPage from "../pages/DashboardPage";
import PaymentsPage from "../pages/PaymentsPage";
import ProjectsPage from "../pages/ProjectsPage";
import ReportsPage from "../pages/ReportsPage";
import SeriAIPage from "../pages/SeriAIPage";
import UsersPage from "../pages/UsersPage";
import { AppHeader } from "./AppHeader";

const TICKER_STORAGE_KEY = "clearpay_ticker_messages_v2";

type TickerMessage = { id: string; html: string };

function loadTickerMessages(): TickerMessage[] {
  try {
    const stored = localStorage.getItem(TICKER_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (_) {
    /* ignore */
  }
  return [];
}

function saveTickerMessages(messages: TickerMessage[]) {
  try {
    localStorage.setItem(TICKER_STORAGE_KEY, JSON.stringify(messages));
  } catch (_) {
    /* ignore */
  }
}

const FONT_NAMES = [
  "Century Gothic",
  "Arial",
  "Times New Roman",
  "Verdana",
  "Tahoma",
  "Georgia",
  "Courier New",
];

const FONT_SIZES = [
  "10",
  "12",
  "14",
  "16",
  "18",
  "20",
  "24",
  "28",
  "32",
  "36",
  "48",
];

function RichToolbar({
  editorRef,
}: { editorRef: React.RefObject<HTMLDivElement | null> }) {
  const [fontName, setFontName] = useState("Century Gothic");
  const [fontSize, setFontSize] = useState("14");
  const [textColor, setTextColor] = useState("#000000");

  const exec = useCallback(
    (command: string, value?: string) => {
      editorRef.current?.focus();
      document.execCommand(command, false, value);
    },
    [editorRef],
  );

  const handleFontName = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFontName(e.target.value);
    exec("fontName", e.target.value);
  };

  const handleFontSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFontSize(e.target.value);
    // execCommand fontSize uses 1-7, use inline style instead
    exec("fontSize", "7");
    // override with actual px via selection
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const span = document.createElement("span");
      span.style.fontSize = `${e.target.value}px`;
      try {
        range.surroundContents(span);
      } catch (_) {
        /* ignore partial selections */
      }
    }
  };

  const handleColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextColor(e.target.value);
    exec("foreColor", e.target.value);
  };

  const toolbarBtnStyle: React.CSSProperties = {
    border: "1px solid #ccc",
    borderRadius: "3px",
    padding: "2px 7px",
    cursor: "pointer",
    background: "#f5f5f5",
    fontSize: "13px",
    lineHeight: "1.4",
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "4px",
        padding: "6px",
        background: "#f0f0f0",
        border: "1px solid #ccc",
        borderBottom: "none",
        borderRadius: "4px 4px 0 0",
        alignItems: "center",
      }}
    >
      {/* Font Name */}
      <select
        value={fontName}
        onChange={handleFontName}
        style={{ ...toolbarBtnStyle, padding: "2px 4px", minWidth: "130px" }}
        title="Font Name"
      >
        {FONT_NAMES.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>
            {f}
          </option>
        ))}
      </select>

      {/* Font Size */}
      <select
        value={fontSize}
        onChange={handleFontSize}
        style={{ ...toolbarBtnStyle, padding: "2px 4px", minWidth: "60px" }}
        title="Font Size"
      >
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Separator */}
      <span style={{ width: "1px", height: "20px", background: "#ccc" }} />

      {/* Bold */}
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          exec("bold");
        }}
        style={{ ...toolbarBtnStyle, fontWeight: "bold" }}
        title="Bold (Ctrl+B)"
      >
        B
      </button>

      {/* Italic */}
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          exec("italic");
        }}
        style={{ ...toolbarBtnStyle, fontStyle: "italic" }}
        title="Italic (Ctrl+I)"
      >
        I
      </button>

      {/* Underline */}
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          exec("underline");
        }}
        style={{ ...toolbarBtnStyle, textDecoration: "underline" }}
        title="Underline (Ctrl+U)"
      >
        U
      </button>

      {/* Separator */}
      <span style={{ width: "1px", height: "20px", background: "#ccc" }} />

      {/* Text Color */}
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "3px",
          cursor: "pointer",
        }}
        title="Text Color"
      >
        <span style={{ fontSize: "12px", color: "#555" }}>A</span>
        <input
          type="color"
          value={textColor}
          onChange={handleColor}
          style={{
            width: "22px",
            height: "22px",
            border: "1px solid #ccc",
            borderRadius: "2px",
            cursor: "pointer",
            padding: "0",
          }}
          title="Text Color"
        />
      </label>

      {/* Separator */}
      <span style={{ width: "1px", height: "20px", background: "#ccc" }} />

      {/* Clear Formatting */}
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          exec("removeFormat");
        }}
        style={{ ...toolbarBtnStyle, fontSize: "11px" }}
        title="Clear Formatting"
      >
        Tx
      </button>
    </div>
  );
}

export default function MainLayout() {
  const { currentPage, setCurrentPage } = useNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Ticker state
  const [messages, setMessages] = useState<TickerMessage[]>(loadTickerMessages);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<TickerMessage | null>(
    null,
  );
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: userProfile } = useGetCallerUserProfile();
  const { isMasterAdmin } = useMasterAdmin();

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const isAdmin = isMasterAdmin || userProfile?.role === "admin";

  const allNavItems = [
    { id: "dashboard" as Page, label: "Dashboard", icon: LayoutDashboard },
    { id: "analytics" as Page, label: "Analytics", icon: BarChart3 },
    { id: "projects" as Page, label: "Projects", icon: FolderKanban },
    { id: "bills" as Page, label: "Bills", icon: FileText },
    { id: "payments" as Page, label: "Payments", icon: CreditCard },
    { id: "clients" as Page, label: "Clients", icon: Users },
    { id: "users" as Page, label: "Users", icon: UserCog, adminOnly: true },
    { id: "reports" as Page, label: "Reports", icon: FileBarChart },
    { id: "seri-ai" as Page, label: "Seri AI", icon: Bot },
  ];

  const navItems = allNavItems.filter((item) => {
    if (item.adminOnly) {
      return isAdmin;
    }
    return true;
  });

  const handlePageChange = (pageId: Page) => {
    if (pageId === "users" && !isAdmin) {
      console.warn("Unauthorized access attempt to Users module");
      setCurrentPage("dashboard");
      return;
    }
    setCurrentPage(pageId);
  };

  const openAddDialog = (msg?: TickerMessage) => {
    setEditingMessage(msg || null);
    setAddDialogOpen(true);
    // Pre-fill editor after dialog mounts
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = msg?.html || "";
        editorRef.current.focus();
      }
    }, 80);
  };

  const handleSaveMessage = () => {
    const html = editorRef.current?.innerHTML?.trim() || "";
    if (!html || html === "<br>") return;
    let updated: TickerMessage[];
    if (editingMessage) {
      updated = messages.map((m) =>
        m.id === editingMessage.id ? { ...m, html } : m,
      );
    } else {
      updated = [...messages, { id: Date.now().toString(), html }];
    }
    setMessages(updated);
    saveTickerMessages(updated);
    setAddDialogOpen(false);
    setEditingMessage(null);
    if (editorRef.current) editorRef.current.innerHTML = "";
  };

  const handleDeleteMessage = (id: string) => {
    const updated = messages.filter((m) => m.id !== id);
    setMessages(updated);
    saveTickerMessages(updated);
  };

  const tickerHtml = messages.map((m) => m.html).join(" &nbsp;|&nbsp; ");

  const renderPage = () => {
    if (currentPage === "users" && !isAdmin) {
      return <DashboardPage />;
    }

    switch (currentPage) {
      case "dashboard":
        return <DashboardPage />;
      case "analytics":
        return <AnalyticsPage />;
      case "projects":
        return <ProjectsPage />;
      case "bills":
        return <BillsPage />;
      case "payments":
        return <PaymentsPage />;
      case "clients":
        return <ClientsPage />;
      case "users":
        return <UsersPage />;
      case "reports":
        return <ReportsPage />;
      case "seri-ai":
        return <SeriAIPage />;
      default:
        return <DashboardPage />;
    }
  };

  const getPageTitle = () => {
    return (
      navItems.find((item) => item.id === currentPage)?.label || "Dashboard"
    );
  };

  const iconBtnStyle: React.CSSProperties = {
    background: "#0078D7",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    width: "22px",
    height: "22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    lineHeight: 1,
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Marquee keyframe style */}
      <style>{`
        @keyframes marquee-rtl {
          from { transform: translateX(100%); }
          to   { transform: translateX(-100%); }
        }
        .ticker-track {
          display: inline-block;
          white-space: nowrap;
          animation: marquee-rtl 40s linear infinite;
        }
      `}</style>

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-white border-r border-border transition-all duration-300 flex flex-col overflow-hidden`}
      >
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-3">
            <img
              src="/assets/logo mkt.png"
              alt="ClearPay Logo"
              className="h-10 w-10"
            />
            <div className="text-2xl font-bold">
              <span className="text-[#0078D7] font-bold">Clear</span>
              <span className="text-[#555555] font-bold">Pay</span>
            </div>
          </div>
          <div className="text-sm text-gray-500" style={{ fontWeight: 400 }}>
            Billing Management System
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => handlePageChange(item.id)}
                className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors font-medium ${
                  isActive
                    ? "bg-[#0078D7] text-white"
                    : "text-[#555555] hover:bg-gray-100"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="text-xs text-[#555555] mb-2 text-center">
            © 2025 ClearPay. Powered by Seri AI.
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full font-normal"
            size="sm"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              data-ocid="nav.toggle"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-[#333333]">
              {getPageTitle()}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <AppHeader />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50">{renderPage()}</main>

        {/* Footer — ticker + date/time */}
        <footer className="bg-white border-t border-border px-4 py-2 flex items-center gap-3 text-sm text-[#555555] font-normal overflow-hidden">
          {/* Scrolling ticker area */}
          <div className="flex items-center gap-2 flex-1 overflow-hidden">
            {isMasterAdmin && (
              <>
                {/* Add message button */}
                <button
                  type="button"
                  onClick={() => openAddDialog()}
                  title="Add scrolling message"
                  data-ocid="ticker.open_modal_button"
                  style={iconBtnStyle}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
                {/* Manage messages button */}
                <button
                  type="button"
                  onClick={() => setManageDialogOpen(true)}
                  title="Manage scrolling messages"
                  data-ocid="ticker.manage_button"
                  style={{ ...iconBtnStyle, background: "#555555" }}
                >
                  <Pencil className="h-3 w-3" />
                </button>
              </>
            )}
            <div
              className="overflow-hidden flex-1"
              style={{ position: "relative" }}
            >
              {tickerHtml && (
                <span
                  className="ticker-track text-[#555555]"
                  style={{ fontSize: "0.8rem" }}
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: rich text ticker content from admin only
                  dangerouslySetInnerHTML={{ __html: tickerHtml }}
                />
              )}
            </div>
          </div>

          {/* Fixed date/time */}
          <span
            className="flex-shrink-0 text-right"
            style={{ fontFamily: "'Consolas', monospace", fontSize: "0.8rem" }}
          >
            {currentDateTime.toLocaleDateString("en-GB").replace(/\//g, "/")}{" "}
            {currentDateTime.toLocaleTimeString("en-GB")}
          </span>
        </footer>
      </div>

      {/* Add / Edit Scrolling Message Dialog */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogOpen(false);
            setEditingMessage(null);
            if (editorRef.current) editorRef.current.innerHTML = "";
          }
        }}
      >
        <DialogContent className="max-w-lg" data-ocid="ticker.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingMessage
                ? "Edit Scrolling Message"
                : "Add Scrolling Message"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            {/* MS Word-style toolbar */}
            <RichToolbar editorRef={editorRef} />

            {/* ContentEditable editor area */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              data-ocid="ticker.editor"
              data-placeholder="Type your message here…"
              style={{
                minHeight: "80px",
                border: "1px solid #ccc",
                borderTop: "none",
                borderRadius: "0 0 4px 4px",
                padding: "8px 10px",
                outline: "none",
                fontSize: "14px",
                lineHeight: "1.5",
                fontFamily: "Century Gothic, sans-serif",
                color: "#333",
              }}
            />
            <p className="text-xs text-gray-400 mt-1">
              Select text first, then apply formatting from the toolbar above.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDialogOpen(false);
                setEditingMessage(null);
                if (editorRef.current) editorRef.current.innerHTML = "";
              }}
              data-ocid="ticker.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveMessage}
              style={{ background: "#0078D7", color: "#fff" }}
              data-ocid="ticker.save_button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Messages Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="max-w-lg" data-ocid="ticker.manage_dialog">
          <DialogHeader>
            <DialogTitle>Manage Scrolling Messages</DialogTitle>
          </DialogHeader>

          <div className="py-2 space-y-2 max-h-72 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No messages saved yet.
              </p>
            ) : (
              messages.map((msg, idx) => {
                // Strip HTML tags for preview text
                const div = document.createElement("div");
                div.innerHTML = msg.html;
                const preview =
                  (div.textContent || "").slice(0, 60) +
                  ((div.textContent || "").length > 60 ? "…" : "");
                return (
                  <div
                    key={msg.id}
                    className="flex items-center justify-between gap-2 p-2 border border-gray-200 rounded"
                  >
                    <span
                      className="flex-1 text-sm text-[#333] truncate"
                      title={div.textContent || ""}
                    >
                      {preview}
                    </span>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setManageDialogOpen(false);
                          openAddDialog(msg);
                        }}
                        title="Edit"
                        data-ocid={`ticker.edit_button.${idx + 1}`}
                        style={{
                          background: "#0078D7",
                          color: "#fff",
                          border: "none",
                          borderRadius: "3px",
                          padding: "3px 8px",
                          cursor: "pointer",
                          fontSize: "12px",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(msg.id)}
                        title="Delete"
                        data-ocid={`ticker.delete_button.${idx + 1}`}
                        style={{
                          background: "#D32F2F",
                          color: "#fff",
                          border: "none",
                          borderRadius: "3px",
                          padding: "3px 8px",
                          cursor: "pointer",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <Trash2 style={{ width: "11px", height: "11px" }} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setManageDialogOpen(false)}
              data-ocid="ticker.cancel_button"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
