import { v2 as cloudinary } from 'cloudinary';
import { env } from './env.js';
import logger from './logger.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_NAME,
  api_key: env.CLOUDINARY_KEY,
  api_secret: env.CLOUDINARY_SECRET,
  secure: true,
});

logger.info('☁️ Cloudinary SDK configured successfully');

export { cloudinary };
export default cloudinary;
