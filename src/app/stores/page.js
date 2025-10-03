"use client"

import { useEffect, useState } from "react"
import Header from "../../../components/Header"
import supabase from "../../../lib/supabaseClient"
import styles from "./page.module.css"

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
    <div className={styles.page}>
      <Header />
      <div className={`container ${styles.container}`}>
        <div className={styles.headerRow}>
          <h1 className={styles.title}>Vendors</h1>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search vendors..."
            className={styles.searchInput}
          />
        </div>

        {loading ? (
          <div className={styles.loading}>Loading vendors...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <h3>No vendors found</h3>
            <p>Try a different search term.</p>
          </div>
        ) : (
          <div className={styles.cardsGrid}>
            {filtered.map(v => (
              <div key={v.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <img src="/user-avatar.png" alt={v.shop_name || v.display_name || 'Vendor'} className={styles.cardThumb} />
                  <div>
                    <h3 className={styles.cardTitle}>{v.display_name || v.shop_name}</h3>
                    {v.business_type && <div className={styles.cardMeta}>{v.business_type}</div>}
                  </div>
                </div>
                {v.bio && <p style={{ margin: '10px 0 12px 0', color: 'var(--muted-foreground)' }}>{v.bio}</p>}
                <a href={`/stores/${v.id}`} className="btn btn-primary">View Store</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
