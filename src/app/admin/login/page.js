"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import supabase from "../../../../lib/supabaseClient"
import styles from "./page.module.css"

export default function AdminLogin() {
  const [formData, setFormData] = useState({ email: "", password: "" })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // ✅ Authenticate with Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })
      if (error) {
        setError("Invalid credentials")
        return
      }

      const user = data.user
      if (!user) {
        setError("No user session found")
        return
      }

      // ✅ Check DB-driven super_user flag
      const { data: row, error: roleErr } = await supabase
        .from("users")
        .select("super_user")
        .eq("id", user.id)
        .maybeSingle()
      if (roleErr) {
        setError("Failed to verify admin role")
        return
      }

      if (row?.super_user) {
        router.push("/admin/dashboard")
      } else {
        setError("You are not authorized as an admin")
        await supabase.auth.signOut()
      }
    } catch (_e) {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.adminLogin}>
      <div className={styles.loginContainer}>
        <div className={styles.loginHeader}>
          <h1>Admin Login</h1>
          <p>Access the Keecee Collection admin panel</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.formGroup}>
            <label htmlFor="email">Admin Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="admin@keecee.com"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter admin password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`btn btn-primary ${styles.loginBtn}`}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
          <div style={{ marginTop: 12 }}>
            <a href="/forgot-password" className={styles.forgot}>
              Forgot password?
            </a>
          </div>
        </form>
      </div>
    </div>
  )
}
