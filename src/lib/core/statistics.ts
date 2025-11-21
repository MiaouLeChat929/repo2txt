// Statistics & Outlier Detection
// See context.md for algorithms
// Refactored for Smart Context System

import { FileItem, isFileItem } from '../file-processing';

export type OutlierMethod = 'mean' | 'median' | 'iqr';

export interface StatisticsResult {
  outliers: Set<string>; // Set of file paths
  threshold: number;
  method: OutlierMethod;
  stats: {
    mean: number;
    median: number;
    q1?: number;
    q3?: number;
    iqr?: number;
  }
}

export function calculateStatistics(files: FileItem[], method: OutlierMethod = 'median'): StatisticsResult {
  // Filter for files only (no directories) and get sizes
  const fileItems = files.filter(f => isFileItem(f) && typeof f.size === 'number');

  if (fileItems.length === 0) {
      return {
          outliers: new Set(),
          threshold: 0,
          method,
          stats: { mean: 0, median: 0 }
      };
  }

  const sizes = fileItems.map(f => f.size as number).sort((a, b) => a - b);
  const n = sizes.length;
  const sum = sizes.reduce((a, b) => a + b, 0);
  const mean = sum / n;

  // Calculate Median
  let median = 0;
  if (n % 2 === 1) {
    median = sizes[Math.floor(n / 2)];
  } else {
    median = (sizes[n / 2 - 1] + sizes[n / 2]) / 2;
  }

  let threshold = 0;
  let q1 = 0;
  let q3 = 0;
  let iqr = 0;

  if (method === 'mean') {
    const multiplier = 5;
    threshold = mean * multiplier;
  } else if (method === 'median') {
    const multiplier = 10;
    threshold = median * multiplier;
  } else if (method === 'iqr') {
    q1 = sizes[Math.floor(n * 0.25)];
    q3 = sizes[Math.floor(n * 0.75)];
    iqr = q3 - q1;
    threshold = q3 + (1.5 * iqr);
  }

  const outliers = new Set<string>();
  fileItems.forEach(f => {
    if ((f.size as number) > threshold) {
        // SAFETY CHECK: Ignore if file is at root (depth 0)
        if (f.path.includes('/')) {
            outliers.add(f.path);
        }
    }
  });

  return {
    outliers,
    threshold,
    method,
    stats: {
        mean,
        median,
        q1: method === 'iqr' ? q1 : undefined,
        q3: method === 'iqr' ? q3 : undefined,
        iqr: method === 'iqr' ? iqr : undefined
    }
  };
}
