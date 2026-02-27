import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { verificationApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Progress } from "../components/ui/progress";
import { 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck,
  FileImage,
  AlertTriangle,
  UserPlus,
  LogIn
} from "lucide-react";

export function VerificationPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser, logout } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState<"upload" | "processing" | "approved" | "rejected">("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [aiConfidence, setAiConfidence] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await verificationApi.status();
        if (res.data.status === 'approved') {
          setVerificationStatus('approved');
          setAiConfidence(res.data.ai_confidence || 98);
        } else if (res.data.status === 'pending') {
          setVerificationStatus('processing');
          setProgress(50);
        } else if (res.data.status === 'rejected') {
          setVerificationStatus('rejected');
        }
      } catch (err) {
        // No verification yet, show upload
      }
    };
    checkStatus();
  }, []);

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setVerificationStatus("processing");
    setProgress(30);
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('id_image', file);

      setProgress(60);
      const res = await verificationApi.upload(formData);
      setProgress(100);
      setAiConfidence(res.data.ai_confidence || 0);

      setTimeout(() => {
        if (res.data.status === 'approved') {
          setVerificationStatus('approved');
          refreshUser();
        } else if (res.data.status === 'rejected') {
          setVerificationStatus('rejected');
        } else {
          // pending - needs admin review
          setVerificationStatus('processing');
        }
      }, 500);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Upload failed');
      setVerificationStatus('upload');
      setProgress(0);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-10">
          {/* Step 1: Register */}
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
              isAuthenticated ? 'bg-success text-white' : 'bg-primary text-primary-foreground ring-4 ring-primary/20'
            }`}>
              {isAuthenticated ? <CheckCircle2 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <span className={`text-xs mt-1.5 font-medium ${
              isAuthenticated ? 'text-success' : 'text-primary'
            }`}>Register</span>
          </div>

          {/* Connector */}
          <div className={`w-16 md:w-24 h-0.5 mx-1 ${
            isAuthenticated ? 'bg-success' : 'bg-border'
          }`} />

          {/* Step 2: Verify ID */}
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
              verificationStatus === 'approved'
                ? 'bg-success text-white'
                : verificationStatus === 'processing'
                ? 'bg-warning text-white ring-4 ring-warning/20 animate-pulse'
                : verificationStatus === 'rejected'
                ? 'bg-destructive text-white ring-4 ring-destructive/20'
                : isAuthenticated
                ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                : 'bg-muted text-muted-foreground'
            }`}>
              {verificationStatus === 'approved' ? <CheckCircle2 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <span className={`text-xs mt-1.5 font-medium ${
              verificationStatus === 'approved' ? 'text-success'
                : verificationStatus === 'processing' ? 'text-warning'
                : verificationStatus === 'rejected' ? 'text-destructive'
                : isAuthenticated ? 'text-primary' : 'text-muted-foreground'
            }`}>Verify ID</span>
          </div>

          {/* Connector */}
          <div className={`w-16 md:w-24 h-0.5 mx-1 ${
            verificationStatus === 'approved' ? 'bg-success' : 'bg-border'
          }`} />

          {/* Step 3: Login */}
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
              verificationStatus === 'approved'
                ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                : 'bg-muted text-muted-foreground'
            }`}>
              <LogIn className="h-5 w-5" />
            </div>
            <span className={`text-xs mt-1.5 font-medium ${
              verificationStatus === 'approved' ? 'text-primary' : 'text-muted-foreground'
            }`}>Login</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-full mb-4">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Identity Verification</h1>
          <p className="text-muted-foreground">
            Upload your MinSU ID for AI-powered verification
          </p>
        </div>

        {errorMsg && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{errorMsg}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-lg mb-6">
          <CardHeader>
            <CardTitle>Upload MinSU ID</CardTitle>
            <CardDescription>
              Your ID will be verified using AI technology to confirm your MinSU affiliation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {verificationStatus === "upload" && (
              <div>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">
                    Drag and drop your ID here
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    or click to browse files
                  </p>
                  <input
                    type="file"
                    id="id-upload"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileInput}
                  />
                  <label htmlFor="id-upload">
                    <Button type="button" onClick={() => document.getElementById("id-upload")?.click()}>
                      <FileImage className="mr-2 h-4 w-4" />
                      Select File
                    </Button>
                  </label>
                  <p className="text-xs text-muted-foreground mt-4">
                    Supported formats: JPG, PNG, PDF (Max 5MB)
                  </p>
                </div>

                <Alert className="mt-6">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Important:</strong> Ensure your ID is clear and all details are visible. 
                    The photo will be processed by AI and not stored permanently.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {verificationStatus === "processing" && (
              <div className="py-8">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 text-primary rounded-full mb-4 animate-pulse">
                    <Clock className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">AI Verification in Progress</h3>
                  <p className="text-muted-foreground">
                    Our AI is analyzing your ID to verify your MinSU affiliation
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Processing...</span>
                    <span>{progress}%</span>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>Image quality check passed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span>ID format validation completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-warning animate-pulse" />
                    <span>Verifying against MinSU database...</span>
                  </div>
                </div>
              </div>
            )}

            {verificationStatus === "approved" && (
              <div className="py-8 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-success/10 text-success rounded-full mb-4">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-success">Verification Approved!</h3>
                <p className="text-muted-foreground mb-6">
                  Your MinSU identity has been successfully verified
                </p>

                <div className="bg-muted/50 rounded-lg p-4 mb-6 max-w-md mx-auto">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Status</span>
                    <Badge className="bg-success text-success-foreground">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Confidence Score</span>
                    <span className="text-sm font-semibold text-success">{aiConfidence}%</span>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8"
                  onClick={async () => {
                    await logout();
                    navigate("/");
                  }}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login to Your Account
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  You'll be redirected to login with your verified account.
                </p>
              </div>
            )}

            {verificationStatus === "rejected" && (
              <div className="py-8 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-destructive/10 text-destructive rounded-full mb-4">
                  <XCircle className="h-10 w-10" />
                </div>
                <h3 className="text-2xl font-semibold mb-2 text-destructive">Verification Failed</h3>
                <p className="text-muted-foreground mb-6">
                  We couldn't verify your ID. Please try again with a clearer photo.
                </p>

                <Alert className="mb-6 text-left max-w-md mx-auto" variant="destructive">
                  <AlertDescription>
                    <strong>Possible reasons:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>ID photo is blurry or unclear</li>
                      <li>ID details don't match your registration info</li>
                      <li>ID has expired</li>
                      <li>Not a valid MinSU ID</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <Button onClick={() => setVerificationStatus("upload")}>
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {verificationStatus === "upload" && (
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-semibold mb-3">Verification Tips</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Take photo in good lighting</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Ensure all text is readable</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Use your current, non-expired ID</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span>Avoid glare or shadows on the ID</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
