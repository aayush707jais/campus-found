import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock, MapPin, Package, MessageSquare, CheckCircle, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MatchConfirmDialog } from "@/components/MatchConfirmDialog";

interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  type: "lost" | "found";
  status: string;
  date: string;
  image_url?: string;
  created_at: string;
}

interface Claim {
  id: string;
  item_id: string;
  claimant_id: string;
  message?: string;
  status: string;
  created_at: string;
  items: Item;
  claimant: {
    full_name: string;
    email: string;
  };
}

const MyItems = () => {
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [matchDialogOpen, setMatchDialogOpen] = useState(false);
  const [pendingApproval, setPendingApproval] = useState<{ claimId: string; item: any } | null>(null);
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
    fetchMyItems(session.user.id);
    fetchClaimsOnMyItems(session.user.id);
  };

  const fetchMyItems = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading items",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClaimsOnMyItems = async (userId: string) => {
    try {
      // First get claims for items owned by the user
      const { data: claimsData, error: claimsError } = await supabase
        .from("claims")
        .select(`
          *,
          items!inner(*)
        `)
        .eq("items.user_id", userId)
        .order("created_at", { ascending: false });

      if (claimsError) throw claimsError;

      // Then fetch claimant profiles for these claims
      if (claimsData && claimsData.length > 0) {
        const claimantIds = claimsData.map((c: any) => c.claimant_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", claimantIds);

        if (profilesError) throw profilesError;

        // Combine the data
        const claimsWithProfiles = claimsData.map((claim: any) => {
          const profile = profilesData?.find((p) => p.id === claim.claimant_id);
          return {
            ...claim,
            claimant: profile || { full_name: "Unknown", email: "N/A" },
          };
        });

        setClaims(claimsWithProfiles);
      } else {
        setClaims([]);
      }
    } catch (error: any) {
      toast({
        title: "Error loading claims",
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

  const findPotentialMatches = (claimedItem: any, userItems: Item[]) => {
    const oppositeType = claimedItem.type === "lost" ? "found" : "lost";
    
    const matches = userItems
      .filter(item => item.type === oppositeType && item.status === "active")
      .map(item => ({
        ...item,
        matchScore: calculateMatchScore(claimedItem, item)
      }))
      .filter(item => item.matchScore >= 40) // Only show matches with 40% or higher
      .sort((a, b) => b.matchScore - a.matchScore);

    return matches;
  };

  const handleClaimResponse = async (claimId: string, newStatus: "approved" | "rejected") => {
    try {
      const claim = claims.find(c => c.id === claimId);
      if (!claim) throw new Error("Claim not found");

      if (newStatus === "rejected") {
        // Just reject without matching
        const { error } = await supabase
          .from("claims")
          .update({ status: newStatus })
          .eq("id", claimId);

        if (error) throw error;

        toast({
          title: "Claim rejected",
          description: "You have rejected this claim.",
        });

        if (user) {
          fetchClaimsOnMyItems(user.id);
        }
        return;
      }

      // For approval, check for potential matches
      const claimedItem = claim.items;
      const matches = findPotentialMatches(claimedItem, items);

      if (matches.length > 0) {
        // Show match confirmation dialog
        setPendingApproval({ claimId, item: claimedItem });
        setPotentialMatches(matches);
        setMatchDialogOpen(true);
      } else {
        // No matches found, proceed with approval
        await approveClaimAndDelete(claimId, claimedItem.id, []);
      }
    } catch (error: any) {
      toast({
        title: "Error updating claim",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const approveClaimAndDelete = async (
    claimId: string,
    claimedItemId: string,
    matchedItemIds: string[]
  ) => {
    try {
      // Update claim status
      const { error: claimError } = await supabase
        .from("claims")
        .update({ status: "approved" })
        .eq("id", claimId);

      if (claimError) throw claimError;

      // Delete the claimed item
      await supabase.from("items").delete().eq("id", claimedItemId);

      // Delete matched items
      if (matchedItemIds.length > 0) {
        await supabase.from("items").delete().in("id", matchedItemIds);
      }

      const totalDeleted = matchedItemIds.length + 1;
      toast({
        title: "Claim approved!",
        description: `Removed ${totalDeleted} matched item${totalDeleted > 1 ? "s" : ""} from the system.`,
      });

      // Refresh data
      if (user) {
        fetchClaimsOnMyItems(user.id);
        fetchMyItems(user.id);
      }
    } catch (error: any) {
      toast({
        title: "Error processing approval",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleMatchConfirm = async (selectedMatchIds: string[]) => {
    if (!pendingApproval) return;

    await approveClaimAndDelete(
      pendingApproval.claimId,
      pendingApproval.item.id,
      selectedMatchIds
    );

    setMatchDialogOpen(false);
    setPendingApproval(null);
    setPotentialMatches([]);
  };

  const handleMatchCancel = async () => {
    if (!pendingApproval) return;

    // Approve without deleting matched items
    await approveClaimAndDelete(pendingApproval.claimId, pendingApproval.item.id, []);

    setMatchDialogOpen(false);
    setPendingApproval(null);
    setPotentialMatches([]);
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from("items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      toast({
        title: "Item deleted",
        description: "Your item has been removed.",
      });

      // Refresh items
      if (user) {
        fetchMyItems(user.id);
      }
    } catch (error: any) {
      toast({
        title: "Error deleting item",
        description: error.message,
        variant: "destructive",
      });
    }
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
        claimedItem={pendingApproval?.item}
        potentialMatches={potentialMatches}
        onConfirm={handleMatchConfirm}
        onCancel={handleMatchCancel}
      />

      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Items</h1>
          <p className="text-muted-foreground">Manage your posted items and received claims</p>
        </div>

        <Tabs defaultValue="items" className="space-y-6">
          <TabsList>
            <TabsTrigger value="items">
              My Posted Items ({items.length})
            </TabsTrigger>
            <TabsTrigger value="claims">
              Claims Received ({claims.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            {items.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">You haven't posted any items yet.</p>
                  <Button onClick={() => navigate("/post")}>Post an Item</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {item.image_url && (
                      <div className="h-48 overflow-hidden bg-muted">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-xl">{item.title}</CardTitle>
                        <Badge variant={item.type === "lost" ? "destructive" : "default"}>
                          {item.type}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {item.location}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatDate(item.date)}
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/item/${item.id}`)}
                          className="flex-1"
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="claims" className="space-y-4">
            {claims.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No claims received yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {claims.map((claim) => (
                  <Card key={claim.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">
                            Claim for: {claim.items.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            From: {claim.claimant.full_name} ({claim.claimant.email})
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
                    <CardContent className="space-y-4">
                      {claim.message && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">Claim Message:</p>
                          <p className="text-sm text-muted-foreground">{claim.message}</p>
                        </div>
                      )}
                      <div className="text-sm text-muted-foreground">
                        Claimed on: {formatDate(claim.created_at)}
                      </div>
                      {claim.status === "pending" && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleClaimResponse(claim.id, "approved")}
                            className="flex-1"
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleClaimResponse(claim.id, "rejected")}
                            className="flex-1"
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyItems;
