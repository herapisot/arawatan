import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Progress } from "../components/ui/progress";
import { Link } from "react-router";
import { 
  User,
  Mail,
  MapPin,
  Calendar,
  Award,
  Gift,
  MessageCircle,
  Settings,
  Shield,
  TrendingUp,
  Loader2,
  Inbox,
  CheckCircle2,
  Clock,
  XCircle
} from "lucide-react";
import { profileApi, itemsApi, transactionsApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import minsuBuilding from "../../assets/minsu-building.jpg";

export function ProfilePage() {
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [myListings, setMyListings] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [myDonations, setMyDonations] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveLoadingId, setApproveLoadingId] = useState<number | null>(null);

  const campusLabels: Record<string, string> = {
    main: "Main Campus",
    bongabong: "Bongabong Campus",
    victoria: "Victoria Campus",
    pinamalayan: "Pinamalayan Campus",
  };

  const tierThresholds: Record<string, number> = {
    bronze: 500,
    silver: 1000,
    gold: 1500,
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [profileRes, listingsRes, requestsRes, donationsRes] = await Promise.all([
          profileApi.getProfile().catch(() => null),
          itemsApi.myItems().catch(() => null),
          transactionsApi.myRequests().catch(() => null),
          transactionsApi.myDonations().catch(() => null),
        ]);

        if (profileRes?.data) {
          // Backend returns { user: {...}, stats: {...} }
          const userData = profileRes.data.user || profileRes.data;
          const statsData = profileRes.data.stats || {};
          setProfile({
            ...userData,
            ...statsData,
            badges: userData.badges || [],
          });
          setBadges(userData.badges || []);
        } else if (authUser) {
          // Fallback: use auth context user data
          setProfile({
            ...authUser,
            full_name: `${authUser.first_name || ''} ${authUser.last_name || ''}`.trim(),
            items_shared: 0,
            items_received: 0,
            active_listings: 0,
            completed_transactions: 0,
            badges: [],
          });
        }

        setMyListings(listingsRes?.data?.data || listingsRes?.data || []);
        setMyRequests(requestsRes?.data?.data || requestsRes?.data || []);
        setMyDonations(donationsRes?.data?.data || donationsRes?.data || []);
      } catch (err) {
        console.error('Failed to load profile:', err);
        // Last resort fallback from auth context
        if (authUser) {
          setProfile({
            ...authUser,
            full_name: `${authUser.first_name || ''} ${authUser.last_name || ''}`.trim(),
            items_shared: 0,
            items_received: 0,
            active_listings: 0,
            completed_transactions: 0,
            badges: [],
          });
        }
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [authUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-16">
        <p>Failed to load profile</p>
      </div>
    );
  }

  const nextTierPoints = (profile.tier || 'bronze') === 'gold'
    ? 2000
    : tierThresholds[(profile.tier || 'bronze') === 'bronze' ? 'silver' : 'gold'] || 1000;
  const progressToNextTier = Math.min(((profile.points || 0) / nextTierPoints) * 100, 100);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      {/* Cover Banner */}
      <div className="relative h-48 md:h-56 overflow-hidden">
        <img src={minsuBuilding} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/60 to-primary/90" />
      </div>

      <div className="container mx-auto max-w-7xl px-4 -mt-20 relative z-10">
        {/* Profile Header */}
        <Card className="mb-6 shadow-md">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar and Basic Info */}
              <div className="flex flex-col items-center md:items-start gap-4">
                <Avatar className="h-24 w-24">
                  <AvatarFallback className="bg-primary text-primary-foreground text-3xl">
                    {`${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`}
                  </AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  {profile.is_verified ? (
                    <Badge className="bg-success text-success-foreground">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Shield className="h-3 w-3 mr-1" />
                      Unverified
                    </Badge>
                  )}
                  <Badge variant="secondary" className="capitalize">{profile.tier || 'bronze'}</Badge>
                </div>
              </div>

              {/* User Details */}
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-2xl font-bold mb-1">{profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`}</h1>
                  <p className="text-muted-foreground capitalize">{profile.user_type || 'Member'} • {profile.student_id || 'N/A'}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{campusLabels[profile.campus] || profile.campus}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Joined {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span>Rank #{profile.rank || '-'} Overall</span>
                  </div>
                </div>

                <div className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span>Progress to Gold Champion</span>
                    <span className="text-sm text-muted-foreground">
                      {profile.points || 0}/{nextTierPoints} points
                    </span>
                  </div>
                  <Progress value={progressToNextTier} className="h-2 mb-2" />
                  <p className="text-xs text-muted-foreground">
                    {Math.max(0, nextTierPoints - (profile.points || 0))} more points needed
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex md:flex-col gap-2">
                <Button variant="outline" className="flex-1 md:flex-initial">
                  <Settings className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
                <Link to="/list-item" className="flex-1 md:flex-initial">
                  <Button className="w-full">
                    <Gift className="mr-2 h-4 w-4" />
                    List Item
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-md">
            <CardContent className="pt-6 pb-6 text-center">
              <Gift className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{profile.items_shared || 0}</div>
              <div className="text-xs text-muted-foreground">Items Shared</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-md">
            <CardContent className="pt-6 pb-6 text-center">
              <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{profile.items_received || 0}</div>
              <div className="text-xs text-muted-foreground">Items Received</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-md">
            <CardContent className="pt-6 pb-6 text-center">
              <MessageCircle className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{'-'}</div>
              <div className="text-xs text-muted-foreground">Active Chats</div>
            </CardContent>
          </Card>
          
          <Card className="shadow-md">
            <CardContent className="pt-6 pb-6 text-center">
              <Award className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold">{(profile.items_shared || 0) + (profile.items_received || 0)}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="listings" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="listings">My Listings</TabsTrigger>
            <TabsTrigger value="donations">
              Incoming
              {myDonations.filter((d) => d.status === 'requested').length > 0 && (
                <Badge className="ml-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 min-w-5 h-5">
                  {myDonations.filter((d) => d.status === 'requested').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests">My Requests</TabsTrigger>
            <TabsTrigger value="badges">Badges</TabsTrigger>
          </TabsList>

          {/* My Listings */}
          <TabsContent value="listings">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>My Listings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myListings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Gift className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">You haven't listed any items yet.</p>
                      <Link to="/list-item">
                        <Button variant="outline" size="sm" className="mt-3">List Your First Item</Button>
                      </Link>
                    </div>
                  ) : myListings.map((listing) => (
                    <div key={listing.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex-1">
                        <div className="font-semibold mb-1">{listing.title}</div>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span>{listing.views_count} views</span>
                          <span>•</span>
                          <span>{listing.requests || 0} requests</span>
                          <span>•</span>
                          <span>{new Date(listing.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={listing.status === "Active" ? "default" : "secondary"}>
                          {listing.status}
                        </Badge>
                        <Link to={`/browseitem/${listing.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incoming Requests (Donations) */}
          <TabsContent value="donations">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Incoming Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myDonations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">No incoming requests for your items yet.</p>
                    </div>
                  ) : myDonations.map((donation) => (
                    <div key={donation.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex-1">
                        <div className="font-semibold mb-1">{donation.item?.title || 'Unknown Item'}</div>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span>Requested by {donation.receiver?.full_name || 'Unknown'}</span>
                          <span>•</span>
                          <span>{new Date(donation.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={
                          donation.status === 'requested' ? 'secondary' :
                          donation.status === 'approved' ? 'default' :
                          donation.status === 'completed' ? 'outline' : 'destructive'
                        } className="capitalize">
                          {donation.status === 'requested' && <Clock className="h-3 w-3 mr-1" />}
                          {donation.status === 'approved' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {donation.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {donation.status === 'cancelled' && <XCircle className="h-3 w-3 mr-1" />}
                          {donation.status}
                        </Badge>
                        {donation.status === 'requested' && (
                          <Button
                            size="sm"
                            disabled={approveLoadingId === donation.id}
                            onClick={async () => {
                              setApproveLoadingId(donation.id);
                              try {
                                await transactionsApi.approve(donation.id);
                                setMyDonations((prev) =>
                                  prev.map((d) =>
                                    d.id === donation.id ? { ...d, status: 'approved' } : d
                                  )
                                );
                              } catch (err) {
                                console.error('Failed to approve:', err);
                              } finally {
                                setApproveLoadingId(null);
                              }
                            }}
                          >
                            {approveLoadingId === donation.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</>
                            )}
                          </Button>
                        )}
                        <Link to={`/browseitem/${donation.item_id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Requests */}
          <TabsContent value="requests">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>My Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="text-sm">You haven't requested any items yet.</p>
                      <Link to="/browseitem">
                        <Button variant="outline" size="sm" className="mt-3">Browse Items</Button>
                      </Link>
                    </div>
                  ) : myRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                      <div className="flex-1">
                        <div className="font-semibold mb-1">{request.item?.title || 'Unknown Item'}</div>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span>From {request.donor?.full_name || 'Unknown'}</span>
                          <span>•</span>
                          <span>{request.campus}</span>
                          <span>•</span>
                          <span>{new Date(request.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={request.status === "Approved" ? "default" : "secondary"}>
                          {request.status}
                        </Badge>
                        <Link to={`/browseitem/${request.item_id || request.item?.id}`}>
                          <Button variant="outline" size="sm">View</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Badges */}
          <TabsContent value="badges">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Achievement Badges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {badges.map((badge, index) => (
                    <div
                      key={index}
                      className={`p-4 border-2 rounded-lg text-center transition-all ${
                        badge.is_earned
                          ? "border-primary bg-primary/5"
                          : "border-border bg-muted/30 opacity-50"
                      }`}
                    >
                      <div className="text-4xl mb-2">{badge.icon}</div>
                      <div className="font-semibold text-sm">{badge.name}</div>
                      {badge.is_earned && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          Earned
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
