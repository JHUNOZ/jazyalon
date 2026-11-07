/**
 * HONE CATALOG PRO — Optimizador y Conversor Automático a WebP
 * Convierte cualquier imagen subida (JPG, PNG, JFIF, HEIC/BMP soportado por navegador)
 * al formato de alta eficiencia .webp mediante HTML5 Canvas.
 */

export const isWebPUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return (
    url.startsWith('data:image/webp') ||
    /\.webp(\?.*)?$/i.test(url)
  );
};

export const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};

/**
 * Convierte un archivo de imagen (File/Blob) a formato .webp optimizado
 * @param {File|Blob} file - Archivo de imagen original
 * @param {Object} options - Opciones de compresión y redimensionado
 * @returns {Promise<{ webpFile: File, dataUrl: string, fileName: string, originalSize: number, webpSize: number, savingsPercent: number, width: number, height: number }>}
 */
export const convertImageFileToWebP = (file, options = {}) => {
  const {
    quality = 0.84,
    maxWidth = 1400,
    maxHeight = 1750
  } = options;

  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No se proporcionó ningún archivo'));
      return;
    }

    // Si es un video, no convertir a WebP
    if (file.type && file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          webpFile: file,
          dataUrl: e.target.result,
          fileName: file.name,
          originalSize: file.size || 0,
          webpSize: file.size || 0,
          savingsPercent: 0,
          width: 0,
          height: 0,
          isVideo: true
        });
      };
      reader.onerror = () => reject(new Error('Error al leer archivo de video'));
      reader.readAsDataURL(file);
      return;
    }

    const originalName = file.name || `corset_${Date.now()}.jpg`;
    const baseName = originalName.includes('.')
      ? originalName.substring(0, originalName.lastIndexOf('.'))
      : originalName;
    const cleanBase = baseName
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 40) || `corset_${Date.now()}`;
    const webpFileName = `${cleanBase}.webp`;

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      try {
        let targetWidth = img.naturalWidth || img.width || 800;
        let targetHeight = img.naturalHeight || img.height || 1000;

        if (targetWidth > maxWidth || targetHeight > maxHeight) {
          const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
          targetWidth = Math.round(targetWidth * ratio);
          targetHeight = Math.round(targetHeight * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        const dataUrl = canvas.toDataURL('image/webp', quality);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              reject(new Error('No se pudo generar el archivo WebP'));
              return;
            }

            const webpFile = new File([blob], webpFileName, {
              type: 'image/webp',
              lastModified: Date.now()
            });

            const originalSize = file.size || blob.size;
            const webpSize = blob.size;
            const savingsPercent = originalSize > webpSize
              ? Math.round(((originalSize - webpSize) / originalSize) * 100)
              : 0;

            resolve({
              webpFile,
              dataUrl,
              fileName: webpFileName,
              originalSize,
              webpSize,
              savingsPercent,
              width: targetWidth,
              height: targetHeight,
              isVideo: false
            });
          },
          'image/webp',
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`No se pudo decodificar la imagen "${originalName}"`));
    };

    img.src = objectUrl;
  });
};

/**
 * Convierte múltiples archivos a formato WebP con reporte de progreso
 */
export const convertMultipleFilesToWebP = async (files, options = {}, onProgress = null) => {
  const fileArray = Array.from(files || []);
  const results = [];

  for (let i = 0; i < fileArray.length; i++) {
    const converted = await convertImageFileToWebP(fileArray[i], options);
    results.push(converted);
    if (typeof onProgress === 'function') {
      onProgress(Math.round(((i + 1) / fileArray.length) * 100), i + 1, fileArray.length);
    }
  }

  return results;
};

export const convertFileToWebP = convertImageFileToWebP;

