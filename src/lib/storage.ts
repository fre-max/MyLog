import { supabase } from './supabase'

const BUCKET = 'trade-images'

export async function uploadImage(
  file: File | Blob,
  path: string
): Promise<string> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) throw error
}

export function buildImagePath(tradeId: string, stepId: string, filename: string): string {
  return `${tradeId}/${stepId}/${filename}`
}
