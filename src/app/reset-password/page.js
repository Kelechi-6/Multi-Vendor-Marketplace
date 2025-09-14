"use client"

import { useEffect, useState } from "react"
import Header from "../../../components/Header"
import supabase from "../../../lib/supabaseClient"
import styles from "./page.module.css"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [status, setStatus] = useState({ loading: false, message: "" })
  const [sessionReady, setSessionReady] = useState(false)

  useEffect(() => {
    // When the user returns from email link, Supabase session should be set by /auth/callback
    // We can still check current user before showing form
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setSessionReady(!!user)
    }
    check()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password.length < 8) {
      setStatus({ loading: false, message: "Password must be at least 8 characters." })
      return
    }
    if (password !== confirm) {
      setStatus({ loading: false, message: "Passwords do not match." })
      return
    }

    setStatus({ loading: true, message: "" })
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setStatus({ loading: false, message: "Password updated successfully. Redirecting to login..." })
      // Redirect after a short delay
      setTimeout(() => {
        window.location.href = "/login"
      }, 1600)
    } catch (e) {
      setStatus({ loading: false, message: e.message || "Failed to update password." })
    }
  }

  return (
    <div className={styles.authPage}>
      <Header />
      <div className={styles.wrapper}>
        <div className={styles.container}>
          <div className={styles.header}>
            <h1 className={styles.title}>Reset Password</h1>
            <p className={styles.subtitle}>Choose a strong password to secure your account.</p>
          </div>
          {!sessionReady && (
            <div className={styles.message}>
              Preparing your session... If this takes too long, click the link in your email again.
            </div>
          )}
          {status.message && (
            <div className={`${styles.message} ${status.message.includes('successfully') ? styles.success : styles.error}`}>
              {status.message}
            </div>
          )}
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label} htmlFor="password">New password</label>
            <input id="password" type="password" className={styles.input} value={password} onChange={(e)=>setPassword(e.target.value)} />
            <label className={styles.label} htmlFor="confirm">Confirm new password</label>
            <input id="confirm" type="password" className={styles.input} value={confirm} onChange={(e)=>setConfirm(e.target.value)} />
            <button className={styles.submitBtn} type="submit" disabled={status.loading || !sessionReady}>
              {status.loading ? "Updating..." : "Update Password"}
            </button>
            <div className={styles.meta}>
              <a href="/login">Back to Login</a>
              <a href="/forgot-password">Forgot again?</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
