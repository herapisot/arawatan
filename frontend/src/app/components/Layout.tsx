import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { useState, useEffect, useCallback } from "react";
import { Button } from "./ui/button";
import { Footer } from "./Footer";
import { 
  Menu, 
  X, 
  Home, 
  Store, 
  Image as ImageIcon, 
  Trophy, 
  Info,
  MessageCircle,
  User,
  Bell,
  LogOut,
  CheckCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { notificationApi } from "../services/api";

interface NotificationType {
  id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

function notifTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function Layout() {
  // mobile menu now navigates to a dedicated page instead of an overlay
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isVerified, logout, login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
      setShowLoginModal(false);
      setLoginEmail("");
      setLoginPassword("");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setLoginError(error.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // ─── Notification Logic ───
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationApi.getNotifications();
      const data = res.data;
      setNotifications(data.notifications?.data || []);
      setUnreadCount(data.unread_count || 0);
    } catch {
      // Silently fail
    }
  }, [isAuthenticated]);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationApi.getUnreadCount();
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      // Silently fail
    }
  }, [isAuthenticated]);

  // Initial load + poll unread count every 15s
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadCount]);

  const handleNotificationOpen = async () => {
    const willOpen = !notificationOpen;
    setNotificationOpen(willOpen);
    setProfileDropdownOpen(false);
    if (willOpen) {
      setNotifLoading(true);
      await fetchNotifications();
      setNotifLoading(false);
    }
  };

  const handleNotificationClick = async (notif: NotificationType) => {
    // Mark as read
    if (!notif.read_at) {
      try {
        await notificationApi.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // Silently fail
      }
    }
    // Navigate if there's a link
    if (notif.link) {
      setNotificationOpen(false);
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch {
      // Silently fail
    }
  };

  // Public nav items (visible to everyone)
  const publicNavItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "About", path: "/about", icon: Info },
    { name: "Gallery", path: "/gallery", icon: ImageIcon },
  ];

  // Full nav items (visible only when authenticated)
  const authNavItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "BrowseItem", path: "/browseitem", icon: Store },
    { name: "Gallery", path: "/gallery", icon: ImageIcon },
    { name: "Leaderboard", path: "/leaderboard", icon: Trophy },
  ];

  const navItems = (isAuthenticated && isVerified) ? authNavItems : publicNavItems;

  const publicMobileNavItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "About", path: "/about", icon: Info },
    { name: "Gallery", path: "/gallery", icon: ImageIcon },
  ];

  const authMobileNavItems = [
    { name: "Home", path: "/", icon: Home },
    { name: "BrowseItem", path: "/browseitem", icon: Store },
    { name: "Chat", path: "/chat", icon: MessageCircle },
    { name: "Gallery", path: "/gallery", icon: ImageIcon },
  ];

  const mobileNavItems = (isAuthenticated && isVerified) ? authMobileNavItems : publicMobileNavItems;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Desktop Header */}
      <header className="shadow-md sticky top-0 z-50" style={{ background: 'linear-gradient(90deg, rgba(27,94,58,0.85) 0%, rgba(77,182,172,0.75) 100%)', backdropFilter: 'blur(6px)' }}>
        <div className="container mx-auto px-4 py-3 text-white">
          {/* Header Layout */}
          <div className="flex items-center justify-between">
            {/* Logo/Brand */}
            <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
              <div>
                <h1 className="text-xl font-bold leading-tight" style={{ color: '#FFD700', textShadow: '0 2px 8px #000', letterSpacing: '2px' }}>MinSU ARAWATAN</h1>
                <p className="text-xs italic leading-tight text-white/80">ᜠᜭᜯᜦᜨ᜴</p>
              </div>
            </Link>

            {/* Desktop Navigation - Centered */}
            <nav className="hidden lg:flex items-center gap-6 flex-1 justify-center mx-8">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant="ghost"
                      className={`hover:bg-white/10 font-semibold text-white ${isActive ? "border-b-2 border-white" : "border-transparent"}`}
                    >
                      <item.icon className="h-4 w-4 mr-1.5 text-white" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            {/* Right Side Icons */}
            <div className="flex items-center gap-2 ml-auto">
              {isAuthenticated && (
                <>
                  {/* Notification Bell */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="relative hover:bg-white/10 text-white"
                      onClick={handleNotificationOpen}
                    >
                      <Bell className="h-5 w-5 text-white" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-destructive text-white rounded-full text-xs font-bold flex items-center justify-center">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      )}
                    </Button>
                    {notificationOpen && (
                      <>
                        <div className="fixed inset-0 z-[90]" onClick={() => setNotificationOpen(false)} />
                        <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 bg-popover border border-border rounded-lg shadow-xl z-[100] overflow-hidden">
                          {/* Header */}
                          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                            <h3 className="font-bold text-sm">Notifications</h3>
                            {unreadCount > 0 && (
                              <button
                                onClick={handleMarkAllRead}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                <CheckCheck className="h-3.5 w-3.5" />
                                Mark all read
                              </button>
                            )}
                          </div>

                          {/* Notification List */}
                          <div className="max-h-80 overflow-y-auto">
                            {notifLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              </div>
                            ) : notifications.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                <Bell className="h-8 w-8 mb-2 opacity-40" />
                                <p className="text-sm">No notifications yet</p>
                              </div>
                            ) : (
                              notifications.map((notif) => (
                                <button
                                  key={notif.id}
                                  onClick={() => handleNotificationClick(notif)}
                                  className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors flex items-start gap-3 ${
                                    !notif.read_at ? "bg-primary/5" : ""
                                  }`}
                                >
                                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                                    !notif.read_at ? "bg-primary" : "bg-transparent"
                                  }`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className={`text-sm truncate ${!notif.read_at ? "font-semibold" : "font-medium text-muted-foreground"}`}>
                                        {notif.title}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                        {notifTimeAgo(notif.created_at)}
                                      </span>
                                    </div>
                                    <p className={`text-xs mt-0.5 truncate ${!notif.read_at ? "text-foreground" : "text-muted-foreground"}`}>
                                      {notif.message}
                                    </p>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>

                          {/* Footer */}
                          {notifications.length > 0 && (
                            <div className="border-t border-border px-4 py-2 text-center">
                              <button
                                onClick={() => {
                                  setNotificationOpen(false);
                                  navigate("/notifications");
                                }}
                                className="text-xs text-primary hover:underline"
                              >
                                View all notifications
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="relative hidden md:block">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-white/10 text-white"
                      onClick={() => {
                        setProfileDropdownOpen(!profileDropdownOpen);
                        setNotificationOpen(false);
                      }}
                    >
                      <User className="h-5 w-5 text-white" />
                    </Button>
                    {profileDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[90]" onClick={() => setProfileDropdownOpen(false)} />
                        <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-md shadow-lg z-[100] py-1">
                          <Link
                            to="/profile"
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <User className="h-4 w-4" />
                            Profile
                          </Link>
                          <Link
                            to="/about"
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <Info className="h-4 w-4" />
                            About
                          </Link>
                          <Link
                            to="/chat"
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                            onClick={() => setProfileDropdownOpen(false)}
                          >
                            <MessageCircle className="h-4 w-4" />
                            Chat
                          </Link>
                          <div className="border-t border-border my-1" />
                          <button
                            className="flex items-center gap-2 px-3 py-2 text-sm w-full text-destructive hover:bg-muted transition-colors"
                            onClick={() => { setProfileDropdownOpen(false); handleLogout(); }}
                          >
                            <LogOut className="h-4 w-4" />
                            Logout
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Mobile Menu Button removed from header; control now in bottom nav */}
            </div>
          </div>
        </div>

        {/* Mobile menu handled by a dedicated route/page now (see /menu) */}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer (hidden on mobile; moved into mobile menu) */}
      <Footer className="hidden md:block mt-auto pb-16 md:pb-0" />

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg z-50">
        <div className="flex items-center justify-around py-2">
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className="flex-1">
                <Button
                  variant="ghost"
                  className={`w-full flex flex-col items-center gap-1 h-auto py-2 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs">{item.name}</span>
                </Button>
              </Link>
            );
          })}
          <div className="flex-1">
            <Button
              variant="ghost"
              className="w-full flex flex-col items-center gap-1 h-auto py-2 text-muted-foreground"
              onClick={() => navigate('/menu')}
            >
              <Menu className="h-5 w-5" />
              <span className="text-xs">Menu</span>
            </Button>
          </div>
        </div>
      </nav>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={() => setShowLoginModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Login to ARAWATAN</h2>
              <button onClick={() => setShowLoginModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            {loginError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {loginError}
              </div>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  placeholder="your.email@minsu.edu.ph"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                  placeholder="Enter your password"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={loginLoading}>
                {loginLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
            <p className="mt-4 text-sm text-center text-gray-500">
              Don't have an account?{" "}
              <Link to="/auth?tab=register" onClick={() => setShowLoginModal(false)} className="text-primary font-semibold hover:underline">
                Register here
              </Link>
            </p>
            <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
              <p className="font-semibold mb-1">Demo Accounts:</p>
              <p>Admin: admin@minsu.edu.ph / password</p>
              <p>User: maria.santos@minsu.edu.ph / password</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}