import { PDFDocument } from 'pdf-lib';
import { storagePut } from './storage';

/**
 * Generate a thumbnail from a PDF file
 * For now, we'll use a simple approach: extract first page info and create a placeholder
 * In production, you might want to use pdf2pic or similar for actual image rendering
 */
export async function generatePdfThumbnail(
  pdfUrl: string,
  fileName: string
): Promise<{ thumbnailUrl: string; thumbnailKey: string } | null> {
  try {
    // Fetch the PDF file
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      console.error('Failed to fetch PDF for thumbnail generation');
      return null;
    }

    const pdfBuffer = await response.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    
    // Get first page dimensions
    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      console.error('PDF has no pages');
      return null;
    }

    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Create a simple SVG placeholder thumbnail
    // In production, you'd use a proper PDF-to-image converter
    const thumbnailSvg = createPdfPlaceholderSvg(width, height, fileName);
    
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
    console.error('Error generating PDF thumbnail:', error);
    return null;
  }
}

/**
 * Create an SVG placeholder for PDF documents
 */
function createPdfPlaceholderSvg(width: number, height: number, fileName: string): string {
  const aspectRatio = width / height;
  const thumbnailWidth = 200;
  const thumbnailHeight = thumbnailWidth / aspectRatio;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${thumbnailWidth}" height="${thumbnailHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f8f9fa;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e9ecef;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#grad)" stroke="#dee2e6" stroke-width="2"/>
  <g transform="translate(${thumbnailWidth / 2}, ${thumbnailHeight / 2 - 20})">
    <path d="M-20,-30 L-20,30 L10,30 L10,0 L-10,0 L-10,-30 Z M-10,-30 L10,0 L-10,0 Z" 
          fill="#6c757d" opacity="0.6"/>
  </g>
  <text x="50%" y="${thumbnailHeight - 15}" 
        text-anchor="middle" 
        font-family="Arial, sans-serif" 
        font-size="10" 
        fill="#495057">
    PDF Document
  </text>
</svg>`;
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

  // PDF files
  if (mimeType === 'application/pdf') {
    return await generatePdfThumbnail(fileUrl, fileName);
  }

  // Word documents
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    return await generateWordThumbnail(fileName);
  }

  // For other file types, return null (no thumbnail)
  return null;
}
