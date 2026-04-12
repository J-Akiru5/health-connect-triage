import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, User, X, Shield, ChevronDown, UserPlus, LogIn, AlertCircle, Info } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { SITE_BARANGAY } from "@/lib/site";
import { AppLogoMark } from "@/components/AppLogoMark";

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
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <AppLogoMark className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xl font-bold text-foreground leading-tight">TeleHealth</span>
              <span className="text-xs font-medium text-muted-foreground truncate">{SITE_BARANGAY}</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Home
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
                  {profile?.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="gap-2">
                        <Shield className="w-4 h-4" />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/consultations">Consultations</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    Get started
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/signup" className="gap-2 cursor-pointer">
                      <UserPlus className="w-4 h-4" />
                      Register
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/login" className="gap-2 cursor-pointer">
                      <LogIn className="w-4 h-4" />
                      Login
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/symptom-checker" className="gap-2 cursor-pointer">
                      <AlertCircle className="w-4 h-4" />
                      Emergency Quick Report (No Login)
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/about" className="gap-2 cursor-pointer">
                      <Info className="w-4 h-4" />
                      Info / About
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
                    {profile.role === "admin" && (
                      <Button variant="outline" className="justify-start gap-2" asChild>
                        <Link to="/admin"><Shield className="w-4 h-4" /> Admin</Link>
                      </Button>
                    )}
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
                    <Link to="/signup" className="text-base font-medium text-foreground px-2 py-2 hover:bg-muted rounded-lg flex items-center gap-2">
                      <UserPlus className="w-4 h-4" /> Register
                    </Link>
                    <Link to="/login" className="text-base font-medium text-foreground px-2 py-2 hover:bg-muted rounded-lg flex items-center gap-2">
                      <LogIn className="w-4 h-4" /> Login
                    </Link>
                    <Link to="/symptom-checker" className="text-base font-medium text-foreground px-2 py-2 hover:bg-muted rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" /> Emergency Quick Report (No Login)
                    </Link>
                    <Link to="/about" className="text-base font-medium text-foreground px-2 py-2 hover:bg-muted rounded-lg flex items-center gap-2">
                      <Info className="w-4 h-4" /> Info / About
                    </Link>
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
