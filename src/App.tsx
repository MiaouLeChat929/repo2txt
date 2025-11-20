import { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GitHubForm } from '@/components/features/github/GitHubForm'
import { LocalForm } from '@/components/features/local/LocalForm'
import { FileTree } from '@/components/features/file-tree/FileTree'
import { OutputDisplay } from '@/components/features/output/OutputDisplay'
import { FileItem, buildFileTree, generateOutputText } from '@/lib/file-processing'
import { fetchGitHubFileContents, GitHubFile } from '@/lib/github'
import { toast, Toaster } from 'sonner'
import JSZip from 'jszip'

function App() {
  const [activeTab, setActiveTab] = useState("github")
  const [fileTree, setFileTree] = useState<any>({}) // TreeNode
  const [rawFiles, setRawFiles] = useState<FileItem[]>([])
  const [selectedFiles, setSelectedFiles] = useState<FileItem[]>([])
  const [outputText, setOutputText] = useState("")
  const [loading, setLoading] = useState(false)
  const [githubToken, setGithubToken] = useState<string | undefined>(undefined)
  const [zipMap, setZipMap] = useState<Record<string, JSZip.JSZipObject>>({})

  const handleTreeFetched = (files: FileItem[], token?: string) => {
    setRawFiles(files)
    setFileTree(buildFileTree(files))
    setGithubToken(token)
    setOutputText("") // Clear previous output
  }

  const handleGenerate = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one file")
      return
    }
    setLoading(true)
    try {
      let contents = [];

      // Determine source
      const isGithub = activeTab === 'github';

      if (isGithub) {
         contents = await fetchGitHubFileContents(selectedFiles as GitHubFile[], githubToken);
      } else {
         // Handle Local/Zip
         contents = await Promise.all(selectedFiles.map(async (file: any) => { // casting as any for mixed type handling
             if (file.urlType === 'zip') {
                 const entry = zipMap[file.path];
                 if (!entry) throw new Error(`Zip entry not found for ${file.path}`);
                 const text = await entry.async('text');
                 return { url: '', path: file.path, text };
             } else if (file.urlType === 'local') {
                 if (file.fileObject) {
                     // Directory picker
                      const text = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.onerror = reject;
                        reader.readAsText(file.fileObject);
                    });
                    return { url: file.url, path: file.path, text };
                 } else {
                     // Fallback URL fetch (blob url)
                      const response = await fetch(file.url);
                      const text = await response.text();
                      return { url: file.url, path: file.path, text };
                 }
             }
             return { url: '', path: '', text: ''};
         }));
      }

      const { text } = generateOutputText(contents);
      setOutputText(text);
      toast.success("Text generated successfully");
    } catch (error: any) {
      console.error(error);
      toast.error("Failed to generate text", { description: error.message });
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadText = () => {
      const blob = new Blob([outputText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'repo_context.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  }

  const handleDownloadZip = async () => {
    if (selectedFiles.length === 0) {
        toast.error("Please select at least one file")
        return
    }
    setLoading(true)
    try {
        const zip = new JSZip();

        // Reuse generation logic to fetch contents
        // Note: This duplicates fetch logic. Refactoring would be better but for now:
         const isGithub = activeTab === 'github';
         let contents = [];

         if (isGithub) {
             contents = await fetchGitHubFileContents(selectedFiles as GitHubFile[], githubToken);
         } else {
            // Copied from handleGenerate
             contents = await Promise.all(selectedFiles.map(async (file: any) => {
                 if (file.urlType === 'zip') {
                     const entry = zipMap[file.path];
                     const text = await entry.async('text');
                     return { url: '', path: file.path, text };
                 } else if (file.urlType === 'local') {
                    if (file.fileObject) {
                        const text = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onload = (e) => resolve(e.target?.result as string);
                            reader.readAsText(file.fileObject);
                        });
                        return { url: file.url, path: file.path, text };
                     }
                     const response = await fetch(file.url);
                     const text = await response.text();
                     return { url: file.url, path: file.path, text };
                 }
                 return { url: '', path: '', text: ''};
             }));
         }

         contents.forEach(file => {
             zip.file(file.path, file.text);
         });

         const blob = await zip.generateAsync({ type: 'blob' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = 'repo_files.zip';
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
         toast.success("Zip downloaded successfully");

    } catch (error: any) {
        console.error(error);
        toast.error("Failed to create zip", { description: error.message });
    } finally {
        setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Repo to Text Converter</h2>
          <p className="text-muted-foreground">
            Convert GitHub repositories or local directories into a single formatted text file for LLM context.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="github">GitHub Repository</TabsTrigger>
            <TabsTrigger value="local">Local Directory / Zip</TabsTrigger>
          </TabsList>

          <TabsContent value="github" className="space-y-6">
            <GitHubForm onTreeFetched={handleTreeFetched} onLoading={setLoading} />
          </TabsContent>

          <TabsContent value="local" className="space-y-6">
            <LocalForm
                onTreeFetched={handleTreeFetched}
                onLoading={setLoading}
                onZipMapUpdate={setZipMap}
            />
          </TabsContent>
        </Tabs>

        {/* Loading Overlay */}
        {loading && (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )}

        {/* Results Section */}
        {rawFiles.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in zoom-in-95 duration-500">
                <div className="lg:col-span-5 xl:col-span-4 border rounded-lg p-4 bg-card shadow-sm h-fit max-h-[800px] overflow-y-auto">
                     <h3 className="font-semibold mb-4 flex items-center">
                        Files
                        <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                            {selectedFiles.length} selected
                        </span>
                    </h3>
                    <FileTree tree={fileTree} onSelectionChange={setSelectedFiles} />
                </div>

                <div className="lg:col-span-7 xl:col-span-8">
                    <OutputDisplay
                        text={outputText}
                        onGenerate={handleGenerate}
                        onDownloadText={handleDownloadText}
                        onDownloadZip={handleDownloadZip}
                        canGenerate={selectedFiles.length > 0}
                    />
                </div>
            </div>
        )}
      </div>
      <Toaster />
    </Layout>
  )
}

export default App
