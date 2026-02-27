import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { 
  Search, 
  Filter,
  MapPin,
  ShieldCheck,
  Plus,
  Loader2
} from "lucide-react";
import { itemsApi } from "../services/api";

interface ItemData {
  id: number;
  title: string;
  description: string;
  category: string;
  condition: string;
  campus: string;
  is_verified: boolean;
  views_count: number;
  user: { id: number; first_name: string; last_name: string; full_name: string };
  images: Array<{ id: number; image_path: string; is_primary: boolean }>;
}

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

export function BrowseItemPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCampus, setSelectedCampus] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [items, setItems] = useState<ItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await itemsApi.browse({
        search: searchQuery || undefined,
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        campus: selectedCampus !== "all" ? selectedCampus : undefined,
        condition: selectedCondition !== "all" ? selectedCondition : undefined,
      });
      setItems(response.data.data || []);
      setTotalItems(response.data.total || 0);
    } catch (err) {
      console.error("Failed to fetch items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchItems, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, selectedCampus, selectedCondition]);

  const categories = ["All", "Books", "Electronics", "Clothing", "Supplies", "Equipment", "Furniture", "Sports", "Others"];
  const campuses = ["All", "Main", "Bongabong", "Victoria", "Pinamalayan"];
  const conditions = ["All", "Like New", "Excellent", "Good", "Fair"];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Browse Item</h1>
            <p className="text-muted-foreground">Browse items available from the MinSU community</p>
          </div>
          <Link to="/list-item">
            <Button size="lg" className="w-full md:w-auto">
              <Plus className="mr-2 h-5 w-5" />
              List an Item
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6 shadow-md">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat.toLowerCase()}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Campus</label>
                  <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {campuses.map((campus) => (
                        <SelectItem key={campus} value={campus.toLowerCase()}>
                          {campus}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Condition</label>
                  <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {conditions.map((condition) => (
                        <SelectItem key={condition} value={condition.toLowerCase().replace(" ", "-")}>
                          {condition}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {items.length} of {totalItems} items
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading items...</span>
          </div>
        )}

        {/* Items Grid */}
        {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative aspect-video bg-muted">
                <ImageWithFallback
                  src={item.images?.[0] ? `${STORAGE_URL}/${item.images[0].image_path}` : `https://placehold.co/400x300?text=${encodeURIComponent(item.title)}`}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
                {item.is_verified && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-success text-success-foreground">
                      <ShieldCheck className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary">{conditionLabels[item.condition] || item.condition}</Badge>
                </div>
              </div>
              
              <CardContent className="pt-4">
                <h3 className="font-semibold text-lg mb-2 line-clamp-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{item.description}</p>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4" />
                  <span>{campusLabels[item.campus] || item.campus}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                    {item.user?.first_name?.[0]}{item.user?.last_name?.[0]}
                  </div>
                  <span className="text-muted-foreground">{item.user?.full_name}</span>
                </div>
              </CardContent>
              
              <CardFooter className="pt-0 pb-4">
                <Link to={`/browseitem/${item.id}`} className="w-full">
                  <Button className="w-full">Request Item</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
        )}

        {/* Empty State */}
        {!loading && items.length === 0 && (
          <Card className="py-16">
            <CardContent className="text-center">
              <Filter className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No items found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your filters or search terms
              </p>
              <Button variant="outline" onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setSelectedCampus("all");
                setSelectedCondition("all");
              }}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
