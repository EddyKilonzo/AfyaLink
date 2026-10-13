/**
 * Uploads a profile picture to the backend, which forwards it to Cloudinary.
 * Returns the updated user object with the new avatar URL.
 */
export async function uploadProfilePicture(file: File): Promise<{ user: import('@/types').User }> {
  const formData = new FormData();
  formData.append('avatar', file);

  const res = await fetch('/api/auth/profile/picture', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(error.message ?? 'Upload failed');
  }

  return res.json();
}

/**
 * Validates an image file for profile picture upload.
 * Returns an error message if invalid, null if valid.
 */
export function validateProfilePicture(file: File | null): string | null {
  if (!file) return 'Please select an image file.';

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) return 'Image must be less than 5MB.';

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) return 'Only JPEG, PNG, WebP, and GIF images are allowed.';

  return null;
}