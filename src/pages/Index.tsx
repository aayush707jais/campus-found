import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Package, Search, Shield, Zap } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="container relative py-20 md:py-32">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
                <Package className="h-4 w-4" />
                <span className="text-sm font-medium">Campus Lost & Found</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight">
                Lost something?{" "}
                <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  We'll help you find it.
                </span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-lg">
                Campus Found connects students who've lost items with those who've found them. 
                Simple, secure, and built for our campus community.
              </p>
              <div className="flex flex-wrap gap-4">
                {user ? (
                  <>
                    <Button size="lg" onClick={() => navigate("/browse")} className="shadow-soft">
                      <Search className="mr-2 h-5 w-5" />
                      Browse Items
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate("/post")}>
                      Post an Item
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="lg" onClick={() => navigate("/auth")} className="shadow-soft">
                      Get Started
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
                      Sign In
                    </Button>
                  </>
                )}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-3xl" />
              <img
                src={heroBanner}
                alt="Campus Lost and Found"
                className="relative rounded-2xl shadow-soft w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to reunite you with your belongings
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center space-y-4">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-card">
                <Search className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold">Post or Search</h3>
              <p className="text-muted-foreground">
                Report a lost item or browse through found items posted by others
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-accent to-accent-glow shadow-card">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold">Get Matched</h3>
              <p className="text-muted-foreground">
                Our system helps match lost items with found items automatically
              </p>
            </div>
            
            <div className="text-center space-y-4">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-secondary to-primary shadow-card">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold">Secure Claims</h3>
              <p className="text-muted-foreground">
                Verify ownership through our secure claim process and get reunited
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-8 p-12 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 shadow-soft">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to find what's yours?
            </h2>
            <p className="text-lg text-muted-foreground">
              Join hundreds of students already using Campus Found to recover their lost items.
            </p>
            <Button
              size="lg"
              onClick={() => navigate(user ? "/browse" : "/auth")}
              className="shadow-soft"
            >
              {user ? "Browse Items Now" : "Get Started Free"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
