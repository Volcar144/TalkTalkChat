"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Plus, Code, BarChart3, Play, Pause, Trash2, Zap } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/client"
import { useUser } from "@stackframe/stack"
import { BotBuilder } from "./bot-builder"
import { BotAnalytics } from "./bot-analytics"

interface BotManagerProps {
  serverId?: string
}

export function BotManager({ serverId }: BotManagerProps) {
  const user = useUser()
  const supabase = createBrowserClient()
  const [bots, setBots] = useState<any[]>([])
  const [selectedBot, setSelectedBot] = useState<any | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showBuilderDialog, setShowBuilderDialog] = useState(false)
  const [showAnalyticsDialog, setShowAnalyticsDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")

  // New bot form state
  const [newBot, setNewBot] = useState({
    name: "",
    description: "",
    avatar_url: "",
    command_prefix: "!",
    is_public: false,
  })

  useEffect(() => {
    if (user) {
      fetchBots()
    }
  }, [user])

  const fetchBots = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("bots")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching bots:", error)
        return
      }

      setBots(data || [])
    } catch (error) {
      console.error("Error fetching bots:", error)
    } finally {
      setLoading(false)
    }
  }

  const createBot = async () => {
    if (!user || !newBot.name.trim()) return

    setLoading(true)
    try {
      // Generate bot token
      const token = `bot_${Date.now()}_${Math.random().toString(36).substring(2)}`

      const { data, error } = await supabase
        .from("bots")
        .insert({
          ...newBot,
          token,
          owner_id: user.id,
          avatar_url:
            newBot.avatar_url ||
            `/placeholder.svg?height=64&width=64&query=${encodeURIComponent(newBot.name + " bot avatar")}`,
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating bot:", error)
        return
      }

      setBots([data, ...bots])
      setShowCreateDialog(false)
      setNewBot({
        name: "",
        description: "",
        avatar_url: "",
        command_prefix: "!",
        is_public: false,
      })
    } catch (error) {
      console.error("Error creating bot:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateBotStatus = async (botId: string, status: "online" | "offline" | "maintenance") => {
    try {
      const { error } = await supabase.from("bots").update({ status }).eq("id", botId)

      if (error) {
        console.error("Error updating bot status:", error)
        return
      }

      setBots(bots.map((bot) => (bot.id === botId ? { ...bot, status } : bot)))
    } catch (error) {
      console.error("Error updating bot status:", error)
    }
  }

  const deleteBot = async (botId: string) => {
    if (!confirm("Are you sure you want to delete this bot? This action cannot be undone.")) {
      return
    }

    try {
      const { error } = await supabase.from("bots").delete().eq("id", botId)

      if (error) {
        console.error("Error deleting bot:", error)
        return
      }

      setBots(bots.filter((bot) => bot.id !== botId))
      setSelectedBot(null)
    } catch (error) {
      console.error("Error deleting bot:", error)
    }
  }

  const copyToken = (token: string) => {
    navigator.clipboard.writeText(token)
    // You could add a toast notification here
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "offline":
        return "bg-gray-500"
      case "maintenance":
        return "bg-yellow-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "online":
        return "Online"
      case "offline":
        return "Offline"
      case "maintenance":
        return "Maintenance"
      default:
        return "Unknown"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bot Manager</h2>
          <p className="text-muted-foreground">Create and manage your custom bots</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Bot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Bot</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bot-name">Bot Name</Label>
                <Input
                  id="bot-name"
                  value={newBot.name}
                  onChange={(e) => setNewBot({ ...newBot, name: e.target.value })}
                  placeholder="My Awesome Bot"
                />
              </div>

              <div>
                <Label htmlFor="bot-description">Description</Label>
                <Textarea
                  id="bot-description"
                  value={newBot.description}
                  onChange={(e) => setNewBot({ ...newBot, description: e.target.value })}
                  placeholder="What does your bot do?"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="bot-prefix">Command Prefix</Label>
                <Input
                  id="bot-prefix"
                  value={newBot.command_prefix}
                  onChange={(e) => setNewBot({ ...newBot, command_prefix: e.target.value })}
                  placeholder="!"
                  maxLength={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="bot-public"
                  checked={newBot.is_public}
                  onCheckedChange={(checked) => setNewBot({ ...newBot, is_public: checked })}
                />
                <Label htmlFor="bot-public">Make bot public</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createBot} disabled={loading || !newBot.name.trim()}>
                  {loading ? "Creating..." : "Create Bot"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Bot List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bots.map((bot) => (
          <Card key={bot.id} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={bot.avatar_url || "/placeholder.svg"} />
                    <AvatarFallback>
                      <Zap className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-background ${getStatusColor(bot.status)}`}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{bot.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {getStatusLabel(bot.status)}
                    </Badge>
                    {bot.is_verified && (
                      <Badge variant="default" className="text-xs">
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {bot.description || "No description provided"}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedBot(bot)
                      setShowBuilderDialog(true)
                    }}
                  >
                    <Code className="h-4 w-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedBot(bot)
                      setShowAnalyticsDialog(true)
                    }}
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateBotStatus(bot.id, bot.status === "online" ? "offline" : "online")}
                  >
                    {bot.status === "online" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>

                <Button size="sm" variant="destructive" onClick={() => deleteBot(bot.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bots.length === 0 && !loading && (
        <Card className="text-center py-12">
          <CardContent>
            <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No bots yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first bot to get started with automation and custom commands.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Bot
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bot Builder Dialog */}
      {selectedBot && (
        <BotBuilder
          open={showBuilderDialog}
          onOpenChange={setShowBuilderDialog}
          bot={selectedBot}
          onBotUpdate={(updatedBot) => {
            setBots(bots.map((bot) => (bot.id === updatedBot.id ? updatedBot : bot)))
            setSelectedBot(updatedBot)
          }}
        />
      )}

      {/* Bot Analytics Dialog */}
      {selectedBot && (
        <BotAnalytics open={showAnalyticsDialog} onOpenChange={setShowAnalyticsDialog} bot={selectedBot} />
      )}
    </div>
  )
}
