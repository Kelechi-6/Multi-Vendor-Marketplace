"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AdminSidebar from "../../../../components/AdminSidebar"
import supabase from "../../../../lib/supabaseClient"
import ui from "../../../../components/AdminCommon.module.css"
import Header from "../../../../components/Header"
import FullPageLoader from "../../../../components/FullPageLoader"

export default function AdminVendorsPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [vendors, setVendors] = useState([])
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
          .from("vendors")
          .select("id, user_id, shop_name, display_name, created_at")
          .order("created_at", { ascending: false })
          .limit(200)
        if (error) throw error
        setVendors(data || [])
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const filtered = vendors.filter(v => {
    const text = `${v.shop_name || ''} ${v.display_name || ''} ${v.user_id || ''}`.toLowerCase()
    return text.includes(q.toLowerCase())
  })

  if (!admin) return <FullPageLoader message="Verifying admin..." />

  return (
    <>
      <Header />
      <div className={ui.adminLayout}>
        <AdminSidebar />
        <main className={ui.main}>
        <div className={ui.pageHeader}>
          <h1 className={ui.pageTitle}>Vendors</h1>
          <div className={ui.toolbar}>
            <input className={ui.input} value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search vendors" />
          </div>
        </div>
        {loading && <FullPageLoader message="Loading vendors..." />}
        {error && <div className={ui.notice}>{error}</div>}
        {!loading && (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead className={ui.thead}>
                <tr>
                  <th className={ui.th}>ID</th>
                  <th className={ui.th}>Shop</th>
                  <th className={ui.th}>Display Name</th>
                  <th className={ui.th}>User</th>
                  <th className={ui.th}>Created</th>
                  <th className={ui.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => (
                  <tr key={v.id}>
                    <td className={ui.td}>{v.id.slice(0,8)}</td>
                    <td className={ui.td}>{v.shop_name}</td>
                    <td className={ui.td}>{v.display_name || '-'}</td>
                    <td className={ui.td}>{v.user_id?.slice(0,8)}</td>
                    <td className={ui.td}>{new Date(v.created_at).toLocaleString()}</td>
                    <td className={ui.td}>
                      <a className="btn btn-secondary" href={`/admin/vendors/${v.id}`}>View Store</a>
                    </td>
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
