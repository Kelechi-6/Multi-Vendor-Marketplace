import supabase from "./supabaseClient"

export async function uploadImageToItemsBucket(file, userId) {
  if (!file) return { url: null }
  if (!userId) throw new Error("Missing userId for image upload")

  const fileExt = file.name?.split(".").pop() || "jpg"
  const fileName = `${crypto.randomUUID()}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from("items")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "image/jpeg",
    })

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabase.storage.from("items").getPublicUrl(filePath)
  return { url: data?.publicUrl || null, path: filePath }
}

export async function uploadAvatarToBucket(file, userId) {
  if (!file) return { url: null }
  if (!userId) throw new Error("Missing userId for avatar upload")

  const fileExt = file.name?.split(".").pop() || "jpg"
  const fileName = `${crypto.randomUUID()}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "image/jpeg",
    })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
  return { url: data?.publicUrl || null, path: filePath }
}

export async function uploadVendorProductImage(file, userId) {
  if (!file) return { url: null }
  if (!userId) throw new Error("Missing userId for vendor product image upload")

  const fileExt = file.name?.split(".").pop() || "jpg"
  const fileName = `${crypto.randomUUID()}.${fileExt}`
  const filePath = `${userId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from("vendors_product_image")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "image/jpeg",
    })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from("vendors_product_image").getPublicUrl(filePath)
  return { url: data?.publicUrl || null, path: filePath }
}
