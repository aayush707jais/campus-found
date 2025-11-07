import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Calendar, Package } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const Browse = () => {
  const [items, setItems] = useState<any[]>([]);
  const [userItems, setUserItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      // Fetch user's items for matching
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
      setUserItems(data);
    }
  };

  const calculateMatchScore = (item1: any, item2: any): number => {
    let score = 0;

    // Category match (40 points)
    if (item1.category.toLowerCase() === item2.category.toLowerCase()) {
      score += 40;
    }

    // Location similarity (30 points)
    const loc1 = item1.location.toLowerCase();
    const loc2 = item2.location.toLowerCase();
    const loc1Words = loc1.split(/[\s,]+/);
    const loc2Words = loc2.split(/[\s,]+/);
    const commonWords = loc1Words.filter(word => loc2Words.includes(word));
    if (commonWords.length > 0) {
      score += Math.min(30, commonWords.length * 10);
    }

    // Date proximity (15 points) - within 7 days
    const date1 = new Date(item1.date).getTime();
    const date2 = new Date(item2.date).getTime();
    const daysDiff = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);
    if (daysDiff <= 7) {
      score += Math.max(0, 15 - daysDiff * 2);
    }

    // Title/Description similarity (15 points)
    const title1 = item1.title.toLowerCase();
    const title2 = item2.title.toLowerCase();
    const desc1 = item1.description.toLowerCase();
    const desc2 = item2.description.toLowerCase();
    
    const titleWords1 = title1.split(/\s+/);
    const titleWords2 = title2.split(/\s+/);
    const descWords1 = desc1.split(/\s+/);
    const descWords2 = desc2.split(/\s+/);
    
    const commonTitleWords = titleWords1.filter(word => 
      word.length > 3 && titleWords2.includes(word)
    );
    const commonDescWords = descWords1.filter(word => 
      word.length > 3 && descWords2.includes(word)
    );
    
    score += Math.min(15, (commonTitleWords.length + commonDescWords.length) * 3);

    return score;
  };

  const getMatchInfo = (item: any) => {
    if (userItems.length === 0 || item.user_id === user?.id) return null;
    
    const oppositeType = item.type === "lost" ? "found" : "lost";
    const matches = userItems
      .filter(userItem => userItem.type === oppositeType)
      .map(userItem => ({
        score: calculateMatchScore(item, userItem),
        item: userItem
      }))
      .filter(m => m.score >= 40)
      .sort((a, b) => b.score - a.score);

    return matches.length > 0 ? matches[0] : null;
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

  const categories = [...new Set(items.map((item) => item.category))];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Browse Items
          </h1>
          <p className="text-muted-foreground">
            Search through lost and found items on campus
          </p>
        </div>

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
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-card-image bg-muted rounded-t-lg" />
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
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => {
              const matchInfo = getMatchInfo(item);
              
              return (
                <Card
                  key={item.id}
                  className="overflow-hidden hover:shadow-soft transition-all cursor-pointer"
                  onClick={() => navigate(`/item/${item.id}`)}
                >
                  {item.image_url ? (
                    <div className="aspect-card-image">
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-card-image bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                      <Package className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="line-clamp-1">{item.title}</CardTitle>
                      <div className="flex gap-2 flex-wrap">
                        {matchInfo && (
                          <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-100 dark:border-green-700">
                            {Math.round(matchInfo.score)}% Match!
                          </Badge>
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
  );
};

export default Browse;
