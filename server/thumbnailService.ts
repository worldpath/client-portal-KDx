import { fromPath } from 'pdf2pic';
import { storagePut } from './storage';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ThumbnailUrls {
  small: string;
  medium: string;
  large: string;
  smallWebp: string;
  mediumWebp: string;
  largeWebp: string;
}

export interface ThumbnailResult {
  thumbnailUrls: ThumbnailUrls;
  thumbnailKeys: {
    small: string;
    medium: string;
    large: string;
    smallWebp: string;
    mediumWebp: string;
    largeWebp: string;
  };
}

/**
 * Resize image buffer to multiple sizes in both PNG and WebP formats
 */
async function resizeImage(
  inputBuffer: Buffer,
  sizes: { width: number; height: number; suffix: string }[]
): Promise<{ bufferPng: Buffer; bufferWebp: Buffer; suffix: string }[]> {
  const results = await Promise.all(
    sizes.map(async ({ width, height, suffix }) => {
      const sharpInstance = sharp(inputBuffer).resize(width, height, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      });

      // Generate both PNG and WebP in parallel
      const [bufferPng, bufferWebp] = await Promise.all([
        sharpInstance.clone().png().toBuffer(),
        sharpInstance.clone().webp({ quality: 85 }).toBuffer()
      ]);

      return { bufferPng, bufferWebp, suffix };
    })
  );
  return results;
}

/**
 * Generate responsive thumbnail images from a PDF file's first page
 */
