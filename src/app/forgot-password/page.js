"use client"

import { useState } from "react"
import Header from "../../../components/Header"
import supabase from "../../../lib/supabaseClient"
import FullPageLoader from "../../../components/FullPageLoader"
import styles from "./page.module.css"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState({ loading: false, message: "" })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !email.includes("@")) {
      setStatus({ loading: false, message: "Please enter a valid email." })
      return
    }
    setStatus({ loading: true, message: "" })
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      })
      if (error) throw error
      setStatus({ loading: false, message: "Password reset email sent. Check your inbox." })
    } catch (e) {
      setStatus({ loading: false, message: e.message || "Failed to send reset email." })
    }
  }

  return (
    <div className={styles.authPage}>
      <Header />
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Forgot Password</h1>
            <p className={styles.subtitle}>Enter your email and we'll send you a secure link to reset your password.</p>
          </div>
          {status.message && (
            <div className={`${styles.message} ${status.message.includes('sent') ? styles.success : styles.error}`}>
              {status.message}
            </div>
          )}
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label} htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className={styles.submitBtn} type="submit" disabled={status.loading}>
              {status.loading ? "Sending..." : "Send Reset Link"}
            </button>
            <div className={styles.meta}>
              <a href="/login">Back to Login</a>
              <a href="/register">Create account</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
