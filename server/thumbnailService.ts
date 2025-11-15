import { fromPath } from 'pdf2pic';
import { storagePut } from './storage';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Generate a real thumbnail image from a PDF file's first page
 */
export async function generatePdfThumbnail(
  pdfUrl: string,
  fileName: string
): Promise<{ thumbnailUrl: string; thumbnailKey: string } | null> {
  const tempDir = os.tmpdir();
  const tempPdfPath = path.join(tempDir, `temp-${Date.now()}-${fileName}`);
  const outputDir = path.join(tempDir, `pdf-output-${Date.now()}`);

  try {
    // Fetch the PDF file
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      console.error('Failed to fetch PDF for thumbnail generation');
      return null;
    }

    const pdfBuffer = await response.arrayBuffer();
    
    // Save PDF to temp file
    fs.writeFileSync(tempPdfPath, Buffer.from(pdfBuffer));

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Configure pdf2pic to convert first page to PNG
    const options = {
      density: 150,           // DPI - higher = better quality but larger file
      saveFilename: 'thumbnail',
      savePath: outputDir,
      format: 'png',
      width: 400,            // Width in pixels
      height: 520,           // Height in pixels (roughly A4 ratio)
    };

    const convert = fromPath(tempPdfPath, options);
    
    // Convert only the first page
    const result = await convert(1, { responseType: 'image' });

    if (!result || !result.path) {
      console.error('Failed to convert PDF to image');
      return null;
    }

    // Read the generated image
    const thumbnailBuffer = fs.readFileSync(result.path);

    // Upload thumbnail to S3
    const thumbnailKey = `thumbnails/${Date.now()}-${fileName.replace(/\.[^/.]+$/, '')}.png`;
    const uploadResult = await storagePut(
      thumbnailKey,
      thumbnailBuffer,
      'image/png'
    );

    // Clean up temp files
    try {
      fs.unlinkSync(tempPdfPath);
      fs.unlinkSync(result.path);
      fs.rmdirSync(outputDir);
    } catch (cleanupError) {
      console.warn('Failed to clean up temp files:', cleanupError);
    }

    return {
      thumbnailUrl: uploadResult.url,
      thumbnailKey,
    };
  } catch (error) {
    console.error('Error generating PDF thumbnail:', error);
    
    // Clean up temp files on error
    try {
      if (fs.existsSync(tempPdfPath)) fs.unlinkSync(tempPdfPath);
      if (fs.existsSync(outputDir)) {
        const files = fs.readdirSync(outputDir);
        files.forEach(file => fs.unlinkSync(path.join(outputDir, file)));
        fs.rmdirSync(outputDir);
      }
    } catch (cleanupError) {
      console.warn('Failed to clean up temp files after error:', cleanupError);
    }

    return null;
  }
}

/**
 * Generate thumbnail for Word documents
 * For Word docs, we create a placeholder since direct rendering requires complex conversion
 */
export async function generateWordThumbnail(
  fileName: string
): Promise<{ thumbnailUrl: string; thumbnailKey: string } | null> {
  try {
    const thumbnailSvg = createWordPlaceholderSvg(fileName);
    
    // Upload thumbnail to S3
    const thumbnailKey = `thumbnails/${Date.now()}-${fileName.replace(/\.[^/.]+$/, '')}.svg`;
    const uploadResult = await storagePut(
      thumbnailKey,
      Buffer.from(thumbnailSvg),
      'image/svg+xml'
    );

    return {
      thumbnailUrl: uploadResult.url,
      thumbnailKey,
    };
  } catch (error) {
    console.error('Error generating Word thumbnail:', error);
    return null;
  }
}

/**
 * Create an SVG placeholder for Word documents
 */
function createWordPlaceholderSvg(fileName: string): string {
  const thumbnailWidth = 200;
  const thumbnailHeight = 260;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${thumbnailWidth}" height="${thumbnailHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wordGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#2b579a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e3a5f;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#wordGrad)" rx="4"/>
  <g transform="translate(${thumbnailWidth / 2}, ${thumbnailHeight / 2 - 20})">
    <text x="0" y="0" 
          text-anchor="middle" 
          font-family="Arial, sans-serif" 
          font-size="60" 
          font-weight="bold"
          fill="white">
      W
    </text>
  </g>
  <text x="50%" y="${thumbnailHeight - 15}" 
        text-anchor="middle" 
        font-family="Arial, sans-serif" 
        font-size="10" 
        fill="white">
    Word Document
  </text>
</svg>`;
}

/**
 * Generate thumbnail based on file type
 */
export async function generateThumbnail(
  fileUrl: string,
  fileName: string,
  mimeType: string | null
): Promise<{ thumbnailUrl: string; thumbnailKey: string } | null> {
  if (!mimeType) {
    return null;
  }

  // PDF files - generate real preview
  if (mimeType === 'application/pdf') {
    return await generatePdfThumbnail(fileUrl, fileName);
  }

  // Word documents - use placeholder
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    return await generateWordThumbnail(fileName);
  }

  // For other file types, return null (no thumbnail)
  return null;
}
