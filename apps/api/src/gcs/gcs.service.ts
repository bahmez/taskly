/**
 * Google Cloud Storage (GCS) Service
 *
 * Manages signed URLs for secure file uploads and downloads.
 * Supports both simple PUT uploads and resumable uploads for large files.
 * 
 * Files are stored in hierarchical paths:
 * - Board attachments: boards/{boardId}/tickets/{ticketId}/{randomHex}-{filename}
 * - User avatars: users/{userId}/avatar/{randomHex}-{filename}
 */

import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import path from 'node:path';

/**
 * Result of a signed URL generation.
 * Contains URL, HTTP method, required headers, and expiration time.
 */
type SignedUrlResult = {
  /** The signed URL to use for the operation */
  url: string;
  /** HTTP method to use: PUT for write, POST for resumable start, GET for read */
  method: 'PUT' | 'GET' | 'POST';
  /** Required headers for the signed URL request */
  headers: Record<string, string>;
  /** ISO timestamp when the signed URL expires */
  expiresAt: string;
  /** Type of operation: write for direct PUT, resumable for session-based, read for GET */
  type: 'write' | 'resumable' | 'read';
};

/**
 * Calculates ISO timestamp for given minutes in the future.
 * @param minutes - Number of minutes to add to current time
 * @returns ISO 8601 formatted string
 */
function addMinutesIso(minutes: number): string {
  const d = new Date(Date.now() + minutes * 60_000);
  return d.toISOString();
}

/**
 * Service for managing Google Cloud Storage operations.
 * Provides signed URL generation for secure file uploads/downloads.
 */
@Injectable()
export class GcsService {
  private readonly storage: Storage;

  /**
   * Initializes GCS client with credentials from environment.
   * Uses GOOGLE_APPLICATION_CREDENTIALS if available, otherwise uses Application Default Credentials.
   */
  constructor() {
    const keyFilename = (process.env.GOOGLE_APPLICATION_CREDENTIALS ?? '').trim();
    // Force using the provided key file when set (avoids falling back to "authorized_user" ADC locally).
    this.storage = keyFilename ? new Storage({ keyFilename }) : new Storage();
  }

  /**
   * Retrieves the GCS bucket name from environment variables.
   * Checks multiple environment variable names for flexibility.
   * @returns Bucket name or empty string if not configured
   */
  private getBucketName(): string {
    return (
      process.env.GCS_BUCKET ??
      process.env.GOOGLE_CLOUD_BUCKET ??
      process.env.GCS_BUCKET_NAME ??
      process.env.GOOGLE_CLOUD_STORAGE_BUCKET ??
      ''
    ).trim();
  }

  /**
   * Gets the GCS bucket instance.
   * @returns GCS bucket reference
   * @throws Error if bucket name is not configured
   */
  private bucket() {
    const name = this.getBucketName();
    if (!name) throw new Error('GCS bucket not configured (set GCS_BUCKET)');
    return this.storage.bucket(name);
  }

  /**
   * Generates a signed upload URL for a file in GCS.
   * Supports both simple PUT uploads and resumable uploads (for large files).
   * 
   * Resumable uploads are recommended for files > 5MB as they can be paused/resumed.
   * 
   * @param input - Upload configuration
   * @param input.objectPath - GCS object path (e.g., boards/{id}/tickets/{id}/file.pdf)
   * @param input.contentType - MIME type of the file
   * @param input.expiresInMinutes - URL expiration time in minutes (default 15)
   * @param input.resumable - Use resumable upload protocol (default true)
   * @returns Signed URL details with HTTP method and required headers
   * @throws Error if GCS bucket is not configured or credentials are invalid
   * 
   * @example
   * // Simple upload
   * const { url, method, headers } = await gcsService.signedUploadUrl({
   *   objectPath: 'users/user123/avatar/randomhex-profile.jpg',
   *   contentType: 'image/jpeg',
   *   resumable: false
   * });
   * 
   * @example
   * // Resumable upload for large files
   * const result = await gcsService.signedUploadUrl({
   *   objectPath: 'boards/board1/tickets/ticket1/large-file.zip',
   *   contentType: 'application/zip',
   *   resumable: true
   * });
   * // Client must POST with 'x-goog-resumable: start' header to get session URL
   */
  async signedUploadUrl(input: { objectPath: string; contentType: string; expiresInMinutes?: number; resumable?: boolean }): Promise<SignedUrlResult> {
    try {
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
    } catch (error) {
      const err = error as { message?: string };
      const credsPath = (process.env.GOOGLE_APPLICATION_CREDENTIALS ?? '').trim();
      const credsHint = credsPath ? `GOOGLE_APPLICATION_CREDENTIALS=${path.basename(credsPath)}` : 'GOOGLE_APPLICATION_CREDENTIALS is not set';
      throw new Error(
        `GCS upload URL generation failed: ${err.message ?? 'Unknown error'}. ${credsHint}. Make sure you are using a service_account JSON (type=service_account) with client_email + private_key.`,
      );
    }
  }

  /**
   * Generates a signed download URL for a file in GCS.
   * Allows temporary public read access to private GCS objects.
   * 
   * @param input - Download configuration
   * @param input.objectPath - GCS object path to download
   * @param input.expiresInMinutes - URL expiration time in minutes (default 15)
   * @returns Signed URL details with GET method and no special headers
   * @throws Error if GCS bucket is not configured or credentials are invalid
   * 
   * @example
   * const { url } = await gcsService.signedDownloadUrl({
   *   objectPath: 'boards/board1/tickets/ticket1/randomhex-attachment.pdf'
   * });
   * // Share URL with client - user can download until URL expires
   */
  async signedDownloadUrl(input: { objectPath: string; expiresInMinutes?: number }): Promise<SignedUrlResult> {
    try {
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
    } catch (error) {
      const err = error as { message?: string };
      const credsPath = (process.env.GOOGLE_APPLICATION_CREDENTIALS ?? '').trim();
      const credsHint = credsPath ? `GOOGLE_APPLICATION_CREDENTIALS=${path.basename(credsPath)}` : 'GOOGLE_APPLICATION_CREDENTIALS is not set';
      throw new Error(
        `GCS download URL generation failed: ${err.message ?? 'Unknown error'}. ${credsHint}. Make sure you are using a service_account JSON (type=service_account) with client_email + private_key.`,
      );
    }
  }

  /**
   * Deletes an object from GCS.
   * Performs best-effort deletion - does not throw if object doesn't exist.
   * 
   * @param objectPath - GCS object path to delete
   * 
   * @example
   * await gcsService.deleteObject('boards/board1/tickets/ticket1/randomhex-file.pdf');
   */
  async deleteObject(objectPath: string): Promise<void> {
    const file = this.bucket().file(objectPath);
    try {
      await file.delete({ ignoreNotFound: true });
    } catch {
      // best-effort - don't fail if deletion has issues
    }
  }
}


