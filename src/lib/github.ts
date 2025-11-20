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

    if (!branchesResponse.ok || !tagsResponse.ok) {
        throw new Error('Failed to fetch references');
    }

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
    if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
        throw new Error('GitHub API rate limit exceeded. Please try again later or provide a valid access token to increase your rate limit.');
    }
    if (response.status === 404) {
        throw new Error(`Repository, branch, or path not found. Please check that the URL, branch/tag, and path are correct and accessible.`);
    }
    throw new Error(`Failed to fetch repository data. Status: ${response.status}. Please check your input and try again.`);
}
