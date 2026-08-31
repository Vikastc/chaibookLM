import multer from "multer";

// Vercel Functions accept request bodies up to 4.5 MB. Keep a margin for
// multipart overhead so uploads fail consistently before reaching the host.
const MAX_PDF_SIZE_BYTES = 4 * 1024 * 1024;

export const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype === "application/pdf") {
      callback(null, true);
      return;
    }

    callback(new Error("Only PDF files are allowed"));
  },
});

export const uploadSinglePdf = pdfUpload.single("file");
