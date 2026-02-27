import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Link } from "react-router";
import { 
  Users,
  UserCheck,
  ShoppingBag,
  Flag,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { adminApi } from "../../services/api";

export function AdminDashboard() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await adminApi.analytics();
        setAnalytics(res.data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stats = [
    {
      title: "Total Users",
      value: analytics?.stats?.total_users?.toLocaleString() || '0',
      change: `${analytics?.stats?.verified_users || 0} verified`,
      trend: "up",
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Pending Verifications",
      value: String((analytics?.stats?.total_users || 0) - (analytics?.stats?.verified_users || 0)),
      change: "Needs attention",
      trend: "neutral",
      icon: UserCheck,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Total Transactions",
      value: analytics?.stats?.total_transactions?.toLocaleString() || '0',
      change: `${analytics?.stats?.completed_transactions || 0} completed`,
      trend: "up",
      icon: ShoppingBag,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Flagged Items",
      value: String(analytics?.stats?.flagged_items || 0),
      change: "Review needed",
      trend: "down",
      icon: Flag,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Monitor platform activity and key metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`${stat.bgColor} ${stat.color} rounded-lg p-3`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                {stat.trend === "up" && <TrendingUp className="h-5 w-5 text-success" />}
                {stat.trend === "down" && <TrendingDown className="h-5 w-5 text-success" />}
                {stat.trend === "neutral" && <Clock className="h-5 w-5 text-warning" />}
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground mb-1">{stat.title}</div>
              <div className={`text-xs ${
                stat.trend === "up" ? "text-success" : 
                stat.trend === "down" ? "text-success" : 
                "text-warning"
              }`}>
                {stat.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Growth Chart */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Platform Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics?.monthly_transactions || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#1A5F3F" strokeWidth={2} name="Transactions" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Campus Activity */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Campus Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics?.campus_activity || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="campus" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#1A5F3F" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 text-muted-foreground">
                <Clock className="h-5 w-5" />
                <span>View recent activity in the Verifications and Moderation panels.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link to="/admin/verifications">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Review Verifications
                </span>
                <Badge variant="secondary">{(analytics?.stats?.total_users || 0) - (analytics?.stats?.verified_users || 0)}</Badge>
              </Button>
            </Link>
            
            <Link to="/admin/moderation">
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  Check Flagged Items
                </span>
                <Badge variant="destructive">{analytics?.stats?.flagged_items || 0}</Badge>
              </Button>
            </Link>
            
            <Link to="/admin/analytics">
              <Button variant="outline" className="w-full justify-start">
                <TrendingUp className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </Link>

            <Button variant="default" className="w-full justify-start">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* System Alerts */}
      <Card className="shadow-md border-warning">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            System Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4 p-3 bg-warning/10 rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{(analytics?.stats?.total_users || 0) - (analytics?.stats?.verified_users || 0)} users pending ID verification</div>
                <div className="text-sm text-muted-foreground">Some users have been waiting for more than 24 hours</div>
              </div>
              <Link to="/admin/verifications">
                <Button size="sm">
                  Review <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            
            <div className="flex items-start justify-between gap-4 p-3 bg-destructive/10 rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{analytics?.stats?.flagged_items || 0} items flagged for prohibited content</div>
                <div className="text-sm text-muted-foreground">AI has detected potential policy violations</div>
              </div>
              <Link to="/admin/moderation">
                <Button size="sm" variant="destructive">
                  Review <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
