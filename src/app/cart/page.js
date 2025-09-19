"use client"

import { useCart } from "../../../contexts/CartContext"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import supabase from "../../../lib/supabaseClient"
import FullPageLoader from "../../../components/FullPageLoader"
import styles from "./page.module.css"

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, getCartTotal, clearCart } = useCart()
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [user, setUser] = useState(null)
  const router = useRouter()
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [stateRegion, setStateRegion] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [errors, setErrors] = useState({ address: "", destination: "" })
  const [toast, setToast] = useState({ show: false, message: "", type: "success" })

  // Modal state
  const [modal, setModal] = useState({ open: false, title: "", message: "", status: "" })

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user || null)
    }
    loadUser()
  }, [])

  // Load default address for user from Supabase
  useEffect(() => {
    const loadDefaultAddress = async () => {
      if (!user) return
      try {
        const { data, error } = await supabase
          .from("addresses")
          .select("line1, city, state, postal_code, country, is_default, created_at")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
        if (!error && data && data.length > 0) {
          const a = data[0]
          setAddress(a.line1 || "")
          setCity(a.city || "")
          setStateRegion(a.state || "")
          setPostalCode(a.postal_code || "")
        }
      } catch (e) {
        // no-op for UX
      }
    }
    loadDefaultAddress()
  }, [user])

  // Dynamically load Paystack inline script when on cart page
  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.PaystackPop) return
    const script = document.createElement("script")
    script.src = "https://js.paystack.co/v1/inline.js"
    script.async = true
    document.body.appendChild(script)
    return () => {
      // Keep script for navigation; no cleanup needed
    }
  }, [])

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId)
    } else {
      updateQuantity(productId, newQuantity)
    }
  }

  const normalizeDestination = (stateVal, cityVal) => {
    const v = String(stateVal || cityVal || "").trim().toLowerCase()
    if (!v) return ""
    if (v.includes("international")) return "international"
    if (v.includes("lagos")) return "lagos"
    if (v.includes("abuja")) return "abuja"
    if (v.includes("nationwide")) return "nationwide"
    return "nationwide" // default for other Nigerian cities/states
  }

  const getShippingFee = (dest, postal) => {
    const base = { lagos: 1500, abuja: 2000, nationwide: 2500, international: 15000 }
    let fee = base[dest] || 0
    const p = (postal || "").trim()
    // Simple heuristic for smarter fees
    if (dest === "lagos" && /^10/.test(p)) fee = 1200
    if (dest === "abuja" && /^90/.test(p)) fee = 1800
    return fee
  }

  const validate = () => {
    const errs = { address: "", destination: "" }
    if (!address || address.trim().length < 8) errs.address = "Please enter a valid delivery address (min 8 characters)."
    if (!stateRegion) errs.destination = "Please select or enter a state/region."
    setErrors(errs)
    return !errs.address && !errs.destination
  }

  const openModal = (title, message, status) => {
    setModal({ open: true, title, message, status })
  }
  const closeModal = () => setModal(m => ({ ...m, open: false }))

  const verifyAndSaveOrder = async ({ reference, userId, address, destination, postalCode, normalizedDestination, shippingFee, subtotal, total }) => {
    try {
      const payload = {
        reference,
        subtotal,
        shipping_fee: shippingFee,
        total,
        address,
        destination,
        normalized_destination: normalizedDestination,
        postal_code: postalCode,
        items,
        city: city || null,
        stateRegion: stateRegion || null,
        user_id: userId,
      }
      const res = await fetch("/api/paystack/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const ct = res.headers.get("content-type") || ""
      let data
      if (ct.includes("application/json")) {
        data = await res.json()
      } else {
        const text = await res.text()
        throw new Error(`Server responded with ${res.status}. ${text.slice(0, 160)}`)
      }
      if (!res.ok) throw new Error(data?.error || "Verification failed")
      return data
    } catch (e) {
      throw e
    }
  }

  const handleCheckout = async () => {
    // Ensure latest auth state
    const { data: { user: current } } = await supabase.auth.getUser()
    if (!current) {
      router.push("/login?redirect=/cart")
      return
    }
    if (!validate()) return
    setIsCheckingOut(true)
    try {
      const subtotal = Number(getCartTotal() || 0)
      const normalized = normalizeDestination(stateRegion, city)
      const shippingFee = getShippingFee(normalized, postalCode)
      const total = subtotal + shippingFee
      if (!total || total <= 0) {
        openModal("Cart Empty", "Your cart total must be greater than 0.", "error")
        return
      }
      const key = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
      if (typeof window === "undefined" || !window.PaystackPop) {
        openModal("Payment Error", "Payment library not loaded. Please try again.", "error")
        return
      }
      if (!key) {
        openModal("Config Error", "Missing Paystack public key. Set NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY in .env.local", "error")
        return
      }

      // Create unique reference
      const reference = `KC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const pop = window.PaystackPop.setup({
        key,
        email: current.email,
        amount: Math.round(total * 100), // kobo
        currency: "NGN",
        ref: reference,
        callback: function (response) {
          // response.reference is provided by Paystack
          (async () => {
            try {
              const result = await verifyAndSaveOrder({
                reference: response?.reference || reference,
                userId: current.id,
                address,
                city,
                stateRegion,
                postalCode,
                normalizedDestination: normalized,
                shippingFee,
                subtotal,
                total,
              })
              const status = result?.status || "pending"
              if (status === "paid") {
                setToast({ show: true, type: "success", message: "Order placed successfully!" })
                openModal(
                  "Payment Successful",
                  `Your order has been placed successfully.\n\nShipping to: ${address}\nCity/State: ${city || "-"} / ${stateRegion}${postalCode ? ` (${postalCode})` : ""}`,
                  "success"
                )
                // Save as default address on server
                try {
                  await supabase.from("addresses").update({ is_default: false }).eq("user_id", current.id)
                  await supabase.from("addresses").insert({
                    user_id: current.id,
                    line1: address,
                    line2: null,
                    city: city || null,
                    state: stateRegion || null,
                    postal_code: postalCode || null,
                    country: normalizeDestination(stateRegion, city) === "international" ? "INTL" : "NG",
                    is_default: true,
                  })
                } catch (e) {
                  // Ignore save errors to not block UX
                }
                clearCart()
              } else if (status === "pending") {
                openModal("Payment Pending", "We couldn\'t confirm payment yet. Please check your orders later.", "warning")
              } else {
                openModal("Payment Failed", "Your payment was not successful.", "error")
              }
            } catch (e) {
              openModal("Verification Error", e.message || "Failed to verify payment.", "error")
            }
          })()
        },
        onClose: function () {
          // User closed the payment modal
          openModal("Payment Cancelled", "You closed the payment window. If money was deducted, it will be verified shortly.", "warning")
        },
      })
      pop.openIframe()
    } finally {
      setIsCheckingOut(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="container">
        <div className={styles.emptyCart}>
          <h1>Your Cart is Empty</h1>
          <p>Looks like you haven&apos;t added any items to your cart yet.</p>
          <Link href="/products" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      {isCheckingOut && <FullPageLoader message="Placing your order..." />}
      {toast.show && (
        <div style={{ position: "fixed", right: 16, bottom: 16, background: "#065f46", color: "white", padding: "12px 16px", borderRadius: 8, zIndex: 1100 }}>
          {toast.message}
        </div>
      )}
      {/* Modal */}
      {modal.open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "white", padding: 20, borderRadius: 8, width: "min(480px, 92vw)" }}>
            <h2 style={{ marginTop: 0 }}>{modal.title}</h2>
            <p style={{ color: modal.status === "success" ? "#065f46" : modal.status === "warning" ? "#92400e" : "#991b1b" }}>{modal.message}</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              {modal.status === "success" ? (
                <Link href="/profile?tab=orders" className="btn btn-primary" onClick={closeModal}>View Orders</Link>
              ) : null}
              <button className="btn" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.cartPage}>
        <h1>Shopping Cart</h1>

        <div className={styles.cartContent}>
          <div className={styles.cartItems}>
            {items.map((item) => (
              <div key={item.id} className={styles.cartItem}>
                <div className={styles.itemImage}>
                  <img src={item.image_url || item.image || "/placeholder.svg"} alt={item.name} />
                </div>

                <div className={styles.itemDetails}>
                  <h3>{item.name}</h3>
                  <p className={styles.itemVendor}>by {item.vendor}</p>
                  <p className={styles.itemPrice}>₦{Number(item.price || 0).toLocaleString()}</p>
                </div>

                <div className={styles.itemControls}>
                  <div className={styles.quantityControls}>
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      className={styles.quantityBtn}
                    >
                      -
                    </button>
                    <span className={styles.quantity}>{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      className={styles.quantityBtn}
                    >
                      +
                    </button>
                  </div>

                  <div className={styles.itemTotal}>₦{Number(item.price * item.quantity || 0).toLocaleString()}</div>

                  <button onClick={() => removeFromCart(item.id)} className={styles.removeBtn}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.cartSummary}>
            <h2>Order Summary</h2>

            <div className={styles.addressBlock}>
              <label htmlFor="shippingAddress">Shipping Address</label>
              <textarea
                id="shippingAddress"
                className="textarea"
                placeholder="Enter your delivery address"
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
              {errors.address ? <div className={styles.formError}>{errors.address}</div> : null}
              <div className={styles.destinationRow}>
                <label htmlFor="city">City (optional)</label>
                <input id="city" list="city-list" className="input" value={city} onChange={(e)=> setCity(e.target.value)} placeholder="e.g. Ikeja" />
                <datalist id="city-list">
                  <option value="Ikeja" />
                  <option value="Lekki" />
                  <option value="Victoria Island" />
                  <option value="Wuse" />
                  <option value="Garki" />
                  <option value="Port Harcourt" />
                </datalist>
              </div>
              <div className={styles.destinationRow}>
                <label htmlFor="state">State/Region</label>
                <input id="state" list="state-list" className="input" value={stateRegion} onChange={(e)=> setStateRegion(e.target.value)} placeholder="e.g. Lagos, Abuja, Nationwide, International" />
                <datalist id="state-list">
                  <option value="Lagos" />
                  <option value="Abuja" />
                  <option value="Ogun" />
                  <option value="Oyo" />
                  <option value="Rivers" />
                  <option value="Kano" />
                  <option value="Kaduna" />
                  <option value="Enugu" />
                  <option value="Nationwide" />
                  <option value="International" />
                </datalist>
              </div>
              {errors.destination ? <div className={styles.formError}>{errors.destination}</div> : null}
              <div className={styles.destinationRow}>
                <label htmlFor="postal">Postal Code (optional)</label>
                <input id="postal" className="input" placeholder="e.g. 100001" value={postalCode} onChange={(e)=> setPostalCode(e.target.value)} />
              </div>
              <p className={styles.addressHint}>We will ship to this address. Shipping fee depends on destination.</p>
            </div>

            <div className={styles.summaryRow}>
              <span>Subtotal:</span>
              <span>₦{Number(getCartTotal() || 0).toLocaleString()}</span>
            </div>

            <div className={styles.summaryRow}>
              <span>Shipping:</span>
              <span>₦{(() => { const fee = getShippingFee(normalizeDestination(stateRegion, city), postalCode); return Number(fee || 0).toLocaleString() })()}</span>
            </div>

            <div className={styles.summaryRow}>
              <span>Tax:</span>
              <span>₦0</span>
            </div>

            <div className={`${styles.summaryRow} ${styles.total}`}>
              <span>Total:</span>
              <span>₦{(() => { const subtotal = Number(getCartTotal() || 0); const fee = getShippingFee(normalizeDestination(stateRegion, city), postalCode); return Number(subtotal + fee).toLocaleString() })()}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isCheckingOut || !address || !stateRegion}
              className={`btn btn-primary ${styles.checkoutBtn}`}
            >
              {isCheckingOut ? "Processing..." : "Proceed to Checkout"}
            </button>

            <Link href="/products" className={styles.continueShoppingLink}>
              Continue Shopping
            </Link>
            <Link href="/profile?tab=orders" className={styles.continueShoppingLink}>
              View my orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
