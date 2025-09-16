"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Header from "../../../../../components/Header"
import supabase from "../../../../../lib/supabaseClient"
import FullPageLoader from "../../../../../components/FullPageLoader"
import Link from "next/link"

export default function OrderDetailsPage({ params }) {
  const { id } = params
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [order, setOrder] = useState(null)
  const [items, setItems] = useState([])
  const [error, setError] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError("")
        // Ensure user is logged in
        const { data: { user: authUser }, error: authErr } = await supabase.auth.getUser()
        if (authErr) throw authErr
        if (!authUser) { router.push("/login?redirect=/profile"); return }
        setUser(authUser)

        // Fetch order that belongs to this user
        const { data: ord, error: ordErr } = await supabase
          .from("orders")
          .select("id, created_at, status, total_amount, products")
          .eq("id", id)
          .eq("user_id", authUser.id)
          .maybeSingle()
        if (ordErr) throw ordErr
        if (!ord) { setError("Order not found"); return }
        setOrder(ord)

        // Parse inline products JSON if present
        let parsed = []
        if (ord.products) {
          try {
            parsed = typeof ord.products === 'string' ? JSON.parse(ord.products) : ord.products
          } catch (_) { parsed = [] }
        }
        setItems(Array.isArray(parsed) ? parsed : [])
      } catch (e) {
        setError(e.message || "Failed to load order")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, router])

  return (
    <div>
      <Header />
      {loading ? (
        <FullPageLoader message="Loading order..." />
      ) : error ? (
        <div className="container" style={{ padding: 24, color: "#b00020" }}>{error}</div>
      ) : order ? (
        <div className="container" style={{ padding: "1.5rem 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h1 style={{ margin: 0 }}>Order #{order.id?.slice(0,8)}</h1>
            <Link href="/profile?tab=orders" className="btn btn-secondary">Back to Orders</Link>
          </div>
          <div style={{ color: "var(--muted-foreground)", marginBottom: 12 }}>
            Placed on {new Date(order.created_at).toLocaleString()}
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16, background: "var(--card)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div><strong>Status:</strong> {order.status || "processing"}</div>
                <div><strong>Total:</strong> ₦{Number(order.total_amount || 0).toLocaleString()}</div>
              </div>
            </div>

            <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 16, background: "var(--card)" }}>
              <h3 style={{ marginTop: 0 }}>Items</h3>
              {(!items || items.length === 0) ? (
                <div style={{ color: "var(--muted-foreground)" }}>No item details available for this order.</div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  {items.map((it, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "64px 1fr auto", gap: 12, alignItems: "center" }}>
                      <img src={it.image_url || "/placeholder.svg"} alt={it.name || `Item ${idx+1}`} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6 }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{it.name || `Item ${idx+1}`}</div>
                        <div style={{ color: "var(--muted-foreground)", fontSize: 14 }}>
                          {it.quantity ? `x${it.quantity} • ` : ''}₦{Number(it.price || 0).toLocaleString()}
                        </div>
                      </div>
                      <div style={{ fontWeight: 600 }}>₦{Number((it.price || 0) * (it.quantity || 1)).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
