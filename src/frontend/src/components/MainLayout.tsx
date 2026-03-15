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
  Plus,
  UserCog,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
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

const TICKER_STORAGE_KEY = "clearpay_ticker_messages";

function loadTickerMessages(): string {
  try {
    const stored = localStorage.getItem(TICKER_STORAGE_KEY);
    if (stored) return stored;
  } catch (_) {
    /* ignore */
  }
  return "";
}

export default function MainLayout() {
  const { currentPage, setCurrentPage } = useNavigation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // Ticker state
  const [tickerText, setTickerText] = useState<string>(loadTickerMessages);
  const [tickerDialogOpen, setTickerDialogOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");

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

  const handleSaveTickerMessage = () => {
    if (!newMessage.trim()) return;
    const updated = tickerText
      ? `${newMessage.trim()}  |  ${tickerText}`
      : newMessage.trim();
    setTickerText(updated);
    try {
      localStorage.setItem(TICKER_STORAGE_KEY, updated);
    } catch (_) {
      /* ignore */
    }
    setNewMessage("");
    setTickerDialogOpen(false);
  };

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
          animation: marquee-rtl 30s linear infinite;
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
              <button
                type="button"
                onClick={() => setTickerDialogOpen(true)}
                title="Add scrolling message"
                data-ocid="ticker.open_modal_button"
                style={{
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
                  fontSize: "16px",
                  lineHeight: 1,
                }}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            )}
            <div
              className="overflow-hidden flex-1"
              style={{ position: "relative" }}
            >
              {tickerText && (
                <span
                  className="ticker-track text-[#555555]"
                  style={{ fontSize: "0.8rem" }}
                >
                  {tickerText}
                </span>
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

      {/* Add Scrolling Message Dialog */}
      <Dialog open={tickerDialogOpen} onOpenChange={setTickerDialogOpen}>
        <DialogContent data-ocid="ticker.dialog">
          <DialogHeader>
            <DialogTitle>Add Scrolling Message</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <textarea
              rows={3}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Enter message (all special characters allowed)..."
              data-ocid="ticker.textarea"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#0078D7]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNewMessage("");
                setTickerDialogOpen(false);
              }}
              data-ocid="ticker.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTickerMessage}
              style={{ background: "#0078D7", color: "#fff" }}
              data-ocid="ticker.save_button"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
