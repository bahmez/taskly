import { describe, expect, it, beforeEach, vi } from 'vitest';
import { GcsService } from './gcs.service.js';
import { Storage } from '@google-cloud/storage';

vi.mock('@google-cloud/storage', () => {
  return { Storage: vi.fn() };
});

describe('GcsService', () => {
  const StorageMock = Storage as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    StorageMock.mockReset();
    delete process.env.GCS_BUCKET;
    delete process.env.GOOGLE_CLOUD_BUCKET;
    delete process.env.GCS_BUCKET_NAME;
    delete process.env.GOOGLE_CLOUD_STORAGE_BUCKET;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  });

  it('uses GOOGLE_APPLICATION_CREDENTIALS when provided', () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = 'C:\\secrets\\sa.json';
    StorageMock.mockImplementationOnce(function () {
      return { bucket: vi.fn() };
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const s = new GcsService();
    expect(StorageMock).toHaveBeenCalledWith({ keyFilename: 'C:\\secrets\\sa.json' });
  });

  it('signedUploadUrl throws a helpful error when bucket is not configured', async () => {
    StorageMock.mockImplementationOnce(function () {
      return { bucket: vi.fn() };
    });
    const s = new GcsService();

    await expect(
      s.signedUploadUrl({ objectPath: 'x', contentType: 'text/plain', resumable: false }),
    ).rejects.toThrow(/GCS upload URL generation failed/i);
  });

  it('signedUploadUrl (resumable default) returns POST + type=resumable + headers', async () => {
    process.env.GCS_BUCKET = 'bucket';

    const getSignedUrl = vi.fn().mockResolvedValue(['https://signed.example/upload']);
    const file = vi.fn().mockReturnValue({ getSignedUrl });
    const bucket = vi.fn().mockReturnValue({ file });
    StorageMock.mockImplementationOnce(function () {
      return { bucket };
    });

    const s = new GcsService();
    const res = await s.signedUploadUrl({ objectPath: 'p', contentType: 'image/png' });

    expect(res).toMatchObject({
      url: 'https://signed.example/upload',
      method: 'POST',
      type: 'resumable',
      headers: { 'Content-Type': 'image/png', 'x-goog-resumable': 'start' },
    });
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 'v4',
        action: 'resumable',
        contentType: 'image/png',
        expires: expect.any(Number),
      }),
    );
  });

  it('signedUploadUrl (resumable=false) returns PUT + type=write', async () => {
    process.env.GCS_BUCKET = 'bucket';

    const getSignedUrl = vi.fn().mockResolvedValue(['https://signed.example/put']);
    const file = vi.fn().mockReturnValue({ getSignedUrl });
    const bucket = vi.fn().mockReturnValue({ file });
    StorageMock.mockImplementationOnce(function () {
      return { bucket };
    });

    const s = new GcsService();
    const res = await s.signedUploadUrl({
      objectPath: 'p',
      contentType: 'application/octet-stream',
      resumable: false,
    });

    expect(res).toMatchObject({
      url: 'https://signed.example/put',
      method: 'PUT',
      type: 'write',
      headers: { 'Content-Type': 'application/octet-stream' },
    });
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 'v4',
        action: 'write',
        contentType: 'application/octet-stream',
        expires: expect.any(Number),
      }),
    );
  });

  it('signedDownloadUrl returns GET + type=read', async () => {
    process.env.GCS_BUCKET = 'bucket';

    const getSignedUrl = vi.fn().mockResolvedValue(['https://signed.example/get']);
    const file = vi.fn().mockReturnValue({ getSignedUrl });
    const bucket = vi.fn().mockReturnValue({ file });
    StorageMock.mockImplementationOnce(function () {
      return { bucket };
    });

    const s = new GcsService();
    const res = await s.signedDownloadUrl({ objectPath: 'p' });

    expect(res).toMatchObject({
      url: 'https://signed.example/get',
      method: 'GET',
      type: 'read',
      headers: {},
    });
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 'v4',
        action: 'read',
        expires: expect.any(Number),
      }),
    );
  });
});


