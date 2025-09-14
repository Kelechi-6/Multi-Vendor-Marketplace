"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import supabase from "../../../lib/supabaseClient"
import Header from "./../../../components/Header"
import styles from "./page.module.css"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    agreeToTerms: false,
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

    if (!formData.username.trim()) newErrors.username = "Full Name is required"
    if (!formData.email.trim()) newErrors.email = "Email is required"
    if (!formData.email.includes("@")) newErrors.email = "Please enter a valid email"
    if (!formData.password) newErrors.password = "Password is required"
    if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters"
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match"
    }
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required"
    if (!formData.agreeToTerms) newErrors.agreeToTerms = "You must agree to the terms and conditions"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
  e.preventDefault()
  if (!validateForm()) return

  setIsSubmitting(true)
  try {
    // 1. Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    })

    if (error) {
      setErrors({ general: error.message })
      return
    }

    const user = data.user

    // 2. Save user info into your custom "users" table
    if (user) {
      const { error: insertError } = await supabase.from("users").insert([
        {
          id: user.id, // same as auth.users.id (foreign key)
          username: formData.username,
          email: formData.email,
          phone: formData.phone,
        },
      ])

      if (insertError) {
        console.error("Error inserting user into users table:", insertError)
      }
    }

    // 3. Redirect or show success
    setErrors({
      general: "Account created successfully!",
    })
    setTimeout(() => {
      router.push("/login")
    }, 2000)
  } catch (err) {
    console.error("Registration error:", err)
    setErrors({ general: err.message || "Registration failed. Please try again." })
  } finally {
    setIsSubmitting(false)
  }
}


  return (
    <div className={styles.registerPage}>
      <Header />

      <div className="container">
        <div className={styles.registerContainer}>
          <div className={styles.registerHeader}>
            <h1>Create Account</h1>
            <p>Join Keecee Collection to start shopping and track your orders</p>
          </div>

          <form onSubmit={handleSubmit} className={styles.registerForm}>
            {errors.general && <div className={styles.errorMessage}>{errors.general}</div>}

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="username">Full Name *</label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={errors.username ? styles.error : ""}
                  placeholder="Enter your full name"
                />
                {errors.username && <span className={styles.errorText}>{errors.username}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className={errors.phone ? styles.error : ""}
                  placeholder="Enter your phone number"
                />
                {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={errors.email ? styles.error : ""}
                placeholder="Enter your email address"
              />
              {errors.email && <span className={styles.errorText}>{errors.email}</span>}
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="password">Password *</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={errors.password ? styles.error : ""}
                  placeholder="Create a password"
                />
                {errors.password && <span className={styles.errorText}>{errors.password}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={errors.confirmPassword ? styles.error : ""}
                  placeholder="Confirm your password"
                />
                {errors.confirmPassword && (
                  <span className={styles.errorText}>{errors.confirmPassword}</span>
                )}
              </div>
            </div>

            <div className={styles.termsGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleInputChange}
                />
                <span className={styles.checkmark}></span>I agree to the{" "}
                <a href="/terms">Terms of Service</a> and{" "}
                <a href="/privacy">Privacy Policy</a>
              </label>
              {errors.agreeToTerms && (
                <span className={styles.errorText}>{errors.agreeToTerms}</span>
              )}
            </div>

            <button
              type="submit"
              className={`btn btn-primary ${styles.submitBtn}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>

            <div className={styles.loginLink}>
              <p>
                Already have an account? <a href="/login">Sign in here</a>
              </p>
            </div>

            <div className={styles.vendorLink}>
              <p>
                Want to sell products? <a href="/vendors/register">Become a Vendor</a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
