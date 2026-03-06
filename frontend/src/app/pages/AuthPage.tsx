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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useAuth } from "../contexts/AuthContext";
import { verificationApi, otpApi } from "../services/api";
import { sileo } from "sileo";
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
  const [idFile, setIdFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // OTP state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(["" , "", "", "", "", ""]);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpExpiryCountdown, setOtpExpiryCountdown] = useState(0);

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

  const requiredRegisterFields: Array<{ key: keyof typeof formData; label: string }> = [
    { key: "firstName", label: "First name" },
    { key: "lastName", label: "Last name" },
    { key: "email", label: "MinSU email" },
    { key: "studentId", label: "Student/Employee ID" },
    { key: "campus", label: "Campus" },
    { key: "userType", label: "Type" },
    { key: "password", label: "Password" },
    { key: "confirmPassword", label: "Confirm password" },
  ];

  const missingRegisterFields = requiredRegisterFields
    .filter(({ key }) => String(formData[key]).trim() === "")
    .map(({ label }) => label);

  const isRegisterFormComplete = missingRegisterFields.length === 0 && Boolean(idFile) && formData.agreeTerms;

  // Resend cooldown timer
  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = setInterval(() => setOtpCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // OTP expiry countdown (5 minutes = 300 seconds)
  useEffect(() => {
    if (otpExpiryCountdown <= 0) return;
    const timer = setInterval(() => setOtpExpiryCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [otpExpiryCountdown]);

  // Only redirect on initial mount if already authenticated and verified
  // (not during registration flow)
  useEffect(() => {
    if (isAuthenticated && isVerified && registerStep === "form") {
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
      const msg = error.response?.data?.message || "Invalid email or password.";
      sileo.error({ title: "Login Failed", description: msg });
    } finally {
      setLoginLoading(false);
    }
  };

  // ==================== REGISTER ====================

  // Send OTP to email
  const sendOtp = async () => {
    if (!formData.email) {
      sileo.error({ title: "Error", description: "Please enter your email first." });
      return;
    }
    setOtpSending(true);
    setOtpError("");
    try {
      const otpRes = await otpApi.send(formData.email);
      setOtpSent(true);
      setOtpCountdown(60); // 60 second cooldown for resend
      setOtpExpiryCountdown(300); // 5 minute expiry
      sileo.success({ title: "OTP Sent", description: `Verification code sent to ${formData.email}` });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error.response?.data?.message || "Failed to send OTP.";
      setOtpError(msg);
      sileo.error({ title: "Error", description: msg });
    } finally {
      setOtpSending(false);
    }
  };

  // Handle OTP input (individual digit boxes)
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newValues = [...otpValues];
    newValues[index] = value;
    setOtpValues(newValues);
    setOtpError("");

    // Auto-focus next input
    if (value && index < 5) {
      const next = document.getElementById(`otp-${index + 1}`);
      next?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      const prev = document.getElementById(`otp-${index - 1}`);
      prev?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newValues = [...otpValues];
    for (let i = 0; i < 6; i++) {
      newValues[i] = pasted[i] || "";
    }
    setOtpValues(newValues);
    // Focus last filled or last input
    const focusIdx = Math.min(pasted.length, 5);
    document.getElementById(`otp-${focusIdx}`)?.focus();
  };

  // Verify OTP then proceed with registration
  const verifyOtpAndRegister = async () => {
    const otp = otpValues.join("");
    if (otp.length !== 6) {
      setOtpError("Please enter all 6 digits.");
      return;
    }

    setOtpVerifying(true);
    setOtpError("");
    try {
      await otpApi.verify(formData.email, otp);
      setShowOtpModal(false);
      // OTP verified — now proceed with actual registration
      await proceedWithRegistration();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error.response?.data?.message || "Invalid OTP.";
      setOtpError(msg);
    } finally {
      setOtpVerifying(false);
    }
  };

  // Open OTP modal when form is submitted (after pre-check passes)
  const handleRegisterFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    if (missingRegisterFields.length > 0) {
      const message = `Please complete all required fields: ${missingRegisterFields.join(", ")}.`;
      setRegError(message);
      sileo.error({ title: "Missing Required Fields", description: message });
      return;
    }

    if (!formData.agreeTerms) {
      const message = "Please agree to the Terms of Service before continuing.";
      setRegError(message);
      sileo.error({ title: "Terms Required", description: message });
      return;
    }

    // Validate email domain
    if (!formData.email.toLowerCase().endsWith("@minsu.edu.ph")) {
      setRegError("Please use your MinSU email address (@minsu.edu.ph).");
      sileo.error({ title: "Error", description: "Please use your MinSU email address (@minsu.edu.ph)." });
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setRegError("Passwords do not match.");
      sileo.error({ title: "Error", description: "Passwords do not match." });
      return;
    }
    if (!idFile) {
      setRegError("Please upload your MinSU ID.");
      sileo.error({ title: "Error", description: "Please upload your MinSU ID." });
      return;
    }

    // Step 1: Pre-check ID image against form data before OTP
    setRegLoading(true);
    try {
      const preCheckData = new FormData();
      preCheckData.append("id_image", idFile);
      preCheckData.append("first_name", formData.firstName);
      preCheckData.append("last_name", formData.lastName);
      preCheckData.append("student_id", formData.studentId);
      preCheckData.append("email", formData.email);

      await verificationApi.preCheck(preCheckData);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { reasons?: string[]; message?: string } } };
      const reasons: string[] = error.response?.data?.reasons || [];
      if (reasons.length > 0) {
        const reason = reasons.map((r) => `• ${r}`).join("\n");
        setRejectionReason(reason);
        setRegisterStep("rejected");
      } else {
        const msg = error.response?.data?.message || "ID verification failed. Please try again.";
        sileo.error({ title: "Verification Failed", description: msg });
      }
      setRegLoading(false);
      return;
    } finally {
      setRegLoading(false);
    }

    // Step 2: Pre-check passed — request the OTP first, then open the modal.
    setOtpValues(["", "", "", "", "", ""]);
    setOtpError("");
    setOtpSent(false);
    setOtpCountdown(0);
    setOtpExpiryCountdown(0);

    setOtpSending(true);
    try {
      await otpApi.send(formData.email);
      setOtpSent(true);
      setOtpCountdown(60);
      setOtpExpiryCountdown(300);
      setShowOtpModal(true);
      sileo.success({ title: "OTP Sent", description: `Verification code sent to ${formData.email}` });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error.response?.data?.message || "Failed to send OTP.";
      setRegError(msg);
      setOtpError(msg);
      setShowOtpModal(false);
      sileo.error({ title: "Unable to Send OTP", description: msg });
    } finally {
      setOtpSending(false);
    }
  };

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

  const proceedWithRegistration = async () => {
    setRegError("");
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
      fd.append("id_image", idFile!);
      setProgress(60);

      const res = await verificationApi.upload(fd);
      setProgress(100);
      setAiConfidence(res.data.ai_confidence || 0);

      // Wait a moment for visual feedback
      await new Promise((r) => setTimeout(r, 1200));

      if (res.data.status === "approved") {
        sileo.success({ title: "Verified!", description: "Your MinSU ID has been verified successfully." });
        // Log out so user re-authenticates cleanly
        await logout();
        // Clear the form and go straight to login tab
        setFormData({ firstName: "", lastName: "", email: "", studentId: "", campus: "", userType: "", password: "", confirmPassword: "", agreeTerms: false });
        setIdFile(null);
        setRegisterStep("form");
        setActiveTab("login");
      } else {
        // Build detailed rejection reason from the reasons array
        const reasons: string[] = res.data.reasons || [];
        const reason = reasons.length > 0
          ? reasons.map(r => `• ${r}`).join('\n')
          : (res.data.message || "Could not verify your MinSU ID.");
        setRejectionReason(reason);
        sileo.error({ title: "Verification Failed", description: "Could not verify your MinSU ID." });
        // Log out to clear local auth state — backend already deleted the account
        await logout();
        setRegisterStep("rejected");
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]>; status?: string; reasons?: string[] } } };

      // If the error came from the verification upload (rejected via 422), show rejection
      if (error.response?.data?.status === 'rejected') {
        const reasons: string[] = error.response.data.reasons || [];
        const reason = reasons.length > 0
          ? reasons.map(r => `• ${r}`).join('\n')
          : (error.response.data.message || "Could not verify your MinSU ID.");
        setRejectionReason(reason);
        sileo.error({ title: "Verification Failed", description: "Could not verify your MinSU ID." });
        await logout();
        setRegisterStep("rejected");
      } else if (error.response?.data?.errors) {
        const firstError = Object.values(error.response.data.errors)[0];
        const msg = Array.isArray(firstError) ? firstError[0] : String(firstError);
        sileo.error({ title: "Registration Failed", description: msg });
        await logout();
        setRegisterStep("form");
        setProgress(0);
      } else {
        const msg = error.response?.data?.message || "Registration failed. Please try again.";
        sileo.error({ title: "Registration Failed", description: msg });
        await logout();
        setRegisterStep("form");
        setProgress(0);
      }
    } finally {
      setRegLoading(false);
    }
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
                <div className="text-left mb-5 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700">Details</span>
                  </div>
                  <p className="text-sm text-red-600 whitespace-pre-line">{rejectionReason}</p>
                </div>
              )}
              <div className="space-y-2">
                <Button className="w-full" onClick={() => { setRegisterStep("form"); setIdFile(null); }}>
                  Try Again
                </Button>
                <Button variant="ghost" className="w-full" onClick={() => { setRegisterStep("form"); setActiveTab("login"); }}>
                  Back to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== LOGIN / REGISTER TABS ===== */}
        {registerStep === "form" && (
          <Card className="shadow-xl border-0 overflow-hidden">
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


                </form>
              )}

              {/* ===== REGISTER TAB ===== */}
              {activeTab === "register" && (
                <form onSubmit={handleRegisterFormSubmit} className="space-y-4">
                  <div className="text-center mb-2">
                    <h1 className="text-lg font-bold">Create Account</h1>
                  </div>

                  {regError && (
                    <Alert variant="destructive">
                      <AlertDescription className="text-xs">{regError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="firstName" className="text-xs">First Name *</Label>
                      <Input id="firstName" value={formData.firstName} onChange={(e) => { setRegError(""); setFormData({ ...formData, firstName: e.target.value }); }} placeholder="Juan" required className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="lastName" className="text-xs">Last Name *</Label>
                      <Input id="lastName" value={formData.lastName} onChange={(e) => { setRegError(""); setFormData({ ...formData, lastName: e.target.value }); }} placeholder="Dela Cruz" required className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="regEmail" className="text-xs">MinSU Email *</Label>
                    <Input id="regEmail" type="email" value={formData.email} onChange={(e) => { setRegError(""); setFormData({ ...formData, email: e.target.value }); }} placeholder="juan.delacruz@minsu.edu.ph" required className="mt-1" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="studentId" className="text-xs">Student/Employee ID *</Label>
                      <Input id="studentId" value={formData.studentId} onChange={(e) => { setRegError(""); setFormData({ ...formData, studentId: e.target.value }); }} placeholder="2024-12345" required className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="userType" className="text-xs">Type *</Label>
                      <Select value={formData.userType} onValueChange={(v) => { setRegError(""); setFormData({ ...formData, userType: v }); }} required>
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
                    <Select value={formData.campus} onValueChange={(v) => { setRegError(""); setFormData({ ...formData, campus: v }); }} required>
                      <SelectTrigger id="campus" className="mt-1"><SelectValue placeholder="Select campus" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main">Main Campus - Victoria</SelectItem>
                        <SelectItem value="bongabong">Bongabong Campus</SelectItem>
                        <SelectItem value="calapan">Calapan Campus</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="password" className="text-xs">Password *</Label>
                      <Input id="password" type="password" value={formData.password} onChange={(e) => { setRegError(""); setFormData({ ...formData, password: e.target.value }); }} placeholder="••••••••" required className="mt-1" />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword" className="text-xs">Confirm *</Label>
                      <Input id="confirmPassword" type="password" value={formData.confirmPassword} onChange={(e) => { setRegError(""); setFormData({ ...formData, confirmPassword: e.target.value }); }} placeholder="••••••••" required className="mt-1" />
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
                          <p className="text-[10px] text-muted-foreground">JPG, PNG — Max 1MB</p>
                        </>
                      )}
                      <input type="file" id="id-upload" className="hidden" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) { setRegError(""); setIdFile(e.target.files[0]); } }} />
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox id="terms" checked={formData.agreeTerms} onCheckedChange={(c) => { setRegError(""); setFormData({ ...formData, agreeTerms: c as boolean }); }} required />
                    <label htmlFor="terms" className="text-[11px] leading-relaxed cursor-pointer text-gray-600">
                      I agree to the Terms of Service and confirm I am a MinSU community member.
                    </label>
                  </div>

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="lg" disabled={!isRegisterFormComplete || regLoading}>
                    {regLoading ? (
                      <><Scan className="h-4 w-4 mr-2 animate-spin" /> Verifying your ID...</>
                    ) : (
                      <><ArrowRight className="h-4 w-4 mr-2" /> Create Account & Verify ID</>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ===== OTP VERIFICATION MODAL ===== */}
      <Dialog open={showOtpModal} onOpenChange={() => {}}>
        <DialogContent
          className="sm:max-w-md"
          hideClose
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-center">Verify Your Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Secure badge */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 text-primary rounded-full mb-3">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <p className="text-sm text-muted-foreground">
                We sent a 6-digit verification code to
              </p>
              <p className="text-sm font-semibold mt-1">{formData.email}</p>
            </div>

            {/* Expiry countdown */}
            {otpSent && otpExpiryCountdown > 0 && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>Code expires in {Math.floor(otpExpiryCountdown / 60)}:{String(otpExpiryCountdown % 60).padStart(2, "0")}</span>
              </div>
            )}

            {otpSent && otpExpiryCountdown === 0 && otpExpiryCountdown !== 0 && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">OTP expired. Please request a new one.</AlertDescription>
              </Alert>
            )}

            {/* OTP Input boxes */}
            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otpValues.map((val, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={val}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="w-11 h-12 text-center text-lg font-bold border-2 rounded-lg focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all bg-background"
                  disabled={otpVerifying}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {/* Error message */}
            {otpError && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{otpError}</AlertDescription>
              </Alert>
            )}

            {/* Verify button */}
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
              onClick={verifyOtpAndRegister}
              disabled={otpVerifying || otpValues.join("").length !== 6}
            >
              {otpVerifying ? "Verifying..." : (
                <><ShieldCheck className="h-4 w-4 mr-2" /> Verify & Continue</>
              )}
            </Button>

            {/* Resend */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Didn't receive the code?</p>
              <button
                type="button"
                onClick={sendOtp}
                disabled={otpSending || otpCountdown > 0}
                className="text-xs font-medium text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
              >
                {otpSending
                  ? "Sending..."
                  : otpCountdown > 0
                  ? `Resend in ${otpCountdown}s`
                  : "Resend Code"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
