import { Shield } from 'lucide-react';

export default function NavBar({ onNavigate, withAuthLinks, onLogout }) {
  return (
    <nav className="border-b border-zinc-800 bg-black/90 backdrop-blur-sm fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-2">
            <Shield className="w-8 h-8 text-cyan-400" />
            <span className="text-xl font-bold text-white">TruthGuard AI</span>
          </div>
          <div className="flex items-center space-x-4">
            {withAuthLinks ? (
              <>
                <button
                  onClick={() => onNavigate('landing')}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Home
                </button>
                <button
                  onClick={() => onNavigate('verify')}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Verify
                </button>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => onNavigate('community')}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Community
                </button>
                <button
                  onClick={() => {
                    onLogout();
                    onNavigate('landing');
                  }}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onNavigate('signin')}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onNavigate('signup')}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg transition-all transform hover:scale-105"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
