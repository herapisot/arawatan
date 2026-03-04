import { Link, useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { 
  Gift, 
  MapPin,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { itemsApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { sileo } from "sileo";
import sampleArawatan from "../../assets/sample-arawatan.jpg";
import hapagA from "../../assets/HAPAG-A.jpg";
import hapagB from "../../assets/HAPAG-B.jpg";
import hapagC from "../../assets/HAPAG-C.jpg";
import hapagD from "../../assets/HAPAG-D.jpg";
import hapagE from "../../assets/HAPAG-E.jpg";

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isVerified, user } = useAuth();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const STORAGE_URL = import.meta.env.VITE_STORAGE_URL || 'http://localhost:8000/storage';

  const campusLabels: Record<string, string> = {
    main: "Main - Victoria Campus",
    bongabong: "Bongabong Campus",
    calapan: "Calapan Campus",
  };

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const res = await itemsApi.browse({ per_page: 8, sort: 'latest' });
        setItems(res.data.data || []);
      } catch (err) {
        console.error('Failed to fetch items:', err);
        sileo.error({ title: "Error", description: "Failed to load latest items." });
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  // Banner slides - awareness & donation campaigns
  const banners = [
    {
      title: "be part of HAPAG",
      subtitle: "Handog Alaga, Pagkain, At Ginhawa",
      description: "Project HAPAG provides food, essentials, and care to MinSU students in need. Your small act of kindness can make a big difference—donate today!",
      cta: "Fund Me",
    },
    {
      title: "be part of HAPAG",
      subtitle: "Handog Alaga, Pagkain, At Ginhawa",
      description: "Your donation can feed a hungry student. Every contribution counts toward helping our MinSU community thrive through Project HAPAG.",
      cta: "Fund Me",
    },
    {
      title: "be part of HAPAG",
      subtitle: "Handog Alaga, Pagkain, At Ginhawa",
      description: "Hunger shouldn't be part of your college experience. Help sustain Project HAPAG and support your classmates with food and essentials.",
      cta: "Fund Me",
    },
  ];

  // Prepare slides by pairing images with banner texts; rotate over slides
  const hapagImages = [hapagA, hapagB, hapagC, hapagD, hapagE];
  const slides = hapagImages.map((img, i) => ({ image: img, ...(banners[i % banners.length]) }));

  // Auto-rotate slides
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % slides.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handleRequestItem = (encryptedId: string) => {
    if (!isAuthenticated) {
      navigate("/auth");
    } else if (!isVerified) {
      navigate("/auth?tab=register");
    } else {
      navigate(`/browseitem/${encryptedId}`);
    }
  };

  const nextBanner = () => {
    setCurrentBannerIndex((prev) => (prev + 1) % slides.length);
  };

  const prevBanner = () => {
    setCurrentBannerIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="pb-20 md:pb-0 bg-background">
      {/* Hero Section with HAPAG Banner */}
      <section className="relative min-h-[100dvh] flex flex-col justify-center px-4 overflow-hidden text-white">
        {/* Background Image with Ken Burns animation */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img src={sampleArawatan} alt="" className="w-full h-full object-cover scale-110 animate-[kenburns_25s_ease-in-out_infinite_alternate]" />
          <div className="absolute inset-0 bg-gradient-to-b from-primary/60 via-primary/40 via-50% to-primary/95" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent via-85% to-accent/60" />
          {/* Animated light shimmer */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_8s_ease-in-out_infinite]" />
        </div>
        <div className="container mx-auto max-w-5xl relative z-10 py-12 md:py-16">
          {/* Welcome Text */}
          <div className="text-center mb-12 md:mb-16">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black mb-4 md:mb-6 tracking-tight" style={{ fontFamily: "'Playfair Display', montserrat", textShadow: '0 4px 20px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.4)' }}>Welcome to MinSU<br className="md:hidden" /> ARAWATAN</h1>
            <p className="text-xl sm:text-2xl md:text-3xl mb-3 md:mb-5 font-bold tracking-wide" style={{ fontFamily: "'Playfair Display', montserrat", color: 'var(--accent)', textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>Sharing Hope, Building Community</p>
            <p className="text-base md:text-xl opacity-95 max-w-2xl mx-auto mb-6 md:mb-8 leading-relaxed" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
              A community-driven platform where MinSU students share items they no longer need with those who need them most.
            </p>
            {!isAuthenticated && (
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 font-bold text-base px-8 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
                onClick={() => navigate("/auth")}
              >
                Get Started
              </Button>
            )}
            {isAuthenticated && !isVerified && (
              <Button
                size="lg"
                className="bg-secondary hover:bg-secondary/90 text-white font-bold text-base px-8 py-3 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
                onClick={() => navigate("/auth?tab=register")}
              >
                Verify Your ID to Unlock Features
              </Button>
            )}
          </div>

          {/* HAPAG Banner Carousel */}
          <div className="relative w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20">
            <div className="relative h-56 md:h-72">
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    index === currentBannerIndex ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <img src={slide.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-primary/50 to-accent/40"></div>
                  <div className="relative h-full w-full px-8 md:px-12 py-6 md:py-8 flex items-center">
                    <div className="flex items-center gap-5 w-full">
                      <div className="flex-1 text-white">
                        <div className="md:hidden flex items-center gap-2 mb-3">
                          <span className="text-xl font-normal tracking-wider">be part of <span style={{ fontFamily: "'Dancing Script', cursive" }} className="text-3xl font-bold">HAPAG</span></span>
                        </div>
                        <h3 className="hidden md:block text-xl md:text-4xl font-normal mb-2 md:mb-3">be part of <span style={{ fontFamily: "'Dancing Script', cursive" }} className="md:text-5xl font-bold">HAPAG</span></h3>
                        <p className="text-sm md:text-lg font-semibold italic mb-2 md:mb-3" style={{ color: 'var(--accent)' }}>{slide.subtitle}</p>
                        <p className="text-sm md:text-base opacity-90 leading-relaxed line-clamp-3 mb-4 md:mb-5">{slide.description}</p>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="text-xs md:text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
                          onClick={() => window.open("https://gcash.com", "_blank")}
                        >
                          {slide.cta}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Navigation Buttons */}
            <button
              onClick={prevBanner}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-1.5 rounded-full transition-colors z-10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextBanner}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white p-1.5 rounded-full transition-colors z-10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Indicator Dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentBannerIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === currentBannerIndex ? "bg-white w-4" : "bg-white/50 w-1.5 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Items Grid Section */}
      <section className="container mx-auto px-4 py-6 md:py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base md:text-lg font-semibold uppercase text-muted-foreground">Available Items</h2>
          <Link to="/browseitem">
            <Button variant="link" className="p-0 h-auto">
              View All →
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
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
                  <Badge variant="secondary">{item.condition}</Badge>
                </div>
              </div>

              <CardContent className="pt-3 pb-2 flex-grow">
                <h3 className="font-semibold text-sm md:text-base line-clamp-2">{item.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground line-clamp-1 mt-1">
                  {item.description}
                </p>

                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="line-clamp-1">{campusLabels[item.campus] || item.campus}</span>
                </div>

                <div className="flex items-center gap-2 text-xs mt-2">
                  <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {`${item.user?.first_name?.[0] || ''}${item.user?.last_name?.[0] || ''}`}
                  </div>
                  <span className="text-muted-foreground line-clamp-1">{item.user?.full_name}</span>
                </div>
              </CardContent>

              <CardFooter className="pt-2 pb-3">
                <Button
                  className="w-full text-sm"
                  variant={item.user?.id === user?.id ? "outline" : "default"}
                  onClick={() => handleRequestItem(item.encrypted_id)}
                >
                  {item.user?.id === user?.id ? "View Item" : "Request Item"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
        )}
      </section>
    </div>
  );
}