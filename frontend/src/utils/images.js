export function readProfileImage(file) {
  if (!file) return Promise.resolve(null);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return Promise.reject(new Error('La foto debe ser JPG, PNG o WebP'));
  if (file.size > 2 * 1024 * 1024) return Promise.reject(new Error('La foto no puede superar los 2 MB'));
  return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('No pudimos leer la foto')); reader.readAsDataURL(file); });
}
