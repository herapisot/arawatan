import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Link } from "react-router";
import { 
  ShieldCheck,
  Users,
  Award,
  MessageCircle,
  MapPin,
  Bot,
  CheckCircle2,
  Lock,
  Heart
} from "lucide-react";

export function AboutPage() {
  const features = [
    {
      icon: ShieldCheck,
      title: "AI Safety Screening",
      description: "Advanced AI technology automatically screens all listings for prohibited items and unsafe content.",
    },
    {
      icon: Users,
      title: "Verified Community",
      description: "All users are verified MinSU students and staff through institutional ID verification.",
    },
    {
      icon: Award,
      title: "Rewards System",
      description: "Earn points and badges for your contributions to encourage community participation.",
    },
    {
      icon: MessageCircle,
      title: "Secure Messaging",
      description: "Built-in chat system with moderation to ensure safe communication between members.",
    },
    {
      icon: MapPin,
      title: "Safe Meetup Locations",
      description: "All exchanges occur at designated Arawatan Corners on campus during office hours.",
    },
    {
      icon: Lock,
      title: "Transaction Monitoring",
      description: "All transactions are tracked and monitored to ensure compliance with university policies.",
    },
  ];

  const stats = [
    { value: "2,847", label: "Active Users" },
    { value: "12,534", label: "Items Exchanged" },
    { value: "4", label: "Campuses Connected" },
    { value: "98.5%", label: "Success Rate" },
  ];

  const campuses = [
    "Main Campus - Calapan City",
    "Bongabong Campus",
    "Victoria Campus",
    "Bulalacao Campus",
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary via-accent to-secondary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">About MinSU ARAWATAN</h1>
          <p className="text-xl text-primary-foreground/90 max-w-3xl mx-auto">
            Building a culture of sharing, sustainability, and community support across
            Mindoro State University campuses.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center shadow-md">
                <CardContent className="pt-6 pb-6">
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <Card className="shadow-lg">
              <CardContent className="pt-8 pb-8">
                <Heart className="h-12 w-12 text-primary mx-auto mb-6" />
                <p className="text-lg leading-relaxed text-muted-foreground mb-6">
                  The MinSU ARAWATAN Platform aims to foster a culture of generosity, 
                  sustainability, and mutual support within the Mindoro State University community. 
                  By connecting students, faculty, and staff, we create opportunities for members 
                  to share resources, reduce waste, and strengthen community bonds.
                </p>
                <p className="text-lg leading-relaxed text-muted-foreground">
                  Our platform ensures safety, transparency, and accountability through institutional 
                  verification, AI screening, and monitored transactions—all while celebrating and 
                  rewarding those who contribute to our shared community.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Platform Features</h2>
            <p className="text-lg text-muted-foreground">
              Built with safety, trust, and community in mind
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 bg-primary/10 rounded-lg p-3">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Campuses */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">Serving All MinSU Campuses</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {campuses.map((campus, index) => (
                <Card key={index} className="shadow-md">
                  <CardContent className="pt-6 pb-6">
                    <MapPin className="h-8 w-8 text-primary mx-auto mb-3" />
                    <div className="font-semibold text-lg">{campus}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
