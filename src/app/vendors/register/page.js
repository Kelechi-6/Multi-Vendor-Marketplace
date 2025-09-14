"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Header from "../../../../components/Header"
import supabase from "../../../../lib/supabaseClient"
import styles from "./page.module.css"
import FullPageLoader from "../../../../components/FullPageLoader"

export default function VendorRegisterPage() {
  const [form, setForm] = useState({ shop_name: "", display_name: "", business_type: "", bio: "" })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push("/login")
        return
      }
      // If vendor already exists, go to dashboard
      const { data: vendor } = await supabase
        .from("vendors")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle()
      if (vendor) router.push("/vendors")
      setLoading(false)
    }
    init()
  }, [router])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    if (error) setError("")
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.shop_name.trim()) {
      setError("Shop name is required")
      return
    }
    setSubmitting(true)
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) {
        setError("Please log in again")
        router.push("/login")
        return
      }
      const { error: insertErr } = await supabase
        .from("vendors")
        .insert({
          user_id: user.id,
          shop_name: form.shop_name,
          display_name: form.display_name || null,
          business_type: form.business_type || null,
          bio: form.bio || null,
        })
      if (insertErr) {
        setError(insertErr.message)
        return
      }
      router.push("/vendors")
    } catch (e) {
      setError("Failed to register as vendor. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <FullPageLoader message="Preparing vendor registration..." />
      </>
    )
  }

  return (
    <div className={styles.page}>
      <Header />
      <div className="container">
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Become a Vendor</h1>
            <p className={styles.subtitle}>Create your shop to start selling products.</p>
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.card}>
            <form onSubmit={onSubmit} className={styles.form}>
              <div className={styles.group}>
                <label className={styles.label} htmlFor="shop_name">Shop Name *</label>
                <input className={styles.input} id="shop_name" name="shop_name" value={form.shop_name} onChange={onChange} placeholder="e.g. Keecee Gadgets" />
              </div>
              <div className={styles.group}>
                <label className={styles.label} htmlFor="display_name">Display Name</label>
                <input className={styles.input} id="display_name" name="display_name" value={form.display_name} onChange={onChange} placeholder="Optional public name" />
              </div>
              <div className={styles.group}>
                <label className={styles.label} htmlFor="business_type">Business Type</label>
                <select
                  className={styles.input}
                  id="business_type"
                  name="business_type"
                  value={form.business_type}
                  onChange={onChange}
                >
                  <option value="">Select business type...</option>
                  <option value="Retail">Retail</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Services">Services</option>
                  <option value="Dropshipping">Dropshipping</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className={styles.group}>
                <label className={styles.label} htmlFor="bio">Bio</label>
                <textarea className={styles.textarea} id="bio" name="bio" rows={4} value={form.bio} onChange={onChange} placeholder="Tell customers about your shop" />
              </div>
              <div className={styles.actions}>
                <button type="button" className="btn btn-secondary" onClick={() => router.push("/")}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Creating..." : "Create Shop"}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
