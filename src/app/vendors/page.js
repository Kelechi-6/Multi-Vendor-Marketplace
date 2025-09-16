"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Header from "../../../components/Header"
import supabase from "../../../lib/supabaseClient"
import FullPageLoader from "../../../components/FullPageLoader"
import { uploadVendorProductImage, uploadAvatarToBucket } from "../../../lib/uploadImage"

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
    <div>
      <Header />
      <div className="container" style={{ padding: "2rem 0" }}>
        {/* Profile editor */}
        <div style={{ display:'grid', gridTemplateColumns:'100px 1fr auto', gap:16, alignItems:'center', border:'1px solid var(--border)', padding:16, borderRadius:8, background:'var(--card)' }}>
          <div>
            <img src={avatarFile ? URL.createObjectURL(avatarFile) : (userProfile.avatar_url || "/user-avatar.png")} alt="Avatar" style={{ width: 100, height: 100, objectFit:'cover', borderRadius: 999, border:'1px solid var(--border)' }} />
          </div>
          <div style={{ display:'grid', gap:8 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <input className="input" placeholder="Shop name" value={profileForm.shop_name} onChange={e=>setProfileForm(f=>({...f, shop_name:e.target.value}))} />
              <input className="input" placeholder="Display name" value={profileForm.display_name} onChange={e=>setProfileForm(f=>({...f, display_name:e.target.value}))} />
            </div>
            <textarea className="textarea" rows={3} placeholder="Bio" value={profileForm.bio} onChange={e=>setProfileForm(f=>({...f, bio:e.target.value}))} />
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <input type="file" accept="image/*" onChange={e=>setAvatarFile(e.target.files?.[0] || null)} />
              <div style={{ fontSize:12, color:'var(--muted-foreground)' }}>This picture is also used as your shop profile image.</div>
            </div>
          </div>
          <div>
            <button className="btn btn-primary" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? 'Saving...' : 'Save Profile'}</button>
          </div>
        </div>

        <div style={{ marginTop: 20, display:'flex', alignItems:'center', gap:12, color:'var(--muted-foreground)' }}>
          <div style={{ height:1, background:'var(--border)', flex:1 }} />
          <div>Your Products</div>
          <div style={{ height:1, background:'var(--border)', flex:1 }} />
        </div>

        <div style={{ marginTop: "1.25rem" }}>
          {products.length === 0 ? (
            <div style={{ textAlign:'center', color:'var(--muted-foreground)' }}>No products yet. Click &quot;Add Product&quot; to create your first item.</div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {products.map(p => {
                const isEditing = editingId === p.id
                return (
                  <div key={p.id} style={{ display: "grid", gridTemplateColumns: "80px 1fr auto", gap: "1rem", alignItems: "center", border: "1px solid var(--border)", padding: "0.75rem", borderRadius: 8, background:'var(--card)' }}>
                    <img src={(isEditing && editImageFile) ? URL.createObjectURL(editImageFile) : (isEditing ? editForm.image_url : p.image_url) || "/user-avatar.png"} alt={p.name} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6 }} />
                    <div>
                      {!isEditing ? (
                        <>
                          <div style={{ fontWeight: 600 }}>{p.name}</div>
                          <div style={{ color: "var(--muted-foreground)" }}>{p.status} • Stock: {p.stock} • ₦{Number(p.price || 0).toLocaleString()}</div>
                          {p.description ? <div style={{ marginTop: 6, color: "var(--muted-foreground)", fontSize: 14 }}>{p.description}</div> : null}
                          {p.categories_id && categories.length>0 ? (
                            <div style={{ marginTop: 4, fontSize: 12, color:'var(--muted-foreground)' }}>
                              Category: {categories.find(c=>c.id===p.categories_id)?.name || p.categories_id}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <input className="input" placeholder="Name" value={editForm.name} onChange={e=>setEditForm(f=>({...f, name:e.target.value}))} />
                            <input className="input" placeholder="Price" value={editForm.price} onChange={e=>setEditForm(f=>({...f, price:e.target.value}))} />
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <input className="input" placeholder="Stock" value={editForm.stock} onChange={e=>setEditForm(f=>({...f, stock:e.target.value}))} />
                            <select className="input" value={editForm.categories_id} onChange={e=>setEditForm(f=>({...f, categories_id:e.target.value}))}>
                              <option value="">Select category</option>
                              {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          </div>
                          <textarea className="textarea" rows={2} placeholder="Description" value={editForm.description} onChange={e=>setEditForm(f=>({...f, description:e.target.value}))} />
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <input type="file" accept="image/*" onChange={e=>setEditImageFile(e.target.files?.[0] || null)} />
                            {(editImageFile || editForm.image_url) && (
                              <img src={editImageFile ? URL.createObjectURL(editImageFile) : editForm.image_url} alt="Preview" style={{ width: 48, height: 48, objectFit:'cover', borderRadius:6, border:'1px solid var(--border)' }} />
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
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
  )
}
