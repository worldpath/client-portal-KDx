import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, Download, Search } from "lucide-react";
import { toast } from "sonner";

export default function TemplateLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const utils = trpc.useUtils();

  // Fetch categories and templates
  const { data: categories = [], isLoading: categoriesLoading } = trpc.templates.getCategories.useQuery();
  const { data: allTemplates = [], isLoading: templatesLoading } = trpc.templates.getByCategory.useQuery({});

  // Download mutation
  const downloadMutation = trpc.templates.download.useMutation({
    onSuccess: (data) => {
      // Trigger download
      const link = document.createElement('a');
      link.href = data.fileUrl;
      link.download = data.fileName;
      link.click();
      
      toast.success("Template downloaded successfully");
      utils.templates.getByCategory.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to download template");
    },
  });

  // Filter templates
  const filteredTemplates = allTemplates.filter((template) => {
    const matchesCategory = selectedCategory === "all" || template.categoryId === parseInt(selectedCategory);
    const matchesSearch = searchQuery === "" || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Group templates by category
  const templatesByCategory = categories.map((category) => ({
    category,
    templates: filteredTemplates.filter((t) => t.categoryId === category.id),
  })).filter((group) => group.templates.length > 0);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const handleDownload = (templateId: number) => {
    downloadMutation.mutate({ id: templateId });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Template Library</h1>
        <p className="text-muted-foreground mt-1">
          Download standard forms, checklists, and protocols
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {templatesLoading || categoriesLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              {searchQuery || selectedCategory !== "all" ? (
                <>
                  <p>No templates found matching your criteria.</p>
                  <Button
                    variant="link"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedCategory("all");
                    }}
                    className="mt-2"
                  >
                    Clear filters
                  </Button>
                </>
              ) : (
                <p>No templates available yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {templatesByCategory.map(({ category, templates }) => (
            <div key={category.id}>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold">{category.name}</h2>
                {category.description && (
                  <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                )}
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleDownload(template.id)}
                          disabled={downloadMutation.isPending}
                        >
                          {downloadMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </>
                          )}
                        </Button>
                      </div>
                      <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
                      {template.description && (
                        <CardDescription className="line-clamp-2">
                          {template.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{formatFileSize(template.size)}</span>
                        <span>{template.downloadCount} downloads</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
