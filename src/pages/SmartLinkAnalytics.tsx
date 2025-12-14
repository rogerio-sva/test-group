import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSmartLinks } from "@/hooks/use-campaigns";
import { useSmartLinkAnalytics } from "@/hooks/use-smart-link-analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";
import { MousePointerClick, Smartphone, Globe, TrendingUp, Calendar } from "lucide-react";

const DEVICE_COLORS = [
  "hsl(142, 70%, 49%)",  // primary green
  "hsl(200, 70%, 50%)",  // blue
  "hsl(280, 60%, 55%)",  // purple
  "hsl(40, 80%, 50%)",   // orange
  "hsl(0, 70%, 55%)",    // red
];

const REFERRER_COLORS = [
  "hsl(142, 70%, 49%)",
  "hsl(160, 60%, 45%)",
  "hsl(180, 50%, 45%)",
  "hsl(200, 60%, 50%)",
  "hsl(220, 55%, 55%)",
  "hsl(240, 50%, 55%)",
  "hsl(260, 50%, 55%)",
  "hsl(280, 50%, 55%)",
  "hsl(300, 45%, 55%)",
  "hsl(320, 45%, 55%)",
];

export default function SmartLinkAnalytics() {
  const [selectedLinkId, setSelectedLinkId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  
  const { data: smartLinks, isLoading: isLoadingLinks } = useSmartLinks();
  const { data: analytics, isLoading: isLoadingAnalytics } = useSmartLinkAnalytics(
    selectedLinkId === "all" ? undefined : selectedLinkId,
    parseInt(dateRange)
  );

  const isLoading = isLoadingLinks || isLoadingAnalytics;

  return (
    <MainLayout 
      title="Analytics de Smart Links" 
      subtitle="Visualize métricas de cliques, dispositivos e origens dos seus links"
    >
      <div className="space-y-6">
        {/* Filters */}
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Smart Link
                </label>
                <Select value={selectedLinkId} onValueChange={setSelectedLinkId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um link" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Links</SelectItem>
                    {smartLinks?.map((link) => (
                      <SelectItem key={link.id} value={link.id}>
                        {link.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-[180px]">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Período
                </label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="14">Últimos 14 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="60">Últimos 60 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <MousePointerClick className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Cliques</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-bold">{analytics?.totalClicks || 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                  <Calendar className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Média/Dia</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-bold">
                      {analytics?.totalClicks 
                        ? (analytics.totalClicks / parseInt(dateRange)).toFixed(1) 
                        : 0}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
                  <Smartphone className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dispositivos</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-bold">{analytics?.clicksByDevice?.length || 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
                  <Globe className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Origens</p>
                  {isLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-bold">{analytics?.clicksByReferrer?.length || 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Clicks by Day Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Cliques por Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : analytics?.clicksByDay && analytics.clicksByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.clicksByDay}>
                  <defs>
                    <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 70%, 49%)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(142, 70%, 49%)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="clicks"
                    stroke="hsl(142, 70%, 49%)"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorClicks)"
                    name="Cliques"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                Nenhum dado disponível para o período selecionado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device and Referrer Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Device Chart */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-purple-500" />
                Cliques por Dispositivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : analytics?.clicksByDevice && analytics.clicksByDevice.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.clicksByDevice}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ device, percent }) => `${device} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="clicks"
                      nameKey="device"
                    >
                      {analytics.clicksByDevice.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referrer Chart */}
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-orange-500" />
                Cliques por Origem
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : analytics?.clicksByReferrer && analytics.clicksByReferrer.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.clicksByReferrer} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      type="number" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      dataKey="referrer" 
                      type="category"
                      width={100}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar 
                      dataKey="clicks" 
                      name="Cliques"
                      radius={[0, 4, 4, 0]}
                    >
                      {analytics.clicksByReferrer.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={REFERRER_COLORS[index % REFERRER_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  Nenhum dado disponível
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Detailed Table */}
        {analytics?.clicksByDevice && analytics.clicksByDevice.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Detalhamento por Dispositivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Dispositivo</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Cliques</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Porcentagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.clicksByDevice.map((item, index) => (
                      <tr key={item.device} className="border-b border-border last:border-0">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div 
                              className="h-3 w-3 rounded-full" 
                              style={{ backgroundColor: DEVICE_COLORS[index % DEVICE_COLORS.length] }}
                            />
                            {item.device}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">{item.clicks}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {((item.clicks / (analytics.totalClicks || 1)) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
