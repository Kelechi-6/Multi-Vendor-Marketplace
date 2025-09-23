"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AdminSidebar from "../../../../components/AdminSidebar"
import supabase from "../../../../lib/supabaseClient"
import ui from "../../../../components/AdminCommon.module.css"
import Header from "../../../../components/Header"
import FullPageLoader from "../../../../components/FullPageLoader"

export default function AdminUsersPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [q, setQ] = useState("")

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/admin/login")
        return
      }
      const { data: profile } = await supabase
        .from("users")
        .select("id, email, username, super_user")
        .eq("id", user.id)
        .maybeSingle()
      if (!profile || !profile.super_user) {
        router.push("/admin/login")
        return
      }
      setAdmin(profile)

      try {
        setLoading(true)
        setError("")
        const { data, error } = await supabase
          .from("users")
          .select("id, email, username, is_vendor, super_user, created_at")
          .order("created_at", { ascending: false })
          .limit(200)
        if (error) throw error
        setUsers(data || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const filtered = users.filter(u => {
    const text = `${u.email || ""} ${u.username || ""} ${u.id}`.toLowerCase()
    return text.includes(q.toLowerCase())
  })

  if (!admin) return <FullPageLoader message="Verifying admin..." />

  return (
    <>
      <Header />
      <div className={ui.adminLayout}>
        <AdminSidebar open={isSidebarOpen || typeof window === 'undefined'} onClose={() => setIsSidebarOpen(false)} />
        {/* Mobile overlay for sidebar */}
        <div
          className={`${ui.overlay} ${isSidebarOpen ? 'show' : ''}`}
          onClick={() => setIsSidebarOpen(false)}
        />
        <main className={ui.main}>
        {/* Mobile menu toggle */}
        <button
          type="button"
          className={ui.mobileToggle}
          aria-label="Open admin menu"
          onClick={() => setIsSidebarOpen(true)}
        >
          ☰ Menu
        </button>
        <div className={ui.pageHeader}>
          <h1 className={ui.pageTitle}>Users</h1>
          <div className={ui.toolbar}>
            <input
              className={ui.input}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by email, username, id"
            />
          </div>
        </div>
        {loading && <FullPageLoader message="Loading users..." />}
        {error && <div className={ui.notice}>{error}</div>}
        {!loading && (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead className={ui.thead}>
                <tr>
                  <th className={ui.th}>ID</th>
                  <th className={ui.th}>Email</th>
                  <th className={ui.th}>Username</th>
                  <th className={ui.th}>Vendor</th>
                  <th className={ui.th}>Admin</th>
                  <th className={ui.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id}>
                    <td className={ui.td}>{u.id.slice(0,8)}</td>
                    <td className={ui.td}>{u.email}</td>
                    <td className={ui.td}>{u.username || "-"}</td>
                    <td className={ui.td}>{u.is_vendor ? "Yes" : "No"}</td>
                    <td className={ui.td}>{u.super_user ? "Yes" : "No"}</td>
                    <td className={ui.td}>{new Date(u.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </main>
      </div>
    </>
  )
}
