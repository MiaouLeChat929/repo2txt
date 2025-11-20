import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, Upload } from 'lucide-react';
import { processLocalDirectory, extractZipContents, LocalFile } from '@/lib/local';
import { toast } from 'sonner';

interface LocalFormProps {
    onTreeFetched: (tree: LocalFile[]) => void;
    onLoading: (loading: boolean) => void;
    onZipMapUpdate: (map: any) => void;
}

export function LocalForm({ onTreeFetched, onLoading, onZipMapUpdate }: LocalFormProps) {

    const handleDirectorySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        onLoading(true);
        try {
            const { tree, gitignoreContent } = await processLocalDirectory(e.target.files);
            // TODO: Implement gitignore filtering logic here or in parent
            // Currently passing raw tree. Ideally we filter before setting state.
            // Importing isIgnored from local.ts
            const { isIgnored } = await import('@/lib/local');

            const filteredTree = tree.filter(file => !isIgnored(file.path, gitignoreContent));

            // Reset zip map as we are in directory mode
            onZipMapUpdate({});
            onTreeFetched(filteredTree);
            toast.success("Directory loaded successfully");
        } catch (error: any) {
             toast.error("Error processing directory", {
                description: error.message
            });
        } finally {
            onLoading(false);
            // Reset input value to allow selecting same directory again if needed
            e.target.value = '';
        }
    };

    const handleZipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        onLoading(true);
        try {
            const { tree, gitignoreContent, pathZipMap } = await extractZipContents(file);
            const { isIgnored } = await import('@/lib/local');

            const filteredTree = tree.filter(file => !isIgnored(file.path, gitignoreContent));

            onZipMapUpdate(pathZipMap);
            onTreeFetched(filteredTree);
             toast.success("Zip file loaded successfully");
        } catch (error: any) {
             toast.error("Error processing zip file", {
                description: error.message
            });
        } finally {
            onLoading(false);
            e.target.value = '';
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="w-full cursor-pointer hover:bg-accent/50 transition-colors relative overflow-hidden">
                <input
                    type="file"
                    webkitdirectory=""
                    directory=""
                    multiple
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={handleDirectorySelect}
                    {...({} as any)} // Bypass TS check for webkitdirectory
                />
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
                        <FolderOpen className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Select Directory</CardTitle>
                    <CardDescription>Pick a local folder to convert</CardDescription>
                </CardHeader>
                <CardContent className="pb-6">
                </CardContent>
            </Card>

            <Card className="w-full cursor-pointer hover:bg-accent/50 transition-colors relative overflow-hidden">
                 <input
                    type="file"
                    accept=".zip,.rar,.7z"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={handleZipSelect}
                />
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
                        <Upload className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">Upload Zip</CardTitle>
                    <CardDescription>Extract and convert .zip files</CardDescription>
                </CardHeader>
                <CardContent className="pb-6">
                </CardContent>
            </Card>
        </div>
    );
}
