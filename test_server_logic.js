
const urls = [
    "https://my-app-s3-bucket-2026.s3.ap-south-1.amazonaws.com/drive-uploads/003-TET-GS-13-2023-CRA-1770387571915-676293177.pdf",
    "https://my-app-s3-bucket-2026.s3.ap-south-1.amazonaws.com/drive-uploads/003-TET-GS-13-2023-CRA-1770387300105-512225450.pdf",
    "https://my-app-s3-bucket-2026.s3.ap-south-1.amazonaws.com/drive-uploads/496-Group-IV-Syllabus-1770387232421-806798684.pdf"
];

urls.forEach(u => {
    try {
        const url = new URL(u);
        const key = url.pathname.substring(1);
        console.log(`URL: ${u}`);
        console.log(`Pathname: ${url.pathname}`);
        console.log(`Extracted Key: ${key}`);
        console.log('---');
    } catch (e) {
        console.error(`Error parsing ${u}:`, e);
    }
});
