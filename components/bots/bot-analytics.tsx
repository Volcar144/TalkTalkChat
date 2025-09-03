"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, TrendingUp, Users, Zap, Clock, AlertCircle } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"

interface BotAnalyticsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bot: any
}

export function BotAnalytics({ open, onOpenChange, bot }: BotAnalyticsProps) {
  const supabase = createBrowserClient()
  const [analytics, setAnalytics] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalCommands: 0,
    successRate: 0,
    avgExecutionTime: 0,
    activeServers: 0,
    topCommands: [],
  })
  const [timeRange, setTimeRange] = useState("7d")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && bot) {
      fetchAnalytics()
    }
  }, [open, bot, timeRange])

  const fetchAnalytics = async () => {
    if (!bot) return

    setLoading(true)
    try {
      const endDate = new Date()
      const startDate = new Date()

      switch (timeRange) {
        case "24h":
          startDate.setHours(startDate.getHours() - 24)
          break
        case "7d":
          startDate.setDate(startDate.getDate() - 7)
          break
        case "30d":
          startDate.setDate(startDate.getDate() - 30)
          break
        case "90d":
          startDate.setDate(startDate.getDate() - 90)
          break
      }

      // Fetch analytics data
      const { data: analyticsData, error } = await supabase
        .from("bot_analytics")
        .select("*")
        .eq("bot_id", bot.id)
        .gte("executed_at", startDate.toISOString())
        .lte("executed_at", endDate.toISOString())
        .order("executed_at", { ascending: false })

      if (error) {
        console.error("Error fetching analytics:", error)
        return
      }

      setAnalytics(analyticsData || [])

      // Calculate stats
      const totalCommands = analyticsData?.length || 0
      const successfulCommands = analyticsData?.filter((a) => a.success).length || 0
      const successRate = totalCommands > 0 ? (successfulCommands / totalCommands) * 100 : 0

      const avgExecutionTime =
        totalCommands > 0 ? analyticsData?.reduce((sum, a) => sum + (a.execution_time || 0), 0) / totalCommands : 0

      const uniqueServers = new Set(analyticsData?.map((a) => a.server_id).filter(Boolean)).size

      // Top commands
      const commandCounts =
        analyticsData?.reduce(
          (acc, a) => {
            if (a.command_name) {
              acc[a.command_name] = (acc[a.command_name] || 0) + 1
            }
            return acc
          },
          {} as Record<string, number>,
        ) || {}

      const topCommands = Object.entries(commandCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))

      setStats({
        totalCommands,
        successRate,
        avgExecutionTime,
        activeServers: uniqueServers,
        topCommands,
      })
    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return "text-green-500"
    if (rate >= 85) return "text-yellow-500"
    return "text-red-500"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics - {bot?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Time Range Selector */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Performance Overview</h3>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Zap className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.totalCommands}</p>
                    <p className="text-xs text-muted-foreground">Commands Executed</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className={`h-5 w-5 ${getSuccessRateColor(stats.successRate)}`} />
                  <div>
                    <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Success Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{formatDuration(stats.avgExecutionTime)}</p>
                    <p className="text-xs text-muted-foreground">Avg Response Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-2xl font-bold">{stats.activeServers}</p>
                    <p className="text-xs text-muted-foreground">Active Servers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Commands */}
          <Card>
            <CardHeader>
              <CardTitle>Top Commands</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.topCommands.length > 0 ? (
                <div className="space-y-2">
                  {stats.topCommands.map((command, index) => (
                    <div key={command.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <span className="font-medium">
                          {bot.command_prefix}
                          {command.name}
                        </span>
                      </div>
                      <Badge>{command.count} uses</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No command usage data available</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {analytics.length > 0 ? (
                  <div className="space-y-2">
                    {analytics.slice(0, 20).map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center space-x-2">
                          {activity.success ? (
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-medium">
                            {bot.command_prefix}
                            {activity.command_name}
                          </span>
                          {activity.execution_time && (
                            <Badge variant="secondary">{formatDuration(activity.execution_time)}</Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.executed_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No recent activity</p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
