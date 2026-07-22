import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { randomUUID } from 'crypto';
import { extname } from 'path';

export interface UploadedFileResult {
  key: string;
  url: string;
}

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrlBase: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME') ?? '';
    this.publicUrlBase = (
      this.configService.get<string>('R2_PUBLIC_URL_BASE') ?? ''
    ).replace(/\/+$/, '');

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.get<string>('R2_ACCESS_KEY_ID') ?? '',
        secretAccessKey:
          this.configService.get<string>('R2_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  async uploadFile(file: Express.Multer.File): Promise<UploadedFileResult> {
    const extension = extname(file.originalname);
    const key = `objects/${randomUUID()}${extension}`;

    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      },
    });

    await upload.done();

    return { key, url: `${this.publicUrlBase}/${key}` };
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }

  /**
   * Derives the R2 object key from a previously stored public URL, i.e.
   * the inverse of `${R2_PUBLIC_URL_BASE}/${key}` built in `uploadFile`.
   */
  extractKeyFromUrl(url: string): string {
    if (this.publicUrlBase && url.startsWith(`${this.publicUrlBase}/`)) {
      return url.slice(this.publicUrlBase.length + 1);
    }
    // Fallback: strip protocol+host and any leading slash.
    try {
      const parsed = new URL(url);
      return parsed.pathname.replace(/^\/+/, '');
    } catch {
      return url;
    }
  }
}
