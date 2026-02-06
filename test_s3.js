import { S3Client, ListBucketsCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: './.env.local' });

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function testS3() {
    console.log("--- Testing S3 Connection ---");
    console.log("Region:", process.env.AWS_REGION);
    console.log("Bucket:", process.env.AWS_BUCKET_NAME);
    console.log("Access Key:", process.env.AWS_ACCESS_KEY_ID ? "****" + process.env.AWS_ACCESS_KEY_ID.slice(-4) : "MISSING");

    try {
        console.log("\n1. Listing Buckets...");
        const data = await s3.send(new ListBucketsCommand({}));
        console.log("Success! Found buckets:");
        data.Buckets.forEach(b => console.log(` - ${b.Name}`));

        const myBucket = data.Buckets.find(b => b.Name === process.env.AWS_BUCKET_NAME);
        if (!myBucket) {
            console.error(`\n[ERROR] Target bucket '${process.env.AWS_BUCKET_NAME}' NOT found in this account!`);
            return;
        }

        console.log(`\n2. Testing Upload to '${process.env.AWS_BUCKET_NAME}'...`);
        await s3.send(new PutObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: 'test-connection.txt',
            Body: 'S3 Connection Successful!'
        }));
        console.log("Success! File 'test-connection.txt' uploaded.");

    } catch (err) {
        console.error("\n[FAILED] S3 Error:");
        console.error("Code:", err.name);
        console.error("Message:", err.message);
        if (err.name === 'InvalidAccessKeyId') console.error("-> Check AWS_ACCESS_KEY_ID");
        if (err.name === 'SignatureDoesNotMatch') console.error("-> Check AWS_SECRET_ACCESS_KEY");
        if (err.name === 'AccessDenied') console.error("-> Check User Permissions (s3:ListAllMyBuckets, s3:PutObject)");
    }
}

testS3();
