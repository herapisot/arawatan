import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Home, Search } from "lucide-react";

export function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full shadow-lg">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="text-8xl font-bold text-primary mb-4">404</div>
          <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
          <p className="text-muted-foreground mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/">
              <Button size="lg" className="w-full sm:w-auto">
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </Link>
            <Link to="/browseitem">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                <Search className="mr-2 h-4 w-4" />
                Browse Browse Items
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
