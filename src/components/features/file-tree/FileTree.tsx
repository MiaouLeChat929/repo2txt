import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, ChevronDown, File as FileIcon, Folder as FolderIcon, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TreeNode, FileItem, isFileItem } from '@/lib/file-processing';

interface FileTreeProps {
    tree: TreeNode;
    selectedFiles: FileItem[]; // Controlled prop
    onSelectionChange: (selectedFiles: FileItem[]) => void;
    outliers?: Set<string>;
}

// Helper to get all file items recursively
const getAllFiles = (node: TreeNode): FileItem[] => {
    let files: FileItem[] = [];
    Object.values(node).forEach(value => {
        if (isFileItem(value as FileItem | TreeNode)) {
            files.push(value as FileItem);
        } else if (typeof value === 'object' && value !== null) {
            files = [...files, ...getAllFiles(value as TreeNode)];
        }
    });
    return files;
};

interface TreeNodeComponentProps {
    name: string;
    node: TreeNode | FileItem;
    selectedFilesSet: Set<string>;
    onToggle: (path: string, checked: boolean) => void;
    outliers?: Set<string>;
    level?: number;
}

const TreeNodeComponent: React.FC<TreeNodeComponentProps> = ({ name, node, selectedFilesSet, onToggle, outliers, level = 0 }) => {
    const [isOpen, setIsOpen] = useState(true);

    const isFile = isFileItem(node as FileItem | TreeNode);

    // Calculate check state for directory
    const getDirectoryState = (dirNode: TreeNode): { checked: boolean; indeterminate: boolean } => {
        const files = getAllFiles(dirNode);
        if (files.length === 0) return { checked: false, indeterminate: false };

        const checkedCount = files.filter(f => selectedFilesSet.has(f.path)).length;

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
        const isOutlier = outliers?.has(fileNode.path);

        return (
            <div className="flex items-center py-1 hover:bg-accent/50 rounded px-2" style={{ paddingLeft: `${level * 1.5}rem` }}>
                <Checkbox
                    checked={selectedFilesSet.has(fileNode.path)}
                    onCheckedChange={(checked) => handleCheckboxChange(checked as boolean)}
                    className="mr-2"
                />
                <FileIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                <span className={cn("text-sm truncate flex-1", isOutlier && "text-amber-600")}>
                    {name}
                </span>
                {isOutlier && (
                    <AlertTriangle className="w-3 h-3 text-amber-500 ml-2" title="High token count (Possible auto-generated or lock file)" />
                )}
            </div>
        );
    }

    // Directory Node
    const dirState = getDirectoryState(node as TreeNode);

    return (
        <div>
            <div className="flex items-center py-1 hover:bg-accent/50 rounded px-2" style={{ paddingLeft: `${level * 1.5}rem` }}>
                <Checkbox
                    checked={dirState.indeterminate ? 'indeterminate' : dirState.checked}
                    onCheckedChange={(checked) => handleCheckboxChange(checked as boolean)}
                    className="mr-2"
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
                            selectedFilesSet={selectedFilesSet}
                            onToggle={onToggle}
                            outliers={outliers}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export function FileTree({ tree, selectedFiles, onSelectionChange, outliers }: FileTreeProps) {
    // Derived state for efficient lookups
    const [selectedFilesSet, setSelectedFilesSet] = useState<Set<string>>(new Set());
    const [extensions, setExtensions] = useState<string[]>([]);
    const [allFiles, setAllFiles] = useState<FileItem[]>([]);

    // Sync Set when selectedFiles prop changes
    useEffect(() => {
        setSelectedFilesSet(new Set(selectedFiles.map(f => f.path)));
    }, [selectedFiles]);

    // Initialize extensions and allFiles when tree changes
    useEffect(() => {
        const files = getAllFiles(tree);
        setAllFiles(files);

        const exts = Array.from(new Set(files.map(f => {
            const parts = f.path.split('.');
            return parts.length > 1 ? parts.pop()?.toLowerCase() : 'no-ext';
        }))).filter(Boolean) as string[];
        setExtensions(exts.sort());
    }, [tree]);

    const handleToggle = (path: string, checked: boolean) => {
        const newSet = new Set(selectedFilesSet);
        if (checked) {
            newSet.add(path);
        } else {
            newSet.delete(path);
        }
        // Notify parent with full objects
        const newSelection = allFiles.filter(f => newSet.has(f.path));
        onSelectionChange(newSelection);
    };

    const handleSelectExtension = (ext: string, checked: boolean) => {
        const newSet = new Set(selectedFilesSet);
        allFiles.forEach(f => {
            const fExt = f.path.split('.').pop()?.toLowerCase() || 'no-ext';
            if (fExt === ext) {
                if (checked) newSet.add(f.path);
                else newSet.delete(f.path);
            }
        });
        const newSelection = allFiles.filter(f => newSet.has(f.path));
        onSelectionChange(newSelection);
    };

    return (
        <div className="space-y-4">
            {/* Extension Filter - Kept as useful feature */}
            <div className="flex flex-wrap gap-2 pb-4 border-b">
                 <div className="text-sm font-medium w-full mb-2">Filter by extension:</div>
                 {extensions.map(ext => {
                     const filesWithExt = allFiles.filter(f => (f.path.split('.').pop()?.toLowerCase() || 'no-ext') === ext);
                     const allChecked = filesWithExt.length > 0 && filesWithExt.every(f => selectedFilesSet.has(f.path));
                     const someChecked = !allChecked && filesWithExt.some(f => selectedFilesSet.has(f.path));

                     return (
                     <div key={ext} className="flex items-center space-x-1 bg-secondary px-2 py-1 rounded-full text-xs">
                         <Checkbox
                            id={`ext-${ext}`}
                            checked={someChecked ? 'indeterminate' : allChecked}
                            onCheckedChange={(checked) => handleSelectExtension(ext, checked as boolean)}
                         />
                         <label htmlFor={`ext-${ext}`} className="cursor-pointer select-none">.{ext}</label>
                     </div>
                 )})}
            </div>

            <div className="overflow-x-auto">
                 {Object.entries(tree).map(([name, node]) => (
                    <TreeNodeComponent
                        key={name}
                        name={name}
                        node={node}
                        selectedFilesSet={selectedFilesSet}
                        onToggle={handleToggle}
                        outliers={outliers}
                    />
                ))}
            </div>
        </div>
    );
}
