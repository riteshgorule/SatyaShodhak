import { Shield, Brain, Users, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';
import NavBar from '../components/NavBar';
import { CanvasRevealEffect } from '../components/Hero';

export default function LandingPage({ onNavigate, isLoggedIn, onLogout }) {
  return (
    <div className="min-h-screen bg-black">
      <NavBar onNavigate={onNavigate} withAuthLinks={isLoggedIn} onLogout={onLogout} />

      {/* Hero Section with Dot Animation */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Dot Animation Background - Hero Only */}
        <div className="absolute inset-0 z-0">
          <CanvasRevealEffect
            colors={[[255, 255, 255], [255, 255, 255]]}
            dotSize={6}
            showGradient={true}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.9)_0%,transparent_100%)]" />
          <div className="absolute top-0 left-0 right-0 h-1/3 bg-gradient-to-b from-black to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center space-x-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-4 py-2 mb-8">
            <Brain className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm font-medium">Powered by Agentic AI</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Combat Misinformation
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
              With AI Intelligence
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto">
            TruthGuard AI uses advanced agentic AI systems to verify claims, detect misinformation,
            and empower communities with fact-checked information in real-time.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => onNavigate('verify')}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/20"
            >
              Verify a Claim
            </button>
            <button
              onClick={() => onNavigate('community')}
              className="bg-zinc-900 hover:bg-zinc-800 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all border border-zinc-800"
            >
              Explore Community
            </button>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Why TruthGuard AI?
            </h2>
            <p className="text-gray-400 text-lg">
              Advanced AI technology meets community wisdom
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-xl p-8 hover:border-cyan-500/50 transition-all">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-6">
                <Brain className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">AI-Powered Analysis</h3>
              <p className="text-gray-400">
                Our agentic AI systems analyze claims across multiple sources,
                providing comprehensive verification with confidence scores.
              </p>
            </div>

            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-xl p-8 hover:border-cyan-500/50 transition-all">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Community Verification</h3>
              <p className="text-gray-400">
                Join a global community of fact-checkers. Vote, discuss, and
                contribute to building a more truthful information ecosystem.
              </p>
            </div>

            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 rounded-xl p-8 hover:border-cyan-500/50 transition-all">
              <div className="w-12 h-12 bg-cyan-500/10 rounded-lg flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Real-Time Updates</h3>
              <p className="text-gray-400">
                Track trending claims, monitor verification status, and stay
                informed with instant notifications on breaking fact-checks.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-gray-400 text-lg">
              Simple, powerful, and transparent verification process
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-500/10 border-2 border-cyan-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-cyan-400">1</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Submit Claim</h3>
              <p className="text-gray-400 text-sm">
                Paste any claim or statement you want to verify
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-500/10 border-2 border-cyan-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-cyan-400">2</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI Analysis</h3>
              <p className="text-gray-400 text-sm">
                Our AI agents scan sources and analyze credibility
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-500/10 border-2 border-cyan-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-cyan-400">3</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Get Results</h3>
              <p className="text-gray-400 text-sm">
                Receive detailed verification with confidence scores
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-cyan-500/10 border-2 border-cyan-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-cyan-400">4</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Join Discussion</h3>
              <p className="text-gray-400 text-sm">
                Engage with community and share insights
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-zinc-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 mb-6">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm font-medium">Combat Misinformation</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Join the Fight Against Fake News
          </h2>

          <p className="text-gray-400 text-lg mb-8">
            Be part of a global movement dedicated to truth and transparency.
            Start verifying claims today and help build a more informed society.
          </p>

          <button
            onClick={() => onNavigate('signup')}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/20"
          >
            Get Started for Free
          </button>
        </div>
      </section>

      <footer className="border-t border-gray-800 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Shield className="w-6 h-6 text-cyan-400" />
              <span className="text-lg font-bold text-white">TruthGuard AI</span>
            </div>
            <p className="text-gray-400 text-sm">
              Powered by Agentic AI Technology
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
