import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { FolderSearch, Info, ExternalLink } from 'lucide-react';
import { parseRepoUrl, getReferences, fetchRepoSha, fetchRepoTree } from '@/lib/github';
import { GitHubFile } from '@/lib/github';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";


interface GitHubFormProps {
    onTreeFetched: (tree: GitHubFile[], token?: string) => void;
    onLoading: (loading: boolean) => void;
}

export function GitHubForm({ onTreeFetched, onLoading }: GitHubFormProps) {
    const [repoUrl, setRepoUrl] = useState('');
    const [token, setToken] = useState(() => localStorage.getItem('githubAccessToken') || '');

    const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newToken = e.target.value;
        setToken(newToken);
        if (newToken) {
            localStorage.setItem('githubAccessToken', newToken);
        } else {
            localStorage.removeItem('githubAccessToken');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        onLoading(true);

        try {
            const { owner, repo, path: lastString } = parseRepoUrl(repoUrl);
            let refFromUrl = '';
            let pathFromUrl = '';

            if (lastString) {
                const references = await getReferences(owner, repo, token);
                const allRefs = [...references.branches, ...references.tags];

                // Sort by length descending to match longest ref first (e.g. "feature/abc" vs "feature")
                allRefs.sort((a, b) => b.length - a.length);

                const matchingRef = allRefs.find(ref => lastString.startsWith(ref));
                if (matchingRef) {
                    refFromUrl = matchingRef;
                    pathFromUrl = lastString.slice(matchingRef.length + 1); // +1 for the slash
                } else {
                    refFromUrl = lastString;
                }
            }

            const sha = await fetchRepoSha(owner, repo, refFromUrl, pathFromUrl, token);
            const tree = await fetchRepoTree(owner, repo, sha, token);

            // Add path context back if we are in a subdirectory,
            // the tree returned by recursive fetch is relative to the SHA we fetched.
            // If we fetched a subdirectory SHA, the paths in 'tree' are relative to that subdirectory.
            // We might want to preserve the full path for display?
            // Actually the current fetchRepoTree uses recursive=1 on the SHA.
            // If the SHA is a subdirectory, the paths returned are relative to that subdirectory.
            // The original code didn't seem to prepend the pathFromUrl. Let's check legacy logic.
            // Legacy logic: displayDirectoryStructure(tree) directly.
            // But wait, if I browse `github.com/user/repo/tree/main/src`, I expect to see `src` content.
            // If the API returns `index.ts` (inside src), showing `index.ts` is correct.
            // But when we display the final output, do we want `src/index.ts`?
            // Legacy code uses `item.path`.

            // If pathFromUrl is present, we should probably prepend it to the item paths IF we want the full repo path.
            // But the original code just passed the tree.
            // However, `fetchRepoSha` returns the SHA of the *object* at that path.
            // `fetchRepoTree` fetches the tree of that SHA.
            // So the paths in the result are relative to that object.

            // Let's stick to original behavior for now.

            onTreeFetched(tree, token);
            toast.success("Repository structure fetched successfully");
        } catch (error: any) {
            toast.error("Error fetching repository", {
                description: error.message
            });
        } finally {
            onLoading(false);
        }
    };

    return (
        <Card className="w-full">
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="repoUrl">GitHub URL</Label>
                        <Input
                            id="repoUrl"
                            placeholder="https://github.com/owner/repo"
                            value={repoUrl}
                            onChange={(e) => setRepoUrl(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="accessToken">Personal Access Token (Optional)</Label>
                             <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        <Info className="h-4 w-4 text-muted-foreground" />
                                        <span className="sr-only">Info</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Personal Access Token</DialogTitle>
                                        <DialogDescription className="pt-2 space-y-2">
                                            <p>This code runs entirely in your browser. Your token is saved locally for convenience and never sent to any third-party server.</p>
                                            <p>Tokens are required for private repositories and to bypass GitHub API rate limits.</p>
                                            <div className="pt-2">
                                                 <a href="https://github.com/settings/tokens/new?description=repo2file&scopes=repo" target="_blank" rel="noreferrer" className="inline-flex items-center text-primary hover:underline">
                                                    <ExternalLink className="w-4 h-4 mr-1" />
                                                    Get your token
                                                </a>
                                            </div>
                                        </DialogDescription>
                                    </DialogHeader>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <Input
                            id="accessToken"
                            type="password"
                            placeholder="ghp_..."
                            value={token}
                            onChange={handleTokenChange}
                        />
                    </div>

                    <Button type="submit" className="w-full">
                        <FolderSearch className="w-4 h-4 mr-2" />
                        Fetch Directory Structure
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
