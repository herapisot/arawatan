import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  Bell,
  CheckCheck,
  Loader2,
  MessageCircle,
  Package,
  ShieldCheck,
  XCircle,
  ArrowRight,
} from "lucide-react";
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

function timeAgo(dateStr: string): string {
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

function getNotifIcon(type: string) {
  switch (type) {
    case "new_message":
      return <MessageCircle className="h-5 w-5 text-blue-500" />;
    case "item_request":
      return <Package className="h-5 w-5 text-amber-500" />;
    case "request_approved":
      return <ShieldCheck className="h-5 w-5 text-green-500" />;
    case "transaction_completed":
      return <CheckCheck className="h-5 w-5 text-green-600" />;
    case "transaction_cancelled":
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Bell className="h-5 w-5 text-primary" />;
  }
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async (pageNum: number, append = false) => {
    try {
      const res = await notificationApi.getNotifications(pageNum);
      const data = res.data;
      const items: NotificationType[] = data.notifications?.data || [];
      const lastPage = data.notifications?.last_page || 1;

      if (append) {
        setNotifications((prev) => [...prev, ...items]);
      } else {
        setNotifications(items);
      }
      setUnreadCount(data.unread_count || 0);
      setHasMore(pageNum < lastPage);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchNotifications(1);
      setLoading(false);
    };
    load();
  }, [fetchNotifications]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    await fetchNotifications(nextPage, true);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const handleClick = async (notif: NotificationType) => {
    if (!notif.read_at) {
      try {
        await notificationApi.markAsRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {
        // silently fail
      }
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch {
      // silently fail
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6 md:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-destructive text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="text-xs gap-1.5"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Bell className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">No notifications</p>
          <p className="text-sm mt-1">You're all caught up!</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <Card
              key={notif.id}
              className={`cursor-pointer hover:shadow-md transition-all border ${
                !notif.read_at
                  ? "bg-primary/5 border-primary/20"
                  : "bg-card border-border"
              }`}
              onClick={() => handleClick(notif)}
            >
              <div className="flex items-start gap-4 p-4">
                {/* Icon */}
                <div className={`mt-0.5 p-2 rounded-full flex-shrink-0 ${
                  !notif.read_at ? "bg-primary/10" : "bg-muted"
                }`}>
                  {getNotifIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notif.read_at ? "font-semibold" : "font-medium text-muted-foreground"}`}>
                        {notif.title}
                      </p>
                      <p className={`text-sm mt-0.5 ${!notif.read_at ? "text-foreground" : "text-muted-foreground"}`}>
                        {notif.message}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notif.read_at && (
                        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      )}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {timeAgo(notif.created_at)}
                      </span>
                    </div>
                  </div>
                  {notif.link && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-primary">
                      <span>View details</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="gap-2"
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
