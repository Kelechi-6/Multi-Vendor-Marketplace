import { NextResponse } from "next/server"

// NOTE: For production, prefer server-side user verification instead of trusting client-provided user_id.
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY

async function verifyWithPaystack(reference) {
  const resp = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    // Cache-busting
    next: { revalidate: 0 },
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Paystack verify failed: ${resp.status} ${text}`)
  }
  return resp.json()
}

// Lazy import Supabase client on server; using anon key from env if available
import { createClient } from "@supabase/supabase-js"

export async function POST(req) {
  try {
    const body = await req.json()
    const {
      reference,
      total,
      items,
      user_id,
      address,
      destination,
      normalized_destination,
      postal_code,
      shipping_fee,
      subtotal,
      city,
      stateRegion,
      shippingCity,
      shippingState,
    } = body || {}
    if (!reference) return NextResponse.json({ error: "Missing reference" }, { status: 400 })
    if (!user_id) return NextResponse.json({ error: "Missing user_id" }, { status: 400 })

    if (!PAYSTACK_SECRET_KEY) {
      return NextResponse.json({ error: "Server not configured with PAYSTACK_SECRET_KEY" }, { status: 500 })
    }

    // Create Supabase client with service role inside handler to avoid module-scope crashes
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server not configured with Supabase Service Role" }, { status: 500 })
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

    const verify = await verifyWithPaystack(reference)
    const data = verify?.data
    const paystackStatus = data?.status // success, failed, abandoned

    let orderStatus = "pending"
    if (paystackStatus === "success") orderStatus = "paid"
    else if (paystackStatus === "failed") orderStatus = "failed"
    else if (paystackStatus === "abandoned") orderStatus = "pending"

    // Insert order row
    const totalAmount = Number(total || 0)
    let productsJson = null
    try {
      productsJson = JSON.stringify(items || [])
    } catch (_) {
      productsJson = null
    }

    // Prepare shipping details (will try to insert as columns/JSON if available)
    const shipping = {
      address: address || null,
      city: shippingCity || city || null,
      state: shippingState || stateRegion || destination || null,
      postal_code: postal_code || null,
      normalized_destination: normalized_destination || null,
      shipping_fee: Number(shipping_fee || 0),
      subtotal: Number(subtotal || 0),
      total: totalAmount,
    }

    // Attempt to insert with shipping JSON column if exists; fall back if it doesn't exist
    let insertError = null
    let orderRow = null
    try {
      const { data: inserted, error } = await supabase
        .from("orders")
        .insert({
          user_id,
          status: orderStatus,
          total_amount: totalAmount,
          products: productsJson,
          shipping, // if a jsonb column named 'shipping' exists this will work
          shipping_address: address || null,
          shipping_city: shipping.city || null,
          shipping_state: shipping.state || null,
          shipping_postal_code: shipping.postal_code || null,
          shipping_fee: shipping.shipping_fee || null,
        })
        .select("*")
        .maybeSingle()
      insertError = error
      orderRow = inserted
    } catch (e) {
      insertError = e
    }

    if (insertError) {
      // Retry without shipping-specific columns; embed shipping into products JSON to avoid data loss
      let productsWithShipping = null
      try {
        productsWithShipping = JSON.stringify({ items: items || [], shipping })
      } catch (_) {
        productsWithShipping = productsJson
      }
      // Retry without products column
      const { data: inserted2, error: err2 } = await supabase
        .from("orders")
        .insert({ user_id, status: orderStatus, total_amount: totalAmount, products: productsWithShipping })
        .select("*")
        .maybeSingle()
      if (err2) {
        return NextResponse.json({ error: err2.message || "Failed to save order" }, { status: 500 })
      }
      orderRow = inserted2
    }

    return NextResponse.json({ status: orderStatus, order: orderRow, paystack: data })
  } catch (e) {
    return NextResponse.json({ error: e.message || "Verification failed" }, { status: 500 })
  }
}
