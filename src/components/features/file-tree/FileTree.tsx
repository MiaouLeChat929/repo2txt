import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, ChevronDown, File as FileIcon, Folder as FolderIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TreeNode, FileItem } from '@/lib/file-processing';

interface FileTreeProps {
    tree: TreeNode;
    onSelectionChange: (selectedFiles: FileItem[]) => void;
}

// Helper to get all file items recursively
const getAllFiles = (node: TreeNode): FileItem[] => {
    let files: FileItem[] = [];
    Object.values(node).forEach(value => {
        if ('path' in value && 'type' in value && value.type === 'blob') {
            files.push(value as FileItem);
        } else if (typeof value === 'object') {
            files = [...files, ...getAllFiles(value as TreeNode)];
        }
    });
    return files;
};

interface TreeNodeComponentProps {
    name: string;
    node: TreeNode | FileItem;
    selectedFiles: Set<string>;
    onToggle: (path: string, checked: boolean) => void;
    level?: number;
}

const TreeNodeComponent: React.FC<TreeNodeComponentProps> = ({ name, node, selectedFiles, onToggle, level = 0 }) => {
    const [isOpen, setIsOpen] = useState(true);
    const isFile = 'type' in node && node.type === 'blob';

    // Calculate check state for directory
    const getDirectoryState = (dirNode: TreeNode): { checked: boolean; indeterminate: boolean } => {
        const files = getAllFiles(dirNode);
        if (files.length === 0) return { checked: false, indeterminate: false };

        const checkedCount = files.filter(f => selectedFiles.has(f.path)).length;

        if (checkedCount === 0) return { checked: false, indeterminate: false };
        if (checkedCount === files.length) return { checked: true, indeterminate: false };
        return { checked: false, indeterminate: true };
    };

    const handleCheckboxChange = (checked: boolean) => {
        if (isFile) {
            onToggle((node as FileItem).path, checked);
        } else {
            const files = getAllFiles(node as TreeNode);
            files.forEach(f => onToggle(f.path, checked));
        }
    };

    if (isFile) {
        const fileNode = node as FileItem;
        return (
            <div className="flex items-center py-1 hover:bg-accent/50 rounded px-2" style={{ paddingLeft: `${level * 1.5}rem` }}>
                <Checkbox
                    checked={selectedFiles.has(fileNode.path)}
                    onCheckedChange={(checked) => handleCheckboxChange(checked as boolean)}
                    className="mr-2"
                />
                <FileIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className="text-sm truncate">{name}</span>
            </div>
        );
    }

    // Directory Node
    const dirState = getDirectoryState(node as TreeNode);

    return (
        <div>
            <div className="flex items-center py-1 hover:bg-accent/50 rounded px-2" style={{ paddingLeft: `${level * 1.5}rem` }}>
                <Checkbox
                    checked={dirState.checked || dirState.indeterminate} // Visual hack: Shadcn checkbox indeterminate handling
                    onCheckedChange={(checked) => handleCheckboxChange(checked as boolean)}
                    className={cn("mr-2", dirState.indeterminate && "opacity-50")} // Basic indeterminate visual
                    // Note: Real indeterminate state requires ref manipulation in Radix/HTML,
                    // simpler here to just trust 'checked' prop logic or custom icon if needed.
                    // Shadcn Checkbox doesn't explicitly export indeterminate prop but handles it via CheckedState.
                />
                 <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-0.5 hover:bg-accent rounded mr-1 focus:outline-none"
                >
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                <FolderIcon className="w-4 h-4 mr-2 text-blue-400" />
                <span className="text-sm font-medium truncate select-none cursor-pointer" onClick={() => setIsOpen(!isOpen)}>{name}</span>
            </div>
            {isOpen && (
                <div>
                    {Object.entries(node as TreeNode).map(([childName, childNode]) => (
                        <TreeNodeComponent
                            key={childName}
                            name={childName}
                            node={childNode}
                            selectedFiles={selectedFiles}
                            onToggle={onToggle}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export function FileTree({ tree, onSelectionChange }: FileTreeProps) {
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [extensions, setExtensions] = useState<string[]>([]);
    const [allFiles, setAllFiles] = useState<FileItem[]>([]);

    // Initialize extensions and files when tree changes
    useEffect(() => {
        const files = getAllFiles(tree);
        setAllFiles(files);

        // Default selection logic: select common text files
        const commonExtensions = ['.js', '.py', '.java', '.cpp', '.html', '.css', '.ts', '.jsx', '.tsx', '.json', '.md', '.txt'];
        const initialSelection = new Set<string>();

        files.forEach(f => {
            const ext = '.' + f.path.split('.').pop()?.toLowerCase();
            if (commonExtensions.includes(ext)) {
                initialSelection.add(f.path);
            }
        });
        setSelectedFiles(initialSelection);

        const exts = Array.from(new Set(files.map(f => {
            const parts = f.path.split('.');
            return parts.length > 1 ? parts.pop()?.toLowerCase() : 'no-ext';
        }))).filter(Boolean) as string[];
        setExtensions(exts.sort());

    }, [tree]);

    // Notify parent of changes
    useEffect(() => {
        const selected = allFiles.filter(f => selectedFiles.has(f.path));
        onSelectionChange(selected);
    }, [selectedFiles, allFiles]); // Intentionally omitting onSelectionChange from deps to avoid loops if parent isn't memoized

    const handleToggle = (path: string, checked: boolean) => {
        const newSelection = new Set(selectedFiles);
        if (checked) {
            newSelection.add(path);
        } else {
            newSelection.delete(path);
        }
        setSelectedFiles(newSelection);
    };

    const handleSelectExtension = (ext: string, checked: boolean) => {
        const newSelection = new Set(selectedFiles);
        allFiles.forEach(f => {
            const fExt = f.path.split('.').pop()?.toLowerCase() || 'no-ext';
            if (fExt === ext) {
                if (checked) newSelection.add(f.path);
                else newSelection.delete(f.path);
            }
        });
        setSelectedFiles(newSelection);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 pb-4 border-b">
                 <div className="text-sm font-medium w-full mb-2">Filter by extension:</div>
                 {extensions.map(ext => (
                     <div key={ext} className="flex items-center space-x-1 bg-secondary px-2 py-1 rounded-full text-xs">
                         <Checkbox
                            id={`ext-${ext}`}
                            checked={allFiles.filter(f => (f.path.split('.').pop()?.toLowerCase() || 'no-ext') === ext).every(f => selectedFiles.has(f.path))}
                            onCheckedChange={(checked) => handleSelectExtension(ext, checked as boolean)}
                            className="w-3 h-3"
                         />
                         <label htmlFor={`ext-${ext}`} className="cursor-pointer select-none">.{ext}</label>
                     </div>
                 ))}
            </div>

            <div className="overflow-x-auto">
                 {Object.entries(tree).map(([name, node]) => (
                    <TreeNodeComponent
                        key={name}
                        name={name}
                        node={node}
                        selectedFiles={selectedFiles}
                        onToggle={handleToggle}
                    />
                ))}
            </div>
        </div>
    );
}
