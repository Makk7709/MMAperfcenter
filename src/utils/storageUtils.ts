import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a signed URL for a file in Supabase Storage
 * @param bucketName - The storage bucket name
 * @param filePath - The path to the file within the bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns The signed URL or null if failed
 */
export async function getSignedUrl(
  bucketName: string,
  filePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('[Storage] Failed to create signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('[Storage] Error creating signed URL:', err);
    return null;
  }
}

/**
 * Extract file path from a public Supabase Storage URL
 * @param publicUrl - The public URL from storage
 * @param bucketName - The bucket name to extract path from
 * @returns The file path or null if not a valid storage URL
 */
export function extractFilePathFromUrl(publicUrl: string, bucketName: string): string | null {
  if (!publicUrl) return null;
  
  try {
    // Pattern: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file
    const regex = new RegExp(`/storage/v1/object/public/${bucketName}/(.+)$`);
    const match = publicUrl.match(regex);
    
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }
    
    return null;
  } catch (err) {
    console.error('[Storage] Error extracting file path:', err);
    return null;
  }
}

/**
 * Convert a public URL to a signed URL for secure access
 * @param publicUrl - The public storage URL
 * @param bucketName - The storage bucket name
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns The signed URL or the original URL if conversion fails
 */
export async function convertToSignedUrl(
  publicUrl: string,
  bucketName: string,
  expiresIn: number = 3600
): Promise<string> {
  if (!publicUrl) return publicUrl;
  
  const filePath = extractFilePathFromUrl(publicUrl, bucketName);
  
  if (!filePath) {
    // Not a storage URL or couldn't extract path, return original
    return publicUrl;
  }
  
  const signedUrl = await getSignedUrl(bucketName, filePath, expiresIn);
  
  return signedUrl || publicUrl;
}
