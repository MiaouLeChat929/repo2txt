import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchRepoSha, GitHubNotFoundError, GitHubRateLimitError, GitHubAuthError } from '../lib/github';

const fetchMock = vi.fn();
global.fetch = fetchMock;

describe('GitHub Error Handling', () => {
    beforeEach(() => {
        fetchMock.mockClear();
    });

    it('should throw GitHubNotFoundError on 404', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 404,
            headers: new Headers(),
            json: async () => ({})
        });

        await expect(fetchRepoSha('owner', 'repo', '', '')).rejects.toThrow(GitHubNotFoundError);
    });

    it('should throw GitHubRateLimitError on 403 with rate limit 0', async () => {
        const headers = new Headers();
        headers.set('X-RateLimit-Remaining', '0');
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 403,
            headers: headers,
            json: async () => ({})
        });

        await expect(fetchRepoSha('owner', 'repo', '', '')).rejects.toThrow(GitHubRateLimitError);
    });

    it('should throw GitHubAuthError on 401', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 401,
            headers: new Headers(),
            json: async () => ({})
        });

        await expect(fetchRepoSha('owner', 'repo', '', '')).rejects.toThrow(GitHubAuthError);
    });
});
