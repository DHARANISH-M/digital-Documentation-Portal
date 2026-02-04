// Cloudinary Storage Service
import { cloudinaryConfig, CLOUDINARY_UPLOAD_URL } from '../config/cloudinary';

/**
 * Upload a file to Cloudinary
 * @param {File} file - The file to upload
 * @param {string} userId - The user's ID for organizing files
 * @param {Function} onProgress - Progress callback (percentage)
 * @returns {Promise<{url: string, publicId: string, path: string}>}
 */
export function uploadFile(file, userId, onProgress) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', cloudinaryConfig.uploadPreset);
        formData.append('folder', `docflow/${userId}`);

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable && onProgress) {
                const progress = Math.round((event.loaded / event.total) * 100);
                onProgress(progress);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                const response = JSON.parse(xhr.responseText);
                resolve({
                    url: response.secure_url,
                    publicId: response.public_id,
                    path: response.public_id // Use public_id as path for deletion
                });
            } else {
                reject(new Error('Upload failed: ' + xhr.statusText));
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
        });

        xhr.open('POST', CLOUDINARY_UPLOAD_URL);
        xhr.send(formData);
    });
}

/**
 * Get the file URL (for Cloudinary, the URL is stored directly)
 * @param {string} url - The file URL
 * @returns {string}
 */
export function getFileUrl(url) {
    return url;
}

/**
 * Delete a file from Cloudinary
 * Note: Client-side deletion requires a signed request or backend API
 * For now, we'll handle this server-side or mark for deletion
 * @param {string} publicId - The public ID of the file
 */
export async function deleteFile(publicId) {
    // Note: Cloudinary deletion requires server-side implementation
    // with API secret for security. For now, we'll just log it.
    console.log('File marked for deletion:', publicId);
    // In production, you would call your backend API to delete the file
    return Promise.resolve();
}

/**
 * Format file size to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file extension from filename
 * @param {string} filename - The filename
 * @returns {string}
 */
export function getFileExtension(filename) {
    return filename.split('.').pop()?.toUpperCase() || '';
}

/**
 * Get file type category from filename
 * @param {string} filename - The filename
 * @returns {string}
 */
export function getFileType(filename) {
    const ext = getFileExtension(filename);
    const typeMap = {
        'PDF': 'PDF',
        'DOC': 'DOC',
        'DOCX': 'DOCX',
        'XLS': 'XLS',
        'XLSX': 'XLSX',
        'PPT': 'PPT',
        'PPTX': 'PPTX',
        'TXT': 'TXT',
        'JPG': 'Image',
        'JPEG': 'Image',
        'PNG': 'Image',
        'GIF': 'Image'
    };

    return typeMap[ext] || ext;
}
