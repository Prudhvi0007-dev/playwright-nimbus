import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();
export class S3Uploader {
    s3Client;
    bucketName;
    region;
    constructor() {
        this.region = process.env.AWS_REGION || 'us-east-1';
        this.bucketName = process.env.S3_BUCKET_NAME || '';
        if (!this.bucketName) {
            throw new Error('S3_BUCKET_NAME environment variable is required');
        }
        this.s3Client = new S3Client({
            region: this.region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
    }
    async uploadFile(localFilePath, s3Key) {
        try {
            const fileContent = fs.readFileSync(localFilePath);
            const contentType = this.getContentType(localFilePath);
            const stats = fs.statSync(localFilePath);
            const command = new PutObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
                Body: fileContent,
                ContentType: contentType,
                // Add metadata for videos
                Metadata: {
                    'original-name': path.basename(localFilePath),
                    'upload-time': new Date().toISOString(),
                    'file-size': stats.size.toString(),
                }
            });
            await this.s3Client.send(command);
            const s3Url = `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${s3Key}`;
            const fileType = this.getFileType(localFilePath);
            console.log(`✓ Uploaded [${fileType}]: ${path.basename(localFilePath)} (${this.formatBytes(stats.size)})`);
            return {
                url: s3Url,
                key: s3Key,
                type: fileType,
                size: stats.size,
                name: path.basename(localFilePath),
            };
        }
        catch (error) {
            console.error(`✗ Failed to upload ${localFilePath}:`, error);
            throw error;
        }
    }
    async uploadDirectory(localDir, s3Prefix) {
        const uploadedFiles = [];
        const uploadDirRecursive = async (dir, prefix) => {
            if (!fs.existsSync(dir)) {
                console.log(`⚠ Directory not found: ${dir}`);
                return;
            }
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const localPath = path.join(dir, entry.name);
                const s3Key = path.join(prefix, entry.name).replace(/\\/g, '/');
                if (entry.isDirectory()) {
                    await uploadDirRecursive(localPath, s3Key);
                }
                else {
                    const fileInfo = await this.uploadFile(localPath, s3Key);
                    uploadedFiles.push(fileInfo);
                }
            }
        };
        await uploadDirRecursive(localDir, s3Prefix);
        return uploadedFiles;
    }
    getContentType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const contentTypes = {
            '.html': 'text/html',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.zip': 'application/zip',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webm': 'video/webm',
            '.mp4': 'video/mp4',
            '.txt': 'text/plain',
            '.css': 'text/css',
            '.js': 'application/javascript',
        };
        return contentTypes[ext] || 'application/octet-stream';
    }
    getFileType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        const fileName = path.basename(filePath).toLowerCase();
        if (ext === '.webm' || ext === '.mp4')
            return 'video';
        if (ext === '.png' || ext === '.jpg' || ext === '.jpeg')
            return 'screenshot';
        if (ext === '.zip' || fileName.includes('trace'))
            return 'trace';
        if (ext === '.html' && fileName.includes('report'))
            return 'report';
        return 'other';
    }
    formatBytes(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }
}
