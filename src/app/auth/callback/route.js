import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") || "/profile"

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // IMPORTANT: exchange code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Error exchanging code:", error.message)
      return NextResponse.redirect(new URL("/login?error=auth", request.url))
    }
  }

  // Redirect user after sign in
  return NextResponse.redirect(new URL(next, request.url))
}
