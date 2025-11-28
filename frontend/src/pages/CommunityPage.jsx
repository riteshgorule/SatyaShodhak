import { useState, useEffect } from 'react';
import { Shield,ThumbsUp, ThumbsDown, MessageCircle, Eye, TrendingUp, Filter } from 'lucide-react';
import NavBar from '../components/NavBar';

export default function CommunityPage({ onNavigate, isLoggedIn, onLogout }) {
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClaims();
  }, [filter]);

  const loadClaims = async () => {
    // Demo mode: no backend; clear list and stop loading
    setClaims([]);
    setLoading(false);
  };

  const loadComments = async (claimId) => {
    // Demo mode: comments loading disabled
    setComments([]);
  };

  const handleVote = (claimId, voteType) => {
    // Demo behavior: no real voting when auth is removed
  };

  const handleComment = async () => {
    // Demo behavior: commenting disabled without auth/backend
  };

  const openClaimDetail = (claim) => {
    setSelectedClaim(claim);
    loadComments(claim.id);
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

  return (
    <div className="min-h-screen bg-black">
      <NavBar onNavigate={onNavigate} withAuthLinks={true} onLogout={onLogout} />

      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Community</h1>
              <p className="text-gray-400">Explore and discuss verified claims</p>
            </div>
            <div className="flex items-center space-x-2 bg-zinc-900/60 border border-zinc-800 rounded-lg p-1">
              <Filter className="w-4 h-4 text-gray-400 ml-2" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-transparent text-white px-3 py-2 focus:outline-none cursor-pointer"
              >
                <option value="all">All Claims</option>
                <option value="verified">Verified</option>
                <option value="debunked">Debunked</option>
                <option value="partially_true">Partially True</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Total Claims</p>
                  <p className="text-3xl font-bold text-white">{claims.length}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-cyan-400" />
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Verified</p>
                  <p className="text-3xl font-bold text-green-400">
                    {claims.filter(c => c.verification_status === 'verified').length}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-green-400" />
              </div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">Debunked</p>
                  <p className="text-3xl font-bold text-red-400">
                    {claims.filter(c => c.verification_status === 'debunked').length}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-red-400" />
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 hover:border-cyan-500/30 transition-all cursor-pointer"
                onClick={() => openClaimDetail(claim)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-sm text-gray-400">@{claim.profiles.username}</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(claim.verification_status)}`}
                      >
                        {claim.verification_status.replace('_', ' ')}
                      </span>
                      {claim.ai_confidence_score && (
                        <span className="text-sm text-cyan-400">
                          {claim.ai_confidence_score}% confidence
                        </span>
                      )}
                    </div>
                    <p className="text-white text-lg leading-relaxed">{claim.content}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                  <div className="flex items-center space-x-6">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(claim.id, 'agree');
                      }}
                      className="flex items-center space-x-2 text-gray-400 hover:text-green-400 transition-colors"
                    >
                      <ThumbsUp className="w-5 h-5" />
                      <span>{claim.agree_count}</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(claim.id, 'disagree');
                      }}
                      className="flex items-center space-x-2 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <ThumbsDown className="w-5 h-5" />
                      <span>{claim.disagree_count}</span>
                    </button>

                    <div className="flex items-center space-x-2 text-gray-400">
                      <MessageCircle className="w-5 h-5" />
                      <span>{claim.comment_count}</span>
                    </div>

                    <div className="flex items-center space-x-2 text-gray-400">
                      <Eye className="w-5 h-5" />
                      <span>{claim.view_count}</span>
                    </div>
                  </div>

                  <span className="text-sm text-gray-500">
                    {new Date(claim.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedClaim && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-zinc-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 border-b border-zinc-800 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Claim Details</h2>
              <button
                onClick={() => setSelectedClaim(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <span className="text-sm text-gray-400">@{selectedClaim.profiles.username}</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedClaim.verification_status)}`}
                  >
                    {selectedClaim.verification_status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-white text-lg leading-relaxed mb-4">{selectedClaim.content}</p>
                {selectedClaim.ai_confidence_score && (
                  <div className="bg-zinc-900/60 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-2">AI Confidence Score</p>
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 bg-black/50 rounded-full h-2">
                        <div
                          className="bg-cyan-500 h-2 rounded-full"
                          style={{ width: `${selectedClaim.ai_confidence_score}%` }}
                        ></div>
                      </div>
                      <span className="text-cyan-400 font-semibold">
                        {selectedClaim.ai_confidence_score}%
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-800 pt-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5 text-cyan-400" />
                  <span>Comments ({comments.length})</span>
                </h3>

                {/* Comment box removed from demo mode (no auth) */}

                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-zinc-900/40 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-cyan-400">
                          @{comment.profiles.username}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-300">{comment.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
