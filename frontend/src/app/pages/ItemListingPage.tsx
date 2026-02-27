import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { 
  Upload, 
  ShieldCheck, 
  AlertTriangle,
  X,
  ImageIcon,
  Loader2
} from "lucide-react";
import { itemsApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export function ItemListingPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [images, setImages] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    condition: "",
    campus: "",
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      setImages([...images, ...newImages].slice(0, 5)); // Max 5 images
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('condition', formData.condition);
      data.append('campus', formData.campus);

      images.forEach((image) => {
        data.append('images[]', image);
      });

      await itemsApi.createItem(data);
      setSuccess(true);
      setTimeout(() => navigate("/browseitem"), 2000);
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errors = Object.values(err.response.data.errors).flat().join(', ');
        setError(errors);
      } else {
        setError(err.response?.data?.message || 'Failed to create listing');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 pb-20 md:pb-12">
        <div className="container mx-auto max-w-3xl">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You must be logged in to list an item. Please <a href="/login" className="underline font-semibold">log in</a> first.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 pb-20 md:pb-12">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">List an Item</h1>
          <p className="text-muted-foreground">
            Share items you no longer need with the MinSU community
          </p>
        </div>

        <Card className="shadow-lg mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>Item Details</CardTitle>
                <CardDescription>
                  Provide clear information about your item
                </CardDescription>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20">
                <ShieldCheck className="h-3 w-3 mr-1" />
                AI Screening Enabled
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="mb-4 border-success text-success">
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>
                  Item listed successfully! Redirecting to browse items...
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Upload */}
              <div>
                <Label>Item Photos *</Label>
                <div className="mt-2">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                    {images.map((image, index) => (
                      <div key={index} className="relative aspect-square bg-muted rounded-lg overflow-hidden">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Upload ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    
                    {images.length < 5 && (
                      <label className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Upload</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Upload up to 5 photos. First photo will be the main display.
                  </p>
                </div>
              </div>

              {/* Title */}
              <div>
                <Label htmlFor="title">Item Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Engineering Textbook - Dynamics"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the item's condition, features, and any other relevant details..."
                  rows={5}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Be honest and detailed to help others understand the item
                </p>
              </div>

              {/* Category and Condition */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })} required>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="books">Books & Textbooks</SelectItem>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="clothing">Clothing & Uniforms</SelectItem>
                      <SelectItem value="supplies">School Supplies</SelectItem>
                      <SelectItem value="equipment">Lab Equipment</SelectItem>
                      <SelectItem value="furniture">Furniture</SelectItem>
                      <SelectItem value="sports">Sports Equipment</SelectItem>
                      <SelectItem value="others">Others</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="condition">Condition *</Label>
                  <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })} required>
                    <SelectTrigger id="condition">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="like-new">Like New</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Campus */}
              <div>
                <Label htmlFor="campus">Pickup Campus *</Label>
                <Select value={formData.campus} onValueChange={(value) => setFormData({ ...formData, campus: value })} required>
                  <SelectTrigger id="campus">
                    <SelectValue placeholder="Select campus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main Campus - Calapan City</SelectItem>
                    <SelectItem value="bongabong">Bongabong Campus</SelectItem>
                    <SelectItem value="victoria">Victoria Campus</SelectItem>
                    <SelectItem value="pinamalayan">Pinamalayan Campus</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Items will be picked up at Arawatan Corner on the selected campus
                </p>
              </div>

              {/* AI Safety Notice */}
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>AI Safety Screening:</strong> Your item listing will be automatically screened for prohibited content including 
                  drugs, alcohol, weapons, and other unsafe goods. Listings that violate policies will be rejected.
                </AlertDescription>
              </Alert>

              {/* Important Note */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>One Item Per Listing:</strong> You can only list one item at a time. 
                  Monthly limit: 5 transactions. Current usage: 3/5
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => navigate("/browseitem")} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : 'Submit for Review'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Guidelines Card */}
        <Card>
          <CardHeader>
            <CardTitle>Listing Guidelines</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary font-semibold">•</span>
                <span>Only list items you genuinely want to give away for free</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-semibold">•</span>
                <span>Provide accurate descriptions and clear photos</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-semibold">•</span>
                <span>Prohibited items: drugs, alcohol, weapons, hazardous materials</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-semibold">•</span>
                <span>Meet only at designated Arawatan Corners during office hours</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-semibold">•</span>
                <span>Be respectful and responsive to interested members</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
