import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock, MapPin, MessageSquare, CheckCircle } from "lucide-react";
import { MatchConfirmDialog } from "@/components/MatchConfirmDialog";

interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  type: "lost" | "found";
  date: string;
  image_url?: string;
}

interface Claim {
  id: string;
  item_id: string;
  message?: string;
  status: string;
  created_at: string;
  items: Item;
}

const MyClaims = () => {
  const [user, setUser] = useState<any>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [myItems, setMyItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [potentialMatches, setPotentialMatches] = useState<any[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setUser(session.user);
    fetchMyClaims(session.user.id);
    fetchMyItems(session.user.id);
  };

  const fetchMyClaims = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("claims")
        .select(`
          *,
          items(*)
        `)
        .eq("claimant_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setClaims(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading claims",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMyItems = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyItems(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading your items",
        description: error.message,
        variant: "destructive",
      });
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

  const findPotentialMatches = (approvedItem: any, userItems: Item[]) => {
    const oppositeType = approvedItem.type === "lost" ? "found" : "lost";
    
    const matches = userItems
      .filter(item => item.type === oppositeType)
      .map(item => ({
        ...item,
        matchScore: calculateMatchScore(approvedItem, item)
      }))
      .filter(item => item.matchScore >= 40)
      .sort((a, b) => b.matchScore - a.matchScore);

    return matches;
  };

  const handleConfirmMatch = (claim: Claim) => {
    const matches = findPotentialMatches(claim.items, myItems);
    
    if (matches.length > 0) {
      setSelectedClaim(claim);
      setPotentialMatches(matches);
      setMatchDialogOpen(true);
    } else {
      toast({
        title: "No matches found",
        description: "We couldn't find any matching items in your posts.",
      });
    }
  };

  const handleMatchConfirm = async (selectedMatchIds: string[]) => {
    if (!selectedClaim) return;

    try {
      // Delete the approved claim's item and the user's matching items
      const itemsToDelete = [selectedClaim.items.id, ...selectedMatchIds];
      
      const { error } = await supabase
        .from("items")
        .delete()
        .in("id", itemsToDelete);

      if (error) throw error;

      toast({
        title: "Items matched and removed!",
        description: `Successfully removed ${itemsToDelete.length} matched item${itemsToDelete.length > 1 ? "s" : ""}.`,
      });

      // Refresh data
      if (user) {
        fetchMyClaims(user.id);
        fetchMyItems(user.id);
      }
    } catch (error: any) {
      toast({
        title: "Error removing items",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setMatchDialogOpen(false);
      setSelectedClaim(null);
      setPotentialMatches([]);
    }
  };

  const handleMatchCancel = () => {
    setMatchDialogOpen(false);
    setSelectedClaim(null);
    setPotentialMatches([]);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <div className="container py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      <MatchConfirmDialog
        open={matchDialogOpen}
        onOpenChange={setMatchDialogOpen}
        claimedItem={selectedClaim?.items}
        potentialMatches={potentialMatches}
        onConfirm={handleMatchConfirm}
        onCancel={handleMatchCancel}
      />
      
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Claims</h1>
          <p className="text-muted-foreground">Track the status of your item claims</p>
        </div>

        {claims.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">You haven't made any claims yet.</p>
              <Button onClick={() => navigate("/browse")}>Browse Items</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {claims.map((claim) => (
              <Card key={claim.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row">
                  {claim.items.image_url && (
                    <div className="md:w-48 h-48 overflow-hidden bg-muted">
                      <img
                        src={claim.items.image_url}
                        alt={claim.items.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">{claim.items.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {claim.items.description}
                          </CardDescription>
                        </div>
                        <Badge
                          variant={
                            claim.status === "approved"
                              ? "default"
                              : claim.status === "rejected"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {claim.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant={claim.items.type === "lost" ? "destructive" : "default"}>
                          {claim.items.type}
                        </Badge>
                        <span>•</span>
                        <span>{claim.items.category}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {claim.items.location}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Claimed on: {formatDate(claim.created_at)}
                      </div>
                      {claim.message && (
                        <div className="p-3 bg-muted rounded-lg mt-3">
                          <p className="text-sm font-medium mb-1">Your Message:</p>
                          <p className="text-sm text-muted-foreground">{claim.message}</p>
                        </div>
                      )}
                      {claim.status === "approved" && (
                        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg mt-3">
                          <p className="text-sm font-medium text-primary mb-2">
                            ✓ Your claim was approved! Does this match any of your posted items?
                          </p>
                          <Button
                            size="sm"
                            onClick={() => handleConfirmMatch(claim)}
                            className="w-full"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Check for Matches & Remove
                          </Button>
                        </div>
                      )}
                      <div className="pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/item/${claim.items.id}`)}
                        >
                          View Item Details
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyClaims;
