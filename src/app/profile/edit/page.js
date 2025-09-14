"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Header from "../../../../components/Header"
import supabase from "../../../../lib/supabaseClient"
import styles from "./../page.module.css"
import FullPageLoader from "../../../../components/FullPageLoader"
import { uploadAvatarToBucket } from "../../../../lib/uploadImage"
import estyles from "./EditPage.module.css"

export default function EditProfile() {
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        phone: ""
    })
    const [errors, setErrors] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState(null)
    const [avatarFile, setAvatarFile] = useState(null)
    const [avatarPreview, setAvatarPreview] = useState("")
    const router = useRouter()

    // Fetch current user data on component mount
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                // Get current user from auth
                const { data: { user }, error: authError } = await supabase.auth.getUser()
                
                if (authError || !user) {
                    router.push('/login')
                    return
                }

                setUser(user)

                // Fetch user profile data from users table
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('username, email, phone, avatar_url')
                    .eq('id', user.id)
                    .maybeSingle()

                if (userError) {
                    console.error('Error fetching user data:', userError)
                }

                // Use profile data if available, otherwise fallback to auth data
                if (userData) {
                    setFormData({
                        username: userData.username || "",
                        email: userData.email || "",
                        phone: userData.phone || ""
                    })
                    setAvatarPreview(userData.avatar_url || user.user_metadata?.avatar_url || "/user-avatar.png")
                } else {
                    // No profile record exists, use auth data as fallback
                    setFormData({
                        username: user.user_metadata?.username || "",
                        email: user.email || "",
                        phone: user.user_metadata?.phone || ""
                    })
                    setAvatarPreview(user.user_metadata?.avatar_url || "/user-avatar.png")
                }
            } catch (error) {
                console.error('Error:', error)
                router.push('/login')
            } finally {
                setLoading(false)
            }
        }

        fetchUserData()
    }, [router])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: "" }))
        }
    }

    const validateForm = () => {
        const newErrors = {}

        if (!formData.username.trim()) {
            newErrors.username = "Username is required"
        }
        if (!formData.email.trim()) {
            newErrors.email = "Email is required"
        } else if (!formData.email.includes("@")) {
            newErrors.email = "Please enter a valid email"
        }
        if (!formData.phone.trim()) {
            newErrors.phone = "Phone number is required"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        
        if (!validateForm()) return

        setIsSubmitting(true)
        try {
            // Get current user data to ensure we have the latest information
            const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser()
            
            if (authError || !currentUser) {
                setErrors({ general: "Authentication error. Please log in again." })
                router.push('/login')
                return
            }

            // If avatar selected, upload to avatars bucket
            let newAvatarUrl = null
            if (avatarFile) {
                const { url } = await uploadAvatarToBucket(avatarFile, currentUser.id)
                newAvatarUrl = url
            }

            // Update user profile in users table
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    username: formData.username,
                    email: formData.email,
                    phone: formData.phone,
                    ...(newAvatarUrl ? { avatar_url: newAvatarUrl } : {})
                })
                .eq('id', currentUser.id)

            if (updateError) {
                setErrors({ general: updateError.message })
                return
            }

            // Update auth user metadata if email changed
            const authUpdatePayload = { data: { username: formData.username, phone: formData.phone } }
            if (newAvatarUrl) authUpdatePayload.data.avatar_url = newAvatarUrl
            if (formData.email !== currentUser.email) authUpdatePayload.email = formData.email

            const { error: authUpdateError } = await supabase.auth.updateUser(authUpdatePayload)

            if (authUpdateError) {
                console.error('Auth update error:', authUpdateError)
                // Don't fail the whole operation for this
            }

            setErrors({ general: "Profile updated successfully!" })
            
            // Redirect back to profile page after a short delay
            setTimeout(() => {
                router.push('/profile')
            }, 2000)

        } catch (error) {
            console.error('Update error:', error)
            setErrors({ general: "Failed to update profile. Please try again." })
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) {
        return (
            <>
                <Header />
                <FullPageLoader message="Loading profile..." />
            </>
        )
    }

    return (
        <div className={`${styles.profilePage} ${estyles.editPage}`}>
            <Header />
            <div className={`container ${estyles.wrapper}`}>
                <div className={styles.profileContainer}>
                    <div className={styles.profileMain}>
                        <div className={`${styles.sectionHeader} ${estyles.headerEnhance}`}>
                            <div>
                                <h1>Edit Profile</h1>
                                <p>Update your personal information</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className={`${styles.profileCard} ${estyles.card} ${estyles.formGrid}`}>
                            {errors.general && (
                                <div className={`${styles.errorMessage} ${errors.general.includes('successfully') ? styles.successMessage : ''}`}>
                                    {errors.general}
                                </div>
                            )}

                            <div className={`${styles.profileField} ${estyles.fieldSpan2}`}>
                                <label htmlFor="avatar">Profile Picture</label>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <img src={avatarPreview || "/user-avatar.png"} alt="Preview" className={estyles.avatarPreview} />
                                    <input
                                        type="file"
                                        id="avatar"
                                        accept="image/*"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0]
                                            if (f) {
                                                setAvatarFile(f)
                                                setAvatarPreview(URL.createObjectURL(f))
                                            }
                                        }}
                                    />
                                </div>
                            </div>

                            <div className={styles.profileField}>
                                <label htmlFor="username">Username *</label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    className={`${errors.username ? styles.error : ""} ${estyles.inputEnhanced}`}
                                    placeholder="Enter your username"
                                />
                                {errors.username && <span className={styles.errorText}>{errors.username}</span>}
                            </div>

                            <div className={styles.profileField}>
                                <label htmlFor="email">Email Address *</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className={`${errors.email ? styles.error : ""} ${estyles.inputEnhanced}`}
                                    placeholder="Enter your email address"
                                />
                                {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                            </div>

                            <div className={styles.profileField}>
                                <label htmlFor="phone">Phone Number *</label>
                                <input
                                    type="tel"
                                    id="phone"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className={`${errors.phone ? styles.error : ""} ${estyles.inputEnhanced}`}
                                    placeholder="Enter your phone number"
                                />
                                {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
                            </div>

                            <div className={`${styles.formActions} ${estyles.actions} ${estyles.fieldSpan2}`}>
                                <button
                                    type="button"
                                    className={`btn btn-secondary ${estyles.secondaryBtn}`}
                                    onClick={() => router.push('/profile')}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={`btn btn-primary ${estyles.primaryBtn}`}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? "Updating..." : "Update Profile"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
