"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Phone,
  PhoneOff,
  Settings,
  Users,
} from "lucide-react"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { useUser } from "@stackframe/stack"

interface VoiceChannelProps {
  channelId: string
  channelName: string
  serverId: string
}

interface VoiceSession {
  id: string
  user_id: string
  is_muted: boolean
  is_deafened: boolean
  is_speaking: boolean
  is_video_enabled: boolean
  is_screen_sharing: boolean
  user_profiles?: {
    username: string
    display_name: string
    avatar_url: string
  }
}

export function VoiceChannel({ channelId, channelName, serverId }: VoiceChannelProps) {
  const user = useUser()
  const supabase = createBrowserClient()
  const [isConnected, setIsConnected] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isDeafened, setIsDeafened] = useState(false)
  const [isVideoEnabled, setIsVideoEnabled] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [participants, setParticipants] = useState<VoiceSession[]>([])
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())

  useEffect(() => {
    if (isConnected) {
      fetchParticipants()
      subscribeToVoiceUpdates()
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
      }
      peerConnections.current.forEach((pc) => pc.close())
    }
  }, [isConnected, channelId])

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from("voice_sessions")
        .select(`
          *,
          user_profiles!inner(username, display_name, avatar_url)
        `)
        .eq("channel_id", channelId)

      if (error) {
        console.error("Error fetching participants:", error)
        return
      }

      setParticipants(data || [])
    } catch (error) {
      console.error("Error fetching participants:", error)
    }
  }

  const subscribeToVoiceUpdates = () => {
    const channel = supabase
      .channel(`voice-channel-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "voice_sessions",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          console.log("Voice session update:", payload)
          fetchParticipants()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const joinVoiceChannel = async () => {
    if (!user) return

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideoEnabled,
      })

      setLocalStream(stream)

      if (localVideoRef.current && isVideoEnabled) {
        localVideoRef.current.srcObject = stream
      }

      // Create voice session in database
      const { error } = await supabase.from("voice_sessions").insert({
        user_id: user.id,
        channel_id: channelId,
        server_id: serverId,
        is_muted: isMuted,
        is_deafened: isDeafened,
        is_video_enabled: isVideoEnabled,
        is_screen_sharing: isScreenSharing,
      })

      if (error) {
        console.error("Error joining voice channel:", error)
        return
      }

      setIsConnected(true)

      // Initialize WebRTC connections with existing participants
      participants.forEach((participant) => {
        if (participant.user_id !== user.id) {
          initializePeerConnection(participant.user_id, stream)
        }
      })
    } catch (error) {
      console.error("Error accessing media devices:", error)
    }
  }

  const leaveVoiceChannel = async () => {
    if (!user) return

    try {
      // Remove voice session from database
      await supabase.from("voice_sessions").delete().eq("user_id", user.id).eq("channel_id", channelId)

      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
        setLocalStream(null)
      }

      // Close all peer connections
      peerConnections.current.forEach((pc) => pc.close())
      peerConnections.current.clear()
      setRemoteStreams(new Map())

      setIsConnected(false)
    } catch (error) {
      console.error("Error leaving voice channel:", error)
    }
  }

  const initializePeerConnection = async (userId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
    })

    // Add local stream tracks
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream)
    })

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams
      setRemoteStreams((prev) => new Map(prev.set(userId, remoteStream)))
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send ICE candidate to remote peer via signaling server
        // This would typically go through your signaling server
        console.log("ICE candidate:", event.candidate)
      }
    }

    peerConnections.current.set(userId, pc)
  }

  const toggleMute = async () => {
    if (!user || !isConnected) return

    const newMutedState = !isMuted
    setIsMuted(newMutedState)

    // Update local stream
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !newMutedState
      })
    }

    // Update database
    await supabase
      .from("voice_sessions")
      .update({ is_muted: newMutedState })
      .eq("user_id", user.id)
      .eq("channel_id", channelId)
  }

  const toggleDeafen = async () => {
    if (!user || !isConnected) return

    const newDeafenedState = !isDeafened
    setIsDeafened(newDeafenedState)

    // If deafening, also mute
    if (newDeafenedState) {
      setIsMuted(true)
      if (localStream) {
        localStream.getAudioTracks().forEach((track) => {
          track.enabled = false
        })
      }
    }

    // Update database
    await supabase
      .from("voice_sessions")
      .update({
        is_deafened: newDeafenedState,
        is_muted: newDeafenedState || isMuted,
      })
      .eq("user_id", user.id)
      .eq("channel_id", channelId)
  }

  const toggleVideo = async () => {
    if (!user || !isConnected) return

    const newVideoState = !isVideoEnabled
    setIsVideoEnabled(newVideoState)

    try {
      if (newVideoState) {
        // Enable video
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
        const videoTrack = videoStream.getVideoTracks()[0]

        // Add video track to existing stream
        if (localStream) {
          localStream.addTrack(videoTrack)
        }

        // Add to peer connections
        peerConnections.current.forEach((pc) => {
          pc.addTrack(videoTrack, localStream!)
        })

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream
        }
      } else {
        // Disable video
        if (localStream) {
          localStream.getVideoTracks().forEach((track) => {
            track.stop()
            localStream.removeTrack(track)
          })
        }
      }

      // Update database
      await supabase
        .from("voice_sessions")
        .update({ is_video_enabled: newVideoState })
        .eq("user_id", user.id)
        .eq("channel_id", channelId)
    } catch (error) {
      console.error("Error toggling video:", error)
    }
  }

  const toggleScreenShare = async () => {
    if (!user || !isConnected) return

    const newScreenShareState = !isScreenSharing
    setIsScreenSharing(newScreenShareState)

    try {
      if (newScreenShareState) {
        // Start screen sharing
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        })

        // Replace video track in peer connections
        const videoTrack = screenStream.getVideoTracks()[0]
        peerConnections.current.forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video")
          if (sender) {
            sender.replaceTrack(videoTrack)
          }
        })

        // Handle screen share end
        videoTrack.onended = () => {
          setIsScreenSharing(false)
          // Switch back to camera
          if (isVideoEnabled) {
            toggleVideo()
          }
        }
      } else {
        // Stop screen sharing - switch back to camera if video was enabled
        if (isVideoEnabled) {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
          const videoTrack = videoStream.getVideoTracks()[0]

          peerConnections.current.forEach((pc) => {
            const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video")
            if (sender) {
              sender.replaceTrack(videoTrack)
            }
          })
        }
      }

      // Update database
      await supabase
        .from("voice_sessions")
        .update({ is_screen_sharing: newScreenShareState })
        .eq("user_id", user.id)
        .eq("channel_id", channelId)
    } catch (error) {
      console.error("Error toggling screen share:", error)
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Volume2 className="h-5 w-5" />
            <h3 className="font-semibold">{channelName}</h3>
            <Badge variant="secondary">
              <Users className="h-3 w-3 mr-1" />
              {participants.length}
            </Badge>
          </div>

          {!isConnected ? (
            <Button onClick={joinVoiceChannel} size="sm">
              <Phone className="h-4 w-4 mr-2" />
              Join
            </Button>
          ) : (
            <Button onClick={leaveVoiceChannel} variant="destructive" size="sm">
              <PhoneOff className="h-4 w-4 mr-2" />
              Leave
            </Button>
          )}
        </div>

        {/* Participants List */}
        {participants.length > 0 && (
          <div className="space-y-2 mb-4">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center space-x-2 p-2 rounded-lg bg-muted/50">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={participant.user_profiles?.avatar_url || "/placeholder.svg"} />
                  <AvatarFallback className="text-xs">
                    {participant.user_profiles?.display_name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>

                <span className="text-sm font-medium flex-1">
                  {participant.user_profiles?.display_name || participant.user_profiles?.username}
                </span>

                <div className="flex space-x-1">
                  {participant.is_muted && <MicOff className="h-3 w-3 text-red-500" />}
                  {participant.is_deafened && <VolumeX className="h-3 w-3 text-red-500" />}
                  {participant.is_video_enabled && <Video className="h-3 w-3 text-green-500" />}
                  {participant.is_screen_sharing && <Monitor className="h-3 w-3 text-blue-500" />}
                  {participant.is_speaking && <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Video Display */}
        {isConnected && (isVideoEnabled || isScreenSharing) && (
          <div className="mb-4">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-48 bg-black rounded-lg object-cover"
            />
          </div>
        )}

        {/* Voice Controls */}
        {isConnected && (
          <div className="flex items-center justify-center space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={isMuted ? "destructive" : "secondary"} size="sm" onClick={toggleMute}>
                    {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isMuted ? "Unmute" : "Mute"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={isDeafened ? "destructive" : "secondary"} size="sm" onClick={toggleDeafen}>
                    {isDeafened ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isDeafened ? "Undeafen" : "Deafen"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={isVideoEnabled ? "default" : "secondary"} size="sm" onClick={toggleVideo}>
                    {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isVideoEnabled ? "Turn off camera" : "Turn on camera"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant={isScreenSharing ? "default" : "secondary"} size="sm" onClick={toggleScreenShare}>
                    {isScreenSharing ? <Monitor className="h-4 w-4" /> : <MonitorOff className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isScreenSharing ? "Stop sharing" : "Share screen"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
