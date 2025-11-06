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

  const handleClaimResponse = async (claimId: string, newStatus: "approved" | "rejected") => {
    try {
      // Get the claim details to find the item
      const claim = claims.find(c => c.id === claimId);
      if (!claim) throw new Error("Claim not found");

      const { error } = await supabase
        .from("claims")
        .update({ status: newStatus })
        .eq("id", claimId);

      if (error) throw error;

      // If approved, match and delete items
      if (newStatus === "approved") {
        const claimedItem = claim.items;
        const oppositeType = claimedItem.type === "lost" ? "found" : "lost";

        // Find matching items (opposite type, same category, similar location)
        const { data: matchingItems } = await supabase
          .from("items")
          .select("*")
          .eq("type", oppositeType)
          .eq("category", claimedItem.category)
          .eq("status", "active")
          .ilike("location", `%${claimedItem.location.split(",")[0].trim()}%`);

        // Delete the claimed item
        await supabase
          .from("items")
          .delete()
          .eq("id", claimedItem.id);

        // Delete matching items
        if (matchingItems && matchingItems.length > 0) {
          const matchingIds = matchingItems.map(item => item.id);
          await supabase
            .from("items")
            .delete()
            .in("id", matchingIds);

          toast({
            title: "Items matched and removed",
            description: `Removed ${matchingItems.length + 1} matched items from the system.`,
          });
        } else {
          toast({
            title: "Claim approved",
            description: "The claimed item has been removed.",
          });
        }
      } else {
        toast({
          title: `Claim ${newStatus}`,
          description: `You have ${newStatus} this claim.`,
        });
      }

      // Refresh data
      if (user) {
        fetchClaimsOnMyItems(user.id);
        fetchMyItems(user.id);
      }
    } catch (error: any) {
      toast({
        title: "Error updating claim",
        description: error.message,
        variant: "destructive",
      });
    }
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
