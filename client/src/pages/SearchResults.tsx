import { useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  File,
  Folder,
  Search,
  Loader2,
  Download,
  Eye,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

export default function SearchResults() {
  const [, params] = useRoute("/search/:query");
  const [, setLocation] = useLocation();
  const initialQuery = params?.query ? decodeURIComponent(params.query) : "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);

  // Fetch search results
  const { data: results = [], isLoading } = trpc.fileSearch.search.useQuery(
    { query: activeQuery },
    { enabled: activeQuery.length > 0 }
  );

  // Download file mutation
  const downloadFileMutation = trpc.files.download.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to download file");
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveQuery(searchQuery.trim());
      setLocation(`/search/${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleDownloadFile = (fileId: number) => {
    downloadFileMutation.mutate({ id: fileId });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return <File className="w-5 h-5" />;
    if (mimeType.startsWith("image/")) return <File className="w-5 h-5 text-blue-500" />;
    if (mimeType.includes("pdf")) return <File className="w-5 h-5 text-red-500" />;
    if (mimeType.includes("word") || mimeType.includes("document"))
      return <File className="w-5 h-5 text-blue-600" />;
    if (mimeType.includes("sheet") || mimeType.includes("excel"))
      return <File className="w-5 h-5 text-green-600" />;
    return <File className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/")}
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 h-12 text-base"
                  autoFocus
                />
              </div>
            </form>
          </div>
        </div>
      </header>

      {/* Results */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activeQuery.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Search Files
            </h2>
            <p className="text-muted-foreground">
              Enter a search term to find files across all folders
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              No results found
            </h2>
            <p className="text-muted-foreground">
              Try a different search term or check your spelling
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                {results.length} {results.length === 1 ? "result" : "results"} for "{activeQuery}"
              </h2>
            </div>

            <div className="space-y-2">
              {results.map((file) => (
                <Card key={file.id} className="border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-1">
                          {getFileIcon(file.mimeType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-base font-medium text-foreground mb-1">
                            {file.name}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-2">
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                          </div>
                          {/* Folder breadcrumb */}
                          <div className="flex items-center gap-1 text-sm text-muted-foreground flex-wrap">
                            <Folder className="w-4 h-4" />
                            {file.folderPath.map((folder, index) => (
                              <span key={folder.id} className="flex items-center gap-1">
                                {index > 0 && <ChevronRight className="w-3 h-3" />}
                                <Link
                                  href={`/admin?folder=${folder.id}`}
                                  className="hover:text-primary transition-colors"
                                >
                                  {folder.name}
                                </Link>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            // Navigate to file location
                            setLocation(`/admin?folder=${file.folderId}`);
                          }}
                          title="Go to file location"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadFile(file.id)}
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
