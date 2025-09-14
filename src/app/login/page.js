"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import supabase from "../../../lib/supabaseClient"
import Header from "../../../components/Header"
import styles from "./page.module.css"

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  })

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  async function getUser() {
    const { data, error } = await supabase.auth.getUser()
    if (error) throw error
    setUser(data?.user ?? null)
    setLoading(false)
  }

  const router = useRouter()

  useEffect(() => {
    getUser()
  }, [])

  useEffect(() => {
    if (user) {
      router.push("/")
    }
  }, [user, router])

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.email.trim()) newErrors.email = "Email is required"
    if (!formData.email.includes("@")) newErrors.email = "Please enter a valid email"
    if (!formData.password) newErrors.password = "Password is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        setErrors({ general: error.message })
      } else if (data?.session) {
        // user logged in successfully
        router.push("/profile")
      } else {
        setErrors({ general: "Unexpected login error. Please try again." })
      }
    } catch (err) {
      console.error("Login error:", err)
      setErrors({ general: err.message || "Login failed. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={styles.loginPage}>
      <Header />

      <div className="container">
        <div className={styles.loginContainer}>
          <div className={styles.loginHeader}>
            <h1>Customer Login</h1>
            <p>Sign in to your account to access your orders and wishlist</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.loginForm}>
            {errors.general && <div className={styles.errorMessage}>{errors.general}</div>}

            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? styles.error : ""}
                placeholder="Enter your email"
              />
              {errors.email && <span className={styles.errorText}>{errors.email}</span>}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={errors.password ? styles.error : ""}
                placeholder="Enter your password"
              />
              {errors.password && <span className={styles.errorText}>{errors.password}</span>}
            </div>

            <div className={styles.formOptions}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleInputChange}
                />
                <span className={styles.checkmark}></span>
                Remember me
              </label>

              <a href="/forgot-password" className={styles.forgotLink}>
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className={`btn btn-primary ${styles.submitBtn}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>

            <div className={styles.registerLink}>
              <p>
                Don't have an account? <a href="/register">Create one here</a>
              </p>
            </div>

            <div className={styles.vendorLink}>
              <p>
                Are you a vendor? <a href="/vendors/login">Vendor Login</a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
