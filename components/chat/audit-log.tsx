"use client"

import { useState, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { createClient } from "@/lib/supabase/client"
import { formatDistanceToNow } from "date-fns"
import { Shield, UserX, Ban, MessageSquareX, Clock, Settings, UserPlus } from "lucide-react"

interface AuditLogProps {
  serverId: string
  user: any
}

export function AuditLog({ serverId, user }: AuditLogProps) {
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAuditLogs()
  }, [serverId])

  const loadAuditLogs = async () => {
    const supabase = createClient()

    // Set user context for RLS
    await supabase.rpc("set_config", {
      parameter: "app.current_user_stack_id",
      value: user.stackUser.id,
    })

    const { data } = await supabase
      .from("audit_logs")
      .select(`
        *,
        users!audit_logs_user_id_fkey(username, display_name, avatar_url),
        target_users:users!audit_logs_target_user_id_fkey(username, display_name, avatar_url)
      `)
      .eq("server_id", serverId)
      .order("created_at", { ascending: false })
      .limit(50)

    setAuditLogs(data || [])
    setLoading(false)
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "kick":
        return <UserX className="w-4 h-4 text-orange-500" />
      case "ban":
        return <Ban className="w-4 h-4 text-red-500" />
      case "timeout":
        return <Clock className="w-4 h-4 text-yellow-500" />
      case "warn":
        return <MessageSquareX className="w-4 h-4 text-blue-500" />
      case "join":
        return <UserPlus className="w-4 h-4 text-green-500" />
      case "settings":
        return <Settings className="w-4 h-4 text-purple-500" />
      default:
        return <Shield className="w-4 h-4 text-slate-500" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "kick":
        return "bg-orange-500/20 text-orange-300"
      case "ban":
        return "bg-red-500/20 text-red-300"
      case "timeout":
        return "bg-yellow-500/20 text-yellow-300"
      case "warn":
        return "bg-blue-500/20 text-blue-300"
      case "join":
        return "bg-green-500/20 text-green-300"
      case "settings":
        return "bg-purple-500/20 text-purple-300"
      default:
        return "bg-slate-500/20 text-slate-300"
    }
  }

  const getActionDescription = (log: any) => {
    const moderator = log.users?.display_name || log.users?.username
    const target = log.target_users?.display_name || log.target_users?.username

    switch (log.action) {
      case "kick":
        return `${moderator} kicked ${target}`
      case "ban":
        return `${moderator} banned ${target}${log.duration ? ` for ${log.duration} minutes` : " permanently"}`
      case "timeout":
        return `${moderator} timed out ${target} for ${log.duration || "5"} minutes`
      case "warn":
        return `${moderator} warned ${target}`
      case "join":
        return `${target} joined the server`
      case "settings":
        return `${moderator} updated server settings`
      default:
        return `${moderator} performed ${log.action}`
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  if (loading) {
    return <div className="text-center py-8 text-slate-400">Loading audit log...</div>
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Audit Log</h3>
      <ScrollArea className="h-96">
        <div className="space-y-3">
          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No audit log entries found</p>
            </div>
          ) : (
            auditLogs.map((log) => (
              <Card key={log.id} className="bg-slate-800">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={log.users?.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback className="bg-indigo-600 text-white text-xs">
                        {getInitials(log.users?.display_name || log.users?.username || "U")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {getActionIcon(log.action)}
                        <Badge className={getActionColor(log.action)}>{log.action.toUpperCase()}</Badge>
                        <span className="text-xs text-slate-400">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                        </span>
                      </div>

                      <p className="text-sm text-white mb-1">{getActionDescription(log)}</p>

                      {log.reason && (
                        <p className="text-xs text-slate-400 bg-slate-700 rounded px-2 py-1">Reason: {log.reason}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
