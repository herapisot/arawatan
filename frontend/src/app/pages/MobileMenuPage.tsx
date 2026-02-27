import { Link, useNavigate } from "react-router";
import { Info, User, Trophy, LogOut, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Footer } from "../components/Footer";

export function MobileMenuPage() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Menu</h2>
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-4">
          <Link to="/about" className="flex items-center gap-3 px-4 py-3 bg-white rounded shadow-sm hover:shadow-md">
            <Info className="h-5 w-5 text-primary" />
            <span className="font-medium">About</span>
          </Link>

          {isAuthenticated && (
            <Link to="/profile" className="flex items-center gap-3 px-4 py-3 bg-white rounded shadow-sm hover:shadow-md">
              <User className="h-5 w-5 text-primary" />
              <span className="font-medium">Profile</span>
            </Link>
          )}

          <Link to="/leaderboard" className="flex items-center gap-3 px-4 py-3 bg-white rounded shadow-sm hover:shadow-md">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="font-medium">Leaderboard</span>
          </Link>

          {isAuthenticated && (
            <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 bg-white rounded shadow-sm hover:shadow-md w-full text-left text-destructive">
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Log out</span>
            </button>
          )}
        </div>

        <div className="mt-8 text-sm text-muted-foreground">
          <h4 className="font-semibold mb-2">About ARAWATAN</h4>
          <p className="mb-2">The official ARAWATAN platform for Mindoro State University.</p>
          <div>Email: arawatan@minsu.edu.ph</div>
          <div>Phone: (+63) 441-104-013</div>
        </div>
      </main>
      <Footer className="mt-6" />
    </div>
  );
}
