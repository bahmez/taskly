import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';

type SignedUrlResult = {
  url: string;
  method: 'PUT' | 'GET' | 'POST';
  headers: Record<string, string>;
  expiresAt: string;
  type: 'write' | 'resumable' | 'read';
};

function addMinutesIso(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60_000);
  return d.toISOString();
}

@Injectable()
export class GcsService {
  private readonly storage = new Storage();

  private getBucketName(): string {
    return (
      process.env.GCS_BUCKET ??
      process.env.GOOGLE_CLOUD_BUCKET ??
      process.env.GCS_BUCKET_NAME ??
      process.env.GOOGLE_CLOUD_STORAGE_BUCKET ??
      ''
    ).trim();
  }

  private bucket() {
    const name = this.getBucketName();
    if (!name) throw new Error('GCS bucket not configured (set GCS_BUCKET)');
    return this.storage.bucket(name);
  }

  async signedUploadUrl(input: { objectPath: string; contentType: string; expiresInMinutes?: number; resumable?: boolean }): Promise<SignedUrlResult> {
    const expiresInMinutes = input.expiresInMinutes ?? 15;
    const expiresAt = addMinutesIso(expiresInMinutes);
    const expires = Date.parse(expiresAt);

    const file = this.bucket().file(input.objectPath);
    const resumable = Boolean(input.resumable ?? true);

    const action = resumable ? 'resumable' : 'write';
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action,
      expires,
      contentType: input.contentType,
    });

    if (resumable) {
      // Client should POST with "x-goog-resumable: start" to get the session URL (Location header).
      return {
        url,
        method: 'POST',
        headers: { 'Content-Type': input.contentType, 'x-goog-resumable': 'start' },
        expiresAt,
        type: 'resumable',
      };
    }

    return {
      url,
      method: 'PUT',
      headers: { 'Content-Type': input.contentType },
      expiresAt,
      type: 'write',
    };
  }

  async signedDownloadUrl(input: { objectPath: string; expiresInMinutes?: number }): Promise<SignedUrlResult> {
    const expiresInMinutes = input.expiresInMinutes ?? 15;
    const expiresAt = addMinutesIso(expiresInMinutes);
    const expires = Date.parse(expiresAt);

    const file = this.bucket().file(input.objectPath);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires,
    });

    return { url, method: 'GET', headers: {}, expiresAt, type: 'read' };
  }

  async deleteObject(objectPath: string): Promise<void> {
    const file = this.bucket().file(objectPath);
    try {
      await file.delete({ ignoreNotFound: true });
    } catch {
      // best-effort
    }
  }
}


