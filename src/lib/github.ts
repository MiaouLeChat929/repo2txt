export interface RepoInfo {
    owner: string;
    repo: string;
    ref?: string;
    path?: string;
}

export interface GitHubFile {
    path: string;
    type: 'blob' | 'tree';
    url: string;
    sha: string;
    size?: number;
    urlType?: 'github' | 'local' | 'zip';
}

export interface FileContent {
    path: string;
    text: string;
    url: string;
}

// Custom Error Classes
export class GitHubError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "GitHubError";
    }
}

export class GitHubNotFoundError extends GitHubError {
    constructor(message = "Repository or resource not found") {
        super(message);
        this.name = "GitHubNotFoundError";
    }
}

export class GitHubRateLimitError extends GitHubError {
    constructor(message = "API rate limit exceeded") {
        super(message);
        this.name = "GitHubRateLimitError";
    }
}

export class GitHubAuthError extends GitHubError {
    constructor(message = "Authentication failed") {
        super(message);
        this.name = "GitHubAuthError";
    }
}

export function parseRepoUrl(url: string): RepoInfo {
    url = url.replace(/\/$/, '');
    const urlPattern = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(\/tree\/(.+))?$/;
    const match = url.match(urlPattern);
    if (!match) {
        throw new Error('Invalid GitHub repository URL. Please ensure the URL is in the correct format: ' +
            'https://github.com/owner/repo or https://github.com/owner/repo/tree/branch/path');
    }
    return {
        owner: match[1],
        repo: match[2],
        path: match[4] || ''
    };
}

export async function getReferences(owner: string, repo: string, token?: string): Promise<{ branches: string[], tags: string[] }> {
    const headers: HeadersInit = {
        'Accept': 'application/vnd.github+json'
    };
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }

    const [branchesResponse, tagsResponse] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}/git/matching-refs/heads/`, { headers }),
        fetch(`https://api.github.com/repos/${owner}/${repo}/git/matching-refs/tags/`, { headers })
    ]);

    if (!branchesResponse.ok) handleFetchError(branchesResponse);
    if (!tagsResponse.ok) handleFetchError(tagsResponse);

    const branches = await branchesResponse.json();
    const tags = await tagsResponse.json();

    return {
        branches: branches.map((b: any) => b.ref.split("/").slice(2).join("/")),
        tags: tags.map((t: any) => t.ref.split("/").slice(2).join("/"))
    };
}

export async function fetchRepoSha(owner: string, repo: string, ref: string, path: string, token?: string): Promise<string> {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path ? `${path}` : ''}${ref ? `?ref=${ref}` : ''}`;
    const headers: HeadersInit = {
        'Accept': 'application/vnd.github.object+json'
    };
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
        handleFetchError(response);
    }
    const data = await response.json();
    return data.sha;
}

export async function fetchRepoTree(owner: string, repo: string, sha: string, token?: string): Promise<GitHubFile[]> {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`;
    const headers: HeadersInit = {
        'Accept': 'application/vnd.github+json'
    };
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
        handleFetchError(response);
    }
    const data = await response.json();

    // Process and filter the tree
    return data.tree.map((item: any) => ({
        ...item,
        urlType: 'github'
    }));
}

export async function fetchGitHubFileContents(files: GitHubFile[], token?: string): Promise<FileContent[]> {
    const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3.raw'
    };
    if (token) {
        headers['Authorization'] = `token ${token}`;
    }
    const contents = await Promise.all(files.map(async file => {
        const response = await fetch(file.url, { headers });
        if (!response.ok) {
            handleFetchError(response);
        }
        const text = await response.text();
        return { url: file.url, path: file.path, text };
    }));
    return contents;
}

function handleFetchError(response: Response) {
    if (response.status === 404) {
        throw new GitHubNotFoundError(`Repository, branch, or path not found. Please check that the URL, branch/tag, and path are correct and accessible.`);
    }
    if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining');
        if (rateLimitRemaining === '0') {
            throw new GitHubRateLimitError('GitHub API rate limit exceeded. Please try again later or provide a valid access token to increase your rate limit.');
        }
        // Check for other 403 reasons (e.g. repo access forbidden)
        throw new GitHubAuthError('Access forbidden. You may need a valid access token for this repository.');
    }
    if (response.status === 401) {
        throw new GitHubAuthError('Invalid token. Please check your Personal Access Token.');
    }

    throw new GitHubError(`Failed to fetch repository data. Status: ${response.status}. Please check your input and try again.`);
}
