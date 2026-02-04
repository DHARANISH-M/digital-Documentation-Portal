// Cloudinary Configuration
// Your Cloudinary credentials

export const cloudinaryConfig = {
    cloudName: 'dss7hg8ut',
    uploadPreset: 'project_upload'
};

// Cloudinary upload URL
export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/auto/upload`;
