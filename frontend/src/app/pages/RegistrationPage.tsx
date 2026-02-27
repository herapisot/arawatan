import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
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
  FileImage, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  LogIn,
  UserPlus,
  AlertTriangle,
  X
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { verificationApi, authApi } from "../services/api";

export function RegistrationPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated, logout, login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form" | "processing" | "approved" | "rejected">("form");
  const [progress, setProgress] = useState(0);
  const [aiConfidence, setAiConfidence] = useState(0);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
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

  // If user is already authenticated and verified, redirect to home
  useEffect(() => {
    if (isAuthenticated) {
      // Check verification status
      verificationApi.status().then((res) => {
        if (res.data.status === 'approved') {
          setStep('approved');
          setAiConfidence(res.data.ai_confidence || 98);
        } else if (res.data.status === 'pending') {
          setStep('processing');
          setProgress(50);
        } else if (res.data.status === 'rejected') {
          setStep('rejected');
        }
      }).catch(() => {
        // No verification yet — show form for ID upload only
      });
    }
  }, [isAuthenticated]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!idFile) {
      setError("Please upload your MinSU ID for verification.");
      return;
    }

    setIsLoading(true);
    setStep("processing");
    setProgress(20);

    try {
      // Step 1: Register account
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
      setProgress(50);

      // Step 2: Upload ID for verification
      const fd = new FormData();
      fd.append('id_image', idFile);
      setProgress(70);
      const res = await verificationApi.upload(fd);
      setProgress(100);
      setAiConfidence(res.data.ai_confidence || 0);

      setTimeout(async () => {
        if (res.data.status === 'approved') {
          // Log out the auto-logged-in session so user can login fresh
          const registeredEmail = formData.email;
          await logout();
          setStep('approved');
          setLoginEmail(registeredEmail);
          setShowSuccessModal(true);
        } else if (res.data.status === 'rejected') {
          setStep('rejected');
        } else {
          // pending admin review
          setStep('processing');
        }
      }, 800);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
      if (error.response?.data?.errors) {
        const firstError = Object.values(error.response.data.errors)[0];
        setError(Array.isArray(firstError) ? firstError[0] : String(firstError));
      } else {
        setError(error.response?.data?.message || "Registration failed. Please try again.");
      }
      setStep("form");
      setProgress(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToLogin = async () => {
    await logout();
    setShowSuccessModal(true);
  };

  const handleModalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
      setShowSuccessModal(false);
      navigate("/");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setLoginError(error.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-muted/30 to-background py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* Step Indicator */}
        <div className="flex items-center justify-center mb-10">
          {/* Step 1: Create Account */}
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
              step !== 'form' ? 'bg-success text-white' : 'bg-primary text-primary-foreground ring-4 ring-primary/20'
            }`}>
              {step !== 'form' ? <CheckCircle2 className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
            </div>
            <span className={`text-xs mt-1.5 font-medium ${
              step !== 'form' ? 'text-success' : 'text-primary'
            }`}>Register</span>
          </div>

          <div className={`w-12 md:w-20 h-0.5 mx-1 ${step !== 'form' ? 'bg-success' : 'bg-border'}`} />

          {/* Step 2: Verify ID */}
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
              step === 'approved' ? 'bg-success text-white'
                : step === 'processing' ? 'bg-warning text-white ring-4 ring-warning/20 animate-pulse'
                : step === 'rejected' ? 'bg-destructive text-white ring-4 ring-destructive/20'
                : 'bg-muted text-muted-foreground'
            }`}>
              {step === 'approved' ? <CheckCircle2 className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <span className={`text-xs mt-1.5 font-medium ${
              step === 'approved' ? 'text-success'
                : step === 'processing' ? 'text-warning'
                : step === 'rejected' ? 'text-destructive'
                : 'text-muted-foreground'
            }`}>Verify ID</span>
          </div>

          <div className={`w-12 md:w-20 h-0.5 mx-1 ${step === 'approved' ? 'bg-success' : 'bg-border'}`} />

          {/* Step 3: Login */}
          <div className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
              step === 'approved' ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : 'bg-muted text-muted-foreground'
            }`}>
              <LogIn className="h-5 w-5" />
            </div>
            <span className={`text-xs mt-1.5 font-medium ${
              step === 'approved' ? 'text-primary' : 'text-muted-foreground'
            }`}>Login</span>
          </div>
        </div>

        {/* ===== STEP: FORM (Register + Upload ID) ===== */}
        {step === "form" && (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-primary-foreground rounded-full mb-4">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Create Your Account</h1>
              <p className="text-muted-foreground">
                Join the MinSU Community Exchange Platform
              </p>
            </div>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Registration Form</CardTitle>
                <CardDescription>
                  All information will be verified against MinSU records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Personal Information */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          placeholder="Juan"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          placeholder="Dela Cruz"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">MinSU Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="juan.delacruz@minsu.edu.ph"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Must be your official MinSU email address
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="studentId">Student/Employee ID *</Label>
                        <Input
                          id="studentId"
                          value={formData.studentId}
                          onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                          placeholder="2024-12345"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="userType">User Type *</Label>
                        <Select value={formData.userType} onValueChange={(value) => setFormData({ ...formData, userType: value })} required>
                          <SelectTrigger id="userType">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="faculty">Faculty</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="campus">Campus *</Label>
                      <Select value={formData.campus} onValueChange={(value) => setFormData({ ...formData, campus: value })} required>
                        <SelectTrigger id="campus">
                          <SelectValue placeholder="Select your campus" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="main">Main Campus - Calapan City</SelectItem>
                          <SelectItem value="bongabong">Bongabong Campus</SelectItem>
                          <SelectItem value="victoria">Victoria Campus</SelectItem>
                          <SelectItem value="pinamalayan">Pinamalayan Campus</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  {/* Upload MinSU ID */}
                  <div className="space-y-2">
                    <Label>Upload MinSU ID *</Label>
                    <div
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                        dragActive
                          ? "border-primary bg-primary/5"
                          : idFile
                          ? "border-success bg-success/10"
                          : "border-border hover:border-primary/50"
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById("id-upload")?.click()}
                    >
                      {idFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <CheckCircle2 className="h-6 w-6 text-success" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-success">{idFile.name}</p>
                            <p className="text-xs text-success/80">{(idFile.size / 1024).toFixed(1)} KB — Click to change</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-sm font-medium mb-1">Drag & drop your MinSU ID here</p>
                          <p className="text-xs text-muted-foreground">or click to browse (JPG, PNG — Max 5MB)</p>
                        </>
                      )}
                      <input
                        type="file"
                        id="id-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => { if (e.target.files?.[0]) setIdFile(e.target.files[0]); }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your ID will be verified by the system to confirm your MinSU affiliation.
                    </p>
                  </div>

                  {/* Terms */}
                  <Alert>
                    <AlertDescription className="text-sm">
                      <strong>Institutional Disclaimer:</strong> This platform is for exclusive use by verified MinSU community members. 
                      All transactions are subject to university policies. Misuse may result in account suspension and disciplinary action.
                    </AlertDescription>
                  </Alert>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="terms"
                      checked={formData.agreeTerms}
                      onCheckedChange={(checked) => setFormData({ ...formData, agreeTerms: checked as boolean })}
                      required
                    />
                    <label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                      I agree to the Terms of Service and Privacy Policy, and confirm that I am a current member of the MinSU community.
                    </label>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={!formData.agreeTerms || isLoading || !idFile}>
                    {isLoading ? "Creating Account & Verifying..." : "Create Account & Verify ID"}
                    {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>

                  <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <button type="button" onClick={() => navigate("/")} className="text-primary hover:underline font-medium">
                      Login here
                    </button>
                  </p>
                </form>
              </CardContent>
            </Card>
          </>
        )}

        {/* ===== STEP: PROCESSING ===== */}
        {step === "processing" && (
          <Card className="shadow-lg">
            <CardContent className="pt-8 pb-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-warning/20 text-warning rounded-full mb-4 animate-pulse">
                  <Clock className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Verifying Your ID</h2>
                <p className="text-muted-foreground">
                  The system is analyzing your MinSU ID...
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-3 mb-6">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Processing...</span>
                  <span>{progress}%</span>
                </div>
              </div>

              <div className="max-w-md mx-auto space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>Account created successfully</span>
                </div>
                <div className="flex items-center gap-2">
                  {progress >= 50 ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Clock className="h-4 w-4 text-warning animate-pulse" />}
                  <span>Image quality check</span>
                </div>
                <div className="flex items-center gap-2">
                  {progress >= 70 ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Clock className="h-4 w-4 text-warning animate-pulse" />}
                  <span>ID format validation</span>
                </div>
                <div className="flex items-center gap-2">
                  {progress >= 100 ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Clock className="h-4 w-4 text-muted-foreground" />}
                  <span>Verifying against MinSU database...</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== STEP: APPROVED (shown briefly before modal) ===== */}
        {step === "approved" && !showSuccessModal && (
          <Card className="shadow-lg">
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-success/10 text-success rounded-full mb-4">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-success">ID Verified Successfully!</h2>
                <p className="text-muted-foreground mb-6">
                  Your MinSU identity has been confirmed.
                </p>
                <Button
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8"
                  onClick={() => setShowSuccessModal(true)}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login to Your Account
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ===== SUCCESS + LOGIN POPUP MODAL ===== */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] px-4" onClick={() => {}}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Success Header */}
              <div className="bg-gradient-to-r from-primary to-accent px-6 py-5 text-center text-white relative">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-full mb-3">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold">Registration Successful!</h2>
                <p className="text-sm text-primary-foreground/80 mt-1">Your MinSU ID has been verified. You can now log in.</p>
              </div>

              {/* Login Form */}
              <div className="px-6 py-5">
                {loginError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                    {loginError}
                  </div>
                )}
                <form onSubmit={handleModalLogin} className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Email</Label>
                    <Input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="your.email@minsu.edu.ph"
                      className="mt-1"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Password</Label>
                    <Input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="mt-1"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                    size="lg"
                    disabled={loginLoading}
                  >
                    {loginLoading ? (
                      "Logging in..."
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        Login to ARAWATAN
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ===== STEP: REJECTED ===== */}
        {step === "rejected" && (
          <Card className="shadow-lg">
            <CardContent className="pt-8 pb-8">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 text-red-500 rounded-full mb-4">
                  <XCircle className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold mb-2 text-red-600">Verification Failed</h2>
                <p className="text-muted-foreground mb-6">
                  We couldn't verify your MinSU ID. Please try again with a clearer photo.
                </p>

                <Alert className="mb-6 text-left max-w-md mx-auto" variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Possible reasons:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>ID photo is blurry or unclear</li>
                      <li>ID details don't match your registration info</li>
                      <li>ID has expired or is not a valid MinSU ID</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <Button onClick={() => { setStep("form"); setError(""); setIdFile(null); }}>
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
