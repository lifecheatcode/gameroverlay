import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Monitor, 
  Gamepad2, 
  Mic, 
  MessageSquare, 
  Zap, 
  Target,
  ArrowRight,
  Eye,
  Brain
} from "lucide-react";
import { Button } from "../components/ui/button";

const HERO_BG = "https://images.unsplash.com/photo-1643858988729-b4c855c09a37?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1Mjh8MHwxfHNlYXJjaHwxfHxjeWJlcnB1bmslMjBjaXR5JTIwbmlnaHQlMjBnYW1lciUyMHNldHVwfGVufDB8fHx8MTc3MzM0MzAzN3ww&ixlib=rb-4.1.0&q=85";

const LandingPage = () => {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState(null);

  const handleStart = () => {
    if (selectedMethod) {
      navigate("/dashboard", { state: { captureMethod: selectedMethod } });
    }
  };

  const features = [
    {
      icon: Eye,
      title: "REAL-TIME ANALYSIS",
      description: "AI watches your screen and provides instant strategic insights"
    },
    {
      icon: Brain,
      title: "GPT-5.2 VISION",
      description: "Powered by cutting-edge AI to understand any game"
    },
    {
      icon: Mic,
      title: "VOICE TIPS",
      description: "Hear strategic advice without looking away from the action"
    },
    {
      icon: MessageSquare,
      title: "CHAT Q&A",
      description: "Ask questions about your current game state anytime"
    }
  ];

  const captureOptions = [
    {
      id: "browser",
      icon: Monitor,
      title: "BROWSER CAPTURE",
      description: "Share your screen directly in the browser using WebRTC",
      details: "Works instantly in Chrome, Edge, Firefox"
    },
    {
      id: "desktop",
      icon: Gamepad2,
      title: "DESKTOP APP",
      description: "Native screen capture for minimal latency",
      details: "Download for Windows, macOS, Linux"
    }
  ];

  return (
    <div className="min-h-screen bg-void overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src={HERO_BG} 
            alt="Gaming Setup" 
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-void/80 via-void/60 to-void" />
        </div>

        {/* Scanning Line Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-primary to-transparent scanning-line opacity-30" />
        </div>

        {/* Hero Content */}
        <div className="relative z-20 max-w-6xl mx-auto px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border-default mb-8">
              <div className="w-2 h-2 bg-success animate-pulse-glow" />
              <span className="font-mono text-xs text-cyan-primary uppercase tracking-widest">
                AI-POWERED GAMING ASSISTANT
              </span>
            </div>

            {/* Main Title */}
            <h1 className="font-heading font-black text-5xl sm:text-6xl lg:text-7xl text-white uppercase tracking-tighter mb-6">
              GAME<span className="text-cyan-primary"> INSIGHT</span>
              <br />
              <span className="text-gray-500">HUD</span>
            </h1>

            {/* Subtitle */}
            <p className="font-body text-base sm:text-lg text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              Real-time AI analysis of your gameplay. Get strategic tips, voice guidance, 
              and instant answers to dominate any game.
            </p>

            {/* Stats Row */}
            <div className="flex justify-center gap-8 md:gap-16 mb-16">
              {[
                { value: "GPT-5.2", label: "AI Engine" },
                { value: "<1s", label: "Response" },
                { value: "ALL", label: "Game Types" }
              ].map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="font-mono text-2xl md:text-3xl text-cyan-primary font-bold">
                    {stat.value}
                  </div>
                  <div className="font-mono text-xs text-gray-500 uppercase tracking-widest mt-1">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Capture Method Selection */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="font-heading font-bold text-xl text-white uppercase tracking-wide mb-6">
              SELECT CAPTURE METHOD
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {captureOptions.map((option) => (
                <button
                  key={option.id}
                  data-testid={`capture-option-${option.id}`}
                  onClick={() => setSelectedMethod(option.id)}
                  className={`
                    relative p-6 text-left transition-all duration-300
                    bg-surface border ${selectedMethod === option.id 
                      ? 'border-cyan-primary glow-cyan' 
                      : 'border-border-default hover:border-gray-600'}
                  `}
                >
                  {/* Selection indicator */}
                  {selectedMethod === option.id && (
                    <div className="absolute top-4 right-4 w-3 h-3 bg-cyan-primary" />
                  )}
                  
                  <option.icon 
                    className={`w-8 h-8 mb-4 ${selectedMethod === option.id ? 'text-cyan-primary' : 'text-gray-500'}`} 
                    strokeWidth={1.5} 
                  />
                  <h3 className="font-heading font-bold text-lg text-white mb-2">
                    {option.title}
                  </h3>
                  <p className="font-body text-sm text-gray-400 mb-2">
                    {option.description}
                  </p>
                  <span className="font-mono text-xs text-gray-600">
                    {option.details}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Button
              data-testid="start-session-btn"
              onClick={handleStart}
              disabled={!selectedMethod}
              className={`
                px-8 py-6 text-lg font-heading font-bold uppercase tracking-wider
                clip-angle transition-all duration-300
                ${selectedMethod 
                  ? 'bg-cyan-primary text-black hover:bg-cyan-300 glow-cyan' 
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
              `}
            >
              <Zap className="w-5 h-5 mr-2" strokeWidth={2} />
              START SESSION
              <ArrowRight className="w-5 h-5 ml-2" strokeWidth={2} />
            </Button>
          </motion.div>
        </div>

        {/* Decorative corner elements */}
        <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-cyan-primary/20" />
        <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-cyan-primary/20" />
      </section>

      {/* Features Section */}
      <section className="relative py-20 bg-surface">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading font-bold text-3xl text-white uppercase tracking-tight mb-4">
              YOUR <span className="text-cyan-primary">UNFAIR ADVANTAGE</span>
            </h2>
            <p className="font-body text-gray-400 max-w-xl mx-auto">
              Advanced AI technology that gives you the edge in every game
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="p-6 bg-void border border-border-default hover:border-cyan-primary/50 transition-colors duration-300 group"
              >
                <feature.icon 
                  className="w-10 h-10 text-cyan-primary mb-4 group-hover:glow-cyan transition-all" 
                  strokeWidth={1.5} 
                />
                <h3 className="font-heading font-bold text-white uppercase tracking-wide mb-2">
                  {feature.title}
                </h3>
                <p className="font-body text-sm text-gray-400">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom cyber border */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-primary to-transparent" />
      </section>

      {/* Footer */}
      <footer className="py-8 bg-void border-t border-border-default">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Target className="w-5 h-5 text-cyan-primary" strokeWidth={1.5} />
            <span className="font-heading font-bold text-white uppercase tracking-wider">
              GAME INSIGHT HUD
            </span>
          </div>
          <p className="font-mono text-xs text-gray-600">
            POWERED BY GPT-5.2 VISION • ALL GAMES SUPPORTED
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
