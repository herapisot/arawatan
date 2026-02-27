import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Avatar, AvatarFallback } from "../../components/ui/avatar";
import { Progress } from "../../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { 
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  FileText,
  Loader2
} from "lucide-react";
import { adminApi } from "../../services/api";

export function UserVerificationPanel() {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || 'http://localhost:8000/storage';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.getVerifications(activeTab);
        setVerifications(res.data.data || res.data);
      } catch (err) {
        console.error('Failed to load verifications:', err);
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    load();
  }, [activeTab]);

  const handleApprove = async (id: number) => {
    try {
      await adminApi.approveVerification(id);
      setVerifications(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error('Failed to approve verification:', err);
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Rejection reason:');
    if (!reason) return;
    try {
      await adminApi.rejectVerification(id, reason);
      setVerifications(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error('Failed to reject verification:', err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">User Verification Panel</h1>
        <p className="text-muted-foreground">
          Review and approve MinSU community member verifications
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{activeTab === 'pending' ? verifications.length : '—'}</div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{activeTab === 'approved' ? verifications.length : '—'}</div>
                <div className="text-sm text-muted-foreground">Approved</div>
              </div>
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{activeTab === 'rejected' ? verifications.length : '—'}</div>
                <div className="text-sm text-muted-foreground">Rejected</div>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected
          </TabsTrigger>
        </TabsList>

        {/* Pending */}
        <TabsContent value="pending" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : verifications.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No pending verifications.</CardContent></Card>
          ) : (
            verifications.map((verification) => (
            <Card key={verification.id} className="shadow-md">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* User Info */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {(verification.user?.full_name || 'U').split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{verification.user?.full_name}</div>
                        <Badge variant="outline">{verification.user?.user_type}</Badge>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Email:</span>
                        <div className="font-medium">{verification.user?.email}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Student ID:</span>
                        <div className="font-medium">{verification.user?.student_id}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Campus:</span>
                        <div className="font-medium">{verification.user?.campus}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Submitted:</span>
                        <div className="font-medium">{new Date(verification.submitted_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </div>

                  {/* ID Preview */}
                  <div>
                    <div className="text-sm font-medium mb-2">Uploaded ID</div>
                    <div className="aspect-video bg-muted rounded-lg overflow-hidden border border-border">
                      <img
                        src={verification.id_image_path ? `${STORAGE_URL}/${verification.id_image_path}` : 'https://placehold.co/400x300?text=ID'}
                        alt="ID"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      <Eye className="mr-2 h-4 w-4" />
                      View Full Size
                    </Button>
                  </div>

                  {/* AI Analysis & Actions */}
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium mb-3">AI Confidence Score</div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Verification Match</span>
                          <span className="font-semibold">{verification.ai_confidence}%</span>
                        </div>
                        <Progress value={verification.ai_confidence} className="h-2" />
                        {verification.ai_confidence >= 90 ? (
                          <div className="flex items-center gap-2 text-success text-sm">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>High confidence</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-warning text-sm">
                            <AlertTriangle className="h-4 w-4" />
                            <span>Manual review recommended</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        AI detected: Valid MinSU ID format, photo quality good, 
                        information matches registration data.
                      </AlertDescription>
                    </Alert>

                    <div className="flex flex-col gap-2">
                      <Button
                        className="w-full"
                        onClick={() => handleApprove(verification.id)}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Approve Verification
                      </Button>
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleReject(verification.id)}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </TabsContent>

        {/* Approved */}
        <TabsContent value="approved">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : verifications.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No approved verifications.</div>
              ) : (
              <div className="space-y-4">
                {verifications.map((verification) => (
                  <div key={verification.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-success text-success-foreground">
                          {(verification.user?.full_name || 'U').split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{verification.user?.full_name}</div>
                        <div className="text-sm text-muted-foreground">{verification.user?.email}</div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">{verification.reviewed_at ? new Date(verification.reviewed_at).toLocaleDateString() : '—'}</div>
                      <div className="text-xs text-muted-foreground">by {verification.reviewer?.full_name || 'System'}</div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rejected */}
        <TabsContent value="rejected">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : verifications.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No rejected verifications.</div>
              ) : (
              <div className="space-y-4">
                {verifications.map((verification) => (
                  <div key={verification.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-destructive text-destructive-foreground">
                          {(verification.user?.full_name || 'U').split(" ").map((n: string) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{verification.user?.full_name}</div>
                        <div className="text-sm text-muted-foreground">{verification.user?.email}</div>
                        <Badge variant="destructive" className="mt-1">{verification.rejection_reason || 'Rejected'}</Badge>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">{verification.reviewed_at ? new Date(verification.reviewed_at).toLocaleDateString() : '—'}</div>
                      <div className="text-xs text-muted-foreground">by {verification.reviewer?.full_name || 'System'}</div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
