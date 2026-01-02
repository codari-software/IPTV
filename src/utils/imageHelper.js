
/**
 * Utility to process image URLs for secure display (HTTPS).
 * This helps avoid Mixed Content errors on Vercel/Production.
 * 
 * @param {string} url - The original image URL
 * @returns {string} - The processed secure URL
 */
export const getSecureImage = (url) => {
    if (!url) return '';

    // If it's already https, return it
    if (url.startsWith('https://')) return url;

    // Use weserv.nl as an image proxy to convert HTTP to HTTPS and optimize
    // It is a reliable, free, open-source image proxy service.
    // We encode the original URL to pass it safely.
    // 'n' param = -1 disables automatic resizing if we want full quality, but usually default is fine.
    // 'q' param = quality, standard is usually good.
    return `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;
};
