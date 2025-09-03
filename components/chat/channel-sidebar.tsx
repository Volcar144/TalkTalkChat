"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Hash, Volume2, Plus, Search, Settings, MessageCircle, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { CreateChannelDialog } from "./create-channel-dialog"
import { ServerSettingsDialog } from "./server-settings-dialog"
import { InviteDialog } from "./invite-dialog"

interface ChannelSidebarProps {
  serverId: string | null
  selectedChannel: string | null
  onChannelSelect: (channelId: string | null) => void
  user: any
}

export function ChannelSidebar({ serverId, selectedChannel, onChannelSelect, user }: ChannelSidebarProps) {
  const [channels, setChannels] = useState<any[]>([])
  const [dmChannels, setDmChannels] = useState<any[]>([])
  const [server, setServer] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showServerSettings, setShowServerSettings] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  useEffect(() => {
    if (serverId) {
      loadServerChannels()
    } else {
      loadDMChannels()
    }
  }, [serverId])

  const loadServerChannels = async () => {
    if (!serverId) return

    const supabase = createClient()

    // Set user context for RLS
    await supabase.rpc("set_config", {
      parameter: "app.current_user_stack_id",
      value: user.stackUser.id,
    })

    // Load server info
    const { data: serverData } = await supabase.from("servers").select("*").eq("id", serverId).single()

    setServer(serverData)

    // Load channels
    const { data: channelsData } = await supabase
      .from("channels")
      .select("*")
      .eq("server_id", serverId)
      .order("position")

    setChannels(channelsData || [])
  }

  const loadDMChannels = async () => {
    const supabase = createClient()

    // Set user context for RLS
    await supabase.rpc("set_config", {
      parameter: "app.current_user_stack_id",
      value: user.stackUser.id,
    })

    const { data: dmData } = await supabase.from("dm_channels").select(`
        *,
        dm_participants(
          user_id,
          users(username, display_name, avatar_url, status)
        )
      `)

    setDmChannels(dmData || [])
  }

  const handleChannelCreated = () => {
    setShowCreateChannel(false)
    loadServerChannels()
  }

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "voice":
        return <Volume2 className="w-4 h-4" />
      default:
        return <Hash className="w-4 h-4" />
    }
  }

  if (!serverId) {
    // Direct Messages View
    return (
      <div className="w-60 bg-slate-700 flex flex-col">
        {/* Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-slate-600">
          <h2 className="font-semibold text-white">Direct Messages</h2>
          <Button variant="ghost" size="icon" className="w-6 h-6">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Find or start a conversation"
              className="pl-8 bg-slate-800 border-slate-600 text-white placeholder-slate-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* DM Channels */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {dmChannels.map((channel) => {
              const otherUser = channel.dm_participants?.find((p: any) => p.user_id !== user.id)?.users
              return (
                <Button
                  key={channel.id}
                  variant={selectedChannel === channel.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-600"
                  onClick={() => onChannelSelect(channel.id)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                      {otherUser?.avatar_url ? (
                        <img src={otherUser.avatar_url || "/placeholder.svg"} alt="" className="w-8 h-8 rounded-full" />
                      ) : (
                        <MessageCircle className="w-4 h-4" />
                      )}
                    </div>
                    <span className="truncate">{otherUser?.display_name || otherUser?.username}</span>
                  </div>
                </Button>
              )
            })}
          </div>
        </ScrollArea>
      </div>
    )
  }

  // Server Channels View
  return (
    <>
      <div className="w-60 bg-slate-700 flex flex-col">
        {/* Server Header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-slate-600">
          <h2 className="font-semibold text-white truncate">{server?.name}</h2>
          <div className="flex items-center space-x-1">
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setShowInviteDialog(true)}>
              <Users className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => setShowServerSettings(true)}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Channels */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {/* Text Channels */}
            <div className="mb-4">
              <div className="flex items-center justify-between px-2 py-1">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Text Channels</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-4 h-4 text-slate-400 hover:text-white"
                  onClick={() => setShowCreateChannel(true)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {channels
                  .filter((c) => c.type === "text")
                  .map((channel) => (
                    <Button
                      key={channel.id}
                      variant={selectedChannel === channel.id ? "secondary" : "ghost"}
                      className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-600"
                      onClick={() => onChannelSelect(channel.id)}
                    >
                      {getChannelIcon(channel.type)}
                      <span className="ml-2 truncate">{channel.name}</span>
                    </Button>
                  ))}
              </div>
            </div>

            {/* Voice Channels */}
            <div>
              <div className="flex items-center justify-between px-2 py-1">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Voice Channels</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-4 h-4 text-slate-400 hover:text-white"
                  onClick={() => setShowCreateChannel(true)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <div className="space-y-1">
                {channels
                  .filter((c) => c.type === "voice")
                  .map((channel) => (
                    <Button
                      key={channel.id}
                      variant={selectedChannel === channel.id ? "secondary" : "ghost"}
                      className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-600"
                      onClick={() => onChannelSelect(channel.id)}
                    >
                      {getChannelIcon(channel.type)}
                      <span className="ml-2 truncate">{channel.name}</span>
                    </Button>
                  ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      <CreateChannelDialog
        open={showCreateChannel}
        onOpenChange={setShowCreateChannel}
        onChannelCreated={handleChannelCreated}
        serverId={serverId}
        user={user}
      />

      <ServerSettingsDialog
        open={showServerSettings}
        onOpenChange={setShowServerSettings}
        server={server}
        user={user}
      />

      <InviteDialog open={showInviteDialog} onOpenChange={setShowInviteDialog} serverId={serverId} user={user} />
    </>
  )
}
