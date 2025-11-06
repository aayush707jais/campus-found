import { Button } from "@/components/ui/button";
import { Package, Search, PlusCircle, LogOut, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
interface NavbarProps {
  user?: any;
}
export const Navbar = ({
  user
}: NavbarProps) => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const handleSignOut = async () => {
    const {
      error
    } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive"
      });
    } else {
      navigate("/auth");
    }
  };
  return <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between py-0 my-0">
        <Link to="/" className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
          <Package className="h-6 w-6 text-primary" />
          <span className="text-foreground">
            Campus Found
          </span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/browse">
                  <Search className="mr-2 h-4 w-4" />
                  Browse
                </Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link to="/post">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Post Item
                </Link>
              </Button>
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/my-items")}>
                    My Items
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/my-claims")}>
                    My Claims
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </> : <>
              <ThemeToggle />
              <Button variant="default" size="sm" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            </>}
        </div>
      </div>
    </nav>;
};