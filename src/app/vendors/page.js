"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Header from "../../../components/Header"
import supabase from "../../../lib/supabaseClient"
import FullPageLoader from "../../../components/FullPageLoader"
import { uploadVendorProductImage, uploadAvatarToBucket } from "../../../lib/uploadImage"
import styles from "./page.module.css"

export default function VendorDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [vendor, setVendor] = useState(null)
  const [products, setProducts] = useState([])
  const [error, setError] = useState("")
  // Profile state
  const [userProfile, setUserProfile] = useState({ id: null, avatar_url: "", email: "", username: "" })
  const [profileForm, setProfileForm] = useState({ shop_name: "", display_name: "", bio: "" })
  const [avatarFile, setAvatarFile] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)
  // Product editing
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({
    name: "",
    price: "",
    stock: "",
    description: "",
    categories_id: "",
    image_url: "",
  })
  const [categories, setCategories] = useState([])
  const [editImageFile, setEditImageFile] = useState(null)
  const [submittingId, setSubmittingId] = useState(null)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser()
        if (authErr || !user) {
          router.push("/login")
          return
        }
        // Load user profile (for avatar)
        const { data: u } = await supabase
          .from("users")
          .select("id, avatar_url, email, username")
          .eq("id", user.id)
          .maybeSingle()
        setUserProfile(u || { id: user.id, avatar_url: "", email: "", username: "" })

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
        setProfileForm({
          shop_name: vendorRow.shop_name || "",
          display_name: vendorRow.display_name || "",
          bio: vendorRow.bio || "",
        })

        // Fetch products
        const { data: prods, error: prodErr } = await supabase
          .from("products")
          .select("id, name, price, stock, status, image_url, categories_id, description")
          .eq("vendor_id", vendorRow.id)
          .order("name", { ascending: true })
        if (prodErr) throw prodErr
        setProducts(prods || [])
        // Fetch categories for dropdown
        const { data: catData, error: catErr } = await supabase
          .from("categories")
          .select("id, name")
          .order("name")
        if (catErr) throw catErr
        setCategories(catData || [])
      } catch (e) {
        setError(e.message || "Failed to load vendor dashboard")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router])

  const saveProfile = async () => {
    if (!vendor || !userProfile?.id) return
    setSavingProfile(true)
    setError("")
    try {
      // If avatar selected, upload and update users.avatar_url
      if (avatarFile) {
        const { url } = await uploadAvatarToBucket(avatarFile, userProfile.id)
        if (!url) throw new Error("Failed to upload avatar")
        const { error: upUserErr } = await supabase
          .from("users")
          .update({ avatar_url: url })
          .eq("id", userProfile.id)
        if (upUserErr) throw upUserErr
        setUserProfile(prev => ({ ...prev, avatar_url: url }))
        setAvatarFile(null)
      }
      // Update vendor profile fields
      const { error: upVendErr } = await supabase
        .from("vendors")
        .update({
          shop_name: profileForm.shop_name || null,
          display_name: profileForm.display_name || null,
          bio: profileForm.bio || null,
        })
        .eq("id", vendor.id)
      if (upVendErr) throw upVendErr
      setVendor(prev => ({ ...prev, ...profileForm }))
    } catch (e) {
      setError(e.message || "Failed to save profile")
    } finally {
      setSavingProfile(false)
    }
  }

  const startEdit = (p) => {
    setEditingId(p.id)
    setEditForm({
      name: p.name || "",
      price: String(p.price ?? ""),
      stock: String(p.stock ?? ""),
      description: p.description || "",
      categories_id: p.categories_id || "",
      image_url: p.image_url || "",
    })
    setEditImageFile(null)
    if (error) setError("")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditImageFile(null)
    setEditForm({ name: "", price: "", stock: "", description: "", categories_id: "", image_url: "" })
  }

  const saveEdit = async (id) => {
    if (!vendor) return
    setSubmittingId(id)
    try {
      const payload = {
        name: editForm.name,
        price: editForm.price === "" ? null : Number(editForm.price),
        stock: editForm.stock === "" ? null : Number(editForm.stock),
        description: editForm.description || null,
        categories_id: editForm.categories_id || null,
        image_url: editForm.image_url || null,
      }
      if (editImageFile) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push("/login"); return }
        const { url } = await uploadVendorProductImage(editImageFile, user.id)
        payload.image_url = url
      }
      const { error: upErr } = await supabase
        .from("products")
        .update(payload)
        .eq("id", id)
        .eq("vendor_id", vendor.id)
      if (upErr) { setError(upErr.message); return }
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...payload } : p))
      cancelEdit()
    } catch (e) {
      setError(e.message || "Failed to update product")
    } finally {
      setSubmittingId(null)
    }
  }

  const deleteProduct = async (id) => {
    if (!vendor) return
    if (!confirm("Delete this product?")) return
    setSubmittingId(id)
    try {
      const { error: delErr } = await supabase
        .from("products")
        .delete()
        .eq("id", id)
        .eq("vendor_id", vendor.id)
      if (delErr) { setError(delErr.message); return }
      setProducts(prev => prev.filter(p => p.id !== id))
      if (editingId === id) cancelEdit()
    } catch (e) {
      setError(e.message || "Failed to delete product")
    } finally {
      setSubmittingId(null)
    }
  }

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
    <div className={styles.page}>
      <Header />
      <div className="container">
        <div className={styles.wrapper}>
          {/* Profile editor */}
          <div className={styles.profileCard}>
            <div>
              <img
                src={avatarFile ? URL.createObjectURL(avatarFile) : (userProfile.avatar_url || "/user-avatar.png")}
                alt="Avatar"
                className={styles.profileAvatar}
              />
            </div>
            <div className={styles.profileFields}>
              <div className={styles.profileTwoCol}>
                <input className="input" placeholder="Shop name" value={profileForm.shop_name} onChange={e=>setProfileForm(f=>({...f, shop_name:e.target.value}))} />
                <input className="input" placeholder="Display name" value={profileForm.display_name} onChange={e=>setProfileForm(f=>({...f, display_name:e.target.value}))} />
              </div>
              <textarea className="textarea" rows={3} placeholder="Bio" value={profileForm.bio} onChange={e=>setProfileForm(f=>({...f, bio:e.target.value}))} />
              <div className={styles.editImageRow}>
                <input type="file" accept="image/*" onChange={e=>setAvatarFile(e.target.files?.[0] || null)} />
                <div className={styles.profileHint}>This picture is also used as your shop profile image.</div>
              </div>
            </div>
            <div className={styles.profileActions}>
              <button className="btn btn-primary" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save Profile'}</button>
            </div>
          </div>

          {/* Header Row */}
          <div className={styles.headerRow}>
            <div className={styles.headerTitle}>
              <div className={styles.sectionDivider}>
                <div className="line" />
                <div>Your Products</div>
                <div className="line" />
              </div>
            </div>
            <div className={styles.headerActions}>
              <Link href="/vendors/products/new" className="btn btn-primary">Add Product</Link>
            </div>
          </div>

          {/* Products List */}
          <div className={styles.productList}>
            {products.length === 0 ? (
              <div className={styles.emptyState}>No products yet. Click "Add Product" to create your first item.</div>
            ) : (
              <div className={styles.productItems}>
                {products.map(p => {
                  const isEditing = editingId === p.id
                  return (
                    <div key={p.id} className={styles.productItem}>
                      <img
                        src={(isEditing && editImageFile) ? URL.createObjectURL(editImageFile) : (isEditing ? editForm.image_url : p.image_url) || "/user-avatar.png"}
                        alt={p.name}
                        className={styles.productThumb}
                      />
                      <div>
                        {!isEditing ? (
                          <>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <div className={styles.productMeta}>{p.status} • Stock: {p.stock} • ₦{Number(p.price || 0).toLocaleString()}</div>
                            {p.description ? <div className={styles.productDescription}>{p.description}</div> : null}
                            {p.categories_id && categories.length>0 ? (
                              <div className={styles.productCategory}>
                                Category: {categories.find(c=>c.id===p.categories_id)?.name || p.categories_id}
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <div className={styles.editGrid}>
                            <div className={styles.editTwoCol}>
                              <input className="input" placeholder="Name" value={editForm.name} onChange={e=>setEditForm(f=>({...f, name:e.target.value}))} />
                              <input className="input" placeholder="Price" value={editForm.price} onChange={e=>setEditForm(f=>({...f, price:e.target.value}))} />
                            </div>
                            <div className={styles.editTwoCol}>
                              <input className="input" placeholder="Stock" value={editForm.stock} onChange={e=>setEditForm(f=>({...f, stock:e.target.value}))} />
                              <select className="input" value={editForm.categories_id} onChange={e=>setEditForm(f=>({...f, categories_id:e.target.value}))}>
                                <option value="">Select category</option>
                                {categories.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                            <textarea className="textarea" rows={2} placeholder="Description" value={editForm.description} onChange={e=>setEditForm(f=>({...f, description:e.target.value}))} />
                            <div className={styles.editImageRow}>
                              <input type="file" accept="image/*" onChange={e=>setEditImageFile(e.target.files?.[0] || null)} />
                              {(editImageFile || editForm.image_url) && (
                                <img src={editImageFile ? URL.createObjectURL(editImageFile) : editForm.image_url} alt="Preview" className={styles.editPreview} />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className={styles.productActions}>
                        {!isEditing ? (
                          <>
                            <button className="btn btn-secondary" onClick={() => startEdit(p)}>Edit</button>
                            <button className="btn btn-danger" onClick={() => deleteProduct(p.id)} disabled={submittingId===p.id}>Delete</button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-primary" onClick={() => saveEdit(p.id)} disabled={submittingId===p.id}>Save</button>
                            <button className="btn" onClick={cancelEdit}>Cancel</button>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
