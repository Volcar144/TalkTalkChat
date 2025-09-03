"use client"

import { useState } from "react"
import { ServerSidebar } from "./server-sidebar"
import { ChannelSidebar } from "./channel-sidebar"
import { ChatArea } from "./chat-area"
import { MemberList } from "./member-list"
import { UserPanel } from "./user-panel"

interface ChatLayoutProps {
  user: any
}

export function ChatLayout({ user }: ChatLayoutProps) {
  const [selectedServer, setSelectedServer] = useState<string | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
  const [showMemberList, setShowMemberList] = useState(true)

  return (
    <div className="h-screen bg-slate-900 flex">
      {/* Server Sidebar */}
      <ServerSidebar selectedServer={selectedServer} onServerSelect={setSelectedServer} user={user} />

      {/* Channel Sidebar */}
      <ChannelSidebar
        serverId={selectedServer}
        selectedChannel={selectedChannel}
        onChannelSelect={setSelectedChannel}
        user={user}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatArea
          channelId={selectedChannel}
          serverId={selectedServer}
          user={user}
          onToggleMemberList={() => setShowMemberList(!showMemberList)}
        />
      </div>

      {/* Member List */}
      {showMemberList && selectedServer && <MemberList serverId={selectedServer} channelId={selectedChannel} />}

      {/* User Panel */}
      <UserPanel user={user} />
    </div>
  )
}
