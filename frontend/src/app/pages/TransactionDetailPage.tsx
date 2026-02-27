import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { 
  MapPin, 
  ShieldCheck, 
  MessageCircle,
  CheckCircle2,
  Clock,
  Upload,
  Flag,
  ArrowLeft,
  Loader2,
  XCircle,
  Handshake
} from "lucide-react";
import { itemsApi, transactionsApi, chatApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

type TransactionStage = "view" | "requested" | "approved" | "meeting" | "completed" | "cancelled";

export function TransactionDetailPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transactionStage, setTransactionStage] = useState<TransactionStage>("view");
  const [item, setItem] = useState<any>(null);
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const proofInputRef = useRef<HTMLInputElement>(null);
  const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || 'http://localhost:8000/storage';

  const campusLabels: Record<string, string> = {
    main: "Main Campus",
    bongabong: "Bongabong Campus",
    victoria: "Victoria Campus",
    pinamalayan: "Pinamalayan Campus",
  };
  const conditionLabels: Record<string, string> = {
    "like-new": "Like New",
    excellent: "Excellent",
    good: "Good",
    fair: "Fair",
  };

  const isDonor = item?.user_id === user?.id;
  const isReceiver = transaction?.receiver_id === user?.id;

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await itemsApi.getItem(itemId!);
        const itemData = res.data;
        setItem(itemData);

        // Find an active transaction for this user (as receiver or donor)
        const existingTx = itemData.transactions?.find(
          (tx: any) =>
            tx.status !== 'cancelled' &&
            (tx.receiver_id === user?.id || itemData.user_id === user?.id)
        );

        if (existingTx) {
          // Load full transaction detail
          try {
            const txRes = await transactionsApi.getTransaction(existingTx.id);
            setTransaction(txRes.data);
            setTransactionStage(txRes.data.status as TransactionStage);
          } catch {
            setTransaction(existingTx);
            setTransactionStage(existingTx.status as TransactionStage);
          }
        }
      } catch (err) {
        setError('Failed to load item');
      } finally {
        setLoading(false);
      }
    };
    if (itemId) fetchItem();
  }, [itemId, user?.id]);

  const stages = [
    { key: "requested", name: "Requested", icon: MessageCircle },
    { key: "approved", name: "Approved", icon: CheckCircle2 },
    { key: "meeting", name: "Meet-Up", icon: MapPin },
    { key: "completed", name: "Completed", icon: CheckCircle2 },
  ];

  const stageOrder = ["requested", "approved", "meeting", "completed"];
  const currentStageIndex = stageOrder.indexOf(transactionStage);

  const clearMessages = () => { setError(''); setSuccessMsg(''); };

  const handleRequest = async () => {
    clearMessages();
    setActionLoading(true);
    try {
      const res = await transactionsApi.requestItem(Number(itemId));
      setTransaction(res.data);
      setTransactionStage("requested");
      setSuccessMsg("Request sent! The donor will be notified.");
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!transaction) return;
    clearMessages();
    setActionLoading(true);
    try {
      const res = await transactionsApi.approve(transaction.id);
      setTransaction(res.data);
      setTransactionStage("approved");
      setSuccessMsg("Request approved! You can now coordinate the meet-up.");
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartMeeting = async () => {
    if (!transaction) return;
    clearMessages();
    setActionLoading(true);
    try {
      const res = await transactionsApi.startMeeting(transaction.id);
      setTransaction(res.data);
      setTransactionStage("meeting");
      setSuccessMsg("Meet-up started! Upload proof after the exchange.");
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start meeting');
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!transaction) return;
    clearMessages();
    setActionLoading(true);
    try {
      const res = await transactionsApi.complete(transaction.id);
      setTransaction(res.data);
      setTransactionStage("completed");
      setSuccessMsg("Transaction completed! Points have been awarded.");
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to complete transaction');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !transaction) return;
    clearMessages();
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append('proof_photo', file);
      await transactionsApi.uploadProof(transaction.id, formData);
      setSuccessMsg("Proof photo uploaded successfully!");
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to upload proof');
    } finally {
      setActionLoading(false);
      e.target.value = '';
    }
  };

  const handleCancel = async () => {
    if (!transaction) return;
    clearMessages();
    setActionLoading(true);
    try {
      const res = await transactionsApi.cancel(transaction.id);
      setTransaction(res.data);
      setTransactionStage("cancelled");
      setSuccessMsg("Transaction cancelled. The item is now available again.");
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenChat = async () => {
    if (!item) return;
    try {
      const otherId = isDonor ? transaction?.receiver_id : item.user_id;
      if (!otherId) return;
      const res = await chatApi.startConversation(item.id, otherId);
      navigate(`/chat/${res.data.id}`);
    } catch {
      // Fallback: navigate to chat page
      navigate('/chat');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!item) return <div className="text-center py-16"><p>{error || 'Item not found'}</p></div>;

  const canRequest = !isDonor && transactionStage === "view" && item.status === "active";
  const canApprove = isDonor && transactionStage === "requested";
  const canStartMeeting = (isDonor || isReceiver) && transactionStage === "approved";
  const canComplete = (isDonor || isReceiver) && transactionStage === "meeting";
  const canUploadProof = (isDonor || isReceiver) && ["approved", "meeting"].includes(transactionStage);
  const canCancel = (isDonor || isReceiver) && ["requested", "approved", "meeting"].includes(transactionStage);
  const hasTransaction = transactionStage !== "view";

  return (
    <div className="min-h-screen bg-background py-8 px-4 pb-20 md:pb-8">
      <div className="container mx-auto max-w-6xl">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate("/browseitem")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Browse Item
        </Button>

        {/* Messages */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {successMsg && (
          <Alert className="mb-4 border-success text-success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{successMsg}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <Card className="overflow-hidden">
              <div className="aspect-video bg-muted relative">
                <ImageWithFallback
                  src={item.images?.[0] ? `${STORAGE_URL}/${item.images[0].image_path}` : `https://placehold.co/800x600?text=${encodeURIComponent(item.title)}`}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                {item.is_verified && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-success text-success-foreground">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                )}
                {item.status !== 'active' && (
                  <div className="absolute top-4 left-4">
                    <Badge variant="secondary" className="text-sm">
                      {item.status === 'reserved' ? 'Reserved' : item.status === 'completed' ? 'Completed' : item.status}
                    </Badge>
                  </div>
                )}
              </div>
            </Card>

            {/* Item Details */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">{item.title}</CardTitle>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="secondary">{conditionLabels[item.condition] || item.condition}</Badge>
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="icon">
                    <Flag className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-border">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Campus</div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-medium">{campusLabels[item.campus] || item.campus}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Posted</div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="font-medium">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Meet-up Location</h3>
                  <Alert>
                    <MapPin className="h-4 w-4" />
                    <AlertDescription>
                      <strong>{item.meetup_location || 'Arawatan Corner'}</strong>
                      <br />
                      <span className="text-sm">All exchanges must occur at designated Arawatan Corners during office hours (8AM - 5PM)</span>
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Progress */}
            {hasTransaction && transactionStage !== "cancelled" && (
              <Card>
                <CardHeader>
                  <CardTitle>Transaction Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stages.map((stage, index) => {
                      const isCompleted = index <= currentStageIndex;
                      const isCurrent = index === currentStageIndex;
                      return (
                        <div key={stage.key} className="flex items-center gap-4">
                          <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                            isCompleted ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
                          } ${isCurrent ? "ring-2 ring-success/30" : ""}`}>
                            <stage.icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className={`font-medium ${isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                              {stage.name}
                            </div>
                            {isCurrent && (
                              <span className="text-xs text-muted-foreground">Current stage</span>
                            )}
                          </div>
                          {isCompleted && <CheckCircle2 className="h-5 w-5 text-success" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Buttons Based on Current Stage */}
                  <div className="mt-6 space-y-3">
                    {/* Donor: Approve request */}
                    {canApprove && (
                      <Button className="w-full" onClick={handleApprove} disabled={actionLoading}>
                        {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Approve Request
                      </Button>
                    )}

                    {/* Both: Start meet-up */}
                    {canStartMeeting && (
                      <Button className="w-full" onClick={handleStartMeeting} disabled={actionLoading}>
                        {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Handshake className="mr-2 h-4 w-4" />}
                        Start Meet-Up
                      </Button>
                    )}

                    {/* Both: Upload proof */}
                    {canUploadProof && (
                      <>
                        <input
                          ref={proofInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleUploadProof}
                        />
                        <Button variant="outline" className="w-full" onClick={() => proofInputRef.current?.click()} disabled={actionLoading}>
                          {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          Upload Proof Photo
                        </Button>
                      </>
                    )}

                    {/* Both: Complete transaction */}
                    {canComplete && (
                      <Button className="w-full" onClick={handleComplete} disabled={actionLoading}>
                        {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                        Complete Transaction
                      </Button>
                    )}

                    {/* Cancel */}
                    {canCancel && (
                      <Button variant="destructive" className="w-full" onClick={handleCancel} disabled={actionLoading}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Cancel Transaction
                      </Button>
                    )}

                    {/* Receiver waiting message */}
                    {isReceiver && transactionStage === "requested" && (
                      <Alert>
                        <Clock className="h-4 w-4" />
                        <AlertDescription>
                          Waiting for the donor to approve your request.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cancelled State */}
            {transactionStage === "cancelled" && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>This transaction has been cancelled.</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Donator Info */}
            <Card>
              <CardHeader>
                <CardTitle>{isDonor ? "Your Listing" : "Donator Information"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {`${item.user?.first_name?.[0] || ''}${item.user?.last_name?.[0] || ''}`}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{item.user?.full_name}</div>
                    <div className="text-sm text-muted-foreground">{campusLabels[item.user?.campus] || item.user?.campus}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Badge variant="outline" className="mr-2">
                    Community Member
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 py-3 border-y border-border">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{item.user?.items_shared || 0}</div>
                    <div className="text-xs text-muted-foreground">Items Shared</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{item.user?.points || 0}</div>
                    <div className="text-xs text-muted-foreground">Points</div>
                  </div>
                </div>

                {/* Request Button — only show when not donor, no existing transaction, item is active */}
                {canRequest && (
                  <Button className="w-full" size="lg" onClick={handleRequest} disabled={actionLoading}>
                    {actionLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Requesting...</>
                    ) : (
                      "Request Item"
                    )}
                  </Button>
                )}

                {/* Already requested / Item not available */}
                {!isDonor && transactionStage === "view" && item.status !== "active" && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      This item is no longer available.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Donor: Show who requested */}
                {isDonor && transaction && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm font-medium mb-2">Requested by:</p>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                          {`${transaction.receiver?.first_name?.[0] || ''}${transaction.receiver?.last_name?.[0] || ''}`}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{transaction.receiver?.full_name}</span>
                    </div>
                  </div>
                )}

                {/* Chat: Show when there's an active transaction */}
                {hasTransaction && transactionStage !== "cancelled" && (
                  <Button variant="outline" className="w-full" onClick={handleOpenChat}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Open Chat
                  </Button>
                )}

                {/* Completed badge */}
                {transactionStage === "completed" && (
                  <Alert className="border-success text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Transaction completed successfully! Points have been awarded.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Safety Notice */}
            <Card className="bg-secondary/10 border-secondary/20">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold mb-2">Safety Guidelines</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Meet only at Arawatan Corners</li>
                      <li>• During office hours only</li>
                      <li>• Bring your MinSU ID</li>
                      <li>• Report any suspicious activity</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
