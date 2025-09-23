"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AdminSidebar from "../../../../components/AdminSidebar"
import styles from "./page.module.css"
import supabase from "../../../../lib/supabaseClient"
import Header from "../../../../components/Header"
import FullPageLoader from "../../../../components/FullPageLoader"

export default function AdminDashboard() {
  const [admin, setAdmin] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVendors: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    pendingProducts: 0,
    activeUsers: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState("")
  const [recentOrders, setRecentOrders] = useState([])
  const [pendingProducts, setPendingProducts] = useState([])
  const [actionMsg, setActionMsg] = useState("")
  const router = useRouter()

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/admin/login")
        return
      }
      const { data } = await supabase
        .from("users")
        .select("id, email, username, super_user")
        .eq("id", user.id)
        .maybeSingle()
      if (!data || !data.super_user) {
        router.push("/admin/login")
        return
      }
      setAdmin({ id: data.id, email: data.email, username: data.username, super_user: data.super_user })
      // After admin confirmed, load stats
      try {
        setStatsLoading(true)
        setStatsError("")

        const [usersCountRes, vendorsCountRes, productsCountRes, ordersCountRes, pendingOrdersCountRes, pendingProductsCountRes] = await Promise.all([
          supabase.from("users").select("id", { count: "exact", head: true }),
          supabase.from("vendors").select("id", { count: "exact", head: true }),
          supabase.from("products").select("id", { count: "exact", head: true }),
          supabase.from("orders").select("id", { count: "exact", head: true }),
          supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("products").select("id", { count: "exact", head: true }).in("status", ["inactive", "pending"]).throwOnError(false),
        ])

        // Revenue: try to fetch total_amount from orders; if not exists, default 0
        let totalRevenue = 0
        const { data: revenueRows, error: revenueErr } = await supabase
          .from("orders")
          .select("total_amount")
          .limit(1000)
        if (!revenueErr && Array.isArray(revenueRows)) {
          totalRevenue = revenueRows.reduce((acc, r) => acc + Number(r.total_amount || 0), 0)
        }

        const totals = {
          totalUsers: usersCountRes.count || 0,
          totalVendors: vendorsCountRes.count || 0,
          totalProducts: productsCountRes.count || 0,
          totalOrders: ordersCountRes.count || 0,
          totalRevenue,
          pendingOrders: pendingOrdersCountRes.count || 0,
          pendingProducts: pendingProductsCountRes.count || 0,
          activeUsers: usersCountRes.count || 0, // fallback; refine with activity metrics if available
        }
        setStats(totals)

        // Recent Orders
        const { data: ordersRows } = await supabase
          .from("orders")
          .select("id, created_at, status, total_amount, user_id")
          .order("created_at", { ascending: false })
          .limit(10)
        setRecentOrders(ordersRows || [])

        // Pending Product Approvals
        const { data: pendingProdRows } = await supabase
          .from("products")
          .select("id, name, status, vendor_id")
          .in("status", ["inactive", "pending"]).order("name", { ascending: true })
        setPendingProducts(pendingProdRows || [])
      } catch (e) {
        setStatsError(e.message || "Failed to load stats")
      } finally {
        setStatsLoading(false)
      }
    }
    checkAdmin()
  }, [router])

  // Approve/Reject product handlers
  const updateProductStatus = async (productId, newStatus) => {
    setActionMsg("")
    const { error } = await supabase
      .from("products")
      .update({ status: newStatus })
      .eq("id", productId)
    if (error) {
      setActionMsg(`Failed to update product: ${error.message}`)
    } else {
      setPendingProducts((prev) => prev.filter((p) => p.id !== productId))
      setActionMsg(`Product ${productId} set to ${newStatus}`)
    }
  }

  if (!admin) {
    return <FullPageLoader message="Verifying admin..." />
  }

  return (
    <>
      <Header />
      <div className={styles.adminLayout}>
        <AdminSidebar open={isSidebarOpen || typeof window === 'undefined'} onClose={() => setIsSidebarOpen(false)} />

        {/* Mobile overlay for sidebar */}
        <div
          className={`${styles.overlay} ${isSidebarOpen ? styles.show : ""}`}
          onClick={() => setIsSidebarOpen(false)}
        />

        <main className={styles.mainContent}>
        {/* Mobile menu toggle */}
        <button
          type="button"
          className={styles.mobileToggle}
          aria-label="Open admin menu"
          onClick={() => setIsSidebarOpen(true)}
        >
          ☰ Menu
        </button>
        {statsLoading && <FullPageLoader message="Loading dashboard..." />}
        <div className={styles.dashboardHeader}>
          <h1>Admin Dashboard</h1>
          <p>Welcome back, {admin.name}</p>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>👥</div>
            <div className={styles.statInfo}>
              <h3>{stats.totalUsers.toLocaleString()}</h3>
              <p>Total Users</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>🏪</div>
            <div className={styles.statInfo}>
              <h3>{stats.totalVendors}</h3>
              <p>Active Vendors</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>📦</div>
            <div className={styles.statInfo}>
              <h3>{stats.totalProducts.toLocaleString()}</h3>
              <p>Total Products</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>🛒</div>
            <div className={styles.statInfo}>
              <h3>{stats.totalOrders}</h3>
              <p>Total Orders</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>💰</div>
            <div className={styles.statInfo}>
              <h3>${stats.totalRevenue.toLocaleString()}</h3>
              <p>Total Revenue</p>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statIcon}>⏳</div>
            <div className={styles.statInfo}>
              <h3>{stats.pendingOrders}</h3>
              <p>Pending Orders</p>
            </div>
          </div>
        </div>

        <div className={styles.dashboardGrid}>
          <div className={styles.dashboardCard}>
            <h2>Recent Orders</h2>
            <div className={styles.ordersList}>
              {recentOrders.length === 0 ? (
                <div className={styles.emptyState}>No recent orders</div>
              ) : (
                recentOrders.map((o) => (
                  <div key={o.id} className={styles.orderItem}>
                    <div className={styles.orderInfo}>
                      <span className={styles.orderId}>#{o.id.slice(0, 8)}</span>
                      <span className={styles.customerName}>{o.user_id?.slice(0, 8) || "Unknown"}</span>
                    </div>
                    <div className={styles.orderAmount}>${Number(o.total_amount || 0).toLocaleString()}</div>
                    <div className={styles.orderStatus}>
                      <span className={`${styles.status} ${o.status === 'pending' ? styles.pending : o.status === 'completed' ? styles.completed : styles.shipped}`}>{o.status || 'unknown'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className={styles.dashboardCard}>
            <h2>Pending Product Approvals</h2>
            {actionMsg && <div className={styles.notice}>{actionMsg}</div>}
            <div className={styles.productsList}>
              {pendingProducts.length === 0 ? (
                <div className={styles.emptyState}>No products pending approval</div>
              ) : (
                pendingProducts.map((p) => (
                  <div key={p.id} className={styles.productItem}>
                    <div className={styles.productInfo}>
                      <span className={styles.productName}>{p.name}</span>
                      <span className={styles.vendorName}>{p.vendor_id?.slice(0, 8) || 'Unknown vendor'}</span>
                    </div>
                    <div className={styles.productActions}>
                      <button className={`btn btn-sm ${styles.approveBtn}`} onClick={() => updateProductStatus(p.id, 'active')}>Approve</button>
                      <button className={`btn btn-sm ${styles.rejectBtn}`} onClick={() => updateProductStatus(p.id, 'rejected')}>Reject</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        </main>
      </div>
    </>
  )
}
