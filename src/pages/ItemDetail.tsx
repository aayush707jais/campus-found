import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, Package, User, Phone, CheckCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

const ItemDetail = () => {
  const { id } = useParams();
  const [item, setItem] = useState<any>(null);
  const [itemOwner, setItemOwner] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [claimMessage, setClaimMessage] = useState("");
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [existingClaim, setExistingClaim] = useState<any>(null);
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
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchItemDetails();
    }
  }, [id, user]);

  const fetchItemDetails = async () => {
    setLoading(true);
    
    const { data: itemData, error: itemError } = await supabase
      .from("items")
      .select("*")
      .eq("id", id)
      .single();

    if (itemError) {
      toast({
        title: "Error fetching item",
        description: itemError.message,
        variant: "destructive",
      });
      navigate("/browse");
      return;
    }

    setItem(itemData);

    const { data: ownerData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", itemData.user_id)
      .single();

    setItemOwner(ownerData);

    const { data: claimData } = await supabase
      .from("claims")
      .select("*")
      .eq("item_id", id)
      .eq("claimant_id", user.id)
      .maybeSingle();

    setExistingClaim(claimData);
    setLoading(false);
  };

  const handleClaimSubmit = async () => {
    if (!claimMessage.trim()) {
      toast({
        title: "Message required",
        description: "Please provide details about why you're claiming this item",
        variant: "destructive",
      });
      return;
    }

    setSubmittingClaim(true);

    const { error } = await supabase.from("claims").insert({
      item_id: id,
      claimant_id: user.id,
      message: claimMessage,
    });

    setSubmittingClaim(false);

    if (error) {
      toast({
        title: "Error submitting claim",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Claim submitted!",
        description: "The item owner will be notified of your claim.",
      });
      fetchItemDetails();
    }
  };

  if (!user || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar user={user} />
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-96 bg-muted rounded-lg" />
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const isOwner = item.user_id === user.id;

  return (
    <div className="min-h-screen bg-background">
      <Navbar user={user} />
      
      <div className="container max-w-4xl py-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.title}
                className="w-full h-96 object-cover rounded-lg shadow-card"
              />
            ) : (
              <div className="w-full h-96 bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center">
                <Package className="h-24 w-24 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="text-3xl font-bold">{item.title}</h1>
                <Badge
                  variant={item.type === "lost" ? "destructive" : "default"}
                  className={`text-sm ${item.type === "found" ? "bg-accent" : ""}`}
                >
                  {item.type}
                </Badge>
              </div>
              <p className="text-muted-foreground text-lg mb-6">
                {item.description}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="h-5 w-5" />
                <span>{item.location}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Calendar className="h-5 w-5" />
                <span>{format(new Date(item.date), "MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm">
                  {item.category}
                </Badge>
              </div>
            </div>

            {itemOwner && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Posted by
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{itemOwner.full_name}</p>
                  {item.contact_info && (
                    <p className="text-sm text-muted-foreground mt-2">
                      <Phone className="inline h-4 w-4 mr-1" />
                      {item.contact_info}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {!isOwner && item.status === "active" && (
              <Card>
                <CardHeader>
                  <CardTitle>Claim This Item</CardTitle>
                  <CardDescription>
                    Explain why this item belongs to you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {existingClaim ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {existingClaim.status === "pending" && (
                          <>
                            <CheckCircle className="h-5 w-5 text-accent" />
                            <span className="font-medium">Claim submitted</span>
                          </>
                        )}
                        {existingClaim.status === "approved" && (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="font-medium text-green-500">Claim approved!</span>
                          </>
                        )}
                        {existingClaim.status === "rejected" && (
                          <>
                            <XCircle className="h-5 w-5 text-destructive" />
                            <span className="font-medium text-destructive">Claim rejected</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {existingClaim.message}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="claim-message">Your Message</Label>
                        <Textarea
                          id="claim-message"
                          placeholder="Describe identifying features, where you lost it, etc."
                          value={claimMessage}
                          onChange={(e) => setClaimMessage(e.target.value)}
                          rows={4}
                        />
                      </div>
                      <Button
                        onClick={handleClaimSubmit}
                        disabled={submittingClaim}
                        className="w-full"
                      >
                        {submittingClaim ? "Submitting..." : "Submit Claim"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetail;
