import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import ClientDashboard from "./pages/ClientDashboard";
import SearchResults from "./pages/SearchResults";
import SharedFile from "./pages/SharedFile";
import Settings from "./pages/Settings";
import ExpiredFiles from "./pages/ExpiredFiles";
import ArchivedFiles from "./pages/ArchivedFiles";
import WorkflowTemplateManager from "@/pages/WorkflowTemplateManager";
import WorkflowAnalytics from "@/pages/WorkflowAnalytics";
import TemplateManager from "@/pages/TemplateManager";
import TemplateLibrary from "./pages/TemplateLibrary";
import MyTemplateRequests from "./pages/MyTemplateRequests";
import SecurityDashboard from "./pages/SecurityDashboard";
import AdminSettings from "./pages/AdminSettings";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/client"} component={ClientDashboard} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/expired-files"} component={ExpiredFiles} />
      <Route path={"/archived-files"} component={ArchivedFiles} />
      <Route path="/admin/workflow-templates" component={WorkflowTemplateManager} />
      <Route path="/workflow-analytics" component={WorkflowAnalytics} />
      <Route path="/admin/templates" component={TemplateManager} />
      <Route path="/template-library" component={TemplateLibrary} />
      <Route path="/my-template-requests" component={MyTemplateRequests} />
      <Route path="/admin/security" component={SecurityDashboard} />
      <Route path="/admin/settings" component={AdminSettings} />
      <Route path={"/search/:query"} component={SearchResults} />
      <Route path={"/search"} component={SearchResults} />
      <Route path={"/share/:token"} component={SharedFile} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
