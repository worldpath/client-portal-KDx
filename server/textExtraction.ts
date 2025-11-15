import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const execAsync = promisify(exec);

/**
 * Extract text from a PDF file using pdftotext utility
 */
export async function extractTextFromPDF(url: string): Promise<string> {
  let tempFile: string | null = null;
  
  try {
    // Download the file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    
    // Save to temp file
    tempFile = join(tmpdir(), `pdf-extract-${Date.now()}.pdf`);
    await writeFile(tempFile, Buffer.from(buffer));
    
    // Extract text using pdftotext
    const { stdout } = await execAsync(`pdftotext "${tempFile}" -`);
    
    return stdout;
  } catch (error) {
    console.error('PDF text extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  } finally {
    // Clean up temp file
    if (tempFile) {
      try {
        await unlink(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Extract text from a Word document (.docx) using pandoc
 */
export async function extractTextFromWord(url: string): Promise<string> {
  let tempFile: string | null = null;
  
  try {
    // Download the file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();
    
    // Save to temp file
    tempFile = join(tmpdir(), `word-extract-${Date.now()}.docx`);
    await writeFile(tempFile, Buffer.from(buffer));
    
    // Extract text using pandoc
    const { stdout } = await execAsync(`pandoc "${tempFile}" -t plain`);
    
    return stdout;
  } catch (error) {
    console.error('Word text extraction error:', error);
    throw new Error('Failed to extract text from Word document');
  } finally {
    // Clean up temp file
    if (tempFile) {
      try {
        await unlink(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Extract text from a plain text file
 */
export async function extractTextFromPlainText(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error('Plain text extraction error:', error);
    throw new Error('Failed to extract text from file');
  }
}

/**
 * Extract text from a file based on its MIME type
 */
export async function extractText(url: string, mimeType: string): Promise<string> {
  if (mimeType === 'application/pdf') {
    return extractTextFromPDF(url);
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    return extractTextFromWord(url);
  } else if (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/xml'
  ) {
    return extractTextFromPlainText(url);
  } else {
    throw new Error(`Unsupported file type for text extraction: ${mimeType}`);
  }
}
