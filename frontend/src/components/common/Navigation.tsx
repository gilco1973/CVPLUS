import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '../Logo';
import { UserMenu } from '../UserMenu';
import { useAuth } from '../../contexts/AuthContext';
import { designSystem } from '../../config/designSystem';
import toast from 'react-hot-toast';

interface NavigationProps {
  variant?: 'default' | 'transparent' | 'solid';
  className?: string;
}

interface NavLink {
  href: string;
  label: string;
  external?: boolean;
}

const navLinks: NavLink[] = [
  { href: '/', label: 'Home' },
  { href: '/features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
];

export const Navigation: React.FC<NavigationProps> = ({
  variant = 'default',
  className = ''
}) => {
  const location = useLocation();
  const { user, signInWithGoogle } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Get variant-specific styling
  const getVariantClasses = () => {
    switch (variant) {
      case 'transparent':
        return {
          background: 'bg-transparent',
          border: 'border-transparent',
          backdrop: '',
        };
      case 'solid':
        return {
          background: 'bg-neutral-800',
          border: 'border-b border-neutral-700',
          backdrop: '',
        };
      default:
        return {
          background: designSystem.components.navigation.header.background,
          border: designSystem.components.navigation.header.border,
          backdrop: 'backdrop-blur-md',
        };
    }
  };

  const variantClasses = getVariantClasses();

  const isActiveRoute = (href: string): boolean => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      toast.success('Signed in successfully!');
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Failed to sign in');
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <header 
      className={`${
        designSystem.components.navigation.header.sticky
      } ${variantClasses.background} ${variantClasses.border} ${
        variantClasses.backdrop
      } ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <Logo 
              size="medium" 
              variant="white"
              className="transition-opacity hover:opacity-80"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8" aria-label="Main navigation">
            {navLinks.map((link) => {
              const isActive = isActiveRoute(link.href);
              
              return (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`${
                    designSystem.components.navigation.link.base
                  } ${
                    isActive 
                      ? designSystem.components.navigation.link.active
                      : designSystem.components.navigation.link.default
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
            
            {/* User Authentication */}
            {user ? (
              <UserMenu variant="white" size="default" />
            ) : (
              <button
                onClick={handleSignIn}
                className={`${
                  designSystem.components.button.base
                } ${
                  designSystem.components.button.variants.primary.default
                } ${
                  designSystem.components.button.sizes.md
                }`}
                aria-label="Sign in with Google"
              >
                Sign In
              </button>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-neutral-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-neutral-900"
            aria-expanded={isMobileMenuOpen}
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-neutral-300" />
            ) : (
              <Menu className="w-6 h-6 text-neutral-300" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
          
          {/* Mobile menu */}
          <div className="md:hidden fixed top-16 left-0 right-0 bg-neutral-800 border-b border-neutral-700 shadow-lg z-50">
            <nav className="px-4 py-4 space-y-2" aria-label="Mobile navigation">
              {navLinks.map((link) => {
                const isActive = isActiveRoute(link.href);
                
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={closeMobileMenu}
                    className={`${
                      designSystem.components.navigation.link.base
                    } ${
                      designSystem.components.navigation.link.mobile
                    } ${
                      isActive
                        ? 'text-primary-400 bg-primary-400/10'
                        : 'text-neutral-300 hover:text-primary-400 hover:bg-neutral-700'
                    } rounded-lg transition-colors`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                );
              })}
              
              {/* Mobile User Authentication */}
              <div className="pt-4 border-t border-neutral-700">
                {user ? (
                  <div className="px-4 py-2">
                    <UserMenu variant="white" size="default" />
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      handleSignIn();
                      closeMobileMenu();
                    }}
                    className={`w-full ${
                      designSystem.components.button.base
                    } ${
                      designSystem.components.button.variants.primary.default
                    } ${
                      designSystem.components.button.sizes.md
                    }`}
                  >
                    Sign In
                  </button>
                )}
              </div>
            </nav>
          </div>
        </>
      )}
    </header>
  );
};

// Export as default
export default Navigation;