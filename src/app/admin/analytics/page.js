"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AdminSidebar from "../../../../components/AdminSidebar"
import supabase from "../../../../lib/supabaseClient"
import ui from "../../../../components/AdminCommon.module.css"
import Header from "../../../../components/Header"
import FullPageLoader from "../../../../components/FullPageLoader"

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [stats, setStats] = useState(null)
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
        const [usersCountRes, vendorsCountRes, productsCountRes, ordersCountRes, pendingOrdersCountRes] = await Promise.all([
          supabase.from("users").select("id", { count: "exact", head: true }),
          supabase.from("vendors").select("id", { count: "exact", head: true }),
          supabase.from("products").select("id", { count: "exact", head: true }),
          supabase.from("orders").select("id", { count: "exact", head: true }),
          supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending")
        ])

        let totalRevenue = 0
        const { data: revenueRows } = await supabase.from("orders").select("total_amount").limit(2000)
        if (Array.isArray(revenueRows)) totalRevenue = revenueRows.reduce((a, r)=>a+Number(r.total_amount||0), 0)

        setStats({
          users: usersCountRes.count||0,
          vendors: vendorsCountRes.count||0,
          products: productsCountRes.count||0,
          orders: ordersCountRes.count||0,
          revenue: totalRevenue,
          pendingOrders: pendingOrdersCountRes.count||0,
        })
      } catch (e) { setError(e.message) }
      finally { setLoading(false) }
    }
    init()
  }, [router])

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
          <h1 className={ui.pageTitle}>Analytics</h1>
        </div>
        {loading && <FullPageLoader message="Loading analytics..." />}
        {error && <div className={ui.notice}>{error}</div>}
        {!loading && stats && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:16 }}>
            <div className={ui.card}><div>Users</div><div style={{ fontSize:24, fontWeight:700 }}>{stats.users.toLocaleString()}</div></div>
            <div className={ui.card}><div>Vendors</div><div style={{ fontSize:24, fontWeight:700 }}>{stats.vendors.toLocaleString()}</div></div>
            <div className={ui.card}><div>Products</div><div style={{ fontSize:24, fontWeight:700 }}>{stats.products.toLocaleString()}</div></div>
            <div className={ui.card}><div>Orders</div><div style={{ fontSize:24, fontWeight:700 }}>{stats.orders.toLocaleString()}</div></div>
            <div className={ui.card}><div>Revenue</div><div style={{ fontSize:24, fontWeight:700 }}>${Number(stats.revenue||0).toLocaleString()}</div></div>
            <div className={ui.card}><div>Pending Orders</div><div style={{ fontSize:24, fontWeight:700 }}>{stats.pendingOrders.toLocaleString()}</div></div>
          </div>
        )}
        </main>
      </div>
    </>
  )
}
