import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { FrameworkID, FRAMEWORKS, PrecisionLevel } from '@/lib/core/heuristics';

interface SmartControlsProps {
  framework: FrameworkID;
  onFrameworkChange: (val: FrameworkID) => void;
  precision: PrecisionLevel;
  onPrecisionChange: (val: PrecisionLevel) => void;
  experimentalStats: boolean;
  onExperimentalStatsChange: (val: boolean) => void;
  isAutoDetected?: boolean;
}

export const SmartControls: React.FC<SmartControlsProps> = ({
  framework,
  onFrameworkChange,
  precision,
  onPrecisionChange,
  experimentalStats,
  onExperimentalStatsChange,
  isAutoDetected = false
}) => {
  return (
    <div className="grid gap-6 p-4 border rounded-lg bg-card">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Framework Selector */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Project Type</Label>
            {isAutoDetected && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold border border-blue-200">
                    Auto
                </span>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Detected framework determines filtering rules.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select value={framework} onValueChange={(val) => onFrameworkChange(val as FrameworkID)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Framework" />
            </SelectTrigger>
            <SelectContent>
              {FRAMEWORKS.map(fw => (
                <SelectItem key={fw.id} value={fw.id}>
                  {fw.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Precision Selector */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Precision Level</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Core: Logic only.<br/>Standard: Logic + Config + Docs.<br/>Full: Everything except junk.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex space-x-2 bg-muted p-1 rounded-md">
             {(['core', 'standard', 'full'] as PrecisionLevel[]).map((level) => (
                 <button
                    key={level}
                    onClick={() => onPrecisionChange(level)}
                    className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-sm transition-all ${
                        precision === level
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-background/50'
                    }`}
                 >
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                 </button>
             ))}
          </div>
        </div>

        {/* Experimental Stats */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label>Experimental</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Uses file size analysis to uncheck unusually large files (outliers).</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex items-center space-x-2 h-10">
            <Switch
                id="experimental-mode"
                checked={experimentalStats}
                onCheckedChange={onExperimentalStatsChange}
            />
            <Label htmlFor="experimental-mode" className="cursor-pointer">
                Filter Outliers
            </Label>
          </div>
        </div>

      </div>
    </div>
  );
};
