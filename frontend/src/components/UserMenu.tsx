import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

interface UserMenuProps {
  variant?: 'default' | 'white' | 'dark';
  size?: 'default' | 'small';
}

export const UserMenu: React.FC<UserMenuProps> = ({ variant = 'default', size = 'default' }) => {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = React.useState(false);

  if (!user) return null;

  const displayName = user.displayName || user.email || 'Anonymous User';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getTextClasses = () => {
    switch (variant) {
      case 'white':
        return 'text-white hover:text-blue-200';
      case 'dark':
        return 'text-gray-700 hover:text-blue-600';
      default:
        return 'text-gray-600 hover:text-blue-600';
    }
  };

  const getDropdownClasses = () => {
    switch (variant) {
      case 'white':
      case 'default':
        return 'bg-white border-gray-200 text-gray-900';
      case 'dark':
        return 'bg-gray-800 border-gray-700 text-gray-100';
      default:
        return 'bg-white border-gray-200 text-gray-900';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 transition font-medium ${getTextClasses()}`}
      >
        <div className={`bg-blue-600 text-white rounded-full flex items-center justify-center font-medium ${
          size === 'small' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'
        }`}>
          {user.photoURL ? (
            <img 
              src={user.photoURL} 
              alt={displayName} 
              className={size === 'small' ? 'w-6 h-6 rounded-full' : 'w-8 h-8 rounded-full'} 
            />
          ) : (
            initials
          )}
        </div>
        {size !== 'small' && (
          <span className="text-sm font-medium hidden sm:block">{displayName}</span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-1 z-20 border ${getDropdownClasses()}`}>
            <div className={`px-4 py-2 border-b ${variant === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <p className={`text-sm font-medium ${variant === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>{displayName}</p>
              {user.email && (
                <p className={`text-xs ${variant === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{user.email}</p>
              )}
            </div>
            <button
              onClick={async () => {
                await signOut();
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors ${
                variant === 'dark' 
                  ? 'text-gray-300 hover:bg-gray-700' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
};