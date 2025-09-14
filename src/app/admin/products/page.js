"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import AdminSidebar from "../../../../components/AdminSidebar"
import supabase from "../../../../lib/supabaseClient"
import ui from "../../../../components/AdminCommon.module.css"
import Header from "../../../../components/Header"
import FullPageLoader from "../../../../components/FullPageLoader"
import { uploadImageToItemsBucket } from "../../../../lib/uploadImage"

export default function AdminProductsPage() {
  const router = useRouter()
  const [admin, setAdmin] = useState(null)
  const [pending, setPending] = useState([])
  const [active, setActive] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState("pending")
  const [msg, setMsg] = useState("")
  const [vendors, setVendors] = useState([])
  const [form, setForm] = useState({
    id: null,
    name: "",
    price: "",
    vendor_id: "",
    status: "inactive",
    description: "",
    image_url: "",
    stock: ""
  })
  const [submitting, setSubmitting] = useState(false)
  const [imageFile, setImageFile] = useState(null)

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
        const { data: vendorRows, error: vendorErr } = await supabase
          .from("vendors")
          .select("id, shop_name")
          .order("shop_name", { ascending: true })
        if (vendorErr) throw vendorErr
        setVendors(vendorRows || [])

        const [{ data: pendingRows, error: pErr }, { data: activeRows, error: aErr }] = await Promise.all([
          supabase
            .from("products")
            .select("id, name, price, status, vendor_id, created_at, vendors:vendor_id(shop_name)")
            .in("status", ["inactive", "pending"])
            .order("created_at", { ascending: false }),
          supabase
            .from("products")
            .select("id, name, price, status, vendor_id, created_at, vendors:vendor_id(shop_name)")
            .eq("status", "active")
            .order("created_at", { ascending: false })
        ])
        if (pErr) throw pErr
        if (aErr) throw aErr
        setPending(pendingRows || [])
        setActive(activeRows || [])
      } catch (e) {
        setError(e.message)
      } finally { setLoading(false) }
    }
    init()
  }, [router])

  const updateProduct = async (id, status) => {
    setMsg("")
    const { error } = await supabase.from("products").update({ status }).eq("id", id)
    if (error) setMsg(`Failed: ${error.message}`)
    else {
      setPending(prev => prev.filter(p => p.id !== id))
      if (status === 'active') {
        const { data } = await supabase
          .from("products")
          .select("id, name, price, status, vendor_id, created_at, vendors:vendor_id(shop_name)")
          .eq("id", id)
          .maybeSingle()
        if (data) setActive(prev => [data, ...prev])
      }
      setMsg(`Updated product ${id.slice(0,8)} -> ${status}`)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg("")
    setSubmitting(true)
    try {
      const payload = {
        name: form.name,
        price: Number(form.price || 0),
        vendor_id: form.vendor_id || null,
        status: form.status || 'inactive',
        description: form.description || null,
        image_url: form.image_url || null,
        stock: form.stock === "" ? null : Number(form.stock)
      }

      // Upload image if a file is selected
      if (imageFile) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Not authenticated")
        const { url } = await uploadImageToItemsBucket(imageFile, user.id)
        if (!url) throw new Error("Failed to obtain image URL")
        payload.image_url = url
      }

      if (form.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", form.id)
        if (error) throw error
        setMsg("Product updated")
      } else {
        const { error } = await supabase.from("products").insert(payload)
        if (error) throw error
        setMsg("Product created")
      }
      const [{ data: pendingRows }, { data: activeRows }] = await Promise.all([
        supabase
          .from("products")
          .select("id, name, price, status, vendor_id, created_at, vendors:vendor_id(shop_name)")
          .in("status", ["inactive", "pending"])
          .order("created_at", { ascending: false }),
        supabase
          .from("products")
          .select("id, name, price, status, vendor_id, created_at, vendors:vendor_id(shop_name)")
          .eq("status", "active")
          .order("created_at", { ascending: false })
      ])
      setPending(pendingRows || [])
      setActive(activeRows || [])
      setForm({ id: null, name: "", price: "", vendor_id: "", status: "inactive", description: "", image_url: "", stock: "" })
      setImageFile(null)
    } catch (err) {
      setMsg(`Failed: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (p) => {
    setForm({
      id: p.id,
      name: p.name || "",
      price: p.price ?? "",
      vendor_id: p.vendor_id || "",
      status: p.status || "inactive",
      description: p.description || "",
      image_url: p.image_url || "",
      stock: p.stock ?? ""
    })
    setTab(p.status === 'active' ? 'active' : 'pending')
  }

  const handleDelete = async (id) => {
    if (!confirm("Delete this product?")) return
    setSubmitting(true)
    setMsg("")
    try {
      const { error } = await supabase.from("products").delete().eq("id", id)
      if (error) throw error
      setPending(prev => prev.filter(p => p.id !== id))
      setActive(prev => prev.filter(p => p.id !== id))
      setMsg("Product deleted")
    } catch (err) {
      setMsg(`Failed: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (!admin) return <FullPageLoader message="Verifying admin..." />

  return (
    <>
      <Header />
      <div className={ui.adminLayout}>
        <AdminSidebar />
        <main className={ui.main}>
        <div className={ui.pageHeader}>
          <h1 className={ui.pageTitle}>Products</h1>
          <div className={ui.toolbar}>
            <button className={`${ui.btnSm} ${tab==='pending'?ui.btnPrimary:''}`} onClick={()=>setTab('pending')}>Pending</button>
            <button className={`${ui.btnSm} ${tab==='active'?ui.btnPrimary:''}`} onClick={()=>setTab('active')}>Active</button>
          </div>
        </div>
        {msg && <div className={ui.notice} style={{ marginBottom: 12 }}>{msg}</div>}
        {loading && <FullPageLoader message="Loading products..." />}
        {error && <div className={ui.notice}>{error}</div>}

        {/* Product form */}
        {!loading && (
          <div className={ui.card} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight:600, marginBottom: 8 }}>{form.id ? 'Edit product' : 'New product'}</div>
            <form onSubmit={handleSubmit} className={ui.formGrid}>
              <div className={ui.formControl}>
                <label className={ui.label}>Name</label>
                <input className={ui.input} value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} required />
              </div>
              <div className={ui.formControl}>
                <label className={ui.label}>Price</label>
                <input className={ui.input} type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm(f=>({...f, price:e.target.value}))} required />
              </div>
              <div className={ui.formControl}>
                <label className={ui.label}>Vendor</label>
                <select className={ui.input} value={form.vendor_id} onChange={e=>setForm(f=>({...f, vendor_id:e.target.value}))} required>
                  <option value="">Select vendor</option>
                  {vendors.map(v=> (
                    <option key={v.id} value={v.id}>{v.shop_name}</option>
                  ))}
                </select>
              </div>
              <div className={ui.formControl}>
                <label className={ui.label}>Status</label>
                <select className={ui.input} value={form.status} onChange={e=>setForm(f=>({...f, status:e.target.value}))}>
                  <option value="inactive">inactive</option>
                  <option value="pending">pending</option>
                  <option value="active">active</option>
                  <option value="rejected">rejected</option>
                </select>
              </div>
              <div className={ui.formControl}>
                <label className={ui.label}>Stock</label>
                <input className={ui.input} type="number" min="0" step="1" value={form.stock} onChange={e=>setForm(f=>({...f, stock:e.target.value}))} />
              </div>
              <div className={ui.formControl}>
                <label className={ui.label}>Product image</label>
                <input className={ui.input} type="file" accept="image/*" onChange={e=>setImageFile(e.target.files?.[0] || null)} />
                {(imageFile || form.image_url) && (
                  <div style={{ marginTop: 8 }}>
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : form.image_url}
                      alt="Preview"
                      style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
                    />
                  </div>
                )}
              </div>
              <div className={ui.formControl} style={{ gridColumn: '1 / -1' }}>
                <label className={ui.label}>Description</label>
                <textarea className={ui.textarea} rows={3} value={form.description} onChange={e=>setForm(f=>({...f, description:e.target.value}))} />
              </div>
              <div style={{ gridColumn: '1 / -1', display:'flex', gap:8 }}>
                <button className={`${ui.btnSm} ${ui.btnPrimary}`} type="submit" disabled={submitting}>{form.id ? 'Update' : 'Create'}</button>
                {form.id && <button type="button" className={`${ui.btnSm}`} onClick={()=>{ setForm({ id: null, name: "", price: "", vendor_id: "", status: "inactive", description: "", image_url: "", stock: "" }); setImageFile(null); }}>Cancel</button>}
              </div>
            </form>
          </div>
        )}

        {!loading && tab === 'pending' && (
          <div className={ui.cardList}>
            {pending.length === 0 ? <div className={ui.empty}>No pending products</div> : pending.map(p => (
              <div key={p.id} className={ui.card}>
                <div>
                  <div style={{ fontWeight:600 }}>{p.name}</div>
                  <div>${Number(p.price||0).toLocaleString()}</div>
                  <div>Vendor: {p.vendors?.shop_name || 'Unknown'}</div>
                </div>
                <div className={ui.actions}>
                  <button className={`${ui.btnSm} ${ui.btnPrimary}`} onClick={()=>updateProduct(p.id,'active')}>Approve</button>
                  <button className={`${ui.btnSm}`} onClick={()=>handleEdit(p)}>Edit</button>
                  <button className={`${ui.btnSm} ${ui.btnDanger}`} onClick={()=>updateProduct(p.id,'rejected')}>Reject</button>
                  <button className={`${ui.btnSm} ${ui.btnDanger}`} onClick={()=>handleDelete(p.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && tab === 'active' && (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead className={ui.thead}>
                <tr>
                  <th className={ui.th}>ID</th>
                  <th className={ui.th}>Name</th>
                  <th className={ui.th}>Price</th>
                  <th className={ui.th}>Vendor</th>
                  <th className={ui.th}>Status</th>
                  <th className={ui.th}>Created</th>
                  <th className={ui.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {active.map(p => (
                  <tr key={p.id}>
                    <td className={ui.td}>{p.id.slice(0,8)}</td>
                    <td className={ui.td}>{p.name}</td>
                    <td className={ui.td}>${Number(p.price||0).toLocaleString()}</td>
                    <td className={ui.td}>{p.vendors?.shop_name || 'Unknown'}</td>
                    <td className={ui.td}>{p.status}</td>
                    <td className={ui.td}>{new Date(p.created_at).toLocaleString()}</td>
                    <td className={ui.td}>
                      <div style={{ display:'flex', gap:8 }}>
                        <button className={`${ui.btnSm}`} onClick={()=>handleEdit(p)}>Edit</button>
                        <button className={`${ui.btnSm} ${ui.btnDanger}`} onClick={()=>handleDelete(p.id)}>Delete</button>
                      </div>
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
