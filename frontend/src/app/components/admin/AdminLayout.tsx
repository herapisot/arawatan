import { Outlet, Link, useLocation } from "react-router";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { 
  LayoutDashboard,
  UserCheck,
  ShieldAlert,
  BarChart3,
  Menu,
  X,
  Bell,
  LogOut
} from "lucide-react";
import { useState } from "react";
import minsuLogo from "../../../assets/7916f883ec8a03e1568c75214e57746fc2beed31.png";

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard, exact: true },
    { name: "User Verifications", path: "/admin/verifications", icon: UserCheck, badge: 12 },
    { name: "Item Moderation", path: "/admin/moderation", icon: ShieldAlert, badge: 5 },
    { name: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  ];

  const isActive = (path: string, exact?: boolean) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <img src={minsuLogo} alt="MinSU Logo" className="h-10 w-10" />
              <div>
                <div className="font-bold text-lg">MinSU Admin</div>
                <div className="text-xs text-sidebar-foreground/70">ARAWATAN Platform</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const active = isActive(item.path, item.exact);
              return (
                <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}>
                  <Button
                    variant="ghost"
                    className={`w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent ${
                      active ? "bg-sidebar-accent" : ""
                    }`}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span className="flex-1 text-left">{item.name}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-card border-b border-border sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 md:px-6 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
              <div>
                <h1 className="text-lg font-semibold">Admin Panel</h1>
                <p className="text-sm text-muted-foreground hidden md:block">
                  Manage and monitor the MinSU ARAWATAN Platform
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive rounded-full text-xs flex items-center justify-center text-destructive-foreground">
                  3
                </span>
              </Button>
              <div className="hidden md:flex items-center gap-3 pl-3 border-l border-border">
                <div className="text-right">
                  <div className="text-sm font-semibold">Admin User</div>
                  <div className="text-xs text-muted-foreground">admin@minsu.edu.ph</div>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                  AU
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
