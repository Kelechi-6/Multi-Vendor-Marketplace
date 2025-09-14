"use client"

import { useEffect, useState } from "react"
import Header from "../../../components/Header"
import supabase from "../../../lib/supabaseClient"

export default function VendorsDirectoryPage() {
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [q, setQ] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true); setError("")
        const { data, error } = await supabase
          .from("vendors")
          .select("id, shop_name, display_name, bio, business_type, created_at")
          .order("created_at", { ascending: false })
        if (error) throw error
        setVendors(data || [])
      } catch (e) {
        setError(e.message || "Failed to load vendors")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = vendors.filter(v => {
    const t = `${v.shop_name || ''} ${v.display_name || ''} ${v.business_type || ''} ${v.bio || ''}`.toLowerCase()
    return t.includes(q.toLowerCase())
  })

  return (
    <div>
      <Header />
      <div className="container" style={{ padding: "1.5rem 0" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0 }}>Vendors</h1>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search vendors..."
            style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', minWidth: 240 }}
          />
        </div>

        {loading ? (
          <div style={{ padding: '2rem 0' }}>Loading vendors...</div>
        ) : error ? (
          <div style={{ padding: '2rem 0', color: '#b00020' }}>{error}</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '2rem 0' }}>
            <h3>No vendors found</h3>
            <p>Try a different search term.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginTop: 16 }}>
            {filtered.map(v => (
              <div key={v.id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 16, background: '#fff' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <img src="/user-avatar.png" alt={v.shop_name || v.display_name || 'Vendor'} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} />
                  <div>
                    <h3 style={{ margin: '0 0 2px 0' }}>{v.display_name || v.shop_name}</h3>
                    {v.business_type && <div style={{ color: '#6b7280', fontSize: 14 }}>{v.business_type}</div>}
                  </div>
                </div>
                {v.bio && <p style={{ margin: '10px 0 12px 0', color: '#4b5563' }}>{v.bio}</p>}
                <a href={`/stores/${v.id}`} className="btn btn-primary">View Store</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
