import { describe, it, expect } from 'vitest';
import { calculateStatistics } from '@/lib/core/statistics';
import { FileItem } from '@/lib/file-processing';

describe('Statistics - calculateStatistics', () => {
  const createMockFiles = (sizes: number[]): FileItem[] => {
    return sizes.map((size, i) => ({
      path: `file${i}.txt`,
      type: 'blob',
      url: '...',
      sha: '...',
      size: size
    } as FileItem));
  };

  it('should detect outliers using mean method', () => {
    // 20 small files of size 10
    const sizes = Array(20).fill(10);
    // 1 large file of size 2000
    sizes.push(2000);

    // Sum = 200 + 2000 = 2200
    // Count = 21
    // Mean = 2200 / 21 ~= 104.76
    // Threshold = 104.76 * 5 ~= 523.8
    // 2000 > 523.8 -> Outlier

    const files = createMockFiles(sizes);
    // Make sure the large file has a recognizable path
    files[20].path = 'large-file.txt';
    // Also verify depth check: "Ignore if file is at root (depth 0)"
    // Wait, statistics.ts says: if (f.path.includes('/')) { outliers.add(f.path); }
    // So root files are ignored!
    // I must ensure the large file is NOT at root for it to be flagged.
    files[20].path = 'src/large-file.txt';

    // Also move some small files to subdirectories to be safe, though root files are just ignored as potential outliers.
    // If small files are at root, they contribute to stats but won't be flagged (they wouldn't anyway).

    const result = calculateStatistics(files, 'mean');

    expect(result.method).toBe('mean');
    expect(result.outliers.has('src/large-file.txt')).toBe(true);
    expect(result.outliers.size).toBe(1);
  });

  it('should ignore root files even if they are large', () => {
     // 20 small files
     const sizes = Array(20).fill(10);
     // 1 large file at root
     sizes.push(2000);

     const files = createMockFiles(sizes);
     files[20].path = 'large-root-file.txt'; // No slash

     const result = calculateStatistics(files, 'mean');

     expect(result.outliers.has('large-root-file.txt')).toBe(false);
  });
});
