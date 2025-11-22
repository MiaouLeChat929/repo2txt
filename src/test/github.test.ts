import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseRepoUrl, getReferences, fetchRepoSha } from '../lib/github';

// Mock global fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('github.ts', () => {
    beforeEach(() => {
        fetchMock.mockClear();
    });

    describe('parseRepoUrl', () => {
        it('should parse standard repo url', () => {
            const res = parseRepoUrl('https://github.com/owner/repo');
            expect(res).toEqual({ owner: 'owner', repo: 'repo', path: '' });
        });

        it('should parse repo url with trailing slash', () => {
             const res = parseRepoUrl('https://github.com/owner/repo/');
             expect(res).toEqual({ owner: 'owner', repo: 'repo', path: '' });
        });

        it('should parse repo url with branch/path', () => {
            const res = parseRepoUrl('https://github.com/owner/repo/tree/main/src');
            expect(res).toEqual({ owner: 'owner', repo: 'repo', path: 'main/src' });
        });

        it('should throw error for invalid url', () => {
            expect(() => parseRepoUrl('https://google.com')).toThrow();
        });
    });

    describe('getReferences', () => {
        it('should fetch branches and tags', async () => {
             fetchMock
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => [{ ref: 'refs/heads/main' }, { ref: 'refs/heads/dev' }]
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => [{ ref: 'refs/tags/v1.0' }]
                });

            const refs = await getReferences('owner', 'repo');
            expect(refs.branches).toEqual(['main', 'dev']);
            expect(refs.tags).toEqual(['v1.0']);
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });
    });

    describe('fetchRepoSha', () => {
        it('should fetch commit sha for root path', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ commit: { tree: { sha: 'root-sha' } } })
            });

            const sha = await fetchRepoSha('owner', 'repo', 'main', '');
            expect(sha).toBe('root-sha');
            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('/commits/main'),
                expect.any(Object)
            );
        });

        it('should fetch object sha for file path', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ sha: 'file-sha' })
            });

            const sha = await fetchRepoSha('owner', 'repo', 'main', 'src/index.ts');
            expect(sha).toBe('file-sha');
            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('/contents/src/index.ts'),
                expect.any(Object)
            );
        });

        it('should throw error for subdirectory path (array response)', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => [{ name: 'file1' }, { name: 'file2' }] // Array response
            });

            await expect(fetchRepoSha('owner', 'repo', 'main', 'src/dir')).rejects.toThrow("Processing subdirectories directly is not fully supported");
        });
    });
});
