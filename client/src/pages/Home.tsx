import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, Lock, FileText, Users } from "lucide-react";
import { APP_TITLE, APP_LOGO, getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') {
        setLocation('/admin');
      } else {
        setLocation('/client');
      }
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="flex justify-center mb-6">
            <img src={APP_LOGO} alt="WorldPath Logo" className="h-24 w-24 object-contain" />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            WorldPath Regulatory Solutions
          </h1>
          <p className="text-2xl text-primary font-serif italic mb-6">
            Charting the WorldPath to success
          </p>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Secure file repository and collaboration hub for medical device projects and regulatory affairs
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-5xl mx-auto">
          <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-foreground">Enterprise Security</CardTitle>
              <CardDescription>
                Military-grade encryption, role-based access control, and comprehensive audit trails
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-foreground">Smart File Management</CardTitle>
              <CardDescription>
                Organize, preview, and edit files with hierarchical folders and granular permissions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader>
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-foreground">Team Collaboration</CardTitle>
              <CardDescription>
                Invite team members, assign permissions, and track all activities in real-time
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Card className="inline-block border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-foreground">Ready to get started?</CardTitle>
              <CardDescription>
                Sign in to access your secure portal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                size="lg" 
                className="w-full"
                onClick={() => window.location.href = getLoginUrl()}
              >
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>© 2024 WorldPath Regulatory Solutions, LLC. All rights reserved.</p>
          <p className="mt-2">2108 N Street, Suite N | Sacramento, CA 95816</p>
          <p className="mt-1">Office: +1.858.264.2019 | Cell: +1.949.800.9978</p>
          <p className="mt-1">
            <a href="https://www.worldpathregulatory.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
              www.worldpathregulatory.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
