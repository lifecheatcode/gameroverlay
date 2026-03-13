import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Monitor, 
  StopCircle, 
  Play, 
  Volume2, 
  VolumeX, 
  Send, 
  Trash2,
  Settings,
  X,
  Target,
  Zap,
  Brain,
  RefreshCw,
  ArrowLeft,
  Loader2,
  Camera
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ScrollArea } from "../components/ui/scroll-area";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const captureMethod = location.state?.captureMethod || "browser";

  // Screen capture state
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Session state
  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisInterval, setAnalysisInterval] = useState(null);

  // Tips and analysis state
  const [currentTips, setCurrentTips] = useState([]);
  const [currentStrategy, setCurrentStrategy] = useState("");
  const [gameDetected, setGameDetected] = useState("No game detected");
  const [confidence, setConfidence] = useState(0);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatScrollRef = useRef(null);

  // Voice/TTS state
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("nova");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef(null);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [analyzeFrequency, setAnalyzeFrequency] = useState(5); // seconds

  // Voices available - Dragon Ball Z Characters
  const voices = [
    { id: "alloy", name: "Goku", preview: "Alright! I'm Goku! Let's power up and win this game together! Kamehameha!" },
    { id: "onyx", name: "Vegeta", preview: "I am the prince of all Saiyans! Your gameplay is pathetic, but I'll make you a warrior!" },
    { id: "echo", name: "Piccolo", preview: "Hmph. Focus. Clear your mind. I'll guide you to victory with superior tactics." },
    { id: "shimmer", name: "Bulma", preview: "Hey there! I'm the genius Bulma! Let me analyze this game and give you the smartest strategy!" },
    { id: "fable", name: "Frieza", preview: "Oh my, how delighthat. I shall help you crush your opponents. No one escapes my wrath, oh ho ho ho!" },
    { id: "nova", name: "Lord Beerus", preview: "I am Beerus, God of Destruction. Entertain me with your gameplay, or face annihilation!" }
  ];

  // Start screen capture
  const startCapture = useCallback(async () => {
    try {
      if (captureMethod === "browser") {
        const mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: "always",
            displaySurface: "monitor"
          },
          audio: false
        });

        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setIsCapturing(true);
        toast.success("Screen capture started");

        // Handle stream end
        mediaStream.getVideoTracks()[0].onended = () => {
          stopCapture();
        };
      } else {
        // Desktop app would handle this differently
        toast.info("Desktop capture coming soon - using browser for now");
        const mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" },
          audio: false
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setIsCapturing(true);
      }
    } catch (err) {
      console.error("Capture error:", err);
      toast.error("Failed to start capture: " + err.message);
    }
  }, [captureMethod]);

  // Stop screen capture
  const stopCapture = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setIsCapturing(false);
    if (analysisInterval) {
      clearInterval(analysisInterval);
      setAnalysisInterval(null);
    }
    toast.info("Screen capture stopped");
  }, [stream, analysisInterval]);

  // Capture current frame as base64
  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    // Get base64 without the data URL prefix
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    return dataUrl.split(",")[1];
  }, []);

  // Analyze current frame
  const analyzeFrame = useCallback(async () => {
    if (!isCapturing) return;

    const imageBase64 = captureFrame();
    if (!imageBase64) return;

    setIsAnalyzing(true);
    try {
      const response = await axios.post(`${API}/analyze`, {
        image_base64: imageBase64,
        game_type: "general",
        context: ""
      });

      const { tips, strategy, game_detected, confidence: conf } = response.data;
      setCurrentTips(tips);
      setCurrentStrategy(strategy);
      setGameDetected(game_detected);
      setConfidence(conf);

      // Speak the first tip if voice is enabled
      if (voiceEnabled && tips.length > 0) {
        speakTip(tips[0]);
      }
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error("Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }, [isCapturing, captureFrame, voiceEnabled]);

  // Auto-analyze effect
  useEffect(() => {
    if (isCapturing && autoAnalyze) {
      const interval = setInterval(() => {
        analyzeFrame();
      }, analyzeFrequency * 1000);
      setAnalysisInterval(interval);
      return () => clearInterval(interval);
    }
  }, [isCapturing, autoAnalyze, analyzeFrequency, analyzeFrame]);

  // Speak a tip using TTS
  const speakTip = async (text) => {
    if (isSpeaking) return;
    setIsSpeaking(true);

    try {
      const response = await axios.post(
        `${API}/tts`,
        {
          text: text,
          voice: selectedVoice,
          speed: 1.1
        },
        { responseType: "blob" }
      );

      const audioUrl = URL.createObjectURL(response.data);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (err) {
      console.error("TTS error:", err);
    } finally {
      setIsSpeaking(false);
    }
  };

  // Send chat message
  const sendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsSending(true);

    try {
      // Include current frame if capturing
      const imageBase64 = isCapturing ? captureFrame() : null;

      const response = await axios.post(`${API}/chat`, {
        session_id: sessionId,
        message: userMessage,
        image_base64: imageBase64,
        game_context: gameDetected !== "No game detected" ? `Playing: ${gameDetected}` : ""
      });

      setMessages(prev => [...prev, { role: "assistant", content: response.data.response }]);

      // Speak response if voice enabled
      if (voiceEnabled) {
        speakTip(response.data.response);
      }
    } catch (err) {
      console.error("Chat error:", err);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // Clear chat
  const clearChat = async () => {
    try {
      await axios.delete(`${API}/chat/${sessionId}/clear`);
      setMessages([]);
      toast.success("Chat cleared");
    } catch (err) {
      console.error("Clear error:", err);
    }
  };

  // Scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="min-h-screen bg-void">
      {/* Hidden elements */}
      <canvas ref={canvasRef} className="hidden" />
      <audio ref={audioRef} onEnded={() => setIsSpeaking(false)} />

      {/* Header */}
      <header className="border-b border-border-default bg-surface">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              data-testid="back-btn"
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-primary" strokeWidth={1.5} />
              <span className="font-heading font-bold text-white uppercase tracking-wider">
                GAME INSIGHT HUD
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Status indicator */}
            <div className="flex items-center gap-2 px-3 py-1 bg-void border border-border-default">
              <div className={`w-2 h-2 ${isCapturing ? 'bg-success animate-pulse-glow' : 'bg-gray-600'}`} />
              <span className="font-mono text-xs text-gray-400 uppercase">
                {isCapturing ? "CAPTURING" : "STANDBY"}
              </span>
            </div>

            {/* Settings button */}
            <Button
              data-testid="settings-btn"
              variant="ghost"
              size="icon"
              onClick={() => setShowSettings(true)}
              className="text-gray-400 hover:text-cyan-primary"
            >
              <Settings className="w-5 h-5" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Screen Preview - Left Panel */}
          <div className="lg:col-span-8 space-y-4">
            {/* Video Preview */}
            <div className="relative bg-surface border border-border-default overflow-hidden aspect-video">
              {!isCapturing ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Monitor className="w-16 h-16 text-gray-600 mb-4" strokeWidth={1} />
                  <p className="font-body text-gray-500 mb-6">No screen capture active</p>
                  <Button
                    data-testid="start-capture-btn"
                    onClick={startCapture}
                    className="bg-cyan-primary text-black font-heading font-bold uppercase tracking-wider hover:bg-cyan-300 clip-angle px-6"
                  >
                    <Play className="w-4 h-4 mr-2" strokeWidth={2} />
                    Start Capture
                  </Button>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain bg-black"
                  />
                  {/* Overlay Controls */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 px-3 py-2 glass-panel">
                      <div className="w-2 h-2 bg-error animate-pulse" />
                      <span className="font-mono text-xs text-white">LIVE</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        data-testid="manual-analyze-btn"
                        variant="ghost"
                        size="sm"
                        onClick={analyzeFrame}
                        disabled={isAnalyzing}
                        className="glass-panel text-white hover:border-cyan-primary"
                      >
                        {isAnalyzing ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        )}
                        Analyze Now
                      </Button>
                      <Button
                        data-testid="stop-capture-btn"
                        variant="ghost"
                        size="sm"
                        onClick={stopCapture}
                        className="glass-panel text-error hover:border-error"
                      >
                        <StopCircle className="w-4 h-4 mr-2" strokeWidth={1.5} />
                        Stop
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Scanning overlay when analyzing */}
              {isAnalyzing && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-primary to-transparent scanning-line" />
                </div>
              )}
            </div>

            {/* AI Tips Panel */}
            <div className="bg-surface border border-border-default p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-cyan-primary" strokeWidth={1.5} />
                  <h2 className="font-heading font-bold text-white uppercase tracking-wide">
                    AI INSIGHTS
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-gray-500">
                    GAME: {gameDetected}
                  </span>
                  <span className="font-mono text-xs text-cyan-primary">
                    {(confidence * 100).toFixed(0)}% CONF
                  </span>
                </div>
              </div>

              {/* Tips List */}
              <div className="space-y-2 mb-4">
                {currentTips.length > 0 ? (
                  currentTips.map((tip, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-void border-l-2 border-cyan-primary"
                    >
                      <span className="font-mono text-xs text-cyan-primary">#{idx + 1}</span>
                      <p className="font-body text-sm text-gray-300">{tip}</p>
                      {voiceEnabled && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => speakTip(tip)}
                          className="ml-auto text-gray-500 hover:text-cyan-primary"
                        >
                          <Volume2 className="w-4 h-4" strokeWidth={1.5} />
                        </Button>
                      )}
                    </motion.div>
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <p className="font-body text-gray-500">
                      {isCapturing ? "Waiting for analysis..." : "Start capture to get tips"}
                    </p>
                  </div>
                )}
              </div>

              {/* Strategy */}
              {currentStrategy && (
                <div className="p-4 bg-void border border-violet-primary/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-violet-primary" strokeWidth={1.5} />
                    <span className="font-heading font-bold text-sm text-violet-primary uppercase">
                      Strategy
                    </span>
                  </div>
                  <p className="font-body text-sm text-gray-300">{currentStrategy}</p>
                </div>
              )}
            </div>
          </div>

          {/* Chat Panel - Right Side */}
          <div className="lg:col-span-4">
            <div className="bg-surface border border-border-default h-full flex flex-col" style={{ minHeight: "600px" }}>
              {/* Chat Header */}
              <div className="p-4 border-b border-border-default flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-primary animate-pulse-glow" />
                  <h2 className="font-heading font-bold text-white uppercase tracking-wide">
                    ASK AI
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    data-testid="toggle-voice-btn"
                    variant="ghost"
                    size="icon"
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    className={voiceEnabled ? "text-cyan-primary" : "text-gray-500"}
                  >
                    {voiceEnabled ? (
                      <Volume2 className="w-4 h-4" strokeWidth={1.5} />
                    ) : (
                      <VolumeX className="w-4 h-4" strokeWidth={1.5} />
                    )}
                  </Button>
                  <Button
                    data-testid="clear-chat-btn"
                    variant="ghost"
                    size="icon"
                    onClick={clearChat}
                    className="text-gray-500 hover:text-error"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>

              {/* Chat Messages */}
              <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
                <div className="space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <Brain className="w-10 h-10 text-gray-600 mx-auto mb-3" strokeWidth={1} />
                      <p className="font-body text-sm text-gray-500">
                        Ask me anything about your game!
                      </p>
                      <p className="font-mono text-xs text-gray-600 mt-2">
                        I can see your screen if capturing
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] p-3 ${
                            msg.role === "user"
                              ? "bg-cyan-primary/20 border border-cyan-primary/30"
                              : "bg-void border border-border-default"
                          }`}
                        >
                          <p className="font-body text-sm text-gray-200">{msg.content}</p>
                        </div>
                      </motion.div>
                    ))
                  )}
                  {isSending && (
                    <div className="flex justify-start">
                      <div className="p-3 bg-void border border-border-default">
                        <Loader2 className="w-4 h-4 text-cyan-primary animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Chat Input */}
              <div className="p-4 border-t border-border-default">
                <div className="flex gap-2">
                  <Input
                    data-testid="chat-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                    placeholder="Ask about your game..."
                    className="flex-1 bg-void border-border-default text-white placeholder:text-gray-600 focus:border-cyan-primary"
                  />
                  <Button
                    data-testid="send-chat-btn"
                    onClick={sendMessage}
                    disabled={isSending || !chatInput.trim()}
                    className="bg-cyan-primary text-black hover:bg-cyan-300"
                  >
                    <Send className="w-4 h-4" strokeWidth={2} />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface border border-border-default w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Settings Header */}
              <div className="p-4 border-b border-border-default flex items-center justify-between">
                <h2 className="font-heading font-bold text-white uppercase tracking-wide">
                  Settings
                </h2>
                <Button
                  data-testid="close-settings-btn"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSettings(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </Button>
              </div>

              {/* Settings Content */}
              <div className="p-4 space-y-6">
                {/* Auto Analyze */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-body font-semibold text-white">Auto Analyze</h3>
                    <p className="font-body text-xs text-gray-500">Automatically analyze screen</p>
                  </div>
                  <Switch
                    data-testid="auto-analyze-switch"
                    checked={autoAnalyze}
                    onCheckedChange={setAutoAnalyze}
                  />
                </div>

                {/* Analyze Frequency */}
                <div>
                  <h3 className="font-body font-semibold text-white mb-2">Analyze Frequency</h3>
                  <Select
                    value={analyzeFrequency.toString()}
                    onValueChange={(v) => setAnalyzeFrequency(parseInt(v))}
                  >
                    <SelectTrigger data-testid="frequency-select" className="bg-void border-border-default text-white">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">Every 3 seconds</SelectItem>
                      <SelectItem value="5">Every 5 seconds</SelectItem>
                      <SelectItem value="10">Every 10 seconds</SelectItem>
                      <SelectItem value="15">Every 15 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Voice Settings */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-body font-semibold text-white">Voice Tips</h3>
                    <p className="font-body text-xs text-gray-500">Read tips aloud</p>
                  </div>
                  <Switch
                    data-testid="voice-switch"
                    checked={voiceEnabled}
                    onCheckedChange={setVoiceEnabled}
                  />
                </div>

                {/* Voice Selection */}
                {voiceEnabled && (
                  <div>
                    <h3 className="font-body font-semibold text-white mb-2">Voice Character</h3>
                    <p className="font-body text-xs text-gray-500 mb-2">Click to hear each character</p>
                    <div className="grid grid-cols-2 gap-2">
                      {voices.map((v) => (
                        <button
                          key={v.id}
                          data-testid={`voice-option-${v.id}`}
                          onClick={async () => {
                            setSelectedVoice(v.id);
                            // Preview the voice with character line
                            try {
                              const response = await axios.post(
                                `${API}/tts`,
                                {
                                  text: v.preview,
                                  voice: v.id,
                                  speed: 1.0
                                },
                                { responseType: "blob" }
                              );
                              const audioUrl = URL.createObjectURL(response.data);
                              if (audioRef.current) {
                                audioRef.current.src = audioUrl;
                                audioRef.current.play();
                              }
                            } catch (err) {
                              console.error("Voice preview error:", err);
                            }
                          }}
                          className={`p-3 text-left transition-all duration-200 border ${
                            selectedVoice === v.id
                              ? 'bg-cyan-primary/20 border-cyan-primary text-white'
                              : 'bg-void border-border-default text-gray-400 hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Volume2 className={`w-4 h-4 ${selectedVoice === v.id ? 'text-cyan-primary' : 'text-gray-500'}`} strokeWidth={1.5} />
                            <span className="font-body text-sm font-semibold">{v.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Settings Footer */}
              <div className="p-4 border-t border-border-default">
                <Button
                  data-testid="save-settings-btn"
                  onClick={() => {
                    toast.success("Settings saved");
                    setShowSettings(false);
                  }}
                  className="w-full bg-cyan-primary text-black font-heading font-bold uppercase hover:bg-cyan-300"
                >
                  Save Settings
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
