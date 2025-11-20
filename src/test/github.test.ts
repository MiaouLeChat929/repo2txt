import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseRepoUrl, getReferences } from '../lib/github';

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
});
