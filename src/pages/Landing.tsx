import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Search, ShieldCheck, Zap, CheckCircle, Clock, BarChart2, ArrowRight, Sparkles, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";

const FeatureCard = ({ icon: Icon, title, description, delay }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow duration-300"
  >
    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 text-primary">
      <Icon className="w-6 h-6" />
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm">{description}</p>
  </motion.div>
);

const Landing = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">
            SatyaShodhak
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          <div className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-sm font-medium hover:text-primary transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium hover:text-primary transition-colors">
              How It Works
            </a>
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button onClick={() => navigate("/auth")} className="space-x-2">
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI-Powered Fact Checking
          </motion.div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Verify the truth behind any claim
          </h1>
          
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Get instant, reliable fact-checking powered by advanced AI and trusted sources.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="px-8 h-12 text-base font-medium"
              onClick={() => navigate("/auth")}
            >
              <Zap className="w-5 h-5 mr-2" />
              Start Fact-Checking
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="px-8 h-12 text-base font-medium"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Learn More
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">Powerful Fact-Checking Tools</h2>
            <p className="text-muted-foreground">
              Our platform combines AI with trusted sources to deliver accurate fact-checking in seconds.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Search}
              title="Instant Verification"
              description="Get real-time fact-checking results with detailed analysis and sources."
              delay={0.1}
            />
            <FeatureCard
              icon={BarChart2}
              title="Confidence Scoring"
              description="Understand the reliability of each verification with our confidence metrics."
              delay={0.2}
            />
            <FeatureCard
              icon={Clock}
              title="Historical Context"
              description="See how claims have evolved over time with our historical analysis."
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground">
              Our three-step process makes fact-checking simple and reliable.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                number: '01',
                title: 'Enter Your Claim',
                description: 'Paste or type the statement you want to verify.',
                icon: <Search className="w-6 h-6" />,
              },
              {
                number: '02',
                title: 'AI Analysis',
                description: 'Our system cross-references with trusted sources.',
                icon: <BarChart2 className="w-6 h-6" />,
              },
              {
                number: '03',
                title: 'Get Results',
                description: 'Receive a detailed report with sources and confidence score.',
                icon: <CheckCircle className="w-6 h-6" />,
              },
            ].map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-card p-8 rounded-xl border border-border shadow-sm"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-lg font-bold mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto bg-gradient-to-r from-primary to-cyan-600 p-0.5 rounded-2xl shadow-lg"
          >
            <div className="bg-background rounded-2xl p-8 md:p-12">
              <h2 className="text-3xl font-bold mb-4">Ready to verify the truth?</h2>
              <p className="text-muted-foreground mb-8">
                Join thousands of users who trust SatyaShodhak for accurate, unbiased fact-checking.
              </p>
              <Button 
                size="lg" 
                className="px-8 h-12 text-base font-medium"
                onClick={() => navigate("/auth")}
              >
                Get Started for Free
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-6 md:mb-0">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">SatyaShodhak</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} SatyaShodhak. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
