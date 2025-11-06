import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Package, Search, Shield, Zap, MapPin, Clock, CheckCircle2, ArrowRight } from "lucide-react";
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
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="container relative py-24 md:py-40">
          <div className="grid gap-16 lg:grid-cols-2 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/20 backdrop-blur-sm hover:scale-105 transition-transform duration-300">
                <Package className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Campus Lost & Found Platform
                </span>
              </div>
              
              <h1 className="text-6xl md:text-7xl font-bold leading-tight tracking-tight">
                Lost something?{" "}
                <span className="relative inline-block">
                  <span className="absolute inset-0 bg-gradient-to-r from-primary via-primary-glow to-accent blur-2xl opacity-50" />
                  <span className="relative bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
                    We'll reunite you.
                  </span>
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-lg leading-relaxed">
                The smartest way to recover lost items on campus. Post, search, and connect with your community in seconds.
              </p>

              {/* Stats */}
              <div className="flex flex-wrap gap-8 py-4">
                <div className="space-y-1">
                  <div className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">500+</div>
                  <div className="text-sm text-muted-foreground">Items Recovered</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold bg-gradient-to-r from-accent to-accent-glow bg-clip-text text-transparent">98%</div>
                  <div className="text-sm text-muted-foreground">Match Rate</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">24h</div>
                  <div className="text-sm text-muted-foreground">Avg Recovery</div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 pt-4">
                {user ? (
                  <>
                    <Button 
                      size="lg" 
                      onClick={() => navigate("/browse")} 
                      className="shadow-soft hover:shadow-lg transition-all duration-300 hover:scale-105 group"
                    >
                      <Search className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                      Browse Items
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      onClick={() => navigate("/post")}
                      className="hover:bg-primary/5 hover:border-primary transition-all duration-300"
                    >
                      Post an Item
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      size="lg" 
                      onClick={() => navigate("/auth")} 
                      className="shadow-soft hover:shadow-lg transition-all duration-300 hover:scale-105 group"
                    >
                      Get Started Free
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      onClick={() => navigate("/auth")}
                      className="hover:bg-primary/5 hover:border-primary transition-all duration-300"
                    >
                      Sign In
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            <div className="relative lg:block animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-3xl blur-3xl animate-pulse" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl hover:scale-105 transition-transform duration-500">
                <img
                  src={heroBanner}
                  alt="Campus Lost and Found Community"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              </div>
              
              {/* Floating cards */}
              <div className="absolute -bottom-6 -left-6 bg-card border rounded-2xl p-4 shadow-lg backdrop-blur-sm animate-fade-in hover:scale-105 transition-transform" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">Quick Match</div>
                    <div className="text-sm text-muted-foreground">AI-powered suggestions</div>
                  </div>
                </div>
              </div>
              
              <div className="absolute -top-6 -right-6 bg-card border rounded-2xl p-6 shadow-lg backdrop-blur-sm animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <div className="relative w-32 h-32">
                  {/* Sad emoji - shows at start */}
                  <div className="absolute inset-0 flex items-center justify-center animate-[lost-item-sequence_4s_ease-in-out_infinite]">
                    <span className="text-6xl">😢</span>
                  </div>
                  
                  {/* Gift box - appears in middle */}
                  <div className="absolute inset-0 flex items-center justify-center animate-[gift-appears_4s_ease-in-out_infinite]">
                    <span className="text-6xl">🎁</span>
                  </div>
                  
                  {/* Happy emoji - shows at end */}
                  <div className="absolute inset-0 flex items-center justify-center animate-[found-item-happy_4s_ease-in-out_infinite]">
                    <span className="text-6xl">😊</span>
                  </div>
                </div>
                <div className="text-center mt-2">
                  <div className="font-semibold text-sm">Lost & Found!</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 relative">
        <div className="container">
          <div className="text-center mb-20 space-y-4 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              Simple & Effective
            </div>
            <h2 className="text-4xl md:text-5xl font-bold">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three effortless steps to reunite you with your belongings
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: Search,
                title: "Post or Search",
                description: "Report a lost item or browse through found items posted by others",
                gradient: "from-primary to-primary-glow",
                delay: "0s"
              },
              {
                icon: Zap,
                title: "Get Matched",
                description: "Our smart system automatically suggests potential matches based on details",
                gradient: "from-accent to-accent-glow",
                delay: "0.1s"
              },
              {
                icon: Shield,
                title: "Secure Claims",
                description: "Verify ownership through our secure claim process and get reunited safely",
                gradient: "from-primary via-primary-glow to-accent",
                delay: "0.2s"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="group relative p-8 rounded-3xl bg-card border hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 animate-fade-in"
                style={{ animationDelay: feature.delay }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative space-y-6">
                  <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                    <feature.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    Learn more
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10" />
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-3xl animate-pulse" />
        </div>

        <div className="container relative">
          <div className="max-w-4xl mx-auto text-center space-y-10 p-12 md:p-16 rounded-3xl bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-primary/20 shadow-2xl animate-fade-in">
            <div className="space-y-6">
              <h2 className="text-4xl md:text-6xl font-bold leading-tight">
                Ready to{" "}
                <span className="relative inline-block">
                  <span className="absolute inset-0 bg-gradient-to-r from-primary to-accent blur-xl opacity-50" />
                  <span className="relative bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    find what's yours?
                  </span>
                </span>
              </h2>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Join hundreds of students already using Campus Found to recover their lost items within hours.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                size="lg"
                onClick={() => navigate(user ? "/browse" : "/auth")}
                className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group px-8 py-6 text-lg"
              >
                {user ? "Browse Items Now" : "Get Started Free"}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/browse")}
                className="hover:bg-primary/5 hover:border-primary transition-all duration-300 px-8 py-6 text-lg"
              >
                View Demo
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>100% Free</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Instant Setup</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Secure & Private</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
