// Smart Filtering Engine
// Logic Flow from context.md

import { FileItem, isFileItem } from '../file-processing';
import {
  FrameworkID,
  PrecisionLevel,
  FRAMEWORK_RULES,
  GLOBAL_EXCLUSIONS
} from './heuristics';

// Simple glob matcher implementation
// Supports: dir/, *.ext, filename, **/
export function matchPattern(path: string, pattern: string): boolean {
  if (pattern === '**/*') return true;

  // Normalize path
  const normalizedPath = path.replace(/\\/g, '/');

  // Directory match: "dir/" matches "dir/file" or "path/to/dir/file"
  if (pattern.endsWith('/')) {
      return normalizedPath.includes(pattern) || normalizedPath.startsWith(pattern);
      // "node_modules/" should match "node_modules/foo.js" but also "src/node_modules/foo.js"
      return normalizedPath.startsWith(pattern);
  }

  // Extension match: "*.ext"
  if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1); // .ext
      return normalizedPath.endsWith(ext);
  }

  // Filename match: "filename"
  if (!pattern.includes('/')) {
      return normalizedPath.endsWith('/' + pattern) || normalizedPath === pattern;
  }

  // Exact match or path match? "dir/file.txt"
  return normalizedPath === pattern;
}

export function shouldIncludeFile(
  path: string,
  framework: FrameworkID,
  precision: PrecisionLevel
): boolean {
  const rules = FRAMEWORK_RULES[framework][precision];

  // 1. Global Exclusion
  for (const pattern of GLOBAL_EXCLUSIONS) {
      if (pattern.endsWith('/')) {
          if (path.includes(pattern)) return false;
      } else {
          if (matchPattern(path, pattern)) return false;
      }
  }

  // 2. Specific Exclusion
  if (rules.exclude) {
      for (const pattern of rules.exclude) {
           let cleanPattern = pattern;
           if (pattern.startsWith('**/')) {
               cleanPattern = pattern.slice(3);
               if (cleanPattern.includes('*') && !cleanPattern.startsWith('*')) {
                   const regexStr = cleanPattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
                   if (new RegExp(regexStr + '$').test(path)) return false;
                   continue;
               }
           }

           if (matchPattern(path, cleanPattern)) return false;
      }
  }

  // 3. Specific Inclusion
  let included = false;
  if (rules.include) {
      for (const pattern of rules.include) {
          if (pattern === '**/*') {
              included = true;
              break;
          }

          let cleanPattern = pattern;
           if (pattern.startsWith('**/')) {
               cleanPattern = pattern.slice(3);
           }

           // Handle src/**/*.js -> startsWith src/ AND endsWith .js
           if (pattern.includes('**') && pattern.indexOf('**') > 0) {
               const parts = pattern.split('/**/'); // split by double star
               if (parts.length === 2) {
                   const dir = parts[0];
                   const filePat = parts[1]; // *.js
                   if (path.startsWith(dir)) {
                       if (matchPattern(path, filePat)) {
                           included = true;
                           break;
                       }
                   }
               }
               const recursiveMarker = '/**/';
                if (pattern.includes(recursiveMarker)) {
                     const [prefix, suffix] = pattern.split(recursiveMarker);
                     if (path.startsWith(prefix) && path.endsWith(suffix.replace('*', ''))) {
                         included = true;
                         break;
                     }
                } else if (pattern.includes('/**/*.'), pattern) {
                    const prefix = pattern.substring(0, pattern.indexOf('/**/'));
                     if (path.startsWith(prefix) && path.endsWith(pattern.substring(pattern.lastIndexOf('.')))) {
                         included = true;
                         break;
                     }
                }
           }

          if (matchPattern(path, cleanPattern)) {
              included = true;
              break;
          }
      }
  }

  // Default: Exclude if no inclusion rule matched
  return included;
}

export interface FilterResult {
  selectedFiles: Set<string>;
  framework: FrameworkID;
}

export function applySmartFilter(
  files: FileItem[],
  framework: FrameworkID,
  precision: PrecisionLevel
): FilterResult {
  const selectedFiles = new Set<string>();

  files.forEach(file => {
      // Use unified helper
      if (isFileItem(file)) {
          if (shouldIncludeFile(file.path, framework, precision)) {
              selectedFiles.add(file.path);
          }
      }
  });

  return { selectedFiles, framework };
}
