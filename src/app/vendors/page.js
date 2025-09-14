"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Header from "../../../components/Header"
import supabase from "../../../lib/supabaseClient"
import FullPageLoader from "../../../components/FullPageLoader"

export default function VendorDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [vendor, setVendor] = useState(null)
  const [products, setProducts] = useState([])
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) {
          router.push("/login")
          return
        }
        // Ensure vendor exists
        const { data: vendorRow } = await supabase
          .from("vendors")
          .select("id, shop_name, display_name, bio, created_at")
          .eq("user_id", user.id)
          .maybeSingle()
        if (!vendorRow) {
          router.push("/vendors/register")
          return
        }
        setVendor(vendorRow)
        // Fetch products
        const { data: prods, error: prodErr } = await supabase
          .from("products")
          .select("id, name, price, stock, status, image_url, categories_id")
          .eq("vendor_id", vendorRow.id)
          .order("name", { ascending: true })
        if (prodErr) throw prodErr
        setProducts(prods || [])
      } catch (e) {
        setError(e.message || "Failed to load vendor dashboard")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  if (loading) {
    return (
      <>
        <Header />
        <FullPageLoader message="Loading vendor dashboard..." />
      </>
    )
  }

  if (error) {
    return (
      <div>
        <Header />
        <div className="container" style={{ padding: "2rem" }}>{error}</div>
      </div>
    )
  }

  return (
    <div>
      <Header />
      <div className="container" style={{ padding: "2rem 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1>{vendor.shop_name}</h1>
            {vendor.display_name ? <p>Seller: {vendor.display_name}</p> : null}
          </div>
          <button className="btn btn-primary" onClick={() => router.push("/vendors/products/new")}>Add Product</button>
        </div>

        <div style={{ marginTop: "2rem" }}>
          {products.length === 0 ? (
            <div>No products yet. Click "Add Product" to create your first item.</div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {products.map(p => (
                <div key={p.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr auto", gap: "1rem", alignItems: "center", border: "1px solid var(--border)", padding: "0.75rem", borderRadius: 6 }}>
                  <img src={p.image_url || "/user-avatar.png"} alt={p.name} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6 }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ color: "var(--muted-foreground)" }}>{p.status} • Stock: {p.stock} • ₦{Number(p.price || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    {/* Future: edit/delete actions */}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
