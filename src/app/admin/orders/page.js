"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AdminSidebar from "../../../../components/AdminSidebar"
import supabase from "../../../../lib/supabaseClient"
import ui from "../../../../components/AdminCommon.module.css"
import Header from "../../../../components/Header"
import FullPageLoader from "../../../../components/FullPageLoader"

export default function AdminOrdersPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [q, setQ] = useState("")

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/admin/login"); return }
      const { data: profile } = await supabase
        .from("users")
        .select("id, super_user")
        .eq("id", user.id)
        .maybeSingle()
      if (!profile || !profile.super_user) { router.push("/admin/login"); return }
      setAdmin(profile)

      try {
        setLoading(true); setError("")
        const { data, error } = await supabase
          .from("orders")
          .select("id, created_at, status, total_amount, user_id, users:user_id(username, email)")
          .order("created_at", { ascending: false })
          .limit(500)
        if (error) throw error
        setOrders(data || [])
      } catch (e) { setError(e.message) }
      finally { setLoading(false) }
    }
    init()
  }, [router])

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id)
    if (!error) setOrders(prev => prev.map(o => o.id===id? { ...o, status } : o))
  }

  if (!admin) return <FullPageLoader message="Verifying admin..." />

  const filteredOrders = orders.filter(o => {
    const userText = `${o.users?.username || ""} ${o.users?.email || ""}`.toLowerCase()
    const idText = `${o.id}`.toLowerCase()
    const statusText = `${o.status || ""}`.toLowerCase()
    const amountText = `${o.total_amount || 0}`
    const qv = q.toLowerCase().trim()
    return qv === "" || userText.includes(qv) || idText.includes(qv) || statusText.includes(qv) || amountText.includes(qv)
  })

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
          <h1 className={ui.pageTitle}>Orders</h1>
          <div className={ui.toolbar}>
            <input
              className={ui.input}
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              placeholder="Search orders by id, user, status"
            />
          </div>
        </div>
        {loading && <FullPageLoader message="Loading orders..." />}
        {error && <div className={ui.notice}>{error}</div>}
        {!loading && (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead className={ui.thead}>
                <tr>
                  <th className={ui.th}>ID</th>
                  <th className={ui.th}>User</th>
                  <th className={ui.th}>Amount</th>
                  <th className={ui.th}>Status</th>
                  <th className={ui.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(o => (
                  <tr key={o.id}>
                    <td className={ui.td} data-label="ID">{o.id.slice(0,8)}</td>
                    <td className={ui.td} data-label="Customer">{o.users?.username || o.users?.email || o.user_id?.slice(0,8) || 'Unknown'}</td>
                    <td className={ui.td} data-label="Amount">${Number(o.total_amount||0).toLocaleString()}</td>
                    <td className={ui.td} data-label="Status">
                      <select value={o.status||''} onChange={(e)=>updateStatus(o.id, e.target.value)}>
                        <option value="pending">pending</option>
                        <option value="processing">processing</option>
                        <option value="shipped">shipped</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </td>
                    <td className={ui.td} data-label="Created">{new Date(o.created_at).toLocaleString()}</td>
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
