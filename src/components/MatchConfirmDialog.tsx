import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MapPin, Calendar, Package } from "lucide-react";

interface MatchedItem {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  type: "lost" | "found";
  date: string;
  image_url?: string;
  matchScore: number;
}

interface MatchConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimedItem: any;
  potentialMatches: MatchedItem[];
  onConfirm: (selectedMatchIds: string[]) => void;
  onCancel: () => void;
}

export function MatchConfirmDialog({
  open,
  onOpenChange,
  claimedItem,
  potentialMatches,
  onConfirm,
  onCancel,
}: MatchConfirmDialogProps) {
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);

  const handleToggleMatch = (itemId: string) => {
    setSelectedMatches((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleConfirm = () => {
    onConfirm(selectedMatches);
    setSelectedMatches([]);
  };

  const handleCancel = () => {
    setSelectedMatches([]);
    onCancel();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Potential Matches Found!</DialogTitle>
          <DialogDescription>
            We found items in your listings that might match this claim. Select any items you want to
            remove (because they're the same item).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="border-primary/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                {claimedItem?.image_url && (
                  <img
                    src={claimedItem.image_url}
                    alt={claimedItem.title}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{claimedItem?.title}</h3>
                    <Badge variant={claimedItem?.type === "lost" ? "destructive" : "default"}>
                      {claimedItem?.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{claimedItem?.description}</p>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {claimedItem?.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {claimedItem?.date && formatDate(claimedItem.date)}
                    </span>
                    <Badge variant="outline">{claimedItem?.category}</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <p className="text-sm font-medium">
              Your {claimedItem?.type === "lost" ? "found" : "lost"} items that might match:
            </p>
            {potentialMatches.map((match) => (
              <Card
                key={match.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleToggleMatch(match.id)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedMatches.includes(match.id)}
                      onCheckedChange={() => handleToggleMatch(match.id)}
                    />
                    {match.image_url && (
                      <img
                        src={match.image_url}
                        alt={match.title}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{match.title}</h4>
                        <Badge variant={match.type === "lost" ? "destructive" : "default"}>
                          {match.type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(match.matchScore)}% match
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {match.description}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {match.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(match.date)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {match.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Skip - Just Approve
          </Button>
          <Button onClick={handleConfirm}>
            Approve & Remove {selectedMatches.length > 0 ? `${selectedMatches.length + 1}` : "1"}{" "}
            Item{selectedMatches.length > 0 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
