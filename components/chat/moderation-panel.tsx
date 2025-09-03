"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { Shield, UserX, Ban, MessageSquareX, Clock } from "lucide-react"

interface ModerationPanelProps {
  serverId: string
  user: any
}

export function ModerationPanel({ serverId, user }: ModerationPanelProps) {
  const [members, setMembers] = useState<any[]>([])
  const [selectedMember, setSelectedMember] = useState<any>(null)
  const [moderationAction, setModerationAction] = useState("")
  const [reason, setReason] = useState("")
  const [duration, setDuration] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadMembers()
  }, [serverId])

  const loadMembers = async () => {
    const supabase = createClient()

    // Set user context for RLS
    await supabase.rpc("set_config", {
      parameter: "app.current_user_stack_id",
      value: user.stackUser.id,
    })

    const { data } = await supabase
      .from("server_members")
      .select(`
        *,
        users(id, username, display_name, avatar_url, status),
        member_roles(
          role_id,
          roles(name, color, permissions)
        )
      `)
      .eq("server_id", serverId)

    setMembers(data || [])
  }

  const executeModerationAction = async () => {
    if (!selectedMember || !moderationAction || !reason.trim()) return

    setLoading(true)
    const supabase = createClient()

    try {
      // Set user context for RLS
      await supabase.rpc("set_config", {
        parameter: "app.current_user_stack_id",
        value: user.stackUser.id,
      })

      // Log the moderation action
      await supabase.from("audit_logs").insert({
        server_id: serverId,
        user_id: user.id,
        target_user_id: selectedMember.user_id,
        action: moderationAction,
        reason: reason.trim(),
        duration: duration || null,
      })

      // Execute the action based on type
      switch (moderationAction) {
        case "kick":
          await supabase.from("server_members").delete().eq("server_id", serverId).eq("user_id", selectedMember.user_id)
          break

        case "ban":
          // Remove from server and add to ban list
          await supabase.from("server_members").delete().eq("server_id", serverId).eq("user_id", selectedMember.user_id)

          await supabase.from("server_bans").insert({
            server_id: serverId,
            user_id: selectedMember.user_id,
            banned_by: user.id,
            reason: reason.trim(),
            expires_at: duration ? new Date(Date.now() + Number.parseInt(duration) * 60000).toISOString() : null,
          })
          break

        case "timeout":
          // Implement timeout logic
          await supabase.from("server_timeouts").insert({
            server_id: serverId,
            user_id: selectedMember.user_id,
            timeout_by: user.id,
            reason: reason.trim(),
            expires_at: new Date(Date.now() + Number.parseInt(duration || "5") * 60000).toISOString(),
          })
          break
      }

      // Reset form
      setSelectedMember(null)
      setModerationAction("")
      setReason("")
      setDuration("")
      loadMembers()
    } catch (error) {
      console.error("Error executing moderation action:", error)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const getHighestRole = (memberRoles: any[]) => {
    if (!memberRoles || memberRoles.length === 0) return null
    return memberRoles.reduce((highest, current) => {
      return current.roles?.position > (highest?.roles?.position || 0) ? current : highest
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Member List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Server Members</h3>
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {members.map((member) => {
              const highestRole = getHighestRole(member.member_roles)
              return (
                <Card
                  key={member.id}
                  className={`cursor-pointer transition-colors ${
                    selectedMember?.id === member.id ? "bg-slate-700" : "bg-slate-800 hover:bg-slate-700"
                  }`}
                  onClick={() => setSelectedMember(member)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={member.users?.avatar_url || "/placeholder.svg"} />
                        <AvatarFallback className="bg-indigo-600 text-white">
                          {getInitials(member.users?.display_name || member.users?.username || "U")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium truncate">
                            {member.nickname || member.users?.display_name || member.users?.username}
                          </span>
                          {highestRole && (
                            <Badge
                              variant="secondary"
                              className="text-xs"
                              style={{ backgroundColor: highestRole.roles?.color }}
                            >
                              {highestRole.roles?.name}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-400">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Moderation Actions */}
      <div className="space-y-4">
        {selectedMember ? (
          <>
            <div className="flex items-center space-x-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={selectedMember.users?.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="bg-indigo-600 text-white">
                  {getInitials(selectedMember.users?.display_name || selectedMember.users?.username || "U")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">
                  {selectedMember.nickname || selectedMember.users?.display_name || selectedMember.users?.username}
                </h3>
                <p className="text-sm text-slate-400">@{selectedMember.users?.username}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Moderation Action</Label>
                <Select value={moderationAction} onValueChange={setModerationAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kick">
                      <div className="flex items-center space-x-2">
                        <UserX className="w-4 h-4" />
                        <span>Kick Member</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="ban">
                      <div className="flex items-center space-x-2">
                        <Ban className="w-4 h-4" />
                        <span>Ban Member</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="timeout">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>Timeout Member</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="warn">
                      <div className="flex items-center space-x-2">
                        <MessageSquareX className="w-4 h-4" />
                        <span>Warn Member</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(moderationAction === "ban" || moderationAction === "timeout") && (
                <div className="space-y-2">
                  <Label>Duration (minutes)</Label>
                  <Input
                    type="number"
                    placeholder={moderationAction === "ban" ? "Leave empty for permanent" : "5"}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Reason for this action..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                onClick={executeModerationAction}
                disabled={!moderationAction || !reason.trim() || loading}
                variant="destructive"
                className="w-full"
              >
                {loading
                  ? "Executing..."
                  : `${moderationAction.charAt(0).toUpperCase() + moderationAction.slice(1)} Member`}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Select a member to moderate</p>
          </div>
        )}
      </div>
    </div>
  )
}
