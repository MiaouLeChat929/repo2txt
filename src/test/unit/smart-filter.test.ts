import { describe, it, expect } from 'vitest';
import { applySmartFilter } from '@/lib/core/smart-filter';
import { FileItem } from '@/lib/file-processing';

describe('Smart Filter - applySmartFilter', () => {
  const createMockFiles = (paths: string[]): FileItem[] => {
    return paths.map(p => ({
      path: p,
      type: 'blob',
      url: `https://github.com/owner/repo/blob/main/${p}`,
      sha: 'mock-sha',
      size: 100
    } as FileItem));
  };

  it('should exclude node_modules in all modes', () => {
    const files = createMockFiles([
      'src/index.ts',
      'node_modules/package/index.js',
      'src/utils.ts'
    ]);

    // Test Node.js Core
    const resultCore = applySmartFilter(files, 'nodejs', 'core');
    expect(resultCore.selectedFiles.has('src/index.ts')).toBe(true);
    expect(resultCore.selectedFiles.has('node_modules/package/index.js')).toBe(false);

    // Test Node.js Full
    const resultFull = applySmartFilter(files, 'nodejs', 'full');
    expect(resultFull.selectedFiles.has('src/index.ts')).toBe(true);
    expect(resultFull.selectedFiles.has('node_modules/package/index.js')).toBe(false); // Global exclusion
  });

  it('should exclude tests and markdown in Core precision for Node.js', () => {
    const files = createMockFiles([
      'src/index.ts',
      'src/components/App.tsx',
      'tests/unit.test.ts',
      'README.md',
      'package.json'
    ]);

    const result = applySmartFilter(files, 'nodejs', 'core');

    // Should include src files
    expect(result.selectedFiles.has('src/index.ts')).toBe(true);
    expect(result.selectedFiles.has('src/components/App.tsx')).toBe(true);

    // Should exclude tests
    expect(result.selectedFiles.has('tests/unit.test.ts')).toBe(false);

    // Should exclude README.md (not in Core include list)
    expect(result.selectedFiles.has('README.md')).toBe(false);

    // Should exclude package.json (not in Core include list)
    expect(result.selectedFiles.has('package.json')).toBe(false);
  });

  it('should include tests and markdown in Full precision for Node.js', () => {
    const files = createMockFiles([
      'src/index.ts',
      'tests/unit.test.ts',
      'README.md'
    ]);

    const result = applySmartFilter(files, 'nodejs', 'full');

    expect(result.selectedFiles.has('src/index.ts')).toBe(true);
    expect(result.selectedFiles.has('tests/unit.test.ts')).toBe(true);
    expect(result.selectedFiles.has('README.md')).toBe(true);
  });
});
