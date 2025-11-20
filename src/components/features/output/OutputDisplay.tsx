import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Copy, Download, FileText, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { countTokens } from '@/lib/tokenizer';

interface OutputDisplayProps {
    text: string;
    onGenerate: () => void;
    onDownloadText: () => void;
    onDownloadZip: () => void;
    canGenerate: boolean;
}

export function OutputDisplay({ text, onGenerate, onDownloadText, onDownloadZip, canGenerate }: OutputDisplayProps) {
    const [tokenCount, setTokenCount] = useState<number | null>(null);

    useEffect(() => {
        if (text) {
            setTokenCount(countTokens(text));
        } else {
            setTokenCount(null);
        }
    }, [text]);

    const handleCopy = async () => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Copied to clipboard");
        } catch (err) {
            toast.error("Failed to copy");
        }
    };

    return (
        <div className="space-y-4">
             <div className="flex gap-4">
                <Button
                    onClick={onGenerate}
                    disabled={!canGenerate}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Text
                </Button>
                <Button
                    onClick={onDownloadZip}
                    disabled={!canGenerate}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                >
                     <Archive className="w-4 h-4 mr-2" />
                     Download Zip
                </Button>
            </div>

            {text && (
                <div className="space-y-2 fade-in animate-in slide-in-from-bottom-4 duration-500">
                     <div className="text-sm text-muted-foreground flex justify-between items-center">
                        <span>Approximate Token Count: {tokenCount !== null ? tokenCount.toLocaleString() : '...'}</span>
                         <span className="text-xs">(cl100k_base)</span>
                    </div>
                    <Textarea
                        value={text}
                        readOnly
                        className="font-mono text-xs h-[500px] resize-y"
                    />
                    <div className="flex gap-4">
                        <Button onClick={handleCopy} className="flex-1" variant="outline">
                            <Copy className="w-4 h-4 mr-2" />
                            Copy to Clipboard
                        </Button>
                        <Button onClick={onDownloadText} className="flex-1" variant="secondary">
                            <Download className="w-4 h-4 mr-2" />
                            Download Text File
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
