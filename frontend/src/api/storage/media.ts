// @ts-nocheck
import { createHmac } from "node:crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

type PutOptions = {
  httpMetadata?: { contentType?: string; cacheControl?: string };
  customMetadata?: Record<string, string>;
};

type StoredObject = {
  body: ReadableStream<Uint8Array>;
  httpEtag?: string;
  writeHttpMetadata(headers: Headers): void;
};

type GlobalStorageCache = {
  divineStoneS3?: S3Client;
};

type ImageKitUpload = {
  fileId: string;
  filePath: string;
};

const globalStorageCache = globalThis as typeof globalThis & GlobalStorageCache;
const imageKitPrefix = "imagekit:";

function imageKitConfiguration() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY?.trim();
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT?.trim().replace(/\/$/, "");
  return privateKey && urlEndpoint ? { privateKey, urlEndpoint } : null;
}

function imageKitAuthorization(privateKey: string) {
  return `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`;
}

function imageKitStorageKey(fileId: string, filePath: string) {
  return `${imageKitPrefix}${fileId}:${encodeURIComponent(filePath)}`;
}

function parseImageKitStorageKey(key: string) {
  if (!key.startsWith(imageKitPrefix)) return null;
  const remainder = key.slice(imageKitPrefix.length);
  const separator = remainder.indexOf(":");
  if (separator < 1) return null;
  return {
    fileId: remainder.slice(0, separator),
    filePath: decodeURIComponent(remainder.slice(separator + 1)),
  };
}

export function publicUrlForMediaKey(key: string) {
  const configuration = imageKitConfiguration();
  const stored = parseImageKitStorageKey(key);
  if (!configuration || !stored) return null;
  return `${configuration.urlEndpoint}/${stored.filePath.replace(/^\/+/, "")}`;
}

function imageKitSignedUrl(filePath: string, expiresIn = 300) {
  const configuration = imageKitConfiguration();
  if (!configuration) throw new Error("ImageKit storage is unavailable.");
  const normalizedPath = filePath.replace(/^\/+/, "");
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  const signature = createHmac("sha1", configuration.privateKey)
    .update(`${normalizedPath}${expiresAt}`)
    .digest("hex");
  return `${configuration.urlEndpoint}/${normalizedPath}?ik-t=${expiresAt}&ik-s=${signature}`;
}

async function putImageKit(key: string, bytes: ArrayBuffer, options: PutOptions) {
  const configuration = imageKitConfiguration();
  if (!configuration) throw new Error("ImageKit storage is unavailable.");
  const segments = key.split("/").filter(Boolean);
  const fileName = segments.pop();
  if (!fileName) throw new Error("A valid media filename is required.");

  const form = new FormData();
  form.set("file", new Blob([bytes], { type: options.httpMetadata?.contentType }), fileName);
  form.set("fileName", fileName);
  form.set("folder", `/${segments.join("/")}`);
  form.set("useUniqueFileName", "false");
  form.set("isPrivateFile", String(options.httpMetadata?.cacheControl?.startsWith("private") ?? false));

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { authorization: imageKitAuthorization(configuration.privateKey) },
    body: form,
  });
  if (!response.ok) throw new Error(`ImageKit upload failed with status ${response.status}.`);
  const uploaded = await response.json() as ImageKitUpload;
  if (!uploaded.fileId || !uploaded.filePath) throw new Error("ImageKit returned an incomplete upload response.");
  return imageKitStorageKey(uploaded.fileId, uploaded.filePath);
}

async function deleteImageKit(key: string) {
  const configuration = imageKitConfiguration();
  const stored = parseImageKitStorageKey(key);
  if (!configuration || !stored) throw new Error("ImageKit storage is unavailable.");
  const response = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(stored.fileId)}`, {
    method: "DELETE",
    headers: { authorization: imageKitAuthorization(configuration.privateKey) },
  });
  if (!response.ok && response.status !== 404) throw new Error(`ImageKit deletion failed with status ${response.status}.`);
}

async function getImageKit(key: string): Promise<StoredObject | null> {
  const stored = parseImageKitStorageKey(key);
  if (!stored) return null;
  const response = await fetch(imageKitSignedUrl(stored.filePath), { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok || !response.body) throw new Error(`ImageKit retrieval failed with status ${response.status}.`);
  return {
    body: response.body,
    httpEtag: response.headers.get("etag") ?? undefined,
    writeHttpMetadata(headers) {
      for (const name of ["content-type", "content-length", "last-modified"] as const) {
        const value = response.headers.get(name);
        if (value) headers.set(name, value);
      }
    },
  };
}

function s3Configuration() {
  const bucket = process.env.S3_BUCKET?.trim();
  const region = process.env.S3_REGION?.trim();
  if (!bucket || !region) throw new Error("Object storage is unavailable. Configure ImageKit or S3.");
  return { bucket, region };
}

function s3Client() {
  if (globalStorageCache.divineStoneS3) return globalStorageCache.divineStoneS3;
  const { region } = s3Configuration();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  globalStorageCache.divineStoneS3 = new S3Client({
    region,
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
  });
  return globalStorageCache.divineStoneS3;
}

async function putS3(key: string, bytes: ArrayBuffer, options: PutOptions) {
  const { bucket } = s3Configuration();
  const configuredEncryption = process.env.S3_SERVER_SIDE_ENCRYPTION?.trim();
  const serverSideEncryption = configuredEncryption === "AES256" || configuredEncryption === "aws:kms" ? configuredEncryption : undefined;
  await s3Client().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: new Uint8Array(bytes),
    ContentType: options.httpMetadata?.contentType,
    CacheControl: options.httpMetadata?.cacheControl,
    Metadata: options.customMetadata,
    ServerSideEncryption: serverSideEncryption,
  }));
  return key;
}

async function deleteS3(key: string) {
  const { bucket } = s3Configuration();
  await s3Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

async function getS3(key: string): Promise<StoredObject | null> {
  const { bucket } = s3Configuration();
  try {
    const object = await s3Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!object.Body) return null;
    return {
      body: object.Body.transformToWebStream(),
      httpEtag: object.ETag,
      writeHttpMetadata(headers) {
        if (object.ContentType) headers.set("content-type", object.ContentType);
        if (object.CacheControl) headers.set("cache-control", object.CacheControl);
        if (object.ContentLength != null) headers.set("content-length", String(object.ContentLength));
      },
    };
  } catch (error) {
    const code = error && typeof error === "object" && "name" in error ? String(error.name) : "";
    if (code === "NoSuchKey" || code === "NotFound") return null;
    throw error;
  }
}

export function getMediaBucket() {
  return {
    put(key: string, bytes: ArrayBuffer, options: PutOptions = {}) {
      return imageKitConfiguration() ? putImageKit(key, bytes, options) : putS3(key, bytes, options);
    },
    delete(key: string) {
      return parseImageKitStorageKey(key) ? deleteImageKit(key) : deleteS3(key);
    },
    get(key: string) {
      return parseImageKitStorageKey(key) ? getImageKit(key) : getS3(key);
    },
  };
}
