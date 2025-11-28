import { useState } from 'react';
import { Brain, Loader2, CheckCircle, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import NavBar from '../components/NavBar';

export default function VerifyPage({ onNavigate, isLoggedIn, onLogout }) {
  const [claim, setClaim] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'debunked': return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'partially_true': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'unverifiable': return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
      default: return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified': return <CheckCircle className="w-5 h-5" />;
      case 'debunked': return <XCircle className="w-5 h-5" />;
      case 'partially_true': return <AlertTriangle className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  const analyzeClaim = async () => {
    if (!claim.trim()) return;

    setAnalyzing(true);

    await new Promise(resolve => setTimeout(resolve, 2500));

    const mockResult = {
      status: Math.random() > 0.5 ? 'verified' : 'debunked',
      confidence: Math.floor(Math.random() * 30) + 70,
      summary: 'Based on analysis from multiple credible sources, the AI system has evaluated this claim using cross-reference verification, fact-checking databases, and contextual analysis.',
      sources: [
        'https://reuters.com/fact-check',
        'https://apnews.com/hub/fact-checking',
        'https://snopes.com'
      ],
      keyPoints: [
        'Cross-referenced with 15 credible news sources',
        'Verified against historical data and scientific consensus',
        'No contradictory evidence found in peer-reviewed publications',
        'Context and original source examined for accuracy'
      ]
    };

    setResult(mockResult);

    setAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-black">
      <NavBar onNavigate={onNavigate} withAuthLinks={true} onLogout={onLogout} />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-2 mb-6">
            <Brain className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-medium">AI-Powered Verification</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Verify a Claim
          </h1>
          <p className="text-gray-400 text-lg">
            Submit any claim and let our AI agents analyze its credibility
          </p>
        </div>

        <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-xl p-8 mb-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Claim or Statement
              </label>
              <textarea
                value={claim}
                onChange={(e) => setClaim(e.target.value)}
                placeholder="Enter the claim you want to verify..."
                className="w-full bg-black/50 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none h-32"
                disabled={analyzing}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Source URL (Optional)
              </label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://example.com/article"
                className="w-full bg-black/50 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                disabled={analyzing}
              />
            </div>

            <button
              onClick={analyzeClaim}
              disabled={!claim.trim() || analyzing}
              className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-6 py-4 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing Claim...</span>
                </>
              ) : (
                <>
                  <Brain className="w-5 h-5" />
                  <span>Analyze with AI</span>
                </>
              )}
            </button>
          </div>
        </div>

        {analyzing && (
          <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-xl p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
                <Brain className="w-6 h-6 text-cyan-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <p className="text-white font-semibold mb-2">AI Agents at Work</p>
                <p className="text-gray-400 text-sm">
                  Scanning sources and analyzing credibility...
                </p>
              </div>
            </div>
          </div>
        )}

        {result && !analyzing && (
          <div className="space-y-6">
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-xl p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg border ${getStatusColor(result.status)}`}>
                    {getStatusIcon(result.status)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white capitalize">
                      {result.status.replace('_', ' ')}
                    </h3>
                    <p className="text-gray-400 text-sm">
                      Confidence Score: {result.confidence}%
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-cyan-400">{result.confidence}%</div>
                  <div className="text-xs text-gray-500">Confidence</div>
                </div>
              </div>

              <div className="w-full bg-black/50 rounded-full h-2 mb-6">
                <div
                  className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${result.confidence}%` }}
                ></div>
              </div>

              <p className="text-gray-300 leading-relaxed">
                {result.summary}
              </p>
            </div>

            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-xl p-8">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-cyan-400" />
                <span>Key Analysis Points</span>
              </h3>
              <ul className="space-y-3">
                {result.keyPoints.map((point, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full mt-2"></div>
                    <span className="text-gray-300">{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-xl p-8">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                <ExternalLink className="w-5 h-5 text-cyan-400" />
                <span>Verified Sources</span>
              </h3>
              <div className="space-y-2">
                {result.sources.map((source, index) => (
                  <a
                    key={index}
                    href={source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
                  >
                    {source}
                  </a>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setClaim('');
                  setSourceUrl('');
                  setResult(null);
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                Verify Another Claim
              </button>
              <button
                onClick={() => onNavigate('community')}
                className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                View in Community
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
