import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileSignature,
  FileText,
  FolderKanban,
  Grid3X3,
  Keyboard,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Sun,
  Trash2,
  UserCog,
  Users,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { type Page, useNavigation } from "../context/NavigationContext";
import { PayGoProvider } from "../context/PayGoContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useMasterAdmin } from "../hooks/useMasterAdmin";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import AnalyticsPage from "../pages/AnalyticsPage";
import BillsPage from "../pages/BillsPage";
import ContractorsPage from "../pages/ContractorsPage";
import DashboardPage from "../pages/DashboardPage";
import PayGoAIPage from "../pages/PayGoAIPage";
import PayGoAnalyticsPage from "../pages/PayGoAnalyticsPage";
import PayGoBOQPage from "../pages/PayGoBOQPage";
import PayGoBillsPage from "../pages/PayGoBillsPage";
import PayGoContractorsPage from "../pages/PayGoContractorsPage";
import PayGoDashboardPage from "../pages/PayGoDashboardPage";
import PayGoPaymentsPage from "../pages/PayGoPaymentsPage";
import PayGoProjectsPage from "../pages/PayGoProjectsPage";
import PayGoReportsPage from "../pages/PayGoReportsPage";
import PayGoUsersPage from "../pages/PayGoUsersPage";
import PayGoWorkOrderPage from "../pages/PayGoWorkOrderPage";
import PaymentsPage from "../pages/PaymentsPage";
import ProjectsPage from "../pages/ProjectsPage";
import ReportsPage from "../pages/ReportsPage";
import SFTPage from "../pages/SFTPage";
import SeriAIPage from "../pages/SeriAIPage";
import UsersPage from "../pages/UsersPage";
import { AppHeader } from "./AppHeader";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";

type AppMode = "clearpay" | "paygo";
type PayGoPage =
  | "pg-dashboard"
  | "pg-analytics"
  | "pg-projects"
  | "pg-contractors"
  | "pg-bills"
  | "pg-payments"
  | "pg-reports"
  | "pg-users"
  | "pg-ai"
  | "pg-boq"
  | "pg-workorder";

type TickerMessage = { id: string; html: string };

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

function applyStyleToSelection(
  property: "fontFamily" | "fontSize" | "color",
  value: string,
) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;

  const range = sel.getRangeAt(0);
  const span = document.createElement("span");
  if (property === "fontFamily") span.style.fontFamily = value;
  else if (property === "fontSize") span.style.fontSize = `${value}px`;
  else if (property === "color") span.style.color = value;

  try {
    range.surroundContents(span);
  } catch {
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  }

  const newRange = document.createRange();
  newRange.selectNodeContents(span);
  sel.removeAllRanges();
  sel.addRange(newRange);
}

function RichToolbar({
  editorRef,
  bgColor,
  onBgColorChange,
}: {
  editorRef: React.RefObject<HTMLDivElement | null>;
  bgColor: string;
  onBgColorChange: (color: string) => void;
}) {
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
    const val = e.target.value;
    setFontName(val);
    editorRef.current?.focus();
    applyStyleToSelection("fontFamily", val);
  };

  const handleFontSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setFontSize(val);
    editorRef.current?.focus();
    applyStyleToSelection("fontSize", val);
  };

  const handleColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTextColor(val);
    editorRef.current?.focus();
    applyStyleToSelection("color", val);
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
      <select
        value={fontName}
        onChange={handleFontName}
        style={{
          ...toolbarBtnStyle,
          padding: "2px 4px",
          minWidth: "140px",
          fontFamily: fontName,
        }}
        title="Font Name (select text first)"
      >
        {FONT_NAMES.map((f) => (
          <option key={f} value={f} style={{ fontFamily: f }}>
            {f}
          </option>
        ))}
      </select>

      <select
        value={fontSize}
        onChange={handleFontSize}
        style={{ ...toolbarBtnStyle, padding: "2px 4px", minWidth: "60px" }}
        title="Font Size (select text first)"
      >
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <span style={{ width: "1px", height: "20px", background: "#ccc" }} />

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          exec("bold");
        }}
        style={{ ...toolbarBtnStyle, fontWeight: "bold" }}
        title="Bold"
      >
        B
      </button>

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          exec("italic");
        }}
        style={{ ...toolbarBtnStyle, fontStyle: "italic" }}
        title="Italic"
      >
        I
      </button>

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          exec("underline");
        }}
        style={{ ...toolbarBtnStyle, textDecoration: "underline" }}
        title="Underline"
      >
        U
      </button>

      <span style={{ width: "1px", height: "20px", background: "#ccc" }} />

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "3px",
          cursor: "pointer",
        }}
        title="Text Color (select text first)"
      >
        <span
          style={{
            fontSize: "13px",
            fontWeight: "bold",
            color: textColor,
            textDecoration: "underline",
            textDecorationColor: textColor,
          }}
        >
          A
        </span>
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
        />
      </label>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "3px",
          cursor: "pointer",
        }}
        title="Message Background Color"
      >
        <span
          style={{
            fontSize: "11px",
            color: "#333",
            background: bgColor,
            border: "1px solid #ccc",
            padding: "1px 4px",
            borderRadius: "2px",
            fontWeight: "bold",
          }}
        >
          BG
        </span>
        <input
          type="color"
          value={bgColor}
          onChange={(e) => onBgColorChange(e.target.value)}
          style={{
            width: "22px",
            height: "22px",
            border: "1px solid #ccc",
            borderRadius: "2px",
            cursor: "pointer",
            padding: "0",
          }}
        />
      </label>

      <span style={{ width: "1px", height: "20px", background: "#ccc" }} />

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

