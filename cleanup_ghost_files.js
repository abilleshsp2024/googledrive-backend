
import './server/config.js';
import mongoose from 'mongoose';
import DriveItem from './server/models/DriveItem.js';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Get all S3 keys
        const command = new ListObjectsV2Command({
            Bucket: process.env.AWS_BUCKET_NAME,
        });
        const response = await s3.send(command);
        const s3Keys = new Set((response.Contents || []).map(c => c.Key));
        console.log(`Found ${s3Keys.size} objects in S3.`);

        // 2. Get all DB items with S3 URLs
        const items = await DriveItem.find({ type: { $ne: 'folder' } });
        console.log(`Found ${items.length} files in DB.`);

        let deleted = 0;
        for (const item of items) {
            if (item.s3Url) {
                try {
                    const url = new URL(item.s3Url);
                    const key = url.pathname.substring(1); // Remove leading /

                    if (!s3Keys.has(key)) {
                        console.log(`Missing S3 object for: ${item.name} (ID: ${item._id})`);
                        await DriveItem.findByIdAndDelete(item._id);
                        console.log('  -> Deleted from DB');
                        deleted++;
                    }
                } catch (e) {
                    console.error(`Error parsing URL for item ${item._id}: ${item.s3Url}`);
                }
            }
        }

        console.log(`Cleanup complete. Removed ${deleted} ghost items.`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

run();
