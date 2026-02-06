
import './server/config.js';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import fs from 'fs';

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const run = async () => {
    try {
        console.log(`Checking bucket: ${process.env.AWS_BUCKET_NAME}`);

        const command = new ListObjectsV2Command({
            Bucket: process.env.AWS_BUCKET_NAME,
        });

        const response = await s3.send(command);

        const contents = response.Contents || [];
        console.log(`Found ${contents.length} objects.`);

        const fileKeys = contents.map(c => c.Key);

        fs.writeFileSync('s3_audit.json', JSON.stringify(fileKeys, null, 2));
        console.log('Written to s3_audit.json');

    } catch (err) {
        console.error('Error listing S3 objects:', err);
    }
};

run();
