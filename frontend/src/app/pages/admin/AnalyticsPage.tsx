import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { 
  Users,
  ShoppingBag,
  TrendingUp,
  Award,
  MapPin,
  Loader2
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { adminApi } from "../../services/api";

const CAMPUS_COLORS = ["#1A5F3F", "#F4B942", "#8B2635", "#4CAF50", "#2196F3", "#9C27B0"];

export function AnalyticsPage() {
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

  // Static demo data (not available from API)
  const userGrowthData = [
    { month: "Sep", users: 1200, active: 980 },
    { month: "Oct", users: 1450, active: 1150 },
    { month: "Nov", users: 1720, active: 1380 },
    { month: "Dec", users: 2100, active: 1650 },
    { month: "Jan", users: 2350, active: 1890 },
    { month: "Feb", users: 2600, active: 2100 },
    { month: "Mar", users: analytics?.stats?.total_users || 2847, active: analytics?.stats?.verified_users || 2280 },
  ];

  const participationData = [
    { week: "Week 1", donors: 45, receivers: 38 },
    { week: "Week 2", donors: 52, receivers: 47 },
    { week: "Week 3", donors: 61, receivers: 54 },
    { week: "Week 4", donors: 58, receivers: 51 },
  ];

  // API-driven data
  const transactionData = analytics?.monthly_transactions || [];
  const categoryData = analytics?.category_distribution || [];
  const campusBreakdown = (analytics?.campus_activity || []).map((c: any, i: number) => ({
    name: c.campus,
    value: c.count,
    color: CAMPUS_COLORS[i % CAMPUS_COLORS.length],
  }));

  const totalTransactions = campusBreakdown.reduce((sum: number, c: any) => sum + c.value, 0) || 1;

  const stats = [
    {
      title: "Total Users",
      value: analytics?.stats?.total_users?.toLocaleString() || '0',
      change: `${analytics?.stats?.verified_users || 0} verified`,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Total Transactions",
      value: analytics?.stats?.total_transactions?.toLocaleString() || '0',
      change: `${analytics?.stats?.completed_transactions || 0} completed`,
      icon: ShoppingBag,
      color: "text-success",
    },
    {
      title: "Active Items",
      value: analytics?.stats?.active_items?.toLocaleString() || '0',
      change: `${analytics?.stats?.total_items || 0} total items`,
      icon: TrendingUp,
      color: "text-warning",
    },
    {
      title: "Flagged Items",
      value: String(analytics?.stats?.flagged_items || 0),
      change: "Review needed",
      icon: Award,
      color: "text-accent",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into platform performance
          </p>
        </div>
        <Select defaultValue="7days">
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 days</SelectItem>
            <SelectItem value="30days">Last 30 days</SelectItem>
            <SelectItem value="3months">Last 3 months</SelectItem>
            <SelectItem value="6months">Last 6 months</SelectItem>
            <SelectItem value="1year">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
              <div className="text-2xl font-bold mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground mb-1">{stat.title}</div>
              <div className="text-xs text-success">{stat.change}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="growth" className="space-y-6">
        <TabsList>
          <TabsTrigger value="growth">User Growth</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="campus">Campus Activity</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        {/* User Growth */}
        <TabsContent value="growth">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-md">
              <CardHeader>
                <CardTitle>User Growth Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={userGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#1A5F3F" 
                      strokeWidth={2} 
                      name="Total Users"
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="active" 
                      stroke="#F4B942" 
                      strokeWidth={2} 
                      name="Active Users"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Weekly Participation</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={participationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="donors" fill="#1A5F3F" name="Donors" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="receivers" fill="#F4B942" name="Receivers" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Transactions */}
        <TabsContent value="transactions">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Transaction Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={transactionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#1A5F3F" 
                    strokeWidth={3} 
                    name="Completed Transactions"
                    dot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campus Activity */}
        <TabsContent value="campus">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Campus Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={campusBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {campusBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Campus Activity Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {campusBreakdown.map((campus, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" style={{ color: campus.color }} />
                          <span className="font-medium">{campus.name}</span>
                        </div>
                        <span className="font-semibold">{campus.value} transactions</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full transition-all duration-500"
                          style={{ 
                            width: `${(campus.value / totalTransactions) * 100}%`,
                            backgroundColor: campus.color 
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Popular Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="category" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1A5F3F" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
