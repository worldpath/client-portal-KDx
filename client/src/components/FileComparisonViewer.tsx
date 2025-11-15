import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ChevronUp, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileComparisonViewerProps {
  fileId: number;
  versions: Array<{
    versionNumber: number;
    createdAt: Date;
    uploadedBy: string;
  }>;
  onClose: () => void;
}

interface DiffLine {
  type: "added" | "removed" | "unchanged" | "modified";
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
  oldContent?: string;
}

export default function FileComparisonViewer({
  fileId,
  versions,
  onClose,
}: FileComparisonViewerProps) {
  const [oldVersion, setOldVersion] = useState<number>(
    versions.length > 1 ? versions[versions.length - 2].versionNumber : versions[0].versionNumber
  );
  const [newVersion, setNewVersion] = useState<number>(
    versions[versions.length - 1].versionNumber
  );

  const leftPaneRef = useRef<HTMLDivElement>(null);
  const rightPaneRef = useRef<HTMLDivElement>(null);

  // Fetch comparison data
  const { data, isLoading, error } = trpc.fileComparison.compareVersions.useQuery(
    {
      fileId,
      oldVersionNumber: oldVersion,
      newVersionNumber: newVersion,
    },
    {
      enabled: oldVersion !== newVersion,
    }
  );

  // Synchronized scrolling
  const handleScroll = (source: "left" | "right") => {
    if (source === "left" && leftPaneRef.current && rightPaneRef.current) {
      rightPaneRef.current.scrollTop = leftPaneRef.current.scrollTop;
    } else if (source === "right" && leftPaneRef.current && rightPaneRef.current) {
      leftPaneRef.current.scrollTop = rightPaneRef.current.scrollTop;
    }
  };

  // Navigate to next/previous change
  const navigateToChange = (direction: "next" | "prev") => {
    if (!data || !leftPaneRef.current) return;

    const changes = data.diff.lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => line.type !== "unchanged");

    if (changes.length === 0) return;

    const currentScrollTop = leftPaneRef.current.scrollTop;
    const lineHeight = 24; // Approximate line height in pixels

    if (direction === "next") {
      const nextChange = changes.find(
        ({ index }) => index * lineHeight > currentScrollTop + 50
      );
      if (nextChange && leftPaneRef.current && rightPaneRef.current) {
        const targetScroll = nextChange.index * lineHeight;
        leftPaneRef.current.scrollTop = targetScroll;
        rightPaneRef.current.scrollTop = targetScroll;
      }
    } else {
      const prevChange = [...changes]
        .reverse()
        .find(({ index }) => index * lineHeight < currentScrollTop - 50);
      if (prevChange && leftPaneRef.current && rightPaneRef.current) {
        const targetScroll = prevChange.index * lineHeight;
        leftPaneRef.current.scrollTop = targetScroll;
        rightPaneRef.current.scrollTop = targetScroll;
      }
    }
  };

  const getLineClassName = (type: DiffLine["type"]) => {
    switch (type) {
      case "added":
        return "bg-green-500/10 border-l-4 border-green-500";
      case "removed":
        return "bg-red-500/10 border-l-4 border-red-500";
      case "modified":
        return "bg-yellow-500/10 border-l-4 border-yellow-500";
      default:
        return "";
    }
  };

  if (oldVersion === newVersion) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <Card className="w-full max-w-md p-6">
          <p className="text-center text-muted-foreground">
            Please select two different versions to compare
          </p>
          <Button onClick={onClose} className="w-full mt-4">
            Close
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card p-4">
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-lg font-semibold">
              {data?.fileName || "File Comparison"}
            </h2>
            {data && (
              <div className="text-sm text-muted-foreground">
                {data.diff.stats.added} added, {data.diff.stats.removed} removed,{" "}
                {data.diff.stats.modified} modified
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToChange("prev")}
              disabled={isLoading}
            >
              <ChevronUp className="w-4 h-4 mr-1" />
              Prev Change
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToChange("next")}
              disabled={isLoading}
            >
              <ChevronDown className="w-4 h-4 mr-1" />
              Next Change
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Version Selectors */}
      <div className="border-b border-border bg-card/50 p-4">
        <div className="container mx-auto grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Old Version</label>
            <Select
              value={oldVersion.toString()}
              onValueChange={(value) => setOldVersion(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.versionNumber} value={v.versionNumber.toString()}>
                    Version {v.versionNumber} ({new Date(v.createdAt).toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">New Version</label>
            <Select
              value={newVersion.toString()}
              onValueChange={(value) => setNewVersion(parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {versions.map((v) => (
                  <SelectItem key={v.versionNumber} value={v.versionNumber.toString()}>
                    Version {v.versionNumber} ({new Date(v.createdAt).toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Comparison View */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <Card className="p-6 max-w-md">
              <p className="text-center text-destructive">{error.message}</p>
            </Card>
          </div>
        ) : data ? (
          <div className="h-full grid grid-cols-2 divide-x divide-border">
            {/* Left pane - Old version */}
            <div
              ref={leftPaneRef}
              onScroll={() => handleScroll("left")}
              className="overflow-auto p-4 bg-muted/20"
            >
              <div className="text-xs font-mono">
                {data.diff.lines.map((line, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-2 py-1 px-2 min-h-[24px]",
                      getLineClassName(line.type)
                    )}
                  >
                    <span className="text-muted-foreground w-12 flex-shrink-0 text-right select-none">
                      {line.oldLineNumber || ""}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap break-all">
                      {line.type === "added" ? "" : line.oldContent || line.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right pane - New version */}
            <div
              ref={rightPaneRef}
              onScroll={() => handleScroll("right")}
              className="overflow-auto p-4"
            >
              <div className="text-xs font-mono">
                {data.diff.lines.map((line, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex gap-2 py-1 px-2 min-h-[24px]",
                      getLineClassName(line.type)
                    )}
                  >
                    <span className="text-muted-foreground w-12 flex-shrink-0 text-right select-none">
                      {line.newLineNumber || ""}
                    </span>
                    <span className="flex-1 whitespace-pre-wrap break-all">
                      {line.type === "removed" ? "" : line.content}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
