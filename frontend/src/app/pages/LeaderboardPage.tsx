import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Progress } from "../components/ui/progress";
import { 
  Trophy,
  Award,
  Star,
  TrendingUp,
  Gift,
  Users,
  Loader2
} from "lucide-react";
import { leaderboardApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";

export function LeaderboardPage() {
  const { user } = useAuth();
  const [topContributors, setTopContributors] = useState<any[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const res = await leaderboardApi.getLeaderboard();
        setTopContributors(res.data.leaderboard || []);
        setCurrentUserRank(res.data.current_user_rank || 0);
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadLeaderboard();
  }, []);

  const currentUser = {
    name: user?.full_name || 'You',
    rank: currentUserRank,
    points: user?.points || 0,
    contributions: user?.items_shared || 0,
    tier: user?.tier || 'bronze',
    nextTierPoints: user?.tier === 'gold' ? 2000 : user?.tier === 'silver' ? 1500 : 1000,
  };

  const badges = [
    {
      name: "Bronze Contributor",
      icon: Trophy,
      color: "text-amber-700",
      bgColor: "bg-amber-50",
      points: "500+ points",
      description: "Taking the first steps in spreading kindness",
    },
    {
      name: "Silver Contributor",
      icon: Award,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      points: "1000+ points",
      description: "A reliable heart the community can count on",
    },
    {
      name: "Gold Community Champion",
      icon: Star,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
      points: "1500+ points",
      description: "The ultimate mabait — a true community hero",
    },
  ];

  const progressToNextTier = (currentUser.points / currentUser.nextTierPoints) * 100;

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background py-8 px-4 pb-20 md:pb-8">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-secondary text-secondary-foreground rounded-full mb-4">
            <Trophy className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">The Kindest Hearts</h1>
          <p className="text-muted-foreground">
            Honoring the most <span className="font-semibold text-primary">mabait</span> and <span className="font-semibold text-primary">mapagbigay</span> members of our community
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Your Progress */}
          <Card className="lg:col-span-1 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Your Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <Avatar className="h-20 w-20 mx-auto mb-3">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    YOU
                  </AvatarFallback>
                </Avatar>
                <Badge className="mb-2">{currentUser.tier}</Badge>
                <div className="text-3xl font-bold text-primary mb-1">#{currentUser.rank}</div>
                <div className="text-sm text-muted-foreground">Current Rank</div>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-border">
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentUser.points}</div>
                  <div className="text-xs text-muted-foreground">Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{currentUser.contributions}</div>
                  <div className="text-xs text-muted-foreground">Items Shared</div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Next Tier Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {currentUser.points}/{currentUser.nextTierPoints}
                  </span>
                </div>
                <Progress value={progressToNextTier} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {currentUser.nextTierPoints - currentUser.points} points to Gold Champion!
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card className="lg:col-span-2 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-secondary" />
                Most Generous Givers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topContributors.map((contributor) => (
                  <div
                    key={contributor.rank}
                    className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                      contributor.rank <= 3
                        ? "bg-secondary/10 border border-secondary/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="text-2xl font-bold text-muted-foreground w-8 text-center">
                      {contributor.rank === 1 ? "🥇" : contributor.rank === 2 ? "🥈" : contributor.rank === 3 ? "🥉" : contributor.rank}
                    </div>
                    
                    <Avatar>
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {`${contributor.first_name?.[0] || ''}${contributor.last_name?.[0] || ''}`}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="font-semibold">{contributor.full_name}</div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {contributor.tier}
                      </Badge>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">{contributor.points}</div>
                      <div className="text-xs text-muted-foreground">
                        {contributor.items_shared} items
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Badge Tiers */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6 text-center">Badges of Kindness</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {badges.map((badge, index) => (
              <Card key={index} className="shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="pt-6 text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 ${badge.bgColor} rounded-full mb-4`}>
                    <badge.icon className={`h-8 w-8 ${badge.color}`} />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{badge.name}</h3>
                  <Badge variant="secondary" className="mb-3">{badge.points}</Badge>
                  <p className="text-sm text-muted-foreground">{badge.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Hall of Fame */}
        <Card className="shadow-md bg-gradient-to-br from-primary/5 to-secondary/5">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              🏆 Wall of Kindness 🏆
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                The most selfless and generous hearts in our community
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {topContributors.slice(0, 3).map((contributor) => (
                  <div key={contributor.rank} className="space-y-3">
                    <div className="text-4xl">{contributor.rank === 1 ? "🥇" : contributor.rank === 2 ? "🥈" : "🥉"}</div>
                    <Avatar className="h-16 w-16 mx-auto">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                        {`${contributor.first_name?.[0] || ''}${contributor.last_name?.[0] || ''}`}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold">{contributor.full_name}</div>
                      <div className="text-2xl font-bold text-primary mt-1">{contributor.points} pts</div>
                      <div className="text-sm text-muted-foreground">{contributor.items_shared} shared</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