export async function generatePdfThumbnail(
  pdfUrl: string,
  fileName: string
): Promise<ThumbnailResult | null> {
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

    // Configure pdf2pic to convert first page to high-res PNG
    const options = {
      density: 300,           // High DPI for quality
      saveFilename: 'thumbnail',
      savePath: outputDir,
      format: 'png',
      width: 1600,           // Large base size
      height: 2080,          // A4 ratio
    };

    const convert = fromPath(tempPdfPath, options);
    
    // Convert only the first page
    const result = await convert(1, { responseType: 'image' });

    if (!result || !result.path) {
      console.error('Failed to convert PDF to image');
      return null;
    }

    // Read the generated high-res image
    const highResBuffer = fs.readFileSync(result.path);

    // Generate three sizes: small (200x260), medium (400x520), large (800x1040)
    const sizes = [
      { width: 200, height: 260, suffix: 'small' },
      { width: 400, height: 520, suffix: 'medium' },
      { width: 800, height: 1040, suffix: 'large' },
    ];

    const resizedImages = await resizeImage(highResBuffer, sizes);

    // Upload all sizes to S3 with long-term caching (both PNG and WebP)
    const timestamp = Date.now();
    const baseKey = `thumbnails/${timestamp}-${fileName.replace(/\.[^/.]+$/, '')}`;
    
    const uploadResults = await Promise.all(
      resizedImages.flatMap(({ bufferPng, bufferWebp, suffix }) => [
        // Upload PNG version
        storagePut(
          `${baseKey}-${suffix}.png`,
          bufferPng,
          {
            contentType: 'image/png',
            cacheControl: 'public, max-age=31536000, immutable'
          }
        ).then(result => ({ url: result.url, key: result.key, suffix, format: 'png' })),
        // Upload WebP version
        storagePut(
          `${baseKey}-${suffix}.webp`,
          bufferWebp,
          {
            contentType: 'image/webp',
            cacheControl: 'public, max-age=31536000, immutable'
          }
        ).then(result => ({ url: result.url, key: result.key, suffix, format: 'webp' }))
      ])
    );

    // Clean up temp files
    try {
      fs.unlinkSync(tempPdfPath);
      fs.unlinkSync(result.path);
      fs.rmdirSync(outputDir);
    } catch (cleanupError) {
      console.warn('Failed to clean up temp files:', cleanupError);
    }

    // Organize results by size and format
    const thumbnailUrls: ThumbnailUrls = {
      small: uploadResults.find(r => r.suffix === 'small' && r.format === 'png')!.url,
      medium: uploadResults.find(r => r.suffix === 'medium' && r.format === 'png')!.url,
      large: uploadResults.find(r => r.suffix === 'large' && r.format === 'png')!.url,
      smallWebp: uploadResults.find(r => r.suffix === 'small' && r.format === 'webp')!.url,
      mediumWebp: uploadResults.find(r => r.suffix === 'medium' && r.format === 'webp')!.url,
      largeWebp: uploadResults.find(r => r.suffix === 'large' && r.format === 'webp')!.url,
    };

    const thumbnailKeys = {
      small: uploadResults.find(r => r.suffix === 'small' && r.format === 'png')!.key,
      medium: uploadResults.find(r => r.suffix === 'medium' && r.format === 'png')!.key,
      large: uploadResults.find(r => r.suffix === 'large' && r.format === 'png')!.key,
      smallWebp: uploadResults.find(r => r.suffix === 'small' && r.format === 'webp')!.key,
      mediumWebp: uploadResults.find(r => r.suffix === 'medium' && r.format === 'webp')!.key,
      largeWebp: uploadResults.find(r => r.suffix === 'large' && r.format === 'webp')!.key,
    };

    return { thumbnailUrls, thumbnailKeys };
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
 * Generate responsive thumbnail for Word documents
 */
export async function generateWordThumbnail(
  fileName: string
): Promise<ThumbnailResult | null> {
  try {
    // Generate SVG placeholders at different sizes
    const sizes = [
      { width: 200, height: 260, suffix: 'small' },
      { width: 400, height: 520, suffix: 'medium' },
      { width: 800, height: 1040, suffix: 'large' },
    ];

    const timestamp = Date.now();
    const baseKey = `thumbnails/${timestamp}-${fileName.replace(/\.[^/.]+$/, '')}`;

    const uploadResults = await Promise.all(
      sizes.flatMap(({ width, height, suffix }) => {
        const svg = createWordPlaceholderSvg(fileName, width, height);
        return [
          // Upload SVG as PNG placeholder
          storagePut(
            `${baseKey}-${suffix}.png`,
            Buffer.from(svg),
            {
              contentType: 'image/svg+xml',
              cacheControl: 'public, max-age=31536000, immutable'
            }
          ).then(result => ({ url: result.url, key: result.key, suffix, format: 'png' })),
          // Upload SVG as WebP placeholder (same SVG content)
          storagePut(
            `${baseKey}-${suffix}.webp`,
            Buffer.from(svg),
            {
              contentType: 'image/svg+xml',
              cacheControl: 'public, max-age=31536000, immutable'
            }
          ).then(result => ({ url: result.url, key: result.key, suffix, format: 'webp' }))
        ];
      })
    );

    const thumbnailUrls: ThumbnailUrls = {
      small: uploadResults.find(r => r.suffix === 'small' && r.format === 'png')!.url,
      medium: uploadResults.find(r => r.suffix === 'medium' && r.format === 'png')!.url,
      large: uploadResults.find(r => r.suffix === 'large' && r.format === 'png')!.url,
      smallWebp: uploadResults.find(r => r.suffix === 'small' && r.format === 'webp')!.url,
      mediumWebp: uploadResults.find(r => r.suffix === 'medium' && r.format === 'webp')!.url,
      largeWebp: uploadResults.find(r => r.suffix === 'large' && r.format === 'webp')!.url,
    };

    const thumbnailKeys = {
      small: uploadResults.find(r => r.suffix === 'small' && r.format === 'png')!.key,
      medium: uploadResults.find(r => r.suffix === 'medium' && r.format === 'png')!.key,
      large: uploadResults.find(r => r.suffix === 'large' && r.format === 'png')!.key,
      smallWebp: uploadResults.find(r => r.suffix === 'small' && r.format === 'webp')!.key,
      mediumWebp: uploadResults.find(r => r.suffix === 'medium' && r.format === 'webp')!.key,
      largeWebp: uploadResults.find(r => r.suffix === 'large' && r.format === 'webp')!.key,
    };

    return { thumbnailUrls, thumbnailKeys };
  } catch (error) {
    console.error('Error generating Word thumbnail:', error);
    return null;
  }
}

/**
 * Create an SVG placeholder for Word documents
 */
function createWordPlaceholderSvg(fileName: string, width: number, height: number): string {
  const fontSize = Math.floor(width * 0.3);
  const labelFontSize = Math.floor(width * 0.05);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="wordGrad-${width}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#2b579a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1e3a5f;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#wordGrad-${width})" rx="4"/>
  <g transform="translate(${width / 2}, ${height / 2 - fontSize / 2})">
    <text x="0" y="0" 
          text-anchor="middle" 
          font-family="Arial, sans-serif" 
          font-size="${fontSize}" 
          font-weight="bold"
          fill="white">
      W
    </text>
  </g>
  <text x="50%" y="${height - labelFontSize * 1.5}" 
        text-anchor="middle" 
        font-family="Arial, sans-serif" 
        font-size="${labelFontSize}" 
        fill="white">
    Word Document
  </text>
</svg>`;
}

/**
 * Generate responsive thumbnails based on file type
 */
export async function generateThumbnail(
  fileUrl: string,
  fileName: string,
  mimeType: string | null
): Promise<ThumbnailResult | null> {
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
