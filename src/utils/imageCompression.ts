/**
 * Стискає зображення до невеликого розміру та повертає його як base64 data URL.
 * Потрібно, бо бекенд приймає JSON з лімітом за замовчуванням (express.json() ~100kb),
 * а оригінальне фото з телефону/камери зазвичай значно важче.
 *
 * @param file    Файл зображення, обраний користувачем
 * @param maxSide Максимальна довжина довшої сторони в пікселях (за замовчуванням 300)
 * @param quality Якість JPEG-стиснення від 0 до 1 (за замовчуванням 0.7)
 */
export function fileToCompressedDataUrl(
  file: File,
  maxSide = 300,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error('Не вдалося прочитати файл'))

    reader.onload = () => {
      const img = new Image()

      img.onerror = () => reject(new Error('Не вдалося обробити зображення'))

      img.onload = () => {
        let { width, height } = img

        if (width > height && width > maxSide) {
          height = Math.round((height * maxSide) / width)
          width = maxSide
        } else if (height > maxSide) {
          width = Math.round((width * maxSide) / height)
          height = maxSide
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas недоступний у цьому браузері'))
          return
        }

        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }

      img.src = reader.result as string
    }

    reader.readAsDataURL(file)
  })
}