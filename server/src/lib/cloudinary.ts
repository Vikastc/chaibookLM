import { v2 as cloudinary } from "cloudinary";
import type {
  UploadApiErrorResponse,
  UploadApiResponse,
} from "cloudinary";
import { ValidationError } from "../types/errors.js";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

/** Normalized result returned after a successful Cloudinary upload. */
export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
  bytes: number;
  originalFilename: string;
  resourceType: "raw" | "image";
};

function ensureConfigured() {
  if (!cloudName || !apiKey || !apiSecret) {
    throw new ValidationError("Cloudinary is not configured on the server");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export function getSignedCloudinaryDownloadUrl(
  publicId: string,
  resourceType: "raw" | "image" = "raw",
) {
  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  ensureConfigured();

  return cloudinary.url(publicId, {
    resource_type: resourceType,
    type: "upload",
    sign_url: true,
    secure: true,
  });
}

/**
 * Uploads a PDF buffer to Cloudinary with a signed server-side request.
 *
 * Uses the account API key/secret, so no unsigned upload preset is required.
 *
 * @param buffer - PDF file bytes from Multer
 * @param filename - Original filename (kept as the download filename)
 * @returns Upload metadata including secure URL and public id
 * @throws {ValidationError} When Cloudinary is not configured or upload is rejected
 */
export async function uploadPdfToCloudinary(
  buffer: Buffer,
  filename: string,
): Promise<CloudinaryUploadResult> {
  ensureConfigured();

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "chaibook/pdfs",
        resource_type: "raw",
        filename_override: filename,
      },
      (error: UploadApiErrorResponse | undefined, upload) => {
        if (error || !upload) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(upload);
      },
    );
    stream.end(buffer);
  }).catch((error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : "Cloudinary upload failed. Check the server credentials.";
    throw new ValidationError(message);
  });

  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
    bytes: result.bytes,
    originalFilename: filename,
    resourceType: result.resource_type === "image" ? "image" : "raw",
  };
}
