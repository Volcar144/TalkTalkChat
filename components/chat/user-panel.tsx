"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings, Mic, MicOff, Headphones, HeadphonesIcon, LogOut, User } from "lucide-react"
import { useStackApp } from "@stackframe/stack"
import { UserProfileDialog } from "@/components/profile/user-profile-dialog"
import { UserStatusIndicator } from "./user-status-indicator"

interface UserPanelProps {
  user: any
}

export function UserPanel({ user }: UserPanelProps) {
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const stackApp = useStackApp()

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  const handleSignOut = async () => {
    await stackApp.signOut()
  }

  return (
    <>
      <div className="h-14 bg-slate-800 border-t border-slate-600 flex items-center justify-between px-2">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <UserStatusIndicator
            userId={user.id}
            username={user.username}
            displayName={user.display_name}
            avatarUrl={user.avatar_url}
            size="md"
            onClick={() => setShowProfileDialog(true)}
          />

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.display_name || user.username}</p>
            <p className="text-xs text-slate-400 truncate">{user.custom_status || "Online"}</p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setIsMuted(!isMuted)}>
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>

          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setIsDeafened(!isDeafened)}>
            {isDeafened ? <HeadphonesIcon className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
                <User className="w-4 h-4 mr-2" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                User Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-400">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <UserProfileDialog open={showProfileDialog} onOpenChange={setShowProfileDialog} />
    </>
  )
}
