"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Hash, Users, Send, Paperclip, Smile, Gift } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { MessageList } from "./message-list"

interface ChatAreaProps {
  channelId: string | null
  serverId: string | null
  user: any
  onToggleMemberList: () => void
}

export function ChatArea({ channelId, serverId, user, onToggleMemberList }: ChatAreaProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [channel, setChannel] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (channelId) {
      loadChannel()
      loadMessages()
    }
  }, [channelId])

  const loadChannel = async () => {
    if (!channelId) return

    const supabase = createClient()

    // Set user context for RLS
    await supabase.rpc("set_config", {
      parameter: "app.current_user_stack_id",
      value: user.stackUser.id,
    })

    if (serverId) {
      // Server channel
      const { data } = await supabase.from("channels").select("*").eq("id", channelId).single()
      setChannel(data)
    } else {
      // DM channel
      const { data } = await supabase
        .from("dm_channels")
        .select(`
          *,
          dm_participants(
            user_id,
            users(username, display_name, avatar_url)
          )
        `)
        .eq("id", channelId)
        .single()
      setChannel(data)
    }
  }

  const loadMessages = async () => {
    if (!channelId) return

    const supabase = createClient()

    // Set user context for RLS
    await supabase.rpc("set_config", {
      parameter: "app.current_user_stack_id",
      value: user.stackUser.id,
    })

    const query = supabase
      .from("messages")
      .select(`
        *,
        users!messages_author_id_fkey(username, display_name, avatar_url),
        reply_to:messages!messages_reply_to_id_fkey(
          id,
          content,
          users!messages_author_id_fkey(username, display_name)
        )
      `)
      .order("created_at", { ascending: true })
      .limit(50)

    if (serverId) {
      query.eq("channel_id", channelId)
    } else {
      query.eq("dm_channel_id", channelId)
    }

    const { data } = await query
    setMessages(data || [])

    // Scroll to bottom
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 100)
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !channelId) return

    setLoading(true)
    const supabase = createClient()

    // Set user context for RLS
    await supabase.rpc("set_config", {
      parameter: "app.current_user_stack_id",
      value: user.stackUser.id,
    })

    const messageData: any = {
      content: newMessage.trim(),
      author_id: user.id,
    }

    if (serverId) {
      messageData.channel_id = channelId
    } else {
      messageData.dm_channel_id = channelId
    }

    const { error } = await supabase.from("messages").insert(messageData)

    if (!error) {
      setNewMessage("")
      loadMessages() // Reload messages
    }

    setLoading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getChannelName = () => {
    if (!channel) return "Select a channel"

    if (serverId) {
      return channel.name
    } else {
      // DM channel
      if (channel.type === "dm") {
        const otherUser = channel.dm_participants?.find((p: any) => p.user_id !== user.id)?.users
        return otherUser?.display_name || otherUser?.username || "Direct Message"
      }
      return channel.name || "Group DM"
    }
  }

  if (!channelId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-800">
        <div className="text-center text-slate-400">
          <Hash className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold mb-2">No channel selected</h3>
          <p>Select a channel from the sidebar to start chatting</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-800">
      {/* Channel Header */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-slate-700 bg-slate-800">
        <div className="flex items-center space-x-2">
          <Hash className="w-5 h-5 text-slate-400" />
          <h2 className="font-semibold text-white">{getChannelName()}</h2>
          {channel?.topic && (
            <>
              <div className="w-px h-4 bg-slate-600" />
              <p className="text-sm text-slate-400 truncate">{channel.topic}</p>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={onToggleMemberList}>
            <Users className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 p-4">
          <MessageList messages={messages} currentUser={user} />
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 bg-slate-800">
          <div className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <Input
                placeholder={`Message ${getChannelName()}`}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 pr-20"
              />
              <div className="absolute right-2 top-2 flex items-center space-x-1">
                <Button variant="ghost" size="icon" className="w-6 h-6">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-6 h-6">
                  <Smile className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="w-6 h-6">
                  <Gift className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || loading}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
