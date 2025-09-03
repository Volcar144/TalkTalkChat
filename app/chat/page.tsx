import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { ChatLayout } from "@/components/chat/chat-layout"

export default async function ChatPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/auth/signin")
  }

  return <ChatLayout user={user} />
}
