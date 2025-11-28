import { useState } from 'react';
import { Shield, Activity, TrendingUp, Award, CheckCircle, XCircle, Clock } from 'lucide-react';
import NavBar from '../components/NavBar';

export default function DashboardPage({ onNavigate, isLoggedIn, onLogout }) {
  const [stats, setStats] = useState({
    totalClaims: 0,
    verifiedClaims: 0,
    debunkedClaims: 0,
    pendingClaims: 0,
    reputationScore: 0,
    totalVotes: 0,
    totalComments: 0,
  });
  const [userClaims, setUserClaims] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading] = useState(false);

  const handleSignOut = () => {
    // Demo behavior: just go back to landing without real sign-out
    onNavigate('landing');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'bg-green-500/10 text-green-400 border-green-500/30';
      case 'debunked': return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'partially_true': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
      case 'unverifiable': return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
      default: return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-5 h-5" />;
      case 'debunked': return <XCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const getActivityDescription = (activity) => {
    switch (activity.activity_type) {
      case 'claim_submitted':
        return 'Submitted a new claim for verification';
      case 'vote_cast':
        return 'Voted on a claim';
      case 'comment_posted':
        return 'Posted a comment';
      default:
        return activity.activity_type;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <NavBar onNavigate={onNavigate} withAuthLinks={true} onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Track your verification activities and contributions</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-8">

            {/* Stats Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Claims */}
              <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                    <Activity className="w-6 h-6 text-cyan-400" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-gray-400 text-sm mb-1">Total Claims</p>
                <p className="text-3xl font-bold text-white">{stats.totalClaims}</p>
              </div>

              {/* Verified */}
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-green-400" />
                </div>
                <p className="text-gray-400 text-sm mb-1">Verified</p>
                <p className="text-3xl font-bold text-white">{stats.verifiedClaims}</p>
              </div>

              {/* Debunked */}
              <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-gray-400 text-sm mb-1">Debunked</p>
                <p className="text-3xl font-bold text-white">{stats.debunkedClaims}</p>
              </div>

              {/* Reputation */}
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Award className="w-6 h-6 text-purple-400" />
                  </div>
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-gray-400 text-sm mb-1">Reputation Score</p>
                <p className="text-3xl font-bold text-white">{stats.reputationScore}</p>
              </div>
            </div>

            {/* Small Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <p className="text-gray-400 text-sm">Pending Claims</p>
                </div>
                <p className="text-2xl font-bold text-white">{stats.pendingClaims}</p>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <p className="text-gray-400 text-sm">Total Votes</p>
                </div>
                <p className="text-2xl font-bold text-white">{stats.totalVotes}</p>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <p className="text-gray-400 text-sm">Total Comments</p>
                </div>
                <p className="text-2xl font-bold text-white">{stats.totalComments}</p>
              </div>
            </div>

            {/* Claims + Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Claims */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-cyan-400" />
                  <span>Your Claims</span>
                </h2>

                <div className="space-y-4">
                  {userClaims.slice(0, 5).map((claim) => (
                    <div
                      key={claim.id}
                      className="bg-black/50 rounded-lg p-4 border border-zinc-800 hover:border-cyan-500/30 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center space-x-1 ${getStatusColor(claim.verification_status)}`}
                        >
                          {getStatusIcon(claim.verification_status)}
                          <span className="ml-1">{claim.verification_status}</span>
                        </span>

                        {claim.ai_confidence_score && (
                          <span className="text-sm text-cyan-400">
                            {claim.ai_confidence_score}%
                          </span>
                        )}
                      </div>

                      <p className="text-gray-300 text-sm line-clamp-2 mb-2">{claim.content}</p>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{new Date(claim.created_at).toLocaleDateString()}</span>
                        <span>{claim.view_count} views</span>
                      </div>
                    </div>
                  ))}

                  {userClaims.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-400 mb-4">No claims submitted yet</p>
                      <button
                        onClick={() => onNavigate('verify')}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-2 rounded-lg font-semibold transition-all"
                      >
                        Submit Your First Claim
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  <span>Recent Activity</span>
                </h2>

                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-3 pb-4 border-b border-zinc-800 last:border-0"
                    >
                      <div className="w-8 h-8 bg-cyan-500/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <Activity className="w-4 h-4 text-cyan-400" />
                      </div>

                      <div className="flex-1">
                        <p className="text-gray-300 text-sm mb-1">
                          {getActivityDescription(activity)}
                        </p>

                        {activity.claims && (
                          <p className="text-gray-500 text-xs line-clamp-1">
                            {activity.claims.content}
                          </p>
                        )}

                        <p className="text-gray-500 text-xs mt-1">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}

                  {recentActivities.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-gray-400">No recent activity</p>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
