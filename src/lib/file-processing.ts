import { GitHubFile, FileContent } from './github';
import { LocalFile } from './local';
import GPTTokenizer from 'gpt-tokenizer';

// Unified file interface
export type FileItem = GitHubFile | LocalFile;

export interface TreeNode {
    [key: string]: TreeNode | FileItem;
}

// Helper to check if an item is a file (blob) or directory (tree)
// Both GitHubFile and LocalFile use type: 'blob' for files and 'tree' for directories (though LocalFile only produces blobs usually)
export function isFileItem(item: FileItem | TreeNode): item is FileItem {
    return 'type' in item && (item.type === 'blob' || item.type === 'file'); // Handle both just in case, though definition says 'blob'
}

// Sort contents alphabetically and by directory/file
export function sortContents(a: FileItem, b: FileItem) {
    if (!a || !b || !a.path || !b.path) return 0;

    const aPath = a.path.split('/');
    const bPath = b.path.split('/');
    const minLength = Math.min(aPath.length, bPath.length);

    for (let i = 0; i < minLength; i++) {
        if (aPath[i] !== bPath[i]) {
            if (i === aPath.length - 1 && i < bPath.length - 1) return 1;
            if (i === bPath.length - 1 && i < aPath.length - 1) return -1;

            return aPath[i].localeCompare(bPath[i]);
        }
    }

    return aPath.length - bPath.length;
}

export function generateOutputText(contents: FileContent[]): { text: string, tokenCount: number } {
    let text = '';
    let index = '';

    // Ensure contents is an array before sorting
    const sortedContents = Array.isArray(contents) ? [...contents].sort((a, b) => sortContents(a as any, b as any)) : [contents];

    // Create a directory tree structure
    const tree: TreeNode = {};
    sortedContents.forEach(item => {
        const parts = item.path.split('/');
        let currentLevel: any = tree;
        parts.forEach((part, i) => {
            if (!currentLevel[part]) {
                currentLevel[part] = i === parts.length - 1 ? null : {};
            }
            currentLevel = currentLevel[part];
        });
    });

    // Build the index recursively
    function buildIndex(node: any, prefix = '') {
        let result = '';
        const entries = Object.entries(node);

        entries.forEach(([name, subNode], index) => {
            const isLastItem = index === entries.length - 1;
            const linePrefix = isLastItem ? '└── ' : '├── ';
            const childPrefix = isLastItem ? '    ' : '│   ';

            name = name === '' ? './' : name;

            result += `${prefix}${linePrefix}${name}\n`;
            if (subNode) {
                result += buildIndex(subNode, `${prefix}${childPrefix}`);
            }
        });
        return result;
    }

    index = buildIndex(tree);

    sortedContents.forEach((item: FileContent) => {
        text += `\n\n---\nFile: ${item.path}\n---\n\n${item.text}\n`;
    });

    const formattedText = `Directory Structure:\n\n${index}\n${text}`;

    let tokenCount = 0;
    try {
        const { encode } = GPTTokenizer;
        tokenCount = encode(formattedText).length;
    } catch (error) {
        console.error('Token counting error:', error);
    }

    return { text: formattedText, tokenCount };
}

export function buildFileTree(files: FileItem[]): TreeNode {
    const tree: any = {};
    files.forEach(item => {
        item.path = item.path.startsWith('/') ? item.path : '/' + item.path;
        const pathParts = item.path.split('/');
        let currentLevel = tree;

        pathParts.forEach((part, index) => {
            part = part === '' ? './' : part;
            if (!currentLevel[part]) {
                currentLevel[part] = index === pathParts.length - 1 ? item : {};
            }
            currentLevel = currentLevel[part];
        });
    });
    return tree;
}
