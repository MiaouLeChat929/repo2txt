import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRepoController } from '@/hooks/useRepoController';
import { FileItem } from '@/lib/file-processing';

// Mock Sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('Integration - useRepoController', () => {
  const createMockFiles = (): FileItem[] => [
    { path: 'package.json', type: 'blob', url: '', sha: '', size: 100 },
    { path: 'src/index.ts', type: 'blob', url: '', sha: '', size: 100 },
    { path: 'tests/app.test.ts', type: 'blob', url: '', sha: '', size: 100 },
    { path: 'README.md', type: 'blob', url: '', sha: '', size: 100 },
  ];

  it('should correctly detect framework and select files on tree fetched', () => {
    const { result } = renderHook(() => useRepoController());
    const files = createMockFiles();

    act(() => {
      result.current.actions.handleTreeFetched(files);
    });

    // Verify Framework Detection
    expect(result.current.state.detectedFramework).toBe('nodejs');

    // Verify Default Selection (Standard)
    // Standard Node.js: include src/*, package.json, README.md. Exclude tests/.
    const selectedPaths = Array.from(result.current.state.selectedFiles).map(f => f.path);

    expect(selectedPaths).toContain('src/index.ts');
    expect(selectedPaths).toContain('package.json');
    expect(selectedPaths).toContain('README.md');
    expect(selectedPaths).not.toContain('tests/app.test.ts');
    expect(result.current.state.precision).toBe('standard');
  });

  it('should update selection when precision changes to full', () => {
    const { result } = renderHook(() => useRepoController());
    const files = createMockFiles();

    act(() => {
      result.current.actions.handleTreeFetched(files);
    });

    // Change to Full
    act(() => {
      result.current.actions.setPrecision('full');
    });

    const selectedPaths = Array.from(result.current.state.selectedFiles).map(f => f.path);

    // Full should include everything
    expect(selectedPaths).toContain('src/index.ts');
    expect(selectedPaths).toContain('tests/app.test.ts'); // Now included
    expect(selectedPaths).toContain('package.json');
    expect(selectedPaths).toContain('README.md');
  });
});
