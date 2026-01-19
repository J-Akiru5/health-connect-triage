import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

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
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm">
              Log In
            </Button>
            <Button variant="default" size="sm">
              Get Started
            </Button>
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
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <Button variant="ghost" className="justify-start">
                  Log In
                </Button>
                <Button variant="default">
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
