import { Button } from "@/components/ui/button";
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
  UserCog,
  Users,
} from "lucide-react";
import { useState } from "react";
import { AppHeader } from "../components/AppHeader";
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

type Page =
  | "dashboard"
  | "analytics"
  | "projects"
  | "bills"
  | "payments"
  | "clients"
  | "users"
  | "reports"
  | "seri-ai";

export default function MainLayout() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { clear } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { data: userProfile } = useGetCallerUserProfile();
  const { isMasterAdmin, isDefaultAdminDetected } = useMasterAdmin();

  const handleLogout = async () => {
    await clear();
    queryClient.clear();
  };

  // CRITICAL: Check if user is admin (Master Admin via email-only OR Admin role OR default admin detected)
  const isAdmin =
    isMasterAdmin || isDefaultAdminDetected || userProfile?.role === "admin";

  // CRITICAL: Filter navigation items based on user role
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

  // CRITICAL: Filter out Users module for non-admin users
  const navItems = allNavItems.filter((item) => {
    if (item.adminOnly) {
      return isAdmin;
    }
    return true;
  });

  // CRITICAL: Redirect to dashboard if non-admin tries to access Users page
  const handlePageChange = (pageId: Page) => {
    if (pageId === "users" && !isAdmin) {
      console.warn("Unauthorized access attempt to Users module");
      setCurrentPage("dashboard");
      return;
    }
    setCurrentPage(pageId);
  };

  const renderPage = () => {
    // CRITICAL: Block access to Users page for non-admin users
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
          <div className="text-sm text-[#555555] mb-2">
            <div className="font-bold">{userProfile?.fullName}</div>
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
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-[#333333]">
              {getPageTitle()}
            </h1>
          </div>
          <AppHeader />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-50">{renderPage()}</main>

        {/* Footer */}
        <footer className="bg-white border-t border-border px-6 py-3 text-center text-sm text-[#555555] font-normal">
          © 2025 ClearPay. Powered by Seri AI.
        </footer>
      </div>
    </div>
  );
}
