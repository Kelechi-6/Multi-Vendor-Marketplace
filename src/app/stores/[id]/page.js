"use client"

import { useEffect, useState } from "react"
import Header from "../../../../components/Header"
import supabase from "../../../../lib/supabaseClient"
import ProductCard from "../../../../components/ProductCard"
import FullPageLoader from "../../../../components/FullPageLoader"
import styles from "./../../page.module.css"
import Link from "next/link"

export default function PublicStorePage({ params }) {
  const vendorId = params.id
  const [vendor, setVendor] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true); setError("")
        const { data: vend, error: vendErr } = await supabase
          .from("vendors")
          .select("id, shop_name, display_name, bio, business_type, created_at")
          .eq("id", vendorId)
          .maybeSingle()
        if (vendErr) throw vendErr
        if (!vend) { setError("Vendor not found"); setLoading(false); return }
        setVendor(vend)

        const { data: prods, error: prodErr } = await supabase
          .from("products")
          .select("id, name, price, image_url, categories_id, stock, status, description")
          .eq("vendor_id", vendorId)
          .eq("status", "active")
          .order("name", { ascending: true })
        if (prodErr) throw prodErr

        const mapped = (prods || []).map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          image_url: p.image_url,
          categories_id: p.categories_id,
          inStock: (p.stock ?? 0) > 0,
          description: p.description || "",
        }))
        setProducts(mapped)
      } catch (e) {
        setError(e.message || "Failed to load store")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [vendorId])

  return (
    <div>
      <Header />
      {loading ? (
        <FullPageLoader message="Loading store..." />
      ) : error ? (
        <div className="container" style={{ padding: "2rem", color: "#b00020" }}>{error}</div>
      ) : vendor ? (
        <div className="container" style={{ padding: "1.5rem 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ margin: 0 }}>{vendor.display_name || vendor.shop_name}</h1>
              {vendor.business_type && (
                <p style={{ margin: "4px 0", color: "#6b7280" }}>{vendor.business_type}</p>
              )}
              {vendor.bio && (
                <p style={{ margin: "6px 0", maxWidth: 720, color: "#9ca3af" }}>{vendor.bio}</p>
              )}
            </div>
            <Link href="/products" className="btn btn-secondary">Browse All Products</Link>
          </div>

          {products.length === 0 ? (
            <div style={{ padding: "2rem 0" }}>
              <h3>No products yet</h3>
              <p>This vendor hasn&apos;t published any products.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginTop: 16 }}>
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
