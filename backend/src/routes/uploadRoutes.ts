import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '@/middleware/errorHandler';
import { uploadController } from '@/controllers/uploadController';

const router = express.Router();

// 配置multer存儲
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`);
  }
});

// 文件過濾器
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支援CSV和Excel文件格式'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB限制
  }
});

// 路由定義
router.post('/', upload.single('file'), asyncHandler(uploadController.uploadFile));
router.get('/files', asyncHandler(uploadController.getUploadedFiles));
router.get('/files/:fileId', asyncHandler(uploadController.getFileInfo));
router.delete('/files/:fileId', asyncHandler(uploadController.deleteFile));

export default router;