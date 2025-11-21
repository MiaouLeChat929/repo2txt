import { useState, useMemo, useCallback } from 'react';
import { FileItem, buildFileTree, TreeNode, generateOutputText } from '@/lib/file-processing';
import { fetchGitHubFileContents, GitHubFile, GitHubNotFoundError, GitHubRateLimitError, GitHubAuthError, FileContent } from '@/lib/github';
import { detectFramework, FrameworkID, PrecisionLevel } from '@/lib/core/heuristics';
import { applySmartFilter } from '@/lib/core/smart-filter';
import { calculateStatistics } from '@/lib/core/statistics';
import { generateSmartFilename } from '@/lib/utils';
import { readFileAsText } from '@/lib/local';
import JSZip from 'jszip';
import { toast } from 'sonner';

export function useRepoController() {
  // 1. Atoms of State
  const [activeTab, setActiveTab] = useState("github");
  const [rawFiles, setRawFiles] = useState<FileItem[]>([]);
  const [userSelectedFiles, setUserSelectedFiles] = useState<Set<string>>(new Set()); // Stores PATHS
  const [outputText, setOutputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [githubToken, setGithubToken] = useState<string | undefined>(undefined);
  const [zipMap, setZipMap] = useState<Record<string, JSZip.JSZipObject>>({});
  const [repoSource, setRepoSource] = useState<string>('unknown-repo');

  // UI State
  const [detectedFramework, setDetectedFramework] = useState<FrameworkID>('unknown');
  const [manualFramework, setManualFramework] = useState<FrameworkID | null>(null);
  const [precision, setPrecision] = useState<PrecisionLevel>('standard');
  const [experimentalStats, setExperimentalStats] = useState(false);

  // 2. Derived State
  const effectiveFramework = manualFramework || detectedFramework;

  const fileTree = useMemo(() => buildFileTree(rawFiles), [rawFiles]);

  const selectedFiles = useMemo(() => {
      return rawFiles.filter(f => userSelectedFiles.has(f.path));
  }, [rawFiles, userSelectedFiles]);

  const outliers = useMemo(() => {
      if (!experimentalStats) return new Set<string>();
      const { outliers } = calculateStatistics(rawFiles, 'mean');
      return outliers;
  }, [rawFiles, experimentalStats]);

  // 3. Event Handlers

  const handleTreeFetched = useCallback((files: FileItem[], token?: string, sourceName: string = 'unknown-repo') => {
    // Update Core Data
    setRawFiles(files);
    setGithubToken(token);
    setOutputText("");
    setRepoSource(sourceName);
    // We don't clear zipMap here as it might be handled by LocalForm, but ideally we should if switching context.
    // For now, we assume LocalForm manages zipMap updates relevant to the files.

    // Logic: Detect Framework
    const rootFiles = files.filter(f => !f.path.includes('/')).map(f => f.path);
    const rootDirs = new Set<string>();
    files.forEach(f => {
        const parts = f.path.split('/');
        if (parts.length > 1) rootDirs.add(parts[0] + '/');
    });
    const allRootItems = [...rootFiles, ...Array.from(rootDirs)];

    const framework = detectFramework(allRootItems);
    setDetectedFramework(framework);
    setManualFramework(null);
    setPrecision('standard');

    // Logic: Apply Filter immediately
    const { selectedFiles: initialSelection } = applySmartFilter(files, framework, 'standard');
    setUserSelectedFiles(initialSelection);
  }, []);

  const updateSelectionConfig = useCallback((newFramework: FrameworkID | null, newPrecision: PrecisionLevel) => {
      setManualFramework(newFramework);
      setPrecision(newPrecision);

      const frameworkToUse = newFramework || detectedFramework;
      const { selectedFiles: newSelection } = applySmartFilter(rawFiles, frameworkToUse, newPrecision);
      setUserSelectedFiles(newSelection);
  }, [rawFiles, detectedFramework]);

  const handleFrameworkChange = useCallback((fw: FrameworkID) => {
      updateSelectionConfig(fw, precision);
  }, [updateSelectionConfig, precision]);

  const handlePrecisionChange = useCallback((prec: PrecisionLevel) => {
      updateSelectionConfig(manualFramework, prec);
  }, [updateSelectionConfig, manualFramework]);

  const handleSelectionChange = useCallback((newSelectedFilesList: FileItem[]) => {
      const newSet = new Set(newSelectedFilesList.map(f => f.path));
      setUserSelectedFiles(newSet);
  }, []);

  const handleError = (error: any, defaultMessage: string) => {
        console.error(error);
        let message = defaultMessage;
        let description = error.message;

        if (error instanceof GitHubNotFoundError) {
             description = "Repository not found. Check the URL or verify it is public (or provide a token).";
        } else if (error instanceof GitHubRateLimitError) {
             message = "API Limit Reached";
             description = "GitHub API rate limit exceeded. Please use a Personal Access Token.";
        } else if (error instanceof GitHubAuthError) {
             message = "Authentication Failed";
             description = "Invalid token or access forbidden. Please check your Personal Access Token.";
        }
        toast.error(message, { description });
  };

  const fetchSelectedContents = useCallback(async (): Promise<FileContent[]> => {
      const isGithub = activeTab === 'github';
      if (isGithub) {
          return await fetchGitHubFileContents(selectedFiles as GitHubFile[], githubToken);
      } else {
          return await Promise.all(selectedFiles.map(async (file: any) => {
             if (file.urlType === 'zip') {
                 const entry = zipMap[file.path];
                 if (!entry) throw new Error(`Zip entry not found for ${file.path}`);
                 const text = await entry.async('text');
                 return { url: '', path: file.path, text };
             } else if (file.urlType === 'local') {
                 if (file.fileObject) {
                      const text = await readFileAsText(file.fileObject);
                      return { url: file.url, path: file.path, text };
                 } else {
                      const response = await fetch(file.url);
                      const text = await response.text();
                      return { url: file.url, path: file.path, text };
                 }
             }
             return { url: '', path: file.path, text: '' };
         }));
      }
  }, [selectedFiles, activeTab, githubToken, zipMap]);

  const generateOutput = useCallback(async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file");
      return;
    }
    setLoading(true);
    try {
      const contents = await fetchSelectedContents();
      const { text } = generateOutputText(contents);
      setOutputText(text);
      toast.success("Text generated successfully");
    } catch (error: any) {
        handleError(error, "Failed to generate text");
    } finally {
      setLoading(false);
    }
  }, [selectedFiles, fetchSelectedContents]);

  const getOutputFilename = useCallback((ext: string) => {
      return generateSmartFilename(repoSource || 'unknown-source', ext);
  }, [repoSource]);

  const downloadText = useCallback(() => {
      if (!outputText) {
          toast.error("No output text to download");
          return;
      }
      const blob = new Blob([outputText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = getOutputFilename('txt');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  }, [outputText, getOutputFilename]);

  const downloadZip = useCallback(async () => {
    if (selectedFiles.length === 0) {
        toast.error("Please select at least one file");
        return;
    }
    setLoading(true);
    try {
        const zip = new JSZip();
        const contents = await fetchSelectedContents();

        contents.forEach(file => {
            zip.file(file.path, file.text);
        });

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getOutputFilename('zip');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Zip downloaded successfully");
    } catch (error: any) {
        handleError(error, "Failed to create zip");
    } finally {
        setLoading(false);
    }
  }, [selectedFiles, fetchSelectedContents, getOutputFilename]);

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
        setSelectedFiles: handleSelectionChange,
        setOutputText,
        setLoading,
        setGithubToken,
        setZipMap,
        setManualFramework: handleFrameworkChange,
        setPrecision: handlePrecisionChange,
        setExperimentalStats,
        handleTreeFetched,
        generateOutput,
        downloadText,
        downloadZip
    }
  };
}
