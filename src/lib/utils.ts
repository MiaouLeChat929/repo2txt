import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a smart filename based on source string and date.
 * Rules:
 * 1. Extract user and repo from URL (github) or folder name.
 * 2. Clean string (lowercase, replace non-alphanum with -, remove duplicate/leading/trailing dashes).
 * 3. Append current date YYYY-MM-DD.
 * 4. Append extension.
 */
export function generateSmartFilename(source: string, extension: string = 'txt'): string {
  // Clean up extension
  const ext = extension.startsWith('.') ? extension : `.${extension}`;

  // Extract info
  let name = source;

  // If GitHub URL
  if (source.includes('github.com')) {
      try {
          const url = new URL(source);
          const parts = url.pathname.split('/').filter(Boolean);
          if (parts.length >= 2) {
              name = `${parts[0]}-${parts[1]}`;
          } else if (parts.length === 1) {
              name = parts[0];
          }
      } catch (e) {
          // fallback if invalid url
          name = source;
      }
  }

  // Sanitize
  // Convert to lowercase
  let sanitized = name.toLowerCase();
  // Replace non-alphanumeric with dash
  sanitized = sanitized.replace(/[^a-z0-9]/g, '-');
  // Remove multiple dashes
  sanitized = sanitized.replace(/-+/g, '-');
  // Trim dashes
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  if (!sanitized) sanitized = 'repo-context';

  // Date
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  return `${sanitized}-${date}${ext}`;
}
