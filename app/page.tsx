'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Plus, Trash2, Wand2, Play, Download, RefreshCw, ChevronRight, ChevronLeft, Image as ImageIcon, X, AlertCircle, Shield, LogIn, LogOut } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { scaffold } from '@/lib/scaffold/client';
import BugReportTrigger from '@/lib/scaffold/components/BugReport';
import { useAuth } from './FirebaseProvider';

// --- Types ---
type GenerationStatus = 'pending' | 'loading' | 'success' | 'error';

interface Result {
  id: string;
  prompt: string;
  url?: string;
  error?: string;
  status: GenerationStatus;
}

// --- Components ---

export default function CharacterGenerator() {
  const [step, setStep] = useState(1);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [goal, setGoal] = useState('');
  const [prompts, setPrompts] = useState<string[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState('Standard');
  const [refiningResult, setRefiningResult] = useState<Result | null>(null);
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [flags, setFlags] = useState<{ [key: string]: boolean }>({});
  const [appName, setAppName] = useState('KineticID');

  const [maxBatchSize, setMaxBatchSize] = useState(10);

  const { user, loading: authLoading, isAdmin, signIn, logout } = useAuth();

  // Load flags and settings
  useEffect(() => {
    const loadScaffold = async () => {
      try {
        const res = await fetch('/api/scaffold/public/config');
        if (res.ok) {
          const data = await res.json();
          const flagMap = data.flags.reduce((acc: any, f: any) => ({ ...acc, [f.key]: f.enabled }), {});
          setFlags(flagMap);
          
          const nameSetting = data.settings.find((s: any) => s.key === 'APP_NAME');
          if (nameSetting) setAppName(nameSetting.value);

          const batchSetting = data.settings.find((s: any) => s.key === 'MAX_BATCH_SIZE');
          if (batchSetting) setMaxBatchSize(Number(batchSetting.value));
        }
      } catch (err) {
        console.warn('Scaffold load failed, using defaults');
      }
    };
    loadScaffold();
  }, []);

  // Log navigation
  useEffect(() => {
    scaffold.log(`Navigated to Step ${step}`, 'NAVIGATION', 'info', { step });
  }, [step]);

  const STYLES = [
    { name: 'Standard', desc: 'Preserves the original reference style' },
    { name: 'Cinematic', desc: 'Hyper-realistic, dramatic lighting, 8k photography' },
    { name: 'Anime', desc: 'Vibrant cel-shaded aesthetic, high detail' },
    { name: 'Cyberpunk', desc: 'Neon glows, dystopian tech-wear, high contrast' },
    { name: 'Oil Painting', desc: 'Classic brushwork and textured canvas' },
    { name: 'Pixel Art', desc: 'Retro digital sprite aesthetic' },
    { name: 'Sketched', desc: 'Rough pencil draft and cross-hatching' },
  ];
  
  // Use a ref to avoid stale results in recursive/async triggers if needed, 
  // but for batching we can rely on the triggerGenerations closure at the start of Step 4.
  const triggerInProgress = useRef(false);

  // --- Handlers ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRefImage(reader.result as string);
        setStep(2);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setRefImage(reader.result as string);
            setStep(2);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }, []);

  const generateAIPrompts = async () => {
    if (!refImage) return;
    setIsGeneratingPrompts(true);
    try {
      scaffold.log('Generating AI Prompts', 'FORM_SUBMIT', 'info', { goal, maxBatchSize });
      const response = await fetch('/api/prompts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: refImage, goal, limit: maxBatchSize }),
      });
      const data = await response.json();
      if (data.prompts) {
        setPrompts(data.prompts.slice(0, maxBatchSize));
        setStep(3);
      }
    } catch (error) {
      scaffold.log('Failed to generate prompts', 'ERROR', 'error', { error });
      console.error('Failed to generate prompts:', error);
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const startBatchGeneration = () => {
    const initialResults: Result[] = prompts.map((p) => ({
      id: Math.random().toString(36).substr(2, 9),
      prompt: p,
      status: 'pending',
    }));
    setResults(initialResults);
    setStep(4);
    scaffold.log('Started Batch Generation', 'BATCH_START', 'info', { count: prompts.length });
    triggerInProgress.current = false; // Reset for new batch
  };

  // Improved generation trigger
  const triggerGenerations = useCallback(async (itemsToGenerate: Result[], options: { upscale?: boolean, refinement?: string } = {}) => {
    if (itemsToGenerate.length === 0) return;
    
    await Promise.all(itemsToGenerate.map(async (item) => {
      try {
        setResults((prev) => prev.map(r => r.id === item.id ? { ...r, status: 'loading' } : r));
        
        const response = await fetch('/api/images/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt: item.prompt, 
            referenceImage: refImage, 
            style: selectedStyle === 'Standard' ? '' : selectedStyle,
            ...options
          }),
        });
        
        const data = await response.json();
        
        if (data.imageUrl) {
          setResults((prev) => prev.map(r => r.id === item.id ? { ...r, status: 'success', url: data.imageUrl } : r));
        } else {
          throw new Error(data.error || 'Generation failed');
        }
      } catch (error: any) {
        setResults((prev) => prev.map(r => r.id === item.id ? { ...r, status: 'error', error: error.message } : r));
      }
    }));
  }, [refImage, selectedStyle]);

  const handleRefine = async () => {
    if (!refiningResult || !refinementPrompt) return;
    setIsRefining(true);
    await triggerGenerations([refiningResult], { refinement: refinementPrompt });
    setRefiningResult(null);
    setRefinementPrompt('');
    setIsRefining(false);
  };

  const handleUpscale = async (res: Result) => {
    await triggerGenerations([res], { upscale: true });
  };

  useEffect(() => {
    if (step === 4 && results.length > 0 && !triggerInProgress.current) {
        const pending = results.filter(r => r.status === 'pending');
        if (pending.length > 0) {
            triggerInProgress.current = true;
            triggerGenerations(pending);
        }
    }
  }, [step, results, triggerGenerations]);

  const addPrompt = () => {
    if (prompts.length >= maxBatchSize) {
      scaffold.log('Denied adding prompt - Max limit reached', 'UI_FEEDBACK', 'warn', { currentSize: prompts.length, maxBatchSize });
      return;
    }
    setPrompts([...prompts, ""]);
  };
  const removePrompt = (index: number) => setPrompts(prompts.filter((_, i) => i !== index));
  const updatePrompt = (index: number, val: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = val;
    setPrompts(newPrompts);
  };

  const reset = () => {
    setStep(1);
    setRefImage(null);
    setPrompts([]);
    setResults([]);
    setGoal('');
    triggerInProgress.current = false;
  };

  // --- Render Helpers ---

  return (
    <div className="min-h-screen flex flex-col bg-[#050506] text-slate-100 font-sans selection:bg-purple-500/30 relative overflow-x-hidden" onPaste={handlePaste}>
      {/* Decorative Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

      {/* Header */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-black/40 backdrop-blur-md shrink-0 z-50 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <ImageIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight font-display uppercase">{appName.slice(0, -2)}<span className="text-purple-400">{appName.slice(-2)}</span></h1>
        </div>
        
        <div className="flex items-center gap-6">
          {authLoading ? (
            <div className="w-5 h-5 border-2 border-white/10 border-t-purple-500 rounded-full animate-spin"></div>
          ) : user ? (
            <div className="flex items-center gap-4">
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg text-[10px] font-bold text-purple-400 hover:bg-purple-500/20 transition-all"
                  id="adminDashboardBtn"
                >
                  <Shield className="w-3.5 h-3.5" />
                  ADMIN
                </Link>
              )}
              <div className="flex items-center gap-3">
                {user.photoURL && (
                  <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden relative">
                    <Image src={user.photoURL} alt="User" fill className="object-cover" referrerPolicy="no-referrer" />
                  </div>
                )}
                <button 
                  onClick={logout} 
                  className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all" 
                  title="Logout"
                  id="logoutBtn"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={signIn} 
              className="flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-white hover:bg-white/10 transition-all font-display"
              id="loginBtn"
            >
              <LogIn className="w-3.5 h-3.5" />
              SIGN IN
            </button>
          )}

          <nav className="hidden md:flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
            <button className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${step === 1 ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500'}`}>1. SOURCE</button>
            <button className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${step === 2 ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500'}`}>2. STRATEGY</button>
            <button className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${step === 3 ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500'}`}>3. CHAIN</button>
            <button className={`px-4 py-1.5 text-[10px] font-bold rounded-md transition-all ${step === 4 ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500'}`}>4. GENERATE</button>
          </nav>
          
          {step > 1 && (
            <button 
              onClick={reset}
              className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-white transition-colors bg-white/5 border border-white/5 rounded-lg flex items-center gap-2"
            >
              <RefreshCw className="w-3 h-3" />
              RESET
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full z-10 relative">
        <AnimatePresence mode="wait">
          {/* Step 1: Upload */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex flex-col items-center justify-center min-h-[60vh] border border-white/10 rounded-[32px] bg-white/5 backdrop-blur-sm p-12 text-center shadow-2xl"
            >
              <div className="mb-8 p-6 bg-gradient-to-tr from-purple-600/20 to-cyan-500/20 border border-white/10 rounded-full">
                <Upload className="w-10 h-10 text-cyan-400" />
              </div>
              <h2 className="text-3xl font-display font-light tracking-tight mb-4 italic">Parallel <span className="font-semibold text-white">Source Capture</span></h2>
              <p className="text-slate-400 mb-10 max-w-md text-sm leading-relaxed">
                Initialize the KineticID pipeline by providing a base character reference. Identity persistence begins here.
              </p>
              
              <div className="flex flex-col items-center gap-4">
                <label className="cursor-pointer bg-white text-black px-12 py-4 rounded-xl font-bold text-sm tracking-widest uppercase hover:bg-slate-200 transition-all flex items-center gap-3 shadow-xl shadow-white/5" id="sourceRefLabel">
                  <Plus className="w-5 h-5" />
                  Select Source
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
                <div className="flex items-center gap-3 mt-4">
                  <div className="h-px w-8 bg-white/10"></div>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">or paste buffer</span>
                  <div className="h-px w-8 bg-white/10"></div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Strategy */}
          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid lg:grid-cols-12 gap-8"
            >
              {/* Reference Preview */}
              <div className="lg:col-span-4 space-y-6">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm flex flex-col gap-4">
                  <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Reference Character</h2>
                  <div className="aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-slate-900 relative group">
                    {refImage && (
                      <Image 
                        src={refImage} 
                        alt="Reference" 
                        fill 
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                    <div className="absolute bottom-4 left-4">
                      <p className="text-xs font-bold text-white uppercase tracking-wider">Active ID: SOURCE_REF</p>
                      <p className="text-[10px] text-slate-400 font-mono">ENCODING ACTIVE...</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-slate-500">Scan Resolution</span>
                      <span className="text-cyan-400">OPTIMAL</span>
                    </div>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 w-[100%]"></div>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setStep(1)}
                  className="w-full py-4 rounded-xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-white/5 hover:text-white transition-all shadow-lg"
                  id="changeSourceButton"
                >
                  CHANGE DATA SOURCE
                </button>
              </div>

              {/* Strategy Choice */}
              <div className="lg:col-span-8 flex flex-col justify-center gap-10 lg:pl-12">
                <div>
                  <h2 className="text-4xl font-display font-light italic tracking-tight mb-4">Pipeline <span className="font-semibold">Logic</span></h2>
                  <p className="text-slate-400 text-sm">Select the synthesis strategy for your character&apos;s visual evolution.</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                  {/* Style Refinement - NEW SECTION */}
                  <div className="sm:col-span-2 p-6 rounded-[32px] bg-white/5 border border-white/10 space-y-4">
                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest px-2">Visualization Style</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {STYLES.map((s) => (
                        <button
                          key={s.name}
                          onClick={() => setSelectedStyle(s.name)}
                          className={`p-3 rounded-xl border text-left transition-all group ${
                            selectedStyle === s.name 
                              ? 'bg-white/10 border-cyan-500/50 text-cyan-400' 
                              : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/20'
                          }`}
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wider mb-1">{s.name}</p>
                          <p className="text-[8px] text-slate-600 group-hover:text-slate-400 leading-tight">{s.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* AI Option */}
                  <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all space-y-6 flex flex-col group" id="aiOption">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20">
                      <Wand2 className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">Neural Chain</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">Let the AI generate a sequence of consistent prompts based on your story goal.</p>
                    </div>
                    <div className="mt-auto space-y-4">
                       <input 
                        type="text" 
                        id="goalInput"
                        placeholder="Define narrative goal..."
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-xs focus:outline-none focus:border-purple-500 transition-colors placeholder:text-slate-700"
                      />
                      <button 
                        onClick={generateAIPrompts}
                        disabled={isGeneratingPrompts}
                        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[10px] font-bold uppercase tracking-[0.2em] py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-purple-500/20"
                        id="generatePromptsBtn"
                      >
                        {isGeneratingPrompts ? <RefreshCw className="w-4 h-4 animate-spin text-white" /> : <Wand2 className="w-4 h-4" />}
                        Synthesize Chain
                      </button>
                    </div>
                  </div>

                  {/* Manual Option */}
                  <button 
                    onClick={() => { setPrompts([""]); setStep(3); }}
                    className="p-8 rounded-[32px] bg-white/5 border border-white/10 hover:border-cyan-500/50 transition-all flex flex-col gap-6 text-left group"
                    id="manualEntryBtn"
                  >
                    <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center border border-cyan-500/20">
                      <ImageIcon className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">Manual Entry</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">Directly encode each scene prompt for maximum granular control over the timeline.</p>
                    </div>
                    <div className="mt-auto flex items-center gap-2 text-cyan-400 text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                      Access Entry <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="space-y-10"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="text-4xl font-display font-light tracking-tight mb-2 italic">Refine <span className="font-semibold text-white">Prompt Chain</span></h2>
                  <p className="text-slate-500 text-sm">Review and edit the visual instructions before parallel generation.</p>
                </div>
                <div className="flex gap-4">
                   <button 
                    onClick={() => setStep(2)}
                    className="px-8 py-3 rounded-xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:bg-white/5 transition-all"
                    id="backBtn"
                  >
                    PREV_STEP
                  </button>
                  <button 
                    onClick={startBatchGeneration}
                    className="px-10 py-3 rounded-xl bg-white text-black text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                    id="executeBatchBtn"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    EXECUTE BATCH
                  </button>
                </div>
              </div>

              <div className="grid gap-6" id="promptsList">
                {prompts.map((p, idx) => (
                  <motion.div 
                    layout
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative group flex gap-6"
                  >
                    <div className="w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-[10px] font-mono font-bold text-slate-600 group-hover:border-cyan-500/50 group-hover:text-cyan-400 transition-all shadow-sm">
                      JOB_{(idx + 1).toString().padStart(3, '0')}
                    </div>
                    <div className="flex-1 relative">
                      <textarea
                        value={p}
                        onChange={(e) => updatePrompt(idx, e.target.value)}
                        placeholder="Describe the action/pose/scene..."
                        className="w-full bg-white/5 border border-white/10 focus:border-cyan-500/50 backdrop-blur-sm rounded-2xl p-5 text-sm ring-0 outline-none transition-all resize-none h-28 italic text-slate-300 placeholder:text-slate-800"
                        id={`promptTextarea-${idx}`}
                      />
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => removePrompt(idx)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-slate-700 hover:text-red-500 transition-colors"
                          id={`removePrompt-${idx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                <button 
                  onClick={addPrompt}
                  className="w-full py-6 rounded-2xl border border-dashed border-white/5 hover:border-white/10 hover:bg-white/5 text-slate-600 hover:text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 group"
                  id="appendActionBtn"
                >
                  <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                  APPEND ACTION
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Generation Progress & Gallery */}
          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-10"
            >
              <div className="flex flex-col md:flex-row justify-between items-center bg-white/5 p-8 rounded-[32px] border border-white/10 backdrop-blur-md gap-8 shadow-2xl">
                <div className="flex items-center gap-8">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 bg-black relative shadow-lg">
                     {refImage && (
                       <Image 
                        src={refImage} 
                        alt="Ref" 
                        fill 
                        className="object-cover opacity-80" 
                        referrerPolicy="no-referrer"
                       />
                     )}
                     <div className="absolute inset-0 bg-gradient-to-t from-cyan-500/20 to-transparent"></div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-tight font-display mb-3">Batch <span className="font-light italic text-slate-400 tracking-normal">Processing</span></h2>
                    <div className="flex items-center gap-4">
                      <div className="h-1.5 w-48 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-purple-600 to-cyan-500" 
                          animate={{ width: `${(results.filter(r => r.status === 'success').length / results.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-cyan-400 font-mono font-bold tracking-widest">
                        {results.filter(r => r.status === 'success').length} / {results.length} STAGES
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Pipeline Active</span>
                  </div>
                  <button 
                    onClick={() => setStep(3)}
                    className="px-6 py-2 rounded-xl border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:bg-white/5 hover:text-white transition-all shadow-sm"
                    id="adjustChainBtn"
                  >
                    Adjust Chain
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" id="generationGallery">
                {results.map((res, idx) => (
                  <motion.div 
                    layout
                    key={res.id}
                    className={`group rounded-3xl border transition-all overflow-hidden flex flex-col bg-white/5 backdrop-blur-sm ${res.status === 'loading' ? 'border-purple-500/30' : res.status === 'error' ? 'border-red-500/30' : 'border-white/10 hover:border-white/20'}`}
                  >
                    <div className="aspect-[4/5] w-full bg-slate-950 relative flex items-center justify-center overflow-hidden border-b border-white/5">
                      {res.status === 'loading' && (
                        <div className="flex flex-col items-center gap-4 relative z-10">
                          <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-[9px] uppercase tracking-[0.4em] text-purple-400 font-bold">Rendering</span>
                        </div>
                      )}
                      
                      {res.status === 'loading' && (
                         <div className="absolute inset-x-0 bottom-0 h-1 bg-white/5 overflow-hidden">
                            <motion.div 
                              className="h-full bg-purple-500" 
                              animate={{ x: [-100, 300] }}
                              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                            />
                         </div>
                      )}

                      {res.status === 'success' && res.url && (
                        <>
                          <Image 
                            src={res.url} 
                            alt="Generated" 
                            fill 
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-[-10px] group-hover:translate-y-0">
                            <a 
                              href={res.url} 
                              download={`kinetic-id-${idx}.png`}
                              className="p-2.5 bg-black/60 backdrop-blur-md rounded-xl hover:bg-white hover:text-black transition-all border border-white/10"
                              id={`downloadBtn-${idx}`}
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button 
                              onClick={() => triggerGenerations([res])}
                              className="p-2.5 bg-black/60 backdrop-blur-md rounded-xl hover:bg-white hover:text-black transition-all border border-white/10"
                              id={`regenSpecificBtn-${idx}`}
                              title="Regenerate"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                            {flags['ENABLE_UPSCALE_TOOL'] !== false && (
                              <button 
                                onClick={() => handleUpscale(res)}
                                className="p-2.5 bg-black/60 backdrop-blur-md rounded-xl hover:bg-white hover:text-black transition-all border border-white/10"
                                id={`upscaleBtn-${idx}`}
                                title="Upscale 2x"
                              >
                                <ImageIcon className="w-4 h-4" />
                              </button>
                            )}
                            {flags['ENABLE_REFINEMENT_TOOL'] !== false && (
                              <button 
                                onClick={() => setRefiningResult(res)}
                                className="p-2.5 bg-black/60 backdrop-blur-md rounded-xl hover:bg-white hover:text-black transition-all border border-white/10"
                                id={`refineBtn-${idx}`}
                                title="Refine Detail"
                              >
                                <Wand2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </>
                      )}
                      {res.status === 'error' && (
                        <div className="p-10 text-center space-y-4">
                           <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
                            <X className="w-6 h-6 text-red-500" />
                           </div>
                           <div>
                            <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-1">Signal Lost</p>
                            <p className="text-[9px] text-slate-600 line-clamp-2 italic">{res.error}</p>
                           </div>
                           <button 
                             onClick={() => triggerGenerations([res])}
                             className="text-[9px] uppercase font-bold text-slate-400 hover:text-white px-4 py-2 border border-white/10 rounded-lg transition-all"
                             id={`retryBtn-${idx}`}
                           >
                             Retry Sequence
                           </button>
                        </div>
                      )}
                      {res.status === 'pending' && (
                         <div className="flex flex-col items-center gap-4 text-slate-800">
                           <ImageIcon className="w-10 h-10 opacity-20" />
                           <span className="text-[9px] uppercase tracking-[0.4em] font-bold">Queued</span>
                         </div>
                      )}
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-mono text-slate-600 font-bold uppercase">JOB_{(idx + 1).toString().padStart(3, '0')}</span>
                        {res.status === 'success' && <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">VALIDATED</span>}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed italic">
                        &quot;{res.prompt}&quot;
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Refinement Modal */}
      <AnimatePresence>
        {refiningResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-xl bg-[#09090b] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center text-white">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight font-display mb-1 italic">Refine <span className="text-cyan-400 font-semibold not-italic">Identity</span></h3>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Targeting Segment: {refiningResult.id}</p>
                  </div>
                  <button onClick={() => setRefiningResult(null)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/5 relative">
                  <Image 
                    src={refiningResult.url || ""} 
                    alt="Current" 
                    fill 
                    className="object-cover opacity-50"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="p-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl max-w-[80%] text-center">
                       <p className="text-[10px] text-slate-400 font-mono line-clamp-2">SOURCE: {refiningResult.prompt}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">Synthesis Refinement Prompt</label>
                  <textarea 
                    value={refinementPrompt}
                    onChange={(e) => setRefinementPrompt(e.target.value)}
                    placeholder="e.g., 'Change lighting to night time', 'Modify expression to be smiling', 'Close up on eyes'..."
                    className="w-full bg-white/5 border border-white/10 focus:border-cyan-500/50 rounded-2xl p-5 text-sm ring-0 outline-none transition-all resize-none h-32 italic text-slate-300 placeholder:text-slate-800"
                  />
                </div>

                <div className="flex gap-4 pt-2">
                  <button 
                    onClick={() => setRefiningResult(null)}
                    className="flex-1 py-4 bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-slate-400 rounded-xl hover:bg-white/10 transition-all"
                  >
                    Cancel Selection
                  </button>
                  <button 
                    onClick={handleRefine}
                    disabled={!refinementPrompt || isRefining}
                    className="flex-1 py-4 bg-cyan-600 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-cyan-500 disabled:opacity-50 transition-all shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-3"
                  >
                    {isRefining ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    EXECUTE REFINEMENT
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-auto py-10 px-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 z-10 bg-black/20" id="mainFooter">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-gradient-to-tr from-purple-600/30 to-cyan-500/30 border border-white/10 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
          </div>
          <span className="text-[10px] text-slate-600 font-bold tracking-[0.3em] uppercase">&copy; 2026 KINETIC_CONTINUITY_AI</span>
        </div>
        <div className="flex gap-8 items-center">
          <div className="flex items-center gap-4">
            <span className="text-[9px] text-slate-700 font-bold uppercase tracking-widest">Protocol</span>
            <span className="text-[9px] text-purple-400 font-mono">GEMINI_IMAGE_GEN_V2.5</span>
          </div>
          <div className="h-4 w-px bg-white/5"></div>
          <div className="flex items-center gap-4">
            <span className="text-[9px] text-slate-700 font-bold uppercase tracking-widest">Engine</span>
            <span className="text-[9px] text-cyan-400 font-mono">IMAGEN_PARALLEL_CORE</span>
          </div>
        </div>
      </footer>
      <BugReportTrigger />
    </div>
  );
}
