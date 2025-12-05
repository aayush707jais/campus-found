import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCombinedMatching, CombinedMatchResult } from "@/hooks/useCombinedMatching";
import { Item } from "@/hooks/useAIMatching";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ModelLoadingIndicator } from "@/components/ModelLoadingIndicator";
import { Sparkles, MapPin, Calendar, RefreshCw, ChevronRight, Package, Image, Brain, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface MatchGroup {
  userItem: Item;
  matches: (CombinedMatchResult & { matchedItem: Item })[];
}

const MyMatches = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { combinedBatchMatch, loading: matchLoading, modelProgress, modelReady } = useCombinedMatching();
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matchGroups, setMatchGroups] = useState<MatchGroup[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [matchingStage, setMatchingStage] = useState<string>("");
  const [stageProgress, setStageProgress] = useState(0);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
    };
    getUser();
  }, [navigate]);

  const fetchMatches = useCallback(async () => {
    if (!user) return;
    
    setRefreshing(true);
    setMatchingStage("");
    setStageProgress(0);
    
    try {
      const { data: userItems, error: userError } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active");

      if (userError) throw userError;
      if (!userItems || userItems.length === 0) {
        setMatchGroups([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data: allItems, error: allError } = await supabase
        .from("items")
        .select("*")
        .eq("status", "active")
        .neq("user_id", user.id);

      if (allError) throw allError;

      const groups: MatchGroup[] = [];

      for (const userItem of userItems) {
        const oppositeType = userItem.type === "lost" ? "found" : "lost";
        const candidates = (allItems || []).filter(
          (item) => item.type === oppositeType
        ) as Item[];

        if (candidates.length === 0) continue;

        const matches = await combinedBatchMatch(
          userItem as Item, 
          candidates,
          (stage, progress) => {
            setMatchingStage(stage);
            setStageProgress(progress);
          }
        );
        
        const significantMatches = matches
          .filter((m) => m.combinedScore > 30)
          .map((match) => ({
            ...match,
            matchedItem: candidates.find((c) => c.id === match.matchedItemId)!,
          }))
          .filter((m) => m.matchedItem);

        if (significantMatches.length > 0) {
          groups.push({
            userItem: userItem as Item,
            matches: significantMatches,
          });
        }
      }

      setMatchGroups(groups);
    } catch (error) {
      console.error("Error fetching matches:", error);
      toast({
        title: "Error",
        description: "Failed to fetch matches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
      setMatchingStage("");
    }
  }, [user, combinedBatchMatch, toast]);

  useEffect(() => {
    if (user) {
      fetchMatches();
    }
  }, [user, fetchMatches]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (score >= 60) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    if (score >= 40) return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    return "bg-muted text-muted-foreground";
  };

  const getCategoryImage = (category: string, imageUrl: string | null) => {
    if (imageUrl) return imageUrl;
    const images: Record<string, string> = {
      electronics: "/src/assets/placeholder-electronics.jpg",
      clothing: "/src/assets/placeholder-clothing.jpg",
      accessories: "/src/assets/placeholder-jewelry.jpg",
      documents: "/src/assets/placeholder-id.jpg",
      keys: "/src/assets/placeholder-keys.jpg",
      bags: "/src/assets/placeholder-backpack.jpg",
      books: "/src/assets/placeholder-books.jpg",
      sports: "/src/assets/placeholder-sports.jpg",
      other: "/src/assets/placeholder-other.jpg",
    };
    return images[category.toLowerCase()] || images.other;
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'image': return 'Analyzing images with ML...';
      case 'ai': return 'Running AI context analysis...';
      case 'combining': return 'Combining results...';
      default: return 'Processing...';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <main className="container py-8">
          <div className="space-y-6">
            <Skeleton className="h-10 w-64" />
            <ModelLoadingIndicator 
              progress={modelProgress} 
              isLoading={!modelReady && modelProgress > 0} 
              modelReady={modelReady} 
            />
            <div className="grid gap-6">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      <main className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Sparkles className="h-8 w-8 text-primary" />
              My AI + ML Matches
            </h1>
            <p className="text-muted-foreground mt-2">
              Combined AI reasoning + ML image analysis for best match accuracy
            </p>
          </div>
          <Button
            variant="outline"
            onClick={fetchMatches}
            disabled={refreshing || matchLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Model loading indicator */}
        {!modelReady && modelProgress > 0 && (
          <div className="mb-6">
            <ModelLoadingIndicator 
              progress={modelProgress} 
              isLoading={true} 
              modelReady={false} 
            />
          </div>
        )}

        {/* Matching progress indicator */}
        {matchingStage && (
          <Card className="mb-6 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="font-medium">{getStageLabel(matchingStage)}</span>
              </div>
              <Progress value={stageProgress} className="h-2" />
            </CardContent>
          </Card>
        )}

        {matchGroups.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Matches Found</h3>
              <p className="text-muted-foreground text-center max-w-md">
                {user ? (
                  "We haven't found any matches for your items yet. Post more items or check back later as new items are added."
                ) : (
                  "Sign in to see matches for your items."
                )}
              </p>
              <Button className="mt-6" onClick={() => navigate("/post")}>
                Post an Item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {matchGroups.map((group) => (
              <Card key={group.userItem.id} className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                  <div className="flex items-start gap-4">
                    <img
                      src={getCategoryImage(group.userItem.category, group.userItem.image_url)}
                      alt={group.userItem.title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={group.userItem.type === "lost" ? "destructive" : "default"}>
                          {group.userItem.type === "lost" ? "Lost" : "Found"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">Your item</span>
                      </div>
                      <CardTitle className="text-lg">{group.userItem.title}</CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {group.userItem.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(group.userItem.date), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/item/${group.userItem.id}`)}
                    >
                      View <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    {group.matches.length} Potential Match{group.matches.length !== 1 ? "es" : ""}
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {group.matches.map((match) => (
                      <Card
                        key={match.matchedItemId}
                        className="cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => navigate(`/item/${match.matchedItemId}`)}
                      >
                        <CardContent className="p-3">
                          <div className="flex gap-3">
                            <img
                              src={getCategoryImage(match.matchedItem.category, match.matchedItem.image_url)}
                              alt={match.matchedItem.title}
                              className="w-16 h-16 object-cover rounded-md"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${getScoreColor(match.combinedScore)}`}
                                >
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  {match.combinedScore}%
                                </Badge>
                              </div>
                              <h5 className="font-medium text-sm truncate">
                                {match.matchedItem.title}
                              </h5>
                              <p className="text-xs text-muted-foreground truncate">
                                {match.matchedItem.location}
                              </p>
                            </div>
                          </div>
                          
                          {/* Score breakdown */}
                          <div className="flex items-center gap-3 mt-3 text-xs">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Brain className="h-3 w-3" />
                              <span>AI: {match.aiScore}%</span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Image className="h-3 w-3" />
                              <span>Image: {match.imageScore}%</span>
                            </div>
                          </div>
                          
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {match.reasoning}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyMatches;
