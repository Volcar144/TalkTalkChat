"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Hash, MessageCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { CreateServerDialog } from "./create-server-dialog"
import { JoinServerDialog } from "./join-server-dialog"

interface ServerSidebarProps {
  selectedServer: string | null
  onServerSelect: (serverId: string | null) => void
  user: any
}

export function ServerSidebar({ selectedServer, onServerSelect, user }: ServerSidebarProps) {
  const [servers, setServers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showJoinDialog, setShowJoinDialog] = useState(false)

  useEffect(() => {
    loadServers()
  }, [])

  const loadServers = async () => {
    const supabase = createClient()

    // Set user context for RLS
    await supabase.rpc("set_config", {
      parameter: "app.current_user_stack_id",
      value: user.stackUser.id,
    })

    const { data: servers } = await supabase
      .from("servers")
      .select(`
        *,
        server_members!inner(user_id)
      `)
      .eq("server_members.user_id", user.id)

    setServers(servers || [])
    setLoading(false)
  }

  const handleServerCreated = () => {
    setShowCreateDialog(false)
    loadServers()
  }

  const handleServerJoined = () => {
    setShowJoinDialog(false)
    loadServers()
  }

  return (
    <>
      <div className="w-18 bg-slate-800 flex flex-col items-center py-3 space-y-2">
        <TooltipProvider>
          {/* Direct Messages */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={selectedServer === null ? "default" : "ghost"}
                size="icon"
                className="w-12 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 hover:rounded-xl transition-all duration-200"
                onClick={() => onServerSelect(null)}
              >
                <MessageCircle className="w-6 h-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Direct Messages</p>
            </TooltipContent>
          </Tooltip>

          <div className="w-8 h-0.5 bg-slate-600 rounded-full" />

          {/* Server List */}
          <ScrollArea className="flex-1 w-full">
            <div className="space-y-2 px-3">
              {servers.map((server) => (
                <Tooltip key={server.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={selectedServer === server.id ? "default" : "ghost"}
                      size="icon"
                      className="w-12 h-12 rounded-2xl hover:rounded-xl transition-all duration-200 bg-slate-700 hover:bg-slate-600"
                      onClick={() => onServerSelect(server.id)}
                    >
                      {server.icon_url ? (
                        <img
                          src={server.icon_url || "/placeholder.svg"}
                          alt={server.name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <Hash className="w-6 h-6" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{server.name}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </ScrollArea>

          {/* Add Server Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-12 h-12 rounded-2xl hover:rounded-xl transition-all duration-200 bg-slate-700 hover:bg-green-600 text-green-400 hover:text-white"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="w-6 h-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add a Server</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <CreateServerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onServerCreated={handleServerCreated}
        user={user}
      />

      <JoinServerDialog
        open={showJoinDialog}
        onOpenChange={setShowJoinDialog}
        onServerJoined={handleServerJoined}
        user={user}
      />
    </>
  )
}
