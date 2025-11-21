import { Layout } from '@/components/layout/Layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GitHubForm } from '@/components/features/github/GitHubForm'
import { LocalForm } from '@/components/features/local/LocalForm'
import { FileTree } from '@/components/features/file-tree/FileTree'
import { OutputDisplay } from '@/components/features/output/OutputDisplay'
import { SmartControls } from '@/components/features/controls/SmartControls'
import { Toaster } from 'sonner'
import { useRepoController } from '@/hooks/useRepoController'

function App() {
  const { state, actions } = useRepoController();

  // Deconstruct state
  const {
    activeTab, rawFiles, fileTree, selectedFiles, outputText, loading,
    detectedFramework, manualFramework, precision,
    experimentalStats, outliers
  } = state;

  return (
    <Layout>
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Repo to Text Converter</h2>
          <p className="text-muted-foreground">
            Convert GitHub repositories or local directories into a single formatted text file for LLM context.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={actions.setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="github">GitHub Repository</TabsTrigger>
            <TabsTrigger value="local">Local Directory / Zip</TabsTrigger>
          </TabsList>

          <TabsContent value="github" className="space-y-6">
            <GitHubForm onTreeFetched={actions.handleTreeFetched} onLoading={actions.setLoading} />
          </TabsContent>

          <TabsContent value="local" className="space-y-6">
            <LocalForm
                onTreeFetched={actions.handleTreeFetched}
                onLoading={actions.setLoading}
                onZipMapUpdate={actions.setZipMap}
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
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">

                {/* Smart Controls */}
                <SmartControls
                    framework={manualFramework || detectedFramework}
                    onFrameworkChange={actions.setManualFramework}
                    precision={precision}
                    onPrecisionChange={actions.setPrecision}
                    experimentalStats={experimentalStats}
                    onExperimentalStatsChange={actions.setExperimentalStats}
                    isAutoDetected={!manualFramework}
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-5 xl:col-span-4 border rounded-lg p-4 bg-card shadow-sm h-fit max-h-[800px] overflow-y-auto">
                        <h3 className="font-semibold mb-4 flex items-center justify-between">
                            <span>Files</span>
                            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                                {selectedFiles.length} selected
                            </span>
                        </h3>
                        <FileTree
                            tree={fileTree}
                            selectedFiles={selectedFiles}
                            onSelectionChange={actions.setSelectedFiles}
                            outliers={outliers}
                        />
                    </div>

                    <div className="lg:col-span-7 xl:col-span-8">
                        <OutputDisplay
                            text={outputText}
                            onGenerate={actions.generateOutput}
                            onDownloadText={actions.downloadText}
                            onDownloadZip={actions.downloadZip}
                            canGenerate={selectedFiles.length > 0}
                        />
                    </div>
                </div>
            </div>
        )}
      </div>
      <Toaster />
    </Layout>
  )
}

export default App
