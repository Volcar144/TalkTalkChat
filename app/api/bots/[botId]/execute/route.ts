import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest, { params }: { params: { botId: string } }) {
  try {
    const supabase = createServerClient()
    const { command, args, userId, serverId, channelId } = await request.json()

    // Verify bot exists and is online
    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select("*")
      .eq("id", params.botId)
      .eq("status", "online")
      .single()

    if (botError || !bot) {
      return NextResponse.json({ error: "Bot not found or offline" }, { status: 404 })
    }

    // Find the command
    const { data: botCommand, error: commandError } = await supabase
      .from("bot_commands")
      .select("*")
      .eq("bot_id", params.botId)
      .eq("name", command.toLowerCase())
      .eq("enabled", true)
      .single()

    if (commandError || !botCommand) {
      return NextResponse.json({ error: "Command not found" }, { status: 404 })
    }

    // Check cooldown (simplified - in production you'd want Redis or similar)
    const now = Date.now()
    const cooldownKey = `${params.botId}:${command}:${userId}`

    // Execute command based on response type
    const startTime = Date.now()
    let response: any = {}
    let success = true
    let errorMessage = ""

    try {
      switch (botCommand.response_type) {
        case "text":
          response = {
            type: "message",
            content: processTextResponse(botCommand.response_content.message, { args, userId, serverId }),
          }
          break

        case "embed":
          response = {
            type: "embed",
            content: {
              title: processTextResponse(botCommand.response_content.title || "", { args, userId, serverId }),
              description: processTextResponse(botCommand.response_content.description || "", {
                args,
                userId,
                serverId,
              }),
              color: botCommand.response_content.color || "#5865F2",
            },
          }
          break

        case "reaction":
          response = {
            type: "reaction",
            content: botCommand.response_content.emoji || "👍",
          }
          break

        default:
          throw new Error("Unknown response type")
      }
    } catch (error) {
      success = false
      errorMessage = error instanceof Error ? error.message : "Unknown error"
      response = {
        type: "message",
        content: "Sorry, I encountered an error while processing that command.",
      }
    }

    const executionTime = Date.now() - startTime

    // Log analytics
    await supabase.from("bot_analytics").insert({
      bot_id: params.botId,
      server_id: serverId,
      command_name: command,
      user_id: userId,
      execution_time: executionTime,
      success,
      error_message: errorMessage || null,
    })

    return NextResponse.json({
      success,
      response,
      executionTime,
    })
  } catch (error) {
    console.error("Bot execution error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Helper function to process text responses with variables
function processTextResponse(text: string, context: { args: string[]; userId: string; serverId: string }): string {
  return text
    .replace(/\{user\}/g, `<@${context.userId}>`)
    .replace(/\{args\}/g, context.args.join(" "))
    .replace(/\{arg(\d+)\}/g, (match, index) => context.args[Number.parseInt(index)] || "")
    .replace(/\{server\}/g, context.serverId)
}
