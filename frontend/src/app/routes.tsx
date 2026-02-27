import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LandingPage } from "./pages/LandingPage";
import { BrowseItemPage } from "./pages/BrowseItemPage";
import { GalleryPage } from "./pages/GalleryPage";
import { LeaderboardPage } from "./pages/LeaderboardPage";
import { AboutPage } from "./pages/AboutPage";
import { MobileMenuPage } from "./pages/MobileMenuPage";
import { AuthPage } from "./pages/AuthPage";
import { ItemListingPage } from "./pages/ItemListingPage";
import { TransactionDetailPage } from "./pages/TransactionDetailPage";
import { ChatPage } from "./pages/ChatPage";
import { ProfilePage } from "./pages/ProfilePage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { UserVerificationPanel } from "./pages/admin/UserVerificationPanel";
import { ItemModerationPanel } from "./pages/admin/ItemModerationPanel";
import { AnalyticsPage } from "./pages/admin/AnalyticsPage";
import { NotFound } from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      // Public routes - accessible without login
      { index: true, Component: LandingPage },
      { path: "about", Component: AboutPage },
      { path: "gallery", Component: GalleryPage },
      { path: "auth", Component: AuthPage },
      { path: "register", Component: AuthPage },
      { path: "profile", element: <ProtectedRoute><ProfilePage /></ProtectedRoute> },
      // Protected routes - require authentication + verified ID
      { path: "browseitem", element: <ProtectedRoute><BrowseItemPage /></ProtectedRoute> },
      { path: "browseitem/:itemId", element: <ProtectedRoute><TransactionDetailPage /></ProtectedRoute> },
      { path: "menu", Component: MobileMenuPage },
      { path: "leaderboard", element: <ProtectedRoute><LeaderboardPage /></ProtectedRoute> },
      { path: "list-item", element: <ProtectedRoute><ItemListingPage /></ProtectedRoute> },
      { path: "chat/:chatId?", element: <ProtectedRoute><ChatPage /></ProtectedRoute> },
      { path: "notifications", element: <ProtectedRoute><NotificationsPage /></ProtectedRoute> },
    ],
  },
  {
    path: "/admin",
    Component: AdminLayout,
    children: [
      { index: true, Component: AdminDashboard },
      { path: "verifications", Component: UserVerificationPanel },
      { path: "moderation", Component: ItemModerationPanel },
      { path: "analytics", Component: AnalyticsPage },
    ],
  },
  {
    path: "*",
    Component: NotFound,
  },
]);
