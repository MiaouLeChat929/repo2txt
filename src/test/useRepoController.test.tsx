import { renderHook, act } from '@testing-library/react';
import { useRepoController } from '../hooks/useRepoController';
import { FileItem } from '../lib/file-processing';
import { describe, it, expect, vi } from 'vitest';

// Mock dependencies
vi.mock('../lib/github', () => ({
    fetchGitHubFileContents: vi.fn(),
    GitHubFile: {},
    GitHubNotFoundError: class extends Error {},
    GitHubRateLimitError: class extends Error {},
    GitHubAuthError: class extends Error {},
}));

// Mock local because readFileAsText is used
vi.mock('../lib/local', () => ({
    readFileAsText: vi.fn(),
}));

describe('useRepoController Integration', () => {
    it('should detect framework and filter files on tree load', async () => {
        const { result } = renderHook(() => useRepoController());

        const mockFiles: FileItem[] = [
            { path: 'package.json', type: 'blob', url: '', sha: '1', urlType: 'github' },
            { path: 'src/index.ts', type: 'blob', url: '', sha: '2', urlType: 'github' },
            { path: 'tests/test.ts', type: 'blob', url: '', sha: '3', urlType: 'github' },
            { path: 'README.md', type: 'blob', url: '', sha: '4', urlType: 'github' }
        ];

        act(() => {
            result.current.actions.handleTreeFetched(mockFiles, 'token', 'repo/test');
        });

        // Check detection
        expect(result.current.state.detectedFramework).toBe('nodejs');

        // Check filtering (Standard precision by default)
        // Standard Node: includes package.json, src/**, README.md. Excludes tests/.
        const selectedPaths = result.current.state.selectedFiles.map(f => f.path);
        expect(selectedPaths).toContain('package.json');
        expect(selectedPaths).toContain('src/index.ts');
        expect(selectedPaths).toContain('README.md');
        expect(selectedPaths).not.toContain('tests/test.ts');
    });

    it('should update filtering when precision changes', () => {
        const { result } = renderHook(() => useRepoController());
        const mockFiles: FileItem[] = [
             { path: 'package.json', type: 'blob', url: '', sha: '1', urlType: 'github' },
             { path: 'src/index.ts', type: 'blob', url: '', sha: '2', urlType: 'github' },
             { path: 'tests/test.ts', type: 'blob', url: '', sha: '3', urlType: 'github' },
        ];

        act(() => {
            result.current.actions.handleTreeFetched(mockFiles);
        });

        // Default Standard
        expect(result.current.state.selectedFiles.map(f=>f.path)).toContain('package.json');

        // Change to Core
        act(() => {
            result.current.actions.setPrecision('core');
        });

        const selectedPaths = result.current.state.selectedFiles.map(f => f.path);
        expect(selectedPaths).toContain('src/index.ts');
        expect(selectedPaths).not.toContain('package.json');
    });

    it('should detect outliers but not deselect them', () => {
        const { result } = renderHook(() => useRepoController());
        const mockFiles: FileItem[] = [
             { path: '1.ts', type: 'blob', url: '', sha: '1', urlType: 'github', size: 10 },
             { path: '2.ts', type: 'blob', url: '', sha: '2', urlType: 'github', size: 10 },
             { path: '3.ts', type: 'blob', url: '', sha: '3', urlType: 'github', size: 10 },
             { path: '4.ts', type: 'blob', url: '', sha: '4', urlType: 'github', size: 10 },
             { path: '5.ts', type: 'blob', url: '', sha: '5', urlType: 'github', size: 10 },
             { path: '6.ts', type: 'blob', url: '', sha: '6', urlType: 'github', size: 10 },
             { path: 'src/huge.ts', type: 'blob', url: '', sha: '7', urlType: 'github', size: 1000 }, // Outlier
        ];

        act(() => {
            result.current.actions.handleTreeFetched(mockFiles);
            result.current.actions.setExperimentalStats(true);
        });

        // Check outliers
        expect(result.current.state.outliers.has('src/huge.ts')).toBe(true);

        // Check selection - huge.ts should STILL be selected (because standard precision selects .ts)
        const selectedPaths = result.current.state.selectedFiles.map(f => f.path);
        expect(selectedPaths).toContain('src/huge.ts');
    });
});
