import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Calendar, Package, Sparkles, Brain, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useCombinedMatching, CombinedMatchResult } from "@/hooks/useCombinedMatching";
import { Item } from "@/hooks/useAIMatching";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ModelLoadingIndicator } from "@/components/ModelLoadingIndicator";

const Browse = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [userItems, setUserItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [user, setUser] = useState<any>(null);
  const [combinedMatches, setCombinedMatches] = useState<Map<string, CombinedMatchResult>>(new Map());
  const [loadingMatches, setLoadingMatches] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { combinedBatchMatch, modelProgress, modelReady } = useCombinedMatching();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchUserItems(session.user.id);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        fetchUserItems(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error fetching items",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const fetchUserItems = async (userId: string) => {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active");

    if (!error && data) {
      setUserItems(data as Item[]);
    }
  };

  // Run combined AI + ML matching
  const runCombinedMatching = useCallback(async () => {
    if (userItems.length === 0 || items.length === 0 || !user) return;

    const itemsToMatch = items.filter(item => item.user_id !== user.id);
    if (itemsToMatch.length === 0) return;

    setLoadingMatches(true);
    const allMatches = new Map<string, CombinedMatchResult>();

    for (const userItem of userItems) {
      const oppositeType = userItem.type === "lost" ? "found" : "lost";
      const candidates = itemsToMatch.filter(item => item.type === oppositeType).slice(0, 10);
      
      if (candidates.length > 0) {
        try {
          const matches = await combinedBatchMatch(userItem, candidates);
          matches.forEach(m => {
            const existing = allMatches.get(m.matchedItemId);
            if (!existing || m.combinedScore > existing.combinedScore) {
              allMatches.set(m.matchedItemId, m);
            }
          });
        } catch (err) {
          console.error("Combined matching error:", err);
        }
      }
    }

    setCombinedMatches(allMatches);
    setLoadingMatches(false);

    if (allMatches.size > 0) {
      toast({
        title: "AI + ML Matches Found",
        description: `Found ${allMatches.size} potential match${allMatches.size > 1 ? "es" : ""} with your items!`,
      });
    }
  }, [userItems, items, user, combinedBatchMatch, toast]);

  useEffect(() => {
    if (userItems.length > 0 && items.length > 0 && user) {
      const timeout = setTimeout(() => {
        runCombinedMatching();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [userItems.length, items.length, user?.id]);

  const getMatchInfo = (item: Item) => {
    return combinedMatches.get(item.id) || null;
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

  // Sort by combined match score (highest first)
  const sortedItems = [...filteredItems].sort((a, b) => {
    const matchA = combinedMatches.get(a.id);
    const matchB = combinedMatches.get(b.id);
    if (matchA && matchB) return matchB.combinedScore - matchA.combinedScore;
    if (matchA) return -1;
    if (matchB) return 1;
    return 0;
  });

  const categories = [...new Set(items.map((item) => item.category))];

  if (!user) return null;

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Browse Items
            </h1>
            {loadingMatches && (
              <Badge variant="outline" className="gap-1">
                <Sparkles className="h-3 w-3 animate-pulse" />
                AI + ML Matching...
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Search through lost and found items. AI + ML matches highlighted with score breakdown.
          </p>
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

        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="found">Found</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg" />
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No items found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filters
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedItems.map((item) => {
              const matchInfo = getMatchInfo(item);
              
              return (
                <Card
                  key={item.id}
                  className="overflow-hidden hover:shadow-soft transition-all cursor-pointer"
                  onClick={() => navigate(`/item/${item.id}`)}
                >
                  {item.image_url ? (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                      <Package className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="line-clamp-1">{item.title}</CardTitle>
                      <div className="flex gap-2 flex-wrap">
                        {matchInfo && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-100 dark:border-green-700 cursor-help gap-1">
                                <Sparkles className="h-3 w-3" />
                                {Math.round(matchInfo.combinedScore)}%
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-2">
                                <p className="font-medium">Score Breakdown:</p>
                                <div className="flex items-center gap-2 text-sm">
                                  <Brain className="h-3 w-3" />
                                  <span>AI Context: {matchInfo.aiScore}%</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Image className="h-3 w-3" />
                                  <span>ML Image: {matchInfo.imageScore}%</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">{matchInfo.reasoning}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <Badge
                          variant={item.type === "lost" ? "destructive" : "default"}
                          className={item.type === "found" ? "bg-accent" : ""}
                        >
                          {item.type}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                <CardFooter className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {item.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(item.date), "MMM d, yyyy")}
                  </div>
                  <Badge variant="outline">{item.category}</Badge>
                </CardFooter>
              </Card>
            );
            })}
          </div>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
};

export default Browse;
