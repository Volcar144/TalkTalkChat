"use client"

import { useState, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { UserStatusIndicator } from "./user-status-indicator"
import { UserProfileDialog } from "@/components/profile/user-profile-dialog"
import { createBrowserClient } from "@/lib/supabase/client"

interface MemberListProps {
  serverId: string
  channelId: string | null
}

export function MemberList({ serverId, channelId }: MemberListProps) {
  const [members, setMembers] = useState<any[]>([])
  const [onlineMembers, setOnlineMembers] = useState<any[]>([])
  const [offlineMembers, setOfflineMembers] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [showProfileDialog, setShowProfileDialog] = useState(false)

  useEffect(() => {
    loadMembers()
  }, [serverId])

  const loadMembers = async () => {
    if (!serverId) return

    const supabase = createBrowserClient()

    const { data: membersData } = await supabase
      .from("server_members")
      .select(`
        *,
        user_profiles!inner(
          id,
          username,
          display_name,
          avatar_url,
          status,
          custom_status
        ),
        member_roles(
          role_id,
          roles(name, color)
        )
      `)
      .eq("server_id", serverId)

    const members = membersData || []
    setMembers(members)

    // Separate online and offline members
    const online = members.filter(
      (m) =>
        m.user_profiles?.status === "online" || m.user_profiles?.status === "idle" || m.user_profiles?.status === "dnd",
    )
    const offline = members.filter((m) => m.user_profiles?.status === "invisible" || !m.user_profiles?.status)

    setOnlineMembers(online)
    setOfflineMembers(offline)
  }

  const handleMemberClick = (userId: string) => {
    setSelectedUserId(userId)
    setShowProfileDialog(true)
  }

  const renderMemberSection = (title: string, members: any[]) => {
    if (members.length === 0) return null

    return (
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-2 mb-2">
          {title} — {members.length}
        </h3>
        <div className="space-y-1">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center space-x-3 px-2 py-1 rounded hover:bg-slate-600/50 cursor-pointer"
              onClick={() => handleMemberClick(member.user_id)}
            >
              <UserStatusIndicator
                userId={member.user_id}
                username={member.user_profiles?.username}
                displayName={member.user_profiles?.display_name}
                avatarUrl={member.user_profiles?.avatar_url}
                size="sm"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-white truncate">
                    {member.nickname || member.user_profiles?.display_name || member.user_profiles?.username}
                  </span>
                  {member.member_roles?.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="text-xs"
                      style={{ backgroundColor: member.member_roles[0].roles?.color }}
                    >
                      {member.member_roles[0].roles?.name}
                    </Badge>
                  )}
                </div>
                {member.user_profiles?.custom_status && (
                  <p className="text-xs text-slate-400 truncate">{member.user_profiles.custom_status}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="w-60 bg-slate-700 border-l border-slate-600">
        <ScrollArea className="h-full p-3">
          {renderMemberSection("Online", onlineMembers)}
          {renderMemberSection("Offline", offlineMembers)}
        </ScrollArea>
      </div>

      <UserProfileDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        userId={selectedUserId || undefined}
      />
    </>
  )
}
