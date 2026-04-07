const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadBaseRoot = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadBaseRoot, { recursive: true });

const makeUploader = (folderName) => {
  const uploadRoot = path.join(uploadBaseRoot, folderName);
  fs.mkdirSync(uploadRoot, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadRoot),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${safeName}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 4 },
    fileFilter: (_req, file, cb) => {
      if (!allowedTypes.has(file.mimetype)) {
        return cb(new Error('Only JPG, PNG, WEBP and PDF files are allowed'));
      }
      cb(null, true);
    },
  });
};

const allowedTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const uploadProofs = makeUploader('room-change-proofs');
const uploadFeeProofs = makeUploader('fee-proofs');

module.exports = {
  uploadProofs,
  uploadFeeProofs,
  uploadBaseRoot,
};
