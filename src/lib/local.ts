import JSZip from 'jszip';

export interface LocalFile {
    path: string;
    type: 'blob' | 'tree'; // 'tree' is directory, 'blob' is file
    url?: string; // For blobs (files)
    urlType: 'local' | 'zip';
    fileObject?: File; // For local files
    zipEntry?: JSZip.JSZipObject; // For zip files
    size?: number; // File size in bytes
}

export interface ExtractedZip {
    tree: LocalFile[];
    gitignoreContent: string[];
    pathZipMap: Record<string, JSZip.JSZipObject>;
}

export async function extractZipContents(zipFile: File): Promise<ExtractedZip> {
    try {
        const zip = await JSZip.loadAsync(zipFile);
        const tree: LocalFile[] = [];
        const gitignoreContent: string[] = ['.git/**'];
        let pathZipMap: Record<string, JSZip.JSZipObject> = {};

        // Process each file in the zip
        for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
            if (!zipEntry.dir) {
                // Attempt to get size. standard zipEntry doesn't always expose it publicly in types,
                // but typically available on internal _data or we can assume 0 if missing.
                // Casting to any to access _data if needed, or using a safer fallback if possible.
                // In JSZip v3, usually available via `_data.uncompressedSize` for synchronous access check.
                const size = (zipEntry as any)._data?.uncompressedSize || 0;

                tree.push({
                    path: relativePath,
                    type: 'blob',
                    urlType: 'zip',
                    zipEntry: zipEntry,
                    size: size
                });
                pathZipMap[relativePath] = zipEntry;

                // Check for .gitignore file
                if (relativePath.endsWith('.gitignore')) {
                    const content = await zipEntry.async('text');
                    processGitIgnore(content, relativePath, gitignoreContent);
                }
            }
        }

        return { tree, gitignoreContent, pathZipMap };
    } catch (error: any) {
        throw new Error(`Failed to extract zip contents: ${error.message}`);
    }
}

export async function processLocalDirectory(files: FileList | File[]): Promise<{ tree: LocalFile[], gitignoreContent: string[] }> {
    const gitignoreContent: string[] = ['.git/**'];
    const tree: LocalFile[] = [];
    const fileArray = Array.from(files);

    for (let file of fileArray) {
        const filePath = file.webkitRelativePath.startsWith('/') ? file.webkitRelativePath.slice(1) : file.webkitRelativePath;
        tree.push({
            path: filePath,
            type: 'blob', // We only get files from input[webkitdirectory]
            urlType: 'local',
            url: URL.createObjectURL(file),
            fileObject: file,
            size: file.size
        });

        if (file.webkitRelativePath.endsWith('.gitignore')) {
             const content = await readFileAsText(file);
             processGitIgnore(content, file.webkitRelativePath, gitignoreContent);
        }
    }
    return { tree, gitignoreContent };
}

function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

function processGitIgnore(content: string, filePath: string, gitignoreContent: string[]) {
    const lines = content.split('\n');
    const gitignorePath = filePath.split('/').slice(0, -1).join('/');
    lines.forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            if (gitignorePath) {
                gitignoreContent.push(`${gitignorePath}/${line}`);
            } else {
                gitignoreContent.push(line);
            }
        }
    });
}

export function isIgnored(filePath: string, gitignoreRules: string[]): boolean {
    return gitignoreRules.some(rule => {
        try {
            // Convert gitignore rule to regex
            let pattern = rule.replace(/\./g, '\\.')  // Escape dots
                            .replace(/\*/g, '.*')   // Convert * to .*
                            .replace(/\?/g, '.')    // Convert ? to .
                            .replace(/\/$/, '(/.*)?$')  // Handle directory matches
                            .replace(/^\//, '^');   // Handle root-level matches

            // If the rule doesn't start with ^, it can match anywhere in the path
            if (!pattern.startsWith('^')) {
                pattern = `(^|/)${pattern}`;
            }

            const regex = new RegExp(pattern);
            return regex.test(filePath);
        } catch (error) {
            console.log('Skipping ignore check for', filePath, 'with rule', rule);
            console.log(error);
            return false;
        }
    });
}
