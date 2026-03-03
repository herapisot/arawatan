import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Textarea } from "../../components/ui/textarea";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Image as ImageIcon,
  Loader2,
  Eye,
} from "lucide-react";
import { adminApi } from "../../services/api";

interface ForumPostData {
  id: number;
  user_id: number;
  transaction_id: number | null;
  image_path: string;
  caption: string | null;
  visibility: string;
  status: string;
  rejection_reason: string | null;
  likes_count: number;
  created_at: string;
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    tier: string;
  };
  transaction?: {
    id: number;
    status: string;
    item?: {
      id: number;
      title: string;
    };
  };
}

const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || "http://localhost:8000/storage";

export function ForumApprovalPanel() {
  const [posts, setPosts] = useState<ForumPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ForumPostData | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getForumPosts(statusFilter);
      setPosts(res.data.data || []);
    } catch (err) {
      console.error("Failed to load forum posts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [statusFilter]);

  const handleApprove = async (post: ForumPostData) => {
    setActionLoading(post.id);
    try {
      await adminApi.approveForumPost(post.id);
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, status: "approved" } : p))
      );
    } catch (err) {
      console.error("Failed to approve post:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectDialog = (post: ForumPostData) => {
    setSelectedPost(post);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!selectedPost || !rejectReason.trim()) return;
    setActionLoading(selectedPost.id);
    try {
      await adminApi.rejectForumPost(selectedPost.id, rejectReason);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedPost.id
            ? { ...p, status: "rejected", rejection_reason: rejectReason }
            : p
        )
      );
      setRejectDialogOpen(false);
      setSelectedPost(null);
      setRejectReason("");
    } catch (err) {
      console.error("Failed to reject post:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-success text-white">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Forum Post Approval</h1>
        <p className="text-muted-foreground">
          Review and approve community forum posts. Points are awarded upon
          approval.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {["pending", "approved", "rejected", "all"].map((status) => (
          <Button
            key={status}
            variant={statusFilter === status ? "default" : "outline"}
            onClick={() => setStatusFilter(status)}
            size="sm"
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Posts List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No {statusFilter} forum posts found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {/* Image */}
                <div
                  className="sm:w-48 h-48 sm:h-auto bg-muted flex-shrink-0 cursor-pointer"
                  onClick={() =>
                    setPreviewImage(
                      `${STORAGE_URL}/${post.image_path}`
                    )
                  }
                >
                  <img
                    src={`${STORAGE_URL}/${post.image_path}`}
                    alt={post.caption || "Forum post"}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Details */}
                <CardContent className="flex-1 p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {`${post.user?.first_name?.[0] || ""}${
                            post.user?.last_name?.[0] || ""
                          }`}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-semibold">
                          {post.user?.full_name || "Unknown"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(post.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    {statusBadge(post.status)}
                  </div>

                  {post.caption && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                      {post.caption}
                    </p>
                  )}

                  {post.transaction?.item && (
                    <div className="text-xs text-muted-foreground mb-3">
                      Linked to: <strong>{post.transaction.item.title}</strong>
                    </div>
                  )}

                  {post.rejection_reason && (
                    <p className="text-xs text-destructive bg-destructive/10 p-2 rounded mb-3">
                      Rejection reason: {post.rejection_reason}
                    </p>
                  )}

                  {/* Actions */}
                  {post.status === "pending" && (
                    <div className="flex gap-2 mt-auto">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(post)}
                        disabled={actionLoading === post.id}
                      >
                        {actionLoading === post.id ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => openRejectDialog(post)}
                        disabled={actionLoading === post.id}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  )}
                </CardContent>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Forum Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Provide a reason for rejection. The user will be notified.
            </p>
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || actionLoading !== null}
            >
              {actionLoading !== null ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Reject Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <img
            src={previewImage}
            alt="Full preview"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
