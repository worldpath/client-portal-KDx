import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Shield, Lock, FileText, Users } from "lucide-react";
import { APP_TITLE, getLoginUrl } from "@/const";
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
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 mb-6">
            <Shield className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            {APP_TITLE}
          </h1>
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
          <p>© 2024 KDx Diagnostics. All rights reserved.</p>
          <p className="mt-2">Secure • Compliant • Reliable</p>
        </div>
      </div>
    </div>
  );
}
