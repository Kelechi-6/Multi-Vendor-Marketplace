"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Header from "../../../../../components/Header"
import supabase from "../../../../../lib/supabaseClient"
import { uploadVendorProductImage } from "../../../../../lib/uploadImage"
import styles from "./page.module.css"

export default function NewProductPage() {
  const [loading, setLoading] = useState(true)
  const [vendor, setVendor] = useState(null)
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    name: "",
    price: "",
    stock: "0",
    description: "",
    categories_id: "",
  })
  const [imageFile, setImageFile] = useState(null)
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        router.push("/login")
        return
      }
      const { data: vendorRow } = await supabase
        .from("vendors")
        .select("id, shop_name")
        .eq("user_id", user.id)
        .maybeSingle()
      if (!vendorRow) {
        router.push("/vendors/register")
        return
      }
      setVendor(vendorRow)

      // Fetch categories for dropdown
      const { data: catData } = await supabase
        .from("categories")
        .select("id, name")
        .order("name")
      setCategories(catData || [])
      setLoading(false)
    }
    init()
  }, [router])

  const onChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    if (error) setError("")
  }

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (file) setImageFile(file)
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError("Product name is required"); return }
    if (!form.price || isNaN(Number(form.price))) { setError("Valid price is required"); return }
    if (!vendor) { setError("No vendor context"); return }

    setSubmitting(true)
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) { router.push("/login"); return }

      let image_url = null
      if (imageFile) {
        const { url } = await uploadVendorProductImage(imageFile, user.id)
        image_url = url
      }

      const { error: insertErr } = await supabase
        .from("products")
        .insert({
          name: form.name,
          price: Number(form.price),
          stock: Number(form.stock || 0),
          description: form.description || null,
          categories_id: form.categories_id || null,
          vendor_id: vendor.id,
          image_url,
          status: 'active',
        })

      if (insertErr) { setError(insertErr.message); return }

      router.push("/vendors")
    } catch (e) {
      setError("Failed to create product. Try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <Header />
        <div className="container">
          <div className={styles.container}>Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <Header />
      <div className="container">
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>New Product</h1>
            <p className={styles.subtitle}>Add a product to your shop</p>
          </div>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.card}>
            <form onSubmit={onSubmit} className={styles.form}>
              <div className={styles.group}>
                <label className={styles.label} htmlFor="name">Product Name *</label>
                <input className={styles.input} id="name" name="name" value={form.name} onChange={onChange} placeholder="e.g. Wireless Headset" />
              </div>
              <div className={styles.twoCol}>
                <div className={styles.group}>
                  <label className={styles.label} htmlFor="price">Price (₦) *</label>
                  <input className={styles.input} id="price" name="price" value={form.price} onChange={onChange} placeholder="0.00" />
                </div>
                <div className={styles.group}>
                  <label className={styles.label} htmlFor="stock">Stock</label>
                  <input className={styles.input} id="stock" name="stock" value={form.stock} onChange={onChange} placeholder="0" />
                </div>
              </div>
              <div className={styles.group}>
                <label className={styles.label} htmlFor="categories_id">Category</label>
                <select className={styles.select} id="categories_id" name="categories_id" value={form.categories_id} onChange={onChange}>
                  <option value="">Select a category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className={styles.group}>
                <label className={styles.label} htmlFor="description">Description</label>
                <textarea className={styles.textarea} id="description" name="description" rows={4} value={form.description} onChange={onChange} />
              </div>
              <div className={styles.group}>
                <label className={styles.label} htmlFor="image">Image</label>
                <input className={styles.file} id="image" type="file" accept="image/*" onChange={onFile} />
              </div>
              <div className={styles.actions}>
                <button type="button" className="btn btn-secondary" onClick={() => router.push("/vendors")}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Saving..." : "Create Product"}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
