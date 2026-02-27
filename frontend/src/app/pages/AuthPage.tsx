import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Progress } from "../components/ui/progress";
import {
  ShieldCheck,
  ArrowRight,
  Upload,
  CheckCircle2,
  XCircle,
  Clock,
  LogIn,
  UserPlus,
  AlertTriangle,
  Scan,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { verificationApi } from "../services/api";
import minsuBuilding from "../../assets/minsu-building.jpg";

type Tab = "login" | "register";
type RegisterStep = "form" | "verifying" | "verified" | "rejected";

export function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, isAuthenticated, isVerified, logout } = useAuth();

  // Tab state — default to "login", or "register" if ?tab=register
  const [activeTab, setActiveTab] = useState<Tab>(
    searchParams.get("tab") === "register" ? "register" : "login"
  );

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [registerStep, setRegisterStep] = useState<RegisterStep>("form");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [progress, setProgress] = useState(0);
  const [aiConfidence, setAiConfidence] = useState(0);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    studentId: "",
    campus: "",
    userType: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  // Only redirect on initial mount if already authenticated and verified
  // (not during registration flow)
  useEffect(() => {
    if (isAuthenticated && isVerified && registerStep === "form" && !showSuccessBanner) {
      navigate("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================== LOGIN ====================
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
      navigate("/");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setLoginError(error.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  // ==================== REGISTER ====================
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setIdFile(e.dataTransfer.files[0]);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    if (formData.password !== formData.confirmPassword) {
      setRegError("Passwords do not match.");
      return;
    }
    if (!idFile) {
      setRegError("Please upload your MinSU ID for verification.");
      return;
    }

    setRegLoading(true);
    setRegisterStep("verifying");
    setProgress(10);

    try {
      // Step 1: Create account
      await register({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        student_id: formData.studentId,
        campus: formData.campus,
        user_type: formData.userType,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
      });
      setProgress(40);

      // Step 2: Upload ID for AI verification (SheerID-like)
      const fd = new FormData();
      fd.append("id_image", idFile);
      setProgress(60);

      const res = await verificationApi.upload(fd);
      setProgress(100);
      setAiConfidence(res.data.ai_confidence || 0);

      // Wait a moment for visual feedback
      await new Promise((r) => setTimeout(r, 1200));

      if (res.data.status === "approved") {
        // Log out so user re-authenticates cleanly
        await logout();
        // Show success popup with login link
        setRegisterStep("verified");
      } else {
        setRejectionReason(res.data.message || "Verification failed.");
        setRegisterStep("rejected");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      if (error.response?.data?.errors) {
        const firstError = Object.values(error.response.data.errors)[0];
        setRegError(Array.isArray(firstError) ? firstError[0] : String(firstError));
      } else {
        setRegError(error.response?.data?.message || "Registration failed. Please try again.");
      }
      setRegisterStep("form");
      setProgress(0);
    } finally {
      setRegLoading(false);
    }
  };

  const handleGoToLogin = () => {
    setRegisterStep("form");
    setActiveTab("login");
    setLoginEmail(formData.email);
    setLoginPassword("");
    setShowSuccessBanner(true);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center py-8 px-4">
      {/* Background Image with Green Overlay */}
      <div className="absolute inset-0 z-0">
        <img src={minsuBuilding} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary/70 to-accent/80" />
      </div>
      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 text-white rounded-full mb-3 backdrop-blur-sm">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">MinSU ARAWATAN</h1>
          <p className="text-sm text-white/80 mt-1">Community Exchange Platform</p>
        </div>

        {/* ===== VERIFIED SUCCESS ===== */}
        {registerStep === "verified" && (
          <Card className="shadow-xl border-0 overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-accent px-6 py-8 text-center text-white">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h2 className="text-xl font-bold">Registration Successful!</h2>
              <p className="text-sm text-primary-foreground/80 mt-2">
                Your MinSU ID has been verified by our AI system.
              </p>
              {aiConfidence > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-full text-xs font-medium">
                  <Scan className="h-3.5 w-3.5" />
                  AI Confidence: {aiConfidence}%
                </div>
              )}
            </div>
            <CardContent className="p-6 text-center">
              <p className="text-sm text-gray-600 mb-5">
                Your account is ready! Click the button below to log in with your new account.
              </p>
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                size="lg"
                onClick={handleGoToLogin}
              >
                <LogIn className="h-4 w-4 mr-2" />
                Go to Login Form
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ===== VERIFYING (AI Processing) ===== */}
        {registerStep === "verifying" && (
          <Card className="shadow-xl border-0">
            <CardContent className="p-8">
              {/* Step Indicator */}
              <div className="flex items-center justify-center mb-8">
                <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full bg-success text-white flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] mt-1 font-medium text-success">Register</span>
                </div>
                <div className="w-10 h-0.5 bg-success mx-0.5" />
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-warning text-white flex items-center justify-center animate-pulse ring-4 ring-warning/20">
                    <Scan className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] mt-1 font-medium text-warning">AI Verify</span>
                </div>
                <div className="w-10 h-0.5 bg-border mx-0.5" />
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                    <LogIn className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] mt-1 font-medium text-muted-foreground">Login</span>
                </div>
              </div>

              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-warning/20 text-warning rounded-full mb-3 animate-pulse">
                  <Scan className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-bold">AI Verifying Your ID</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  SheerID-powered verification in progress...
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Processing...</span>
                  <span>{progress}%</span>
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                  <span>Account created</span>
                </div>
                <div className="flex items-center gap-2">
                  {progress >= 40 ? <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" /> : <Clock className="h-4 w-4 text-warning animate-pulse flex-shrink-0" />}
                  <span>Checking email domain (@minsu.edu.ph)</span>
                </div>
                <div className="flex items-center gap-2">
                  {progress >= 60 ? <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" /> : <Clock className="h-4 w-4 text-warning animate-pulse flex-shrink-0" />}
                  <span>Validating student/employee ID format</span>
                </div>
                <div className="flex items-center gap-2">
                  {progress >= 80 ? <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" /> : <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                  <span>AI scanning ID image...</span>
                </div>
                <div className="flex items-center gap-2">
                  {progress >= 100 ? <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" /> : <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                  <span>Cross-referencing MinSU database</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== REJECTED ===== */}
        {registerStep === "rejected" && (
          <Card className="shadow-xl border-0">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 text-red-500 rounded-full mb-4">
                <XCircle className="h-9 w-9" />
              </div>
              <h2 className="text-xl font-bold text-red-600 mb-2">Verification Failed</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Our AI system could not verify your MinSU ID.
              </p>
              {rejectionReason && (
                <Alert variant="destructive" className="text-left mb-5">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{rejectionReason}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Button className="w-full" onClick={() => { setRegisterStep("form"); setRegError(""); setIdFile(null); }}>
                  Try Again
                </Button>
                <Button variant="ghost" className="w-full" onClick={handleGoToLogin}>
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== LOGIN / REGISTER TABS ===== */}
        {registerStep === "form" && (
          <Card className="shadow-xl border-0 overflow-hidden">
            {/* Success Banner — shown after verified registration */}
            {showSuccessBanner && (
              <div className="bg-gradient-to-r from-primary to-accent px-5 py-4 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Registration Successful!</p>
                    <p className="text-xs text-primary-foreground/80">Your MinSU ID has been verified. Log in to continue.</p>
                  </div>
                  {aiConfidence > 0 && (
                    <div className="ml-auto flex-shrink-0 bg-white/15 px-2 py-1 rounded-full text-[10px] font-medium flex items-center gap-1">
                      <Scan className="h-3 w-3" />
                      {aiConfidence}%
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab Switcher */}
            <div className="flex border-b">
              <button
                className={`flex-1 py-3.5 text-sm font-semibold text-center transition-colors ${
                  activeTab === "login"
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("login")}
              >
                <LogIn className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                Login
              </button>
              <button
                className={`flex-1 py-3.5 text-sm font-semibold text-center transition-colors ${
                  activeTab === "register"
                    ? "text-primary border-b-2 border-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("register")}
              >
                <UserPlus className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                Register
              </button>
            </div>

            <CardContent className="p-6">
              {/* ===== LOGIN TAB ===== */}
              {activeTab === "login" && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="text-center mb-2">
                    <h2 className="text-lg font-bold">Welcome Back</h2>
                    <p className="text-xs text-muted-foreground">Login with your MinSU account</p>
                  </div>

                  {loginError && (
                    <Alert variant="destructive">
                      <AlertDescription className="text-sm">{loginError}</AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <Label htmlFor="loginEmail">Email</Label>
                    <Input
                      id="loginEmail"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="your.email@minsu.edu.ph"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="loginPassword">Password</Label>
                    <Input
                      id="loginPassword"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="mt-1"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    size="lg"
                    disabled={loginLoading}
                  >
                    {loginLoading ? "Logging in..." : "Login"}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Don't have an account?{" "}
                    <button type="button" onClick={() => setActiveTab("register")} className="text-primary font-semibold hover:underline">
                      Register here
                    </button>
                  </p>

                </form>
              )}

              {/* ===== REGISTER TAB ===== */}
              {activeTab === "register" && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="text-center mb-2">
                    <h2 className="text-lg font-bold">Create Account</h2>
                    <p className="text-xs text-muted-foreground">Your ID will be verified by AI (SheerID)</p>
                  </div>

                  {regError && (
                    <Alert variant="destructive">
                      <AlertDescription className="text-sm">{regError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="firstName" className="text-xs">First Name *</Label>
                      <Input id="firstName" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="Juan" required className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-xs">Last Name *</Label>
                      <Input id="lastName" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Dela Cruz" required className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="regEmail" className="text-xs">MinSU Email *</Label>
                    <Input id="regEmail" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="juan.delacruz@minsu.edu.ph" required className="mt-1" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="studentId" className="text-xs">Student/Employee ID *</Label>
                      <Input id="studentId" value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })} placeholder="2024-12345" required className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="userType" className="text-xs">Type *</Label>
                      <Select value={formData.userType} onValueChange={(v) => setFormData({ ...formData, userType: v })} required>
                        <SelectTrigger id="userType" className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="faculty">Faculty</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="campus" className="text-xs">Campus *</Label>
                    <Select value={formData.campus} onValueChange={(v) => setFormData({ ...formData, campus: v })} required>
                      <SelectTrigger id="campus" className="mt-1"><SelectValue placeholder="Select campus" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Main Campus - Victoria</SelectItem>
                        <SelectItem value="bongabong">Bongabong Campus</SelectItem>
                        <SelectItem value="victoria">Calapan Campus</SelectItem>
                        <SelectItem value="pinamalayan">Bulalacao Campus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="password" className="text-xs">Password *</Label>
                      <Input id="password" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" required className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword" className="text-xs">Confirm *</Label>
                      <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="••••••••" required className="mt-1" />
                    </div>
                  </div>

                  {/* Upload MinSU ID */}
                  <div>
                    <Label className="text-xs">Upload MinSU ID *</Label>
                    <div
                      className={`mt-1 border-2 border-dashed rounded-lg p-4 text-center transition-colors cursor-pointer ${
                        dragActive ? "border-primary bg-primary/5" : idFile ? "border-success bg-success/10" : "border-border hover:border-primary/50"
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById("id-upload")?.click()}
                    >
                      {idFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-success" />
                          <div className="text-left">
                            <p className="text-xs font-medium text-success">{idFile.name}</p>
                            <p className="text-[10px] text-success/80">{(idFile.size / 1024).toFixed(0)} KB — Click to change</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-xs font-medium">Upload your MinSU ID</p>
                          <p className="text-[10px] text-muted-foreground">JPG, PNG — Max 5MB</p>
                        </>
                      )}
                      <input type="file" id="id-upload" className="hidden" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) setIdFile(e.target.files[0]); }} />
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox id="terms" checked={formData.agreeTerms} onCheckedChange={(c) => setFormData({ ...formData, agreeTerms: c as boolean })} required />
                    <label htmlFor="terms" className="text-[11px] leading-relaxed cursor-pointer text-gray-600">
                      I agree to the Terms of Service and confirm I am a MinSU community member.
                    </label>
                  </div>

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg" disabled={!formData.agreeTerms || regLoading || !idFile}>
                    {regLoading ? "Creating & Verifying..." : (
                      <><ArrowRight className="h-4 w-4 mr-2" /> Create Account & Verify ID</>
                    )}
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    Already have an account?{" "}
                    <button type="button" onClick={() => setActiveTab("login")} className="text-primary font-semibold hover:underline">
                      Login here
                    </button>
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
