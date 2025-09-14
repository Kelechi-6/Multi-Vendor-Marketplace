"use client"

import { createContext, useContext, useReducer, useEffect, useState } from "react"
import supabase from "../lib/supabaseClient"

const CartContext = createContext()

const cartReducer = (state, action) => {
  switch (action.type) {
    case "ADD_TO_CART":
      const existingItem = state.items.find((item) => item.id === action.payload.id)
      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.payload.id ? { ...item, quantity: item.quantity + 1 } : item,
          ),
        }
      }
      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      }

    case "REMOVE_FROM_CART":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      }

    case "UPDATE_QUANTITY":
      return {
        ...state,
        items: state.items
          .map((item) =>
            item.id === action.payload.id ? { ...item, quantity: Math.max(0, action.payload.quantity) } : item,
          )
          .filter((item) => item.quantity > 0),
      }

    case "CLEAR_CART":
      return {
        ...state,
        items: [],
      }

    case "LOAD_CART":
      return {
        ...state,
        items: action.payload || [],
      }

    default:
      return state
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] })
  const [userId, setUserId] = useState(null)

  // Load session/user id
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || null)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id || null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Load cart: prefer DB when logged in, otherwise localStorage fallback
  useEffect(() => {
    const loadCart = async () => {
      if (userId) {
        // Load from DB and hydrate items with product info
        const { data: dbRows, error } = await supabase
          .from("cart")
          .select("product_id, quantity")
          .eq("user_id", userId)
        if (!error && dbRows && dbRows.length > 0) {
          const productIds = dbRows.map(r => r.product_id)
          const { data: products } = await supabase
            .from("products")
            .select("id, name, price, image_url, image, categories_id")
            .in("id", productIds)
          const items = dbRows.map(r => {
            const p = products?.find(pr => pr.id === r.product_id)
            return p ? { id: p.id, name: p.name, price: p.price, image_url: p.image_url || p.image || null, categories_id: p.categories_id, quantity: r.quantity || 1 } : null
          }).filter(Boolean)
          dispatch({ type: "LOAD_CART", payload: items })
          // Also cache to localStorage
          localStorage.setItem("keecee-cart", JSON.stringify(items))
          return
        }
      }
      // Fallback: localStorage
      const savedCart = localStorage.getItem("keecee-cart")
      if (savedCart) {
        const items = JSON.parse(savedCart)
        const missing = items.filter(it => !it.image_url && !it.image)
        if (missing.length > 0) {
          const ids = missing.map(it => it.id)
          const { data: products } = await supabase
            .from("products")
            .select("id, image_url, image, name, price, categories_id")
            .in("id", ids)
          const merged = items.map(it => {
            if (it.image_url || it.image) return it
            const p = products?.find(pr => pr.id === it.id)
            return p ? { ...it, image_url: p.image_url || p.image || null, name: it.name || p.name, price: it.price ?? p.price, categories_id: it.categories_id ?? p.categories_id } : it
          })
          dispatch({ type: "LOAD_CART", payload: merged })
          localStorage.setItem("keecee-cart", JSON.stringify(merged))
        } else {
          dispatch({ type: "LOAD_CART", payload: items })
        }
      }
    }
    loadCart()
  }, [userId])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("keecee-cart", JSON.stringify(state.items))
  }, [state.items])

  const addToCart = async (product) => {
    dispatch({ type: "ADD_TO_CART", payload: product })
    // Persist to DB if logged in
    try {
      if (!userId) return
      // Check if a row exists
      const { data: existing } = await supabase
        .from("cart")
        .select("product_id, quantity")
        .eq("user_id", userId)
        .eq("product_id", product.id)
        .maybeSingle()
      if (existing) {
        // Increment quantity
        await supabase
          .from("cart")
          .update({ quantity: (existing.quantity || 1) + 1 })
          .eq("user_id", userId)
          .eq("product_id", product.id)
      } else {
        await supabase
          .from("cart")
          .insert({
            user_id: userId,
            product_id: product.id,
            categories_id: product.categories_id || null,
            quantity: 1,
          })
      }
    } catch (_e) {
      // ignore DB errors to keep UX smooth; local state is already updated
    }
  }

  const removeFromCart = async (productId) => {
    dispatch({ type: "REMOVE_FROM_CART", payload: productId })
    try {
      if (!userId) return
      await supabase
        .from("cart")
        .delete()
        .eq("user_id", userId)
        .eq("product_id", productId)
    } catch (_e) {}
  }

  const updateQuantity = async (productId, quantity) => {
    dispatch({ type: "UPDATE_QUANTITY", payload: { id: productId, quantity } })
    try {
      if (!userId) return
      await supabase
        .from("cart")
        .update({ quantity })
        .eq("user_id", userId)
        .eq("product_id", productId)
    } catch (_e) {}
  }

  const clearCart = () => {
    dispatch({ type: "CLEAR_CART" })
  }

  const getCartTotal = () => {
    return state.items.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getCartItemsCount = () => {
    return state.items.reduce((count, item) => count + item.quantity, 0)
  }

  const value = {
    items: state.items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartItemsCount,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
