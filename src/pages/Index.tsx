import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Package, Search, Shield, Zap, MapPin, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";
import { Navbar } from "@/components/Navbar";
import { FeatureModal, Step } from "@/components/FeatureModal";
const Index = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkAuth();
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);
  return <div className="min-h-screen bg-background">
      <Navbar user={user} />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{
          animationDelay: '1s'
        }} />
        </div>

        <div className="container relative md:py-40 my-0 py-[50px]">
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
                {user ? <>
                    <Button size="lg" onClick={() => navigate("/browse")} className="shadow-soft hover:shadow-lg transition-all duration-300 hover:scale-105 group">
                      <Search className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                      Browse Items
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate("/post")} className="hover:bg-primary/5 hover:border-primary transition-all duration-300">
                      Post an Item
                    </Button>
                  </> : <>
                    <Button size="lg" onClick={() => navigate("/auth")} className="shadow-soft hover:shadow-lg transition-all duration-300 hover:scale-105 group">
                      Get Started Free
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="hover:bg-primary/5 hover:border-primary transition-all duration-300">
                      Sign In
                    </Button>
                  </>}
              </div>
            </div>
            
            <div className="relative lg:block animate-fade-in" style={{
            animationDelay: '0.2s'
          }}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 rounded-3xl blur-3xl animate-pulse" />
              
              {/* Emoji Animation */}
              <div className="relative flex items-center justify-center min-h-[400px]">
                <div className="relative w-48 h-48 bg-card/50 backdrop-blur-sm rounded-3xl border border-primary/20 shadow-2xl flex items-center justify-center">
                  {/* Sad emoji - shows at start */}
                  <div className="absolute inset-0 flex items-center justify-center animate-[lost-item-sad_6s_ease-in-out_infinite]">
                    <span className="text-8xl">😢</span>
                  </div>

                  {/* Gift box - appears in middle */}
                  <div className="absolute inset-0 flex items-center justify-center animate-[gift-appears_6s_ease-in-out_infinite]">
                    <span className="text-8xl">🎁</span>
                  </div>

                  {/* Happy emoji - shows at end */}
                  <div className="absolute inset-0 flex items-center justify-center animate-[found-item-happy_6s_ease-in-out_infinite]">
                    <span className="text-8xl">😊</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-[35px]">
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
            {/* Post or Search */}
            <div className="group relative p-8 rounded-3xl bg-card border hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 animate-fade-in">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative space-y-6">
                <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <Search className="h-8 w-8 text-white" />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold">Post or Search</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Report a lost item or browse through found items posted by others
                  </p>
                </div>

                <FeatureModal 
                  title="Post or Search"
                  trigger={
                    <button className="flex items-center gap-2 text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-500 hover:gap-3">
                      Learn more
                      <ArrowRight className="h-4 w-4 transition-transform" />
                    </button>
                  }
                >
                  <Step
                    number={1}
                    title="Lost Something?"
                    description="Create a detailed post about your lost item to help others identify it."
                    details={[
                      "Click 'Post an Item' and select 'Lost'",
                      "Choose the category (wallet, keys, electronics, etc.)",
                      "Add a clear title like 'Lost Black Wallet near Library'",
                      "Describe unique features (color, brand, distinctive marks)",
                      "Specify where and when you last saw it",
                      "Upload photos if you have any reference images"
                    ]}
                  />
                  <Step
                    number={2}
                    title="Found Something?"
                    description="Help reunite items with their owners by posting what you found."
                    details={[
                      "Select 'Found' when posting an item",
                      "Take clear photos from multiple angles",
                      "Describe the item accurately but avoid too many specifics (for verification)",
                      "Mark the approximate location where you found it",
                      "The system will automatically notify potential owners"
                    ]}
                  />
                  <Step
                    number={3}
                    title="Browse Items"
                    description="Search through all posted items to find yours or help identify owners."
                    details={[
                      "Use filters by category, date, and location",
                      "Search using keywords from your item description",
                      "Check regularly - new items are posted daily",
                      "Click on items to see full details and contact options"
                    ]}
                  />
                </FeatureModal>
              </div>
            </div>

            {/* Get Matched */}
            <div className="group relative p-8 rounded-3xl bg-card border hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative space-y-6">
                <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-accent to-accent-glow shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold">Get Matched</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Our smart system automatically suggests potential matches based on details
                  </p>
                </div>

                <FeatureModal 
                  title="Get Matched"
                  trigger={
                    <button className="flex items-center gap-2 text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-500 hover:gap-3">
                      Learn more
                      <ArrowRight className="h-4 w-4 transition-transform" />
                    </button>
                  }
                >
                  <Step
                    number={1}
                    title="Automatic Matching"
                    description="Our intelligent system analyzes all posts and finds potential matches for you."
                    details={[
                      "Matches are based on category, location, date, and description",
                      "System compares lost items with found items automatically",
                      "You'll receive notifications when potential matches are found",
                      "Match score indicates likelihood of being your item"
                    ]}
                  />
                  <Step
                    number={2}
                    title="Review Suggestions"
                    description="Browse through suggested matches and identify your item."
                    details={[
                      "Check your 'My Claims' page for match notifications",
                      "Compare photos and descriptions carefully",
                      "Look for unique identifiers you mentioned",
                      "Multiple matches? Review each one thoroughly"
                    ]}
                  />
                  <Step
                    number={3}
                    title="Improve Match Accuracy"
                    description="The more details you provide, the better the matches."
                    details={[
                      "Add specific details (scratches, stickers, wear patterns)",
                      "Include brand names and model numbers",
                      "Specify exact location and time",
                      "Update your post if you remember additional details"
                    ]}
                  />
                </FeatureModal>
              </div>
            </div>

            {/* Secure Claims */}
            <div className="group relative p-8 rounded-3xl bg-card border hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative space-y-6">
                <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary via-primary-glow to-accent shadow-lg group-hover:scale-110 transition-transform duration-500">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold">Secure Claims</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Verify ownership through our secure claim process and get reunited safely
                  </p>
                </div>

                <FeatureModal 
                  title="Secure Claims"
                  trigger={
                    <button className="flex items-center gap-2 text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-500 hover:gap-3">
                      Learn more
                      <ArrowRight className="h-4 w-4 transition-transform" />
                    </button>
                  }
                >
                  <Step
                    number={1}
                    title="Initiate a Claim"
                    description="Found your item? Start the secure claim process."
                    details={[
                      "Click 'Claim This Item' on the matching post",
                      "Provide verification details that only the owner would know",
                      "Describe unique features not mentioned in the public post",
                      "Include any proof of ownership if available"
                    ]}
                  />
                  <Step
                    number={2}
                    title="Verification Process"
                    description="The finder reviews your claim to verify ownership."
                    details={[
                      "Finder compares your details with the actual item",
                      "They may ask follow-up questions for verification",
                      "Private details aren't visible to others",
                      "Process ensures only rightful owners can claim"
                    ]}
                  />
                  <Step
                    number={3}
                    title="Safe Meetup"
                    description="Arrange a secure exchange in a public campus location."
                    details={[
                      "Choose a public, well-lit meeting spot",
                      "Campus security offices or cafeterias work well",
                      "Bring your student ID for additional verification",
                      "Confirm the meetup time via the platform messaging",
                      "Mark the item as 'Returned' once you receive it"
                    ]}
                  />
                </FeatureModal>
              </div>
            </div>
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
              <Button size="lg" onClick={() => navigate(user ? "/browse" : "/auth")} className="shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 group px-8 py-6 text-lg">
                {user ? "Browse Items Now" : "Get Started Free"}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
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
    </div>;
};
export default Index;