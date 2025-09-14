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
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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
          .select("id, created_at, status, total_amount, user_id")
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

  return (
    <>
      <Header />
      <div className={ui.adminLayout}>
        <AdminSidebar />
        <main className={ui.main}>
        <div className={ui.pageHeader}>
          <h1 className={ui.pageTitle}>Orders</h1>
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
                {orders.map(o => (
                  <tr key={o.id}>
                    <td className={ui.td}>{o.id.slice(0,8)}</td>
                    <td className={ui.td}>{o.user_id?.slice(0,8)}</td>
                    <td className={ui.td}>${Number(o.total_amount||0).toLocaleString()}</td>
                    <td className={ui.td}>
                      <select value={o.status||''} onChange={(e)=>updateStatus(o.id, e.target.value)}>
                        <option value="pending">pending</option>
                        <option value="processing">processing</option>
                        <option value="shipped">shipped</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </td>
                    <td className={ui.td}>{new Date(o.created_at).toLocaleString()}</td>
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
