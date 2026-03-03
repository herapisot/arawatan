import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { 
  Eye, 
  EyeOff,
  ShieldCheck,
  Heart,
  Loader2,
  Upload,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { forumApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export function ForumPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "my">("all");
  const [forumItems, setForumItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || 'http://localhost:8000/storage';

  const loadForum = async () => {
    setLoading(true);
    try {
      const res = filter === 'my' && isAuthenticated
        ? await forumApi.myPosts()
        : await forumApi.getPosts();
      setForumItems(res.data.data || []);
    } catch (err) {
      console.error('Failed to load forum:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForum();
  }, [filter, isAuthenticated]);

  const handleLike = async (postId: number) => {
    try {
      const res = await forumApi.toggleLike(postId);
      setForumItems(prev => prev.map(item =>
        item.id === postId ? { ...item, likes_count: res.data.likes_count, is_liked: res.data.is_liked } : item
      ));
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setUploadDialogOpen(true);
    // Reset the input so the same file can be re-selected
    e.target.value = '';
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('caption', caption);
    formData.append('visibility', 'public');
    try {
      const response = await forumApi.createPost(formData);
      console.log('Post created successfully:', response);
      // Reload forum
      const res = filter === 'my' && isAuthenticated
        ? await forumApi.myPosts()
        : await forumApi.getPosts();
      setForumItems(res.data.data || []);
      // Close dialog and reset
      setUploadDialogOpen(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption("");
    } catch (err: any) {
      console.error('Failed to upload:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Unknown error';
      alert(`Error posting to forum: ${errorMsg}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setUploadDialogOpen(false);
      setSelectedFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setCaption("");
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 pb-20 md:pb-8">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Community Forum</h1>
          <p className="text-muted-foreground">
            See the positive impact of sharing within the MinSU community
          </p>
        </div>

        {/* Filter Tabs - only for authenticated users */}
        {isAuthenticated && (
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All Posts
          </Button>
          <Button
            variant={filter === "my" ? "default" : "outline"}
            onClick={() => setFilter("my")}
          >
            My Posts
          </Button>
        </div>
        )}

        {/* Forum Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : forumItems.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            No forum posts yet.
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forumItems.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square bg-muted relative">
                <ImageWithFallback
                  src={item.image_path ? `${STORAGE_URL}/${item.image_path}` : 'https://placehold.co/600x600?text=Forum'}
                  alt={item.caption}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 flex gap-1">
                  {filter === "my" && item.status && item.status !== "approved" && (
                    <Badge
                      variant={item.status === "pending" ? "secondary" : "destructive"}
                      className="bg-card/90 backdrop-blur"
                    >
                      {item.status === "pending" ? (
                        <><Clock className="h-3 w-3 mr-1" /> Pending</>
                      ) : (
                        <><XCircle className="h-3 w-3 mr-1" /> Rejected</>
                      )}
                    </Badge>
                  )}
                  {filter === "my" && item.status === "approved" && (
                    <Badge variant="secondary" className="bg-success/90 text-white backdrop-blur">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Approved
                    </Badge>
                  )}
                  <Badge
                    variant="secondary"
                    className="bg-card/90 backdrop-blur"
                  >
                    {item.visibility === "public" ? (
                      <><Eye className="h-3 w-3 mr-1" /> Public</>
                    ) : (
                      <><EyeOff className="h-3 w-3 mr-1" /> Private</>
                    )}
                  </Badge>
                </div>
              </div>
              
              <CardContent className="pt-4">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {`${item.user?.first_name?.[0] || ''}${item.user?.last_name?.[0] || ''}`}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{item.user?.full_name}</div>
                    <Badge variant="outline" className="text-xs mt-1">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      {item.user?.tier || 'Member'}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                  {item.caption}
                </p>

                {filter === "my" && item.status === "rejected" && item.rejection_reason && (
                  <p className="text-xs text-destructive mb-3 bg-destructive/10 p-2 rounded">
                    Reason: {item.rejection_reason}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <button
                    className="flex items-center gap-1 hover:text-accent transition-colors"
                    onClick={() => handleLike(item.id)}
                  >
                    <Heart className={`h-4 w-4 text-accent ${item.is_liked ? 'fill-current' : ''}`} />
                    <span>{item.likes_count || 0} likes</span>
                  </button>
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}

        {/* Info Banner */}
        <Card className="mt-8 bg-success/10 border-success/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">Share Your Exchange Story!</h3>
              <p className="text-sm text-muted-foreground mb-4">
                After completing an exchange, share a photo to inspire others and showcase the power of community.
                Posts are reviewed by admins before they appear publicly. Max image size: 1MB (auto-cropped to square).
              </p>
              {isAuthenticated ? (
              <Button asChild>
                <label className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Exchange Photo
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                </label>
              </Button>
              ) : (
              <Button onClick={() => navigate("/auth")}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Exchange Photo
              </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upload Dialog with Caption */}
        <Dialog open={uploadDialogOpen} onOpenChange={handleDialogClose}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Share Your Exchange Photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {previewUrl && (
                <div className="aspect-square w-full rounded-lg overflow-hidden bg-muted">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1.5 block">Caption</label>
                <Textarea
                  placeholder="Share your exchange story..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{caption.length}/500</p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => handleDialogClose(false)} disabled={uploading}>
                Cancel
              </Button>
              <Button onClick={handleUploadSubmit} disabled={uploading}>
                {uploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" /> Post</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
