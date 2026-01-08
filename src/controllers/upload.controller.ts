import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';

export class UploadController {
    // Upload store logo
    async uploadLogo(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded',
                });
            }

            // Return the file path
            const fileUrl = `/uploads/logos/${req.file.filename}`;

            return res.json({
                success: true,
                message: 'Logo uploaded successfully',
                data: {
                    url: fileUrl,
                    filename: req.file.filename,
                },
            });
        } catch (error) {
            return next(error);
        }
    }

    // Upload profile picture
    async uploadProfile(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded',
                });
            }

            // Return the file path
            const fileUrl = `/uploads/profiles/${req.file.filename}`;

            return res.json({
                success: true,
                message: 'Profile picture uploaded successfully',
                data: {
                    url: fileUrl,
                    filename: req.file.filename,
                },
            });
        } catch (error) {
            return next(error);
        }
    }
}

export const uploadController = new UploadController();
