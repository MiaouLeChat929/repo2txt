import { useState, useEffect, useCallback } from 'react';
import { FileItem, buildFileTree, TreeNode } from '@/lib/file-processing';
import { fetchGitHubFileContents, GitHubFile } from '@/lib/github';
import { detectFramework, FrameworkID, PrecisionLevel } from '@/lib/core/heuristics';
import { applySmartFilter } from '@/lib/core/smart-filter';
import { calculateStatistics } from '@/lib/core/statistics';
import JSZip from 'jszip';
import { toast } from 'sonner';

export function useRepoController() {
  const [activeTab, setActiveTab] = useState("github");
  const [rawFiles, setRawFiles] = useState<FileItem[]>([]);
  const [fileTree, setFileTree] = useState<TreeNode>({});
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([]);
  const [outputText, setOutputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [githubToken, setGithubToken] = useState<string | undefined>(undefined);
  const [zipMap, setZipMap] = useState<Record<string, JSZip.JSZipObject>>({});

  // Source info for smart naming
  const [repoSource, setRepoSource] = useState<string>('unknown-repo');

  // Smart Features State
  const [detectedFramework, setDetectedFramework] = useState<FrameworkID>('unknown');
  const [manualFramework, setManualFramework] = useState<FrameworkID | null>(null);
  const [precision, setPrecision] = useState<PrecisionLevel>('standard');
  const [experimentalStats, setExperimentalStats] = useState(false);
  const [outliers, setOutliers] = useState<Set<string>>(new Set());

  const effectiveFramework = manualFramework || detectedFramework;

  // Apply filters when controls or files change
  useEffect(() => {
    if (rawFiles.length === 0) return;

    // 1. Smart Filter
    const { selectedFiles: smartSelection } = applySmartFilter(rawFiles, effectiveFramework, precision);

    // 2. Experimental Stats
    let finalSelectionPaths = smartSelection;
    if (experimentalStats) {
        const { outliers: statsOutliers } = calculateStatistics(rawFiles, 'median');
        setOutliers(statsOutliers);
        // Remove outliers from selection
        const filteredSelection = new Set([...smartSelection]);
        statsOutliers.forEach(path => filteredSelection.delete(path));
        finalSelectionPaths = filteredSelection;
    } else {
        setOutliers(new Set());
    }

    // Map paths back to FileItem objects
    const newSelectedFiles = rawFiles.filter(f => finalSelectionPaths.has(f.path));
    setSelectedFiles(newSelectedFiles);

  }, [rawFiles, effectiveFramework, precision, experimentalStats]);

  const handleTreeFetched = useCallback((files: FileItem[], token?: string, sourceName: string = 'unknown-repo') => {
    setRawFiles(files);
    setFileTree(buildFileTree(files));
    setGithubToken(token);
    setOutputText("");
    setRepoSource(sourceName);

    // Run Detection
    const rootFiles = files
        .filter(f => !f.path.includes('/')) // items at root
        .map(f => f.path);

    const rootDirs = new Set<string>();
    files.forEach(f => {
        const parts = f.path.split('/');
        if (parts.length > 1) {
            rootDirs.add(parts[0] + '/');
        }
    });
    const allRootItems = [...rootFiles, ...Array.from(rootDirs)];

    const framework = detectFramework(allRootItems);
    setDetectedFramework(framework);
    setManualFramework(null); // Reset manual override
    setPrecision('standard'); // Reset precision
  }, []);

  return {
    state: {
        activeTab,
        rawFiles,
        fileTree,
        selectedFiles,
        outputText,
        loading,
        githubToken,
        zipMap,
        detectedFramework,
        manualFramework,
        precision,
        experimentalStats,
        outliers,
        repoSource
    },
    actions: {
        setActiveTab,
        setFileTree,
        setSelectedFiles,
        setOutputText,
        setLoading,
        setGithubToken,
        setZipMap,
        setManualFramework,
        setPrecision,
        setExperimentalStats,
        handleTreeFetched
    }
  };
}
