import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { 
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Flag,
  Loader2
} from "lucide-react";
import { adminApi } from "../../services/api";

export function ItemModerationPanel() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || 'http://localhost:8000/storage';

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.getModeration({ status: activeTab });
        setReports(res.data.data || res.data);
      } catch (err) {
        console.error('Failed to load moderation data:', err);
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    load();
  }, [activeTab]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-destructive text-destructive-foreground";
      case "high":
        return "bg-warning text-warning-foreground";
      case "medium":
        return "bg-secondary text-secondary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await adminApi.approveFalsePositive(id);
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  };

  const handleRemove = async (id: number) => {
    try {
      await adminApi.removeItem(id, 'warn');
      setReports(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to remove:', err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Item Moderation Panel</h1>
        <p className="text-muted-foreground">
          Review and moderate flagged items for policy violations
        </p>
      </div>

      {/* Alert */}
      <Alert className="border-destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertDescription>
          <strong>Prohibited Items:</strong> Drugs, Alcohol, Weapons, Hazardous Materials, 
          Tobacco Products, or any items that violate university policies must be removed immediately.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{activeTab === 'pending' ? reports.length : '—'}</div>
                <div className="text-sm text-muted-foreground">Pending Review</div>
              </div>
              <Flag className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{activeTab === 'approved' ? reports.length : '—'}</div>
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
                <div className="text-2xl font-bold">{activeTab === 'removed' ? reports.length : '—'}</div>
                <div className="text-sm text-muted-foreground">Removed</div>
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
            Flagged
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved
          </TabsTrigger>
          <TabsTrigger value="removed">
            Removed
          </TabsTrigger>
        </TabsList>

        {/* Flagged Items */}
        <TabsContent value="pending" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <Card><CardContent className="pt-6 text-center text-muted-foreground">No flagged items to review.</CardContent></Card>
          ) : (
            reports.map((report) => (
            <Card key={report.id} className="shadow-md border-warning">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  {/* Item Preview */}
                  <div className="lg:col-span-1">
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden border border-border">
                      <img
                        src={`https://placehold.co/300x300?text=${encodeURIComponent(report.item?.title || 'Item')}`}
                        alt={report.item?.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-2">
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
                  </div>

                  {/* Item Info */}
                  <div className="lg:col-span-2 space-y-4">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg">{report.item?.title}</h3>
                        <Badge className={getSeverityColor(report.severity)}>
                          {(report.severity || 'unknown').toUpperCase()}
                        </Badge>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="font-medium text-destructive">{report.reason}</div>
                            <div className="text-muted-foreground">AI Confidence: {report.ai_confidence}%</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 py-3 border-y border-border text-sm">
                      <div>
                        <span className="text-muted-foreground">Listed by:</span>
                        <div className="font-medium">{report.item?.user?.full_name}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Campus:</span>
                        <div className="font-medium">{report.item?.campus}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Reported by:</span>
                        <div className="font-medium">{report.reporter?.full_name || 'AI System'}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Flagged:</span>
                        <div className="font-medium">{new Date(report.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>

                    <Alert>
                      <ShieldAlert className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Our AI has detected this item may violate platform policies. 
                        Manual review is required to confirm and take appropriate action.
                      </AlertDescription>
                    </Alert>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-semibold text-sm mb-2">Moderator Actions</h4>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => handleApprove(report.id)}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Approve (False Positive)
                        </Button>
                        <Button
                          variant="destructive"
                          className="w-full justify-start"
                          onClick={() => handleRemove(report.id)}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Remove Item
                        </Button>
                      </div>
                    </div>

                    <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20">
                      <h4 className="font-semibold text-sm mb-2 text-destructive">Enforcement Options</h4>
                      <div className="space-y-2 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="rounded" />
                          <span>Warn user</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="rounded" />
                          <span>Suspend account</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="rounded" />
                          <span>Ban user</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
          )}
        </TabsContent>

        {/* Approved Items */}
        <TabsContent value="approved">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No approved items.</div>
              ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <div className="font-semibold">{report.item?.title}</div>
                      <div className="text-sm text-muted-foreground">{report.reason}</div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">{new Date(report.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Removed Items */}
        <TabsContent value="removed">
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">No removed items.</div>
              ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                    <div>
                      <div className="font-semibold">{report.item?.title}</div>
                      <div className="text-sm text-muted-foreground">{report.reason}</div>
                      <Badge variant="destructive" className="mt-1">{report.severity}</Badge>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">{new Date(report.created_at).toLocaleDateString()}</div>
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
