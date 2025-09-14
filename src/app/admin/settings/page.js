"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AdminSidebar from "../../../../components/AdminSidebar"
import supabase from "../../../../lib/supabaseClient"
import ui from "../../../../components/AdminCommon.module.css"
import Header from "../../../../components/Header"
import FullPageLoader from "../../../../components/FullPageLoader"

export default function AdminSettingsPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/admin/login"); return }
      const { data: profile } = await supabase
        .from("users")
        .select("id, super_user, email, username")
        .eq("id", user.id)
        .maybeSingle()
      if (!profile || !profile.super_user) { router.push("/admin/login"); return }
      setAdmin(profile)
    }
    init()
  }, [router])

  if (!admin) return <FullPageLoader message="Verifying admin..." />

  return (
    <>
      <Header />
      <div className={ui.adminLayout}>
        <AdminSidebar />
        <main className={ui.main}>
        <div className={ui.pageHeader}>
          <h1 className={ui.pageTitle}>Settings</h1>
        </div>
        <div className={ui.card}>
          <div>
            <div style={{ fontWeight: 600 }}>Signed in as</div>
            <div>{admin.username || admin.email}</div>
          </div>
        </div>
        <div className={ui.card} style={{ marginTop: 12 }}>
          <div>
            <div style={{ fontWeight: 600 }}>Platform Settings</div>
            <div className={ui.empty}>This is a placeholder for platform settings (maintenance mode, roles, etc.).</div>
          </div>
        </div>
        </main>
      </div>
    </>
  )
}
