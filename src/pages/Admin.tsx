import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Pencil, Trash2, CheckCircle, XCircle } from "lucide-react";

interface Item {
  id: string;
  title: string;
  category: string;
  type: string;
  status: "active" | "claimed" | "resolved";
  location: string;
  date: string;
  user_id: string;
  profiles?: { full_name: string; email: string } | null;
}

interface Claim {
  id: string;
  status: "pending" | "approved" | "rejected";
  message: string;
  created_at: string;
  claimant_id: string;
  item_id: string;
  items?: { title: string } | null;
  profiles?: { full_name: string; email: string } | null;
}

const Admin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Please log in to access this page");
        navigate("/auth");
        return;
      }

      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (error || !roles) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await fetchData();
    } catch (error) {
      console.error("Error checking admin access:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    await Promise.all([fetchItems(), fetchClaims()]);
  };

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("items")
      .select(`
        *,
        profiles!items_user_id_fkey (full_name, email)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch items");
      console.error(error);
    } else {
      setItems(data as any || []);
    }
  };

  const fetchClaims = async () => {
    const { data, error } = await supabase
      .from("claims")
      .select(`
        *,
        items!claims_item_id_fkey (title),
        profiles!claims_claimant_id_fkey (full_name, email)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch claims");
      console.error(error);
    } else {
      setClaims(data as any || []);
    }
  };

  const updateItemStatus = async (itemId: string, newStatus: "active" | "claimed" | "resolved") => {
    const { error } = await supabase
      .from("items")
      .update({ status: newStatus })
      .eq("id", itemId);

    if (error) {
      toast.error("Failed to update item status");
    } else {
      toast.success("Item status updated");
      fetchItems();
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    const { error } = await supabase
      .from("items")
      .delete()
      .eq("id", itemId);

    if (error) {
      toast.error("Failed to delete item");
    } else {
      toast.success("Item deleted");
      fetchItems();
    }
  };

  const updateClaimStatus = async (claimId: string, newStatus: "pending" | "approved" | "rejected") => {
    const { error } = await supabase
      .from("claims")
      .update({ status: newStatus })
      .eq("id", claimId);

    if (error) {
      toast.error("Failed to update claim status");
    } else {
      toast.success("Claim status updated");
      fetchClaims();
    }
  };

  const deleteClaim = async (claimId: string) => {
    if (!confirm("Are you sure you want to delete this claim?")) return;

    const { error } = await supabase
      .from("claims")
      .delete()
      .eq("id", claimId);

    if (error) {
      toast.error("Failed to delete claim");
    } else {
      toast.success("Claim deleted");
      fetchClaims();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-80px)]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-3xl">Admin Dashboard</CardTitle>
            <CardDescription>
              Manage all items, claims, and users in the system
            </CardDescription>
          </CardHeader>
        </Card>

        <Tabs defaultValue="items" className="space-y-4">
          <TabsList>
            <TabsTrigger value="items">Items ({items.length})</TabsTrigger>
            <TabsTrigger value="claims">Claims ({claims.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <Card>
              <CardHeader>
                <CardTitle>All Items</CardTitle>
                <CardDescription>View and manage all posted items</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Posted By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>
                          <Badge variant={item.type === "lost" ? "destructive" : "default"}>
                            {item.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={item.status === "active" ? "default" : "secondary"}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{item.location}</TableCell>
                        <TableCell>
                          {item.profiles?.full_name || "Unknown"}<br />
                          <span className="text-xs text-muted-foreground">
                            {item.profiles?.email}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/item/${item.id}`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {item.status === "active" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateItemStatus(item.id, "resolved")}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateItemStatus(item.id, "active")}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="claims">
            <Card>
              <CardHeader>
                <CardTitle>All Claims</CardTitle>
                <CardDescription>Review and manage all claims</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Claimant</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {claims.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">
                          {claim.items?.title || "Unknown Item"}
                        </TableCell>
                        <TableCell>
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
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {claim.message || "No message"}
                        </TableCell>
                        <TableCell>
                          {claim.profiles?.full_name || "Unknown"}<br />
                          <span className="text-xs text-muted-foreground">
                            {claim.profiles?.email}
                          </span>
                        </TableCell>
                        <TableCell>
                          {new Date(claim.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {claim.status !== "approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateClaimStatus(claim.id, "approved")}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {claim.status !== "rejected" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateClaimStatus(claim.id, "rejected")}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteClaim(claim.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;