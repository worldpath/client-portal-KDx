/**
 * Client-side storage helper for uploading files to S3
 * Converts file to base64 and uses backend storage API via tRPC
 */

export async function storagePut(
  fileKey: string,
  file: File | Blob,
  contentType?: string
): Promise<{ url: string; key: string }> {
  // Convert file to base64
  const base64 = await fileToBase64(file);
  
  // Use tRPC endpoint
  const response = await fetch('/api/trpc/storage.upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileKey,
      content: base64,
      contentType: contentType || 'application/octet-stream',
    }),
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const data = await response.json();
  return {
    url: data.result.data.url,
    key: fileKey,
  };
}

function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
