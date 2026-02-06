import express from 'express';
import DriveItem from '../models/DriveItem.js';
import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import path from 'path';

const router = express.Router();

// AWS S3 Configuration
const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

// Multer S3 Storage
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_BUCKET_NAME,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            // Sanitize filename (remove spaces/special chars)
            const safeName = path.parse(file.originalname).name.replace(/[^a-zA-Z0-9]/g, '-');
            const ext = path.extname(file.originalname);
            cb(null, `drive-uploads/${safeName}-${uniqueSuffix}${ext}`);
        },
        contentType: multerS3.AUTO_CONTENT_TYPE // Automatically set content type
    })
});

router.get('/', async (req, res) => {
    const { ownerId, parentId } = req.query;
    try {
        const query = { ownerId };
        if (parentId && parentId !== 'null') {
            query.parentId = parentId;
        } else {
            query.parentId = null;
        }

        const items = await DriveItem.find(query);

        const formattedItems = items.map(item => ({
            ...item._doc,
            id: item._id,
        }));

        res.status(200).json(formattedItems);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/folder', async (req, res) => {
    const { name, parentId, ownerId } = req.body;

    const newFolder = new DriveItem({
        name,
        type: 'folder',
        parentId: parentId || null,
        ownerId,
        createdAt: new Date().toISOString(),
    });

    try {
        await newFolder.save();
        res.status(201).json({ ...newFolder._doc, id: newFolder._id });
    } catch (error) {
        res.status(409).json({ message: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const item = await DriveItem.findById(id);
        if (!item) return res.status(404).json({ message: 'Item not found' });

        // If it's a file, try to delete from S3
        if (item.type !== 'folder' && item.s3Url) {
            try {
                // Extract Key from URL
                // URL format: https://bucket.s3.region.amazonaws.com/key
                // or https://s3.region.amazonaws.com/bucket/key
                // Simplest is to store the Key in DB, but we stored s3Url.
                // Let's try to extract it.
                // Assuming standard S3 URL: https://[bucket].s3.[region].amazonaws.com/[key]
                const url = new URL(item.s3Url);
                const key = url.pathname.substring(1); // Remove leading /

                await s3.send(new DeleteObjectCommand({
                    Bucket: process.env.AWS_BUCKET_NAME,
                    Key: key
                }));
            } catch (s3Error) {
                console.error("Failed to delete from S3:", s3Error);
                // Continue to delete from DB even if S3 fails
            }
        }

        await DriveItem.findByIdAndDelete(id);
        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting item' });
    }
});

// Custom upload middleware to catch S3 errors
const uploadMiddleware = (req, res, next) => {
    const uploadSingle = upload.single('file');
    uploadSingle(req, res, (err) => {
        if (err) {
            console.error("\n=== UPLOAD ERROR DETECTED ===");
            console.error("Code:", err.code);
            console.error("Message:", err.message);
            console.error("Stack:", err.stack);
            console.error("=============================\n");
            return res.status(500).json({ message: `Upload Failed: ${err.message}` });
        }
        next();
    });
};

router.post('/upload', uploadMiddleware, async (req, res) => {
    try {
        const { parentId, ownerId } = req.body;
        const file = req.file;

        if (!file) {
            console.error("No file received in request");
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log("File uploaded to S3:", file.location);

        // Determine file type
        let type = 'other';
        if (file.mimetype.startsWith('image/')) type = 'image';
        else if (file.mimetype === 'application/pdf') type = 'pdf';

        const newFile = new DriveItem({
            name: file.originalname,
            type,
            parentId: parentId === 'null' ? null : parentId,
            ownerId,
            size: file.size,
            mimeType: file.mimetype,
            s3Url: file.location, // S3 URL provided by multer-s3
            createdAt: new Date().toISOString(),
        });

        await newFile.save();
        res.status(201).json({ ...newFile._doc, id: newFile._id });
    } catch (error) {
        console.error("Database save error:", error);
        res.status(500).json({ message: error.message });
    }
});

// Add this Route BEFORE existing routes or at end (e.g., before export default)

router.get('/file/:id/view', async (req, res) => {
    try {
        const { id } = req.params;
        const item = await DriveItem.findById(id);

        if (!item) {
            return res.status(404).json({ message: 'File not found' });
        }

        if (!item.s3Url) {
            return res.status(400).json({ message: 'File does not have a valid S3 URL' });
        }

        // Extract Key from URL
        const url = new URL(item.s3Url);
        const key = url.pathname.substring(1); // Remove leading /

        const command = new GetObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
        });

        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 900 }); // 15 minutes

        res.status(200).json({ url: signedUrl });
    } catch (error) {
        console.error("Presign error:", error);
        res.status(500).json({ message: 'Could not generate view link' });
    }
});

export default router;
