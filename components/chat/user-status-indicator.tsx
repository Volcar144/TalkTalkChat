"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { createClient as createBrowserClient } from "@/lib/supabase/client"

interface UserStatusIndicatorProps {
  userId: string
  username?: string
  displayName?: string
  avatarUrl?: string
  showStatus?: boolean
  size?: "sm" | "md" | "lg"
  onClick?: () => void
}

interface UserStatus {
  status: "online" | "idle" | "dnd" | "invisible"
  custom_status: string
  display_name: string
  avatar_url: string
}

const statusColors = {
  online: "bg-green-500",
  idle: "bg-yellow-500",
  dnd: "bg-red-500",
  invisible: "bg-gray-500",
}

const statusLabels = {
  online: "Online",
  idle: "Idle",
  dnd: "Do Not Disturb",
  invisible: "Invisible",
}

const sizeClasses = {
  sm: "h-6 w-6",
  md: "h-8 w-8",
  lg: "h-12 w-12",
}

const indicatorSizes = {
  sm: "h-2 w-2",
  md: "h-3 w-3",
  lg: "h-4 w-4",
}

export function UserStatusIndicator({
  userId,
  username,
  displayName,
  avatarUrl,
  showStatus = true,
  size = "md",
  onClick,
}: UserStatusIndicatorProps) {
  const [userStatus, setUserStatus] = useState<UserStatus | null>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    fetchUserStatus()

    // Subscribe to real-time status updates
    const channel = supabase
      .channel("user-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            setUserStatus({
              status: payload.new.status,
              custom_status: payload.new.custom_status,
              display_name: payload.new.display_name,
              avatar_url: payload.new.avatar_url,
            })
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const fetchUserStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("status, custom_status, display_name, avatar_url")
        .eq("id", userId)
        .single()

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user status:", error)
        return
      }

      if (data) {
        setUserStatus(data)
      }
    } catch (error) {
      console.error("Error fetching user status:", error)
    }
  }

  const currentDisplayName = userStatus?.display_name || displayName || username || "User"
  const currentAvatarUrl = userStatus?.avatar_url || avatarUrl
  const status = userStatus?.status || "offline"

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`relative cursor-pointer ${onClick ? "hover:opacity-80" : ""}`} onClick={onClick}>
            <Avatar className={sizeClasses[size]}>
              <AvatarImage src={currentAvatarUrl || "/placeholder.svg"} />
              <AvatarFallback className="text-xs">{currentDisplayName.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>

            {showStatus && status !== "invisible" && (
              <div
                className={`absolute -bottom-0.5 -right-0.5 ${indicatorSizes[size]} rounded-full border-2 border-background ${statusColors[status]}`}
              />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${statusColors[status]}`} />
              <span className="font-medium">{currentDisplayName}</span>
            </div>
            <div className="text-xs text-muted-foreground">{statusLabels[status]}</div>
            {userStatus?.custom_status && <div className="text-xs">{userStatus.custom_status}</div>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
