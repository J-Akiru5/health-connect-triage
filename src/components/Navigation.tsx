import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, LogOut, Menu, User, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">BarangayHealth</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/symptom-checker" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Check Symptoms
            </Link>
            <Link to="/consultations" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Consultations
            </Link>
            <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <Link to="/faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              FAQ
            </Link>
          </div>

          {/* Desktop CTA / User menu */}
          <div className="hidden md:flex items-center gap-3">
            {session && profile ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <User className="w-4 h-4" />
                    <span className="max-w-[120px] truncate">{profile.full_name ?? profile.role}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/consultations">Consultations</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/signup">Sign up</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border animate-slide-up">
            <div className="flex flex-col gap-4">
              <Link to="/" className="text-base font-medium text-foreground px-2 py-2 hover:bg-muted rounded-lg">
                Home
              </Link>
              <Link to="/symptom-checker" className="text-base font-medium text-foreground px-2 py-2 hover:bg-muted rounded-lg">
                Check Symptoms
              </Link>
              <Link to="/consultations" className="text-base font-medium text-foreground px-2 py-2 hover:bg-muted rounded-lg">
                Consultations
              </Link>
              <Link to="/about" className="text-base font-medium text-foreground px-2 py-2 hover:bg-muted rounded-lg">
                About
              </Link>
              <Link to="/faq" className="text-base font-medium text-foreground px-2 py-2 hover:bg-muted rounded-lg">
                FAQ
              </Link>
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                {session && profile ? (
                  <>
                    <Button variant="outline" className="justify-start" asChild>
                      <Link to="/profile">Profile</Link>
                    </Button>
                    <Button variant="outline" className="justify-start" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" className="justify-start" asChild>
                      <Link to="/login">Log in</Link>
                    </Button>
                    <Button variant="default" asChild>
                      <Link to="/signup">Sign up</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
