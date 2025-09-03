"use client"

import { formatDistanceToNow } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Reply, Smile } from "lucide-react"

interface MessageListProps {
  messages: any[]
  currentUser: any
}

export function MessageList({ messages, currentUser }: MessageListProps) {
  const formatTime = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const prevMessage = messages[index - 1]
        const isGrouped =
          prevMessage &&
          prevMessage.author_id === message.author_id &&
          new Date(message.created_at).getTime() - new Date(prevMessage.created_at).getTime() < 300000 // 5 minutes

        return (
          <div key={message.id} className="group hover:bg-slate-700/30 px-4 py-1 -mx-4 rounded">
            {message.reply_to_id && (
              <div className="flex items-center space-x-2 mb-2 text-sm text-slate-400">
                <Reply className="w-3 h-3" />
                <span>Replying to {message.reply_to?.users?.display_name || message.reply_to?.users?.username}</span>
                <span className="truncate max-w-xs">{message.reply_to?.content}</span>
              </div>
            )}

            <div className="flex space-x-3">
              {!isGrouped && (
                <Avatar className="w-10 h-10">
                  <AvatarImage src={message.users?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback className="bg-indigo-600 text-white">
                    {getInitials(message.users?.display_name || message.users?.username || "U")}
                  </AvatarFallback>
                </Avatar>
              )}

              <div className={`flex-1 ${isGrouped ? "ml-13" : ""}`}>
                {!isGrouped && (
                  <div className="flex items-baseline space-x-2 mb-1">
                    <span className="font-semibold text-white">
                      {message.users?.display_name || message.users?.username}
                    </span>
                    <span className="text-xs text-slate-400">{formatTime(message.created_at)}</span>
                  </div>
                )}

                <div className="text-slate-200 break-words">
                  {message.content}
                  {message.edited_at && <span className="text-xs text-slate-400 ml-1">(edited)</span>}
                </div>

                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {message.attachments.map((attachment: any, i: number) => (
                      <div key={i} className="bg-slate-700 rounded p-2">
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:underline"
                        >
                          {attachment.filename}
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {message.reactions && Object.keys(message.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {Object.entries(message.reactions).map(([emoji, count]: [string, any]) => (
                      <Button
                        key={emoji}
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 bg-slate-700 border-slate-600 hover:bg-slate-600"
                      >
                        <span className="mr-1">{emoji}</span>
                        <span className="text-xs">{count}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="icon" className="w-8 h-8">
                    <Smile className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8">
                    <Reply className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