function extractBgColor(html: string): string {
  const match = html.match(/data-ticker-bg="([^"]+)"/);
  return match ? match[1] : "#FFF8E1";
}

function extractInnerHtml(html: string): string {
  const match = html.match(/<span[^>]*data-ticker-bg[^>]*>(.*)<\/span>$/s);
  return match ? match[1] : html;
}

export default function MainLayout() {
  const { theme, setTheme } = useTheme();
  const { currentPage, setCurrentPage } = useNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Mode switcher
  const [appMode, setAppMode] = useState<AppMode>("clearpay");
  const [paygoCurrentPage, setPaygoCurrentPage] =
    useState<PayGoPage>("pg-dashboard");

  // Ticker state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<TickerMessage | null>(
    null,
  );
  const [msgBgColor, setMsgBgColor] = useState("#FFF8E1");
  const editorRef = useRef<HTMLDivElement>(null);
  const handleThemeClick = () => {
    setTheme(theme === "neon" ? "light" : "neon");
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentDateTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      const isEditable =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        (e.target as HTMLElement)?.isContentEditable;
      if (!isEditable && e.key === "?") {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: userProfile } = useGetCallerUserProfile();
  const { isMasterAdmin } = useMasterAdmin();
  const { actor } = useActor();

  const { data: tickerData, refetch: refetchTicker } = useQuery({
    queryKey: ["tickerMessages"],
    queryFn: async () => {
      if (!actor) return [];
      const entries = await actor.getTickerMessages();
      return entries.map(([id, html]: [string, string]) => ({ id, html }));
    },
    enabled: !!actor,
    staleTime: 30000,
  });

  const saveTickerMutation = useMutation({
    mutationFn: async (msgs: TickerMessage[]) => {
      if (!actor) return;
      await actor.saveTickerMessages(
        msgs.map((m) => [m.id, m.html] as [string, string]),
      );
    },
    onSuccess: () => refetchTicker(),
  });

  const messages: TickerMessage[] = tickerData || [];

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  const isAdmin = isMasterAdmin || userProfile?.role === "admin";

  // ClearPay nav items
  const allNavItems = [
    {
      id: "dashboard" as Page,
      label: "Dashboard",
      icon: LayoutDashboard,
      shortcut: "Alt+D",
    },
    {
      id: "analytics" as Page,
      label: "Analytics",
      icon: BarChart3,
      shortcut: "Alt+A",
    },
    {
      id: "projects" as Page,
      label: "Projects",
      icon: FolderKanban,
      shortcut: "Alt+P",
    },
    { id: "bills" as Page, label: "Bills", icon: FileText, shortcut: "Alt+B" },
    {
      id: "payments" as Page,
      label: "Payments",
      icon: CreditCard,
      shortcut: "Alt+M",
    },
    {
      id: "contractors" as Page,
      label: "Contractors",
      icon: Users,
      shortcut: "Alt+C",
    },
    { id: "sft" as Page, label: "SFT", icon: Grid3X3, shortcut: "Alt+F" },
    {
      id: "users" as Page,
      label: "Users",
      icon: UserCog,
      adminOnly: true,
      shortcut: "Alt+U",
    },
    {
      id: "reports" as Page,
      label: "Reports",
      icon: FileBarChart,
      shortcut: "Alt+R",
    },
    { id: "seri-ai" as Page, label: "Seri AI", icon: Bot, shortcut: "Alt+S" },
  ];

  const navItems = allNavItems.filter((item) => {
    if (item.adminOnly) return isAdmin;
    return true;
  });

  // PayGo nav items
  const allPaygoNavItems = [
    {
      id: "pg-dashboard" as PayGoPage,
      label: "Dashboard",
      icon: LayoutDashboard,
      shortcut: "Alt+1",
    },
    {
      id: "pg-analytics" as PayGoPage,
      label: "Analytics",
      icon: BarChart3,
      shortcut: "Alt+2",
    },
    {
      id: "pg-projects" as PayGoPage,
      label: "Projects",
      icon: FolderKanban,
      shortcut: "Alt+3",
    },
    {
      id: "pg-contractors" as PayGoPage,
      label: "Contractors",
      icon: Users,
      shortcut: "Alt+4",
    },
    {
      id: "pg-bills" as PayGoPage,
      label: "Bills",
      icon: FileText,
      shortcut: "Alt+0",
    },
    {
      id: "pg-payments" as PayGoPage,
      label: "Payments",
      icon: CreditCard,
      shortcut: "Alt+5",
    },
    {
      id: "pg-reports" as PayGoPage,
      label: "Reports",
      icon: FileBarChart,
      shortcut: "Alt+6",
    },
    {
      id: "pg-users" as PayGoPage,
      label: "Users",
      icon: UserCog,
      adminOnly: true,
      shortcut: "Alt+7",
    },
    {
      id: "pg-ai" as PayGoPage,
      label: "AI Assistant",
      icon: Bot,
      shortcut: "Alt+8",
    },
    {
      id: "pg-boq" as PayGoPage,
      label: "BOQ",
      icon: ClipboardList,
      adminOnly: false,
    },
    {
      id: "pg-workorder" as PayGoPage,
      label: "Work Orders",
      icon: FileSignature,
      adminOnly: false,
    },
  ];

  const paygoNavItems = allPaygoNavItems.filter((item) => {
    if (item.adminOnly) return isAdmin;
    return true;
  });

  const handlePageChange = (pageId: Page) => {
    if (pageId === "users" && !isAdmin) {
      setCurrentPage("dashboard");
      return;
    }
    setCurrentPage(pageId);
  };

  const handleModeSwitch = (mode: AppMode) => {
    setAppMode(mode);
    if (mode === "clearpay") setCurrentPage("dashboard");
    else setPaygoCurrentPage("pg-dashboard");
  };

  const openAddDialog = (msg?: TickerMessage) => {
    setEditingMessage(msg || null);
    const bg = msg ? extractBgColor(msg.html) : "#FFF8E1";
    setMsgBgColor(bg);
    setAddDialogOpen(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = msg ? extractInnerHtml(msg.html) : "";
        editorRef.current.focus();
      }
    }, 80);
  };

  const handleSaveMessage = () => {
    const innerHtml = editorRef.current?.innerHTML?.trim() || "";
    if (!innerHtml || innerHtml === "<br>") return;
    const html = `<span style="background-color:${msgBgColor};padding:2px 8px;border-radius:3px;display:inline-block;" data-ticker-bg="${msgBgColor}">${innerHtml}</span>`;
    let updated: TickerMessage[];
    if (editingMessage) {
      updated = messages.map((m) =>
        m.id === editingMessage.id ? { ...m, html } : m,
      );
    } else {
      updated = [...messages, { id: Date.now().toString(), html }];
    }
    saveTickerMutation.mutate(updated);
    setAddDialogOpen(false);
    setEditingMessage(null);
    setMsgBgColor("#FFF8E1");
    if (editorRef.current) editorRef.current.innerHTML = "";
  };

  const handleDeleteMessage = (id: string) => {
    const updated = messages.filter((m) => m.id !== id);
    saveTickerMutation.mutate(updated);
  };

  const tickerHtml = messages.map((m) => m.html).join("  &nbsp;&nbsp;  ");

  const renderPayGoPage = () => {
    switch (paygoCurrentPage) {
      case "pg-dashboard":
        return <PayGoDashboardPage />;
      case "pg-analytics":
        return <PayGoAnalyticsPage />;
      case "pg-projects":
        return <PayGoProjectsPage />;
      case "pg-contractors":
        return <PayGoContractorsPage />;
      case "pg-bills":
        return <PayGoBillsPage />;
      case "pg-payments":
        return <PayGoPaymentsPage />;
      case "pg-reports":
        return <PayGoReportsPage />;
      case "pg-users":
        return <PayGoUsersPage />;
      case "pg-ai":
        return <PayGoAIPage />;
      case "pg-boq":
        return <PayGoBOQPage />;
      case "pg-workorder":
        return <PayGoWorkOrderPage />;
      default:
        return <PayGoDashboardPage />;
    }
  };

  const renderPage = () => {
    if (appMode === "paygo") return renderPayGoPage();
    if (currentPage === "users" && !isAdmin) return <DashboardPage />;
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
      case "contractors":
        return <ContractorsPage />;
      case "sft":
        return <SFTPage />;
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
    if (appMode === "paygo") {
      return (
        paygoNavItems.find((item) => item.id === paygoCurrentPage)?.label ||
        "Dashboard"
      );
    }
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

  const PAYGO_GREEN = "#28A745";

  return (
    <ThemeProvider>
      <PayGoProvider>
        <div className="flex h-screen bg-background overflow-hidden">
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
              sidebarOpen ? "w-52" : "w-0"
            } bg-white border-r border-border transition-all duration-300 flex flex-col overflow-hidden`}
          >
            {/* Mode Switcher */}
            <div className="px-3 pt-3 pb-2">
              <div
                className="flex rounded-lg overflow-hidden border"
                style={{
                  borderColor: appMode === "paygo" ? PAYGO_GREEN : "#0078D7",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleModeSwitch("clearpay")}
                  data-ocid="nav.clearpay_toggle"
                  style={{
                    flex: 1,
                    padding: "5px 0",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                    background: appMode === "clearpay" ? "#0078D7" : "#f5f5f5",
                    color: appMode === "clearpay" ? "#fff" : "#888",
                    transition: "all 0.2s",
                    fontFamily: "Century Gothic, sans-serif",
                    letterSpacing: "0.03em",
                  }}
                >
                  MKT
                </button>
                <button
                  type="button"
                  onClick={() => handleModeSwitch("paygo")}
                  data-ocid="nav.paygo_toggle"
                  style={{
                    flex: 1,
                    padding: "5px 0",
                    fontSize: "11px",
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                    background: appMode === "paygo" ? PAYGO_GREEN : "#f5f5f5",
                    color: appMode === "paygo" ? "#fff" : "#888",
                    transition: "all 0.2s",
                    fontFamily: "Century Gothic, sans-serif",
                    letterSpacing: "0.03em",
                  }}
                >
                  MPH
                </button>
              </div>
            </div>

            {/* Logo Banner */}
            <div className="w-full border-b border-border">
              <img
                src="/assets/bms_logo_3-019d489a-4c4a-750d-bff5-483863e1ff92.png"
                alt="BMS Logo"
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  objectFit: "contain",
                  maxHeight: "70px",
                }}
              />
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
              {appMode === "clearpay"
                ? navItems.map((item) => {
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
                        <span className="flex-1">{item.label}</span>
                      </button>
                    );
                  })
                : paygoNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = paygoCurrentPage === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setPaygoCurrentPage(item.id)}
                        className="w-full flex items-center gap-3 px-6 py-3 text-left transition-colors font-medium"
                        style={{
                          background: isActive ? PAYGO_GREEN : "transparent",
                          color: isActive ? "#fff" : "#555555",
                        }}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="flex-1">{item.label}</span>
                      </button>
                    );
                  })}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-border">
              <div
                style={{
                  fontSize: "9px",
                  color: "#555555",
                  marginBottom: "8px",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                © 2025 <strong>{appMode === "paygo" ? "MPH" : "MKT"}</strong>.
                Powered by Seri AI.
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
                <h1
                  className="text-2xl font-bold"
                  style={{
                    color: appMode === "paygo" ? PAYGO_GREEN : "#333333",
                  }}
                >
                  {getPageTitle()}
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleThemeClick}
                  title="Click to toggle theme (Light / Neon)"
                  data-ocid="header.toggle"
                  style={{
                    padding: "6px 10px",
                    borderRadius: "6px",
                    border:
                      theme === "neon"
                        ? "1px solid #00d4ff"
                        : "1px solid #e0e0e0",
                    background:
                      theme === "neon" ? "rgba(0,212,255,0.1)" : "#f5f5f5",
                    color: theme === "neon" ? "#00d4ff" : "#555",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                    boxShadow:
                      theme === "neon" ? "0 0 8px rgba(0,212,255,0.3)" : "none",
                    transition: "all 0.2s",
                  }}
                >
                  {theme === "neon" ? <Sun size={14} /> : <Zap size={14} />}
                  {theme === "neon" ? "Light" : "Neon"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowShortcuts(true)}
                  title="Keyboard Shortcuts (?)"
                  data-ocid="shortcuts.open_modal_button"
                  style={{
                    background: "transparent",
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    padding: "4px 8px",
                    cursor: "pointer",
                    color: "#555555",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    fontFamily: "'Century Gothic', Arial, sans-serif",
                  }}
                >
                  <Keyboard size={15} />
                  <span style={{ fontWeight: 600 }}>?</span>
                </button>
                <AppHeader />
              </div>
            </header>

            <main className="flex-1 overflow-auto bg-gray-50">
              {renderPage()}
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-border px-4 py-2 flex items-center gap-3 text-sm text-[#555555] font-normal overflow-hidden">
              <div className="flex items-center gap-2 flex-1 overflow-hidden">
                {isMasterAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => openAddDialog()}
                      title="Add scrolling message"
                      data-ocid="ticker.open_modal_button"
                      style={iconBtnStyle}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
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
                  style={{
                    position: "relative",
                    background: "#f9f9f9",
                    borderRadius: "4px",
                    padding: "2px 8px",
                    border: "1px solid #e0e0e0",
                    minHeight: "24px",
                  }}
                >
                  {tickerHtml && (
                    <span
                      className="ticker-track"
                      style={{ fontSize: "0.8rem" }}
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: rich text ticker content from admin only
                      dangerouslySetInnerHTML={{ __html: tickerHtml }}
                    />
                  )}
                </div>
              </div>

              <span
                className="flex-shrink-0 text-right"
                style={{
                  fontFamily: "'Consolas', monospace",
                  fontSize: "0.8rem",
                }}
              >
                {currentDateTime.toLocaleDateString("en-GB")}{" "}
                {currentDateTime.toLocaleTimeString("en-GB")}
              </span>
            </footer>
          </div>

          {/* Add / Edit Dialog */}
          <Dialog
            open={addDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                setAddDialogOpen(false);
                setEditingMessage(null);
                setMsgBgColor("#FFF8E1");
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
                <RichToolbar
                  editorRef={editorRef}
                  bgColor={msgBgColor}
                  onBgColorChange={setMsgBgColor}
                />
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  data-ocid="ticker.editor"
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
                    backgroundColor: msgBgColor,
                  }}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Select text first, then apply font / size / color from the
                  toolbar above.
                </p>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddDialogOpen(false);
                    setEditingMessage(null);
                    setMsgBgColor("#FFF8E1");
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
            <DialogContent
              className="max-w-lg"
              data-ocid="ticker.manage_dialog"
            >
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
                    const div = document.createElement("div");
                    div.innerHTML = extractInnerHtml(msg.html);
                    const preview =
                      (div.textContent || "").slice(0, 60) +
                      ((div.textContent || "").length > 60 ? "\u2026" : "");
                    const bg = extractBgColor(msg.html);
                    return (
                      <div
                        key={msg.id}
                        className="flex items-center justify-between gap-2 p-2 border border-gray-200 rounded"
                        style={{ backgroundColor: bg }}
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

          <KeyboardShortcutsModal
            open={showShortcuts}
            onClose={() => setShowShortcuts(false)}
          />
        </div>
      </PayGoProvider>
    </ThemeProvider>
  );
}
