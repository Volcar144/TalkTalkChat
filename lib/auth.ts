import { stackServerApp } from "@/stack"
import { createClient } from "@/lib/supabase/server"

export async function getCurrentUser() {
  const stackUser = await stackServerApp.getUser()
  if (!stackUser) return null

  const supabase = await createClient()

  // Set the current user context for RLS
  await supabase.rpc("set_config", {
    parameter: "app.current_user_stack_id",
    value: stackUser.id,
  })

  // Get or create user profile in Supabase
  let { data: user } = await supabase.from("users").select("*").eq("stack_user_id", stackUser.id).single()

  if (!user) {
    // Create user profile if it doesn't exist
    const { data: newUser } = await supabase
      .from("users")
      .insert({
        stack_user_id: stackUser.id,
        username: stackUser.displayName || stackUser.primaryEmail?.split("@")[0] || "user",
        display_name: stackUser.displayName,
      })
      .select()
      .single()

    user = newUser
  }

  return {
    ...user,
    stackUserId: stackUser.id,
    stackUserEmail: stackUser.primaryEmail,
    stackUserDisplayName: stackUser.displayName,
    stackUserAvatarUrl: stackUser.profileImageUrl,
    stackUserEmailVerified: stackUser.primaryEmailVerified,
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error("Authentication required")
  }
  return user
}
