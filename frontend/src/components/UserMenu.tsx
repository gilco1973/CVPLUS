import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

export const UserMenu: React.FC = () => {
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

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-gray-300 hover:text-cyan-400 transition font-medium"
      >
        <div className="w-8 h-8 bg-cyan-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
          {user.photoURL ? (
            <img src={user.photoURL} alt={displayName} className="w-8 h-8 rounded-full" />
          ) : (
            initials
          )}
        </div>
        <span className="text-sm font-medium hidden sm:block">{displayName}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg py-1 z-20 border border-gray-700">
            <div className="px-4 py-2 border-b border-gray-700">
              <p className="text-sm font-medium text-gray-100">{displayName}</p>
              {user.email && (
                <p className="text-xs text-gray-400">{user.email}</p>
              )}
            </div>
            <button
              onClick={async () => {
                await signOut();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
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