"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AdminSidebar from "../../../../../components/AdminSidebar"
import supabase from "../../../../../lib/supabaseClient"
import ui from "../../../../../components/AdminCommon.module.css"
import Header from "../../../../../components/Header"
import FullPageLoader from "../../../../../components/FullPageLoader"

export default function AdminVendorDetailPage({ params }) {
  const { id } = params
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [vendor, setVendor] = useState(null)
  const [products, setProducts] = useState([])
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
        const { data: vend, error: vendErr } = await supabase
          .from("vendors")
          .select("id, user_id, shop_name, display_name, bio, business_type, created_at")
          .eq("id", id)
          .maybeSingle()
        if (vendErr) throw vendErr
        setVendor(vend)

        const { data: prod, error: prodErr } = await supabase
          .from("products")
          .select("id, name, price, image_url, stock, status, categories_id")
          .eq("vendor_id", id)
          .order("created_at", { ascending: false })
          .limit(50)
        if (prodErr) throw prodErr
        setProducts(prod || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [id, router])

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
            <h1 className={ui.pageTitle}>Vendor Store</h1>
          </div>
          {loading && <FullPageLoader message="Loading vendor store..." />}
          {error && <div className={ui.notice}>{error}</div>}
          {vendor && (
            <div className={ui.card}>
              <div className={ui.cardHeader}>
                <h2>{vendor.display_name || vendor.shop_name}</h2>
                <div className={ui.muted}>Vendor ID: {vendor.id}</div>
              </div>
              <div className={ui.cardBody}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div><strong>Shop Name:</strong> {vendor.shop_name}</div>
                  <div><strong>Business Type:</strong> {vendor.business_type || 'Not set'}</div>
                  <div><strong>About:</strong> {vendor.bio || 'No description provided.'}</div>
                  <div><strong>Owner (User ID):</strong> {vendor.user_id}</div>
                  <div><strong>Created:</strong> {new Date(vendor.created_at).toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}

          <div className={ui.pageHeader}>
            <h2 className={ui.pageTitle}>Products</h2>
          </div>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead className={ui.thead}>
                <tr>
                  <th className={ui.th}>Product</th>
                  <th className={ui.th}>Price</th>
                  <th className={ui.th}>Stock</th>
                  <th className={ui.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id}>
                    <td className={ui.td}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <img src={p.image_url || '/placeholder.svg'} alt={p.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
                        <a href={`/products/${p.id}`} target="_blank" rel="noreferrer">{p.name}</a>
                      </div>
                    </td>
                    <td className={ui.td}>₦{Number(p.price || 0).toLocaleString()}</td>
                    <td className={ui.td}>{p.stock ?? 0}</td>
                    <td className={ui.td}>{p.status}</td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td className={ui.td} colSpan={4}>No products found for this vendor.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </>
  )
}
