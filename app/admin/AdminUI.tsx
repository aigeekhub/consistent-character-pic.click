'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Shield, 
  Activity, 
  Settings, 
  Flag, 
  FileText, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  Download, 
  CheckCircle, 
  XCircle,
  Clock,
  Terminal,
  ChevronRight,
  Database,
  Lock,
  Eye,
  EyeOff,
  LogOut,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../FirebaseProvider';
import Link from 'next/link';

// --- API Helpers ---
const fetchWithError = async (url: string, secret: string, options: RequestInit = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'x-admin-secret': secret,
    },
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  return res.json();
};

export default function AdminDashboard() {
  const { user: firebaseUser, loading: authLoading, isAdmin: isFirebaseAdmin, logout: firebaseLogout, signIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [secret, setSecret] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('admin_secret') || '' : ''));
  const [activeTab, setActiveTab] = useState<'status' | 'settings' | 'flags' | 'logs' | 'errors'>('status');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  const refreshData = useCallback(async (activeSecret = secret) => {
    setLoading(true);
    try {
      const [status, settings, flags, logs] = await Promise.all([
        fetchWithError('/api/scaffold/status', activeSecret),
        fetchWithError('/api/scaffold/settings', activeSecret),
        fetchWithError('/api/scaffold/flags', activeSecret),
        fetchWithError('/api/scaffold/logs', activeSecret),
      ]);
      setData({ status, settings: settings.settings, flags: flags.flags, logs: logs.logs });
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [secret]);

  const verifySecret = useCallback(async (val: string) => {
    setLoading(true);
    try {
      await fetchWithError('/api/scaffold/status', val);
      setIsAdmin(true);
      localStorage.setItem('admin_secret', val);
      refreshData(val);
    } catch (err) {
      setError('Invalid Admin Secret');
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [refreshData]);

  const verifiedRef = useRef(false);

  // Load secret from localStorage if available
  useEffect(() => {
    if (verifiedRef.current) return;
    const saved = localStorage.getItem('admin_secret');
    if (saved) {
      verifiedRef.current = true;
      setTimeout(() => verifySecret(saved), 0);
    } else if (isFirebaseAdmin) {
      // If firebase admin but no secret saved, we still need to prompt for secret 
      // because API routes are still protected by ADMIN_SECRET.
      // But we can at least show the auth UI.
    }
  }, [verifySecret, isFirebaseAdmin]);

  const updateSetting = async (key: string, value: any) => {
    try {
      await fetchWithError('/api/scaffold/settings', secret, {
        method: 'POST',
        body: JSON.stringify({ key, value }),
      });
      refreshData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const updateFlag = async (key: string, enabled: boolean) => {
    try {
      await fetchWithError('/api/scaffold/flags', secret, {
        method: 'POST',
        body: JSON.stringify({ key, enabled }),
      });
      refreshData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const clearLogs = async () => {
    try {
      await fetchWithError('/api/scaffold/logs', secret, { method: 'DELETE' });
      refreshData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const exportLogs = () => {
    if (!data?.logs) return;
    const blob = new Blob([JSON.stringify(data.logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString()}.json`;
    a.click();
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#050506] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-xl shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className={`w-16 h-16 rounded-2xl ${isFirebaseAdmin ? 'bg-emerald-500/20' : 'bg-purple-600/20'} flex items-center justify-center mb-4 border ${isFirebaseAdmin ? 'border-emerald-500/20' : 'border-purple-500/20'}`}>
              {isFirebaseAdmin ? <Shield className="w-8 h-8 text-emerald-400" /> : <Lock className="w-8 h-8 text-purple-400" />}
            </div>
            <h1 className="text-2xl font-display font-bold tracking-tight text-white italic">Admin <span className={`not-italic ${isFirebaseAdmin ? 'text-emerald-400' : 'text-purple-400'}`}>Access</span></h1>
            {isFirebaseAdmin ? (
               <p className="text-emerald-400/70 text-[10px] text-center font-bold uppercase tracking-widest mt-2">Authenticated via Identity Protocol</p>
            ) : (
               <p className="text-slate-500 text-xs uppercase tracking-widest mt-2">{authLoading ? 'Initializing Identity...' : 'Restricted Foundation Pipeline'}</p>
            )}
          </div>

          {!authLoading && firebaseUser && !isFirebaseAdmin && (
             <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-4">
               <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
               <div>
                  <p className="text-[11px] font-bold text-red-400 uppercase tracking-tight">Access Denied</p>
                  <p className="text-[10px] text-red-400/60 font-medium leading-relaxed mt-1">Your account ({firebaseUser.email}) lacks administrative clearance for this module.</p>
               </div>
             </div>
          )}

          {!authLoading && !firebaseUser && (
             <button 
               onClick={signIn}
               className="w-full py-4 mb-6 bg-white/5 hover:bg-white/10 text-white text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all border border-white/10 flex items-center justify-center gap-3 font-display"
             >
               <LogIn className="w-4 h-4 text-purple-400" />
               Sign in with Google
             </button>
          )}

          <div className="space-y-4">
            <div className="relative">
              <input 
                type={showSecret ? "text" : "password"}
                placeholder="Enter Admin Secret..."
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-sm focus:outline-none focus:border-purple-500 transition-colors placeholder:text-slate-700 text-white"
              />
              <button 
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            
            <button 
              onClick={() => verifySecret(secret)}
              disabled={loading || !secret}
              className="w-full py-4 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-3"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Authenticate Session
            </button>
            
            {error && (
              <p className="text-red-400 text-[10px] text-center font-bold uppercase tracking-widest mt-2">{error}</p>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050506] text-slate-100 flex font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black/40 backdrop-blur-md flex flex-col sticky top-0 h-screen">
        <div className="p-8 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <h1 className="font-display font-bold tracking-tight text-sm uppercase">Scaffold <span className="text-purple-400">Admin</span></h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<Activity />} label="Status" active={activeTab === 'status'} onClick={() => setActiveTab('status')} />
          <NavItem icon={<Settings />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          <NavItem icon={<Flag />} label="Feature Flags" active={activeTab === 'flags'} onClick={() => setActiveTab('flags')} />
          <NavItem icon={<Terminal />} label="Debug Logs" active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} />
          <NavItem icon={<AlertTriangle />} label="Error Insights" active={activeTab === 'errors'} onClick={() => setActiveTab('errors')} />
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <button 
            onClick={firebaseLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            Switch User
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('admin_secret');
              setIsAdmin(false);
              setSecret('');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500/70 hover:text-red-400 transition-colors text-xs font-bold uppercase tracking-widest"
          >
            <XCircle className="w-4 h-4" />
            Lock Session
          </button>
          <Link 
            href="/"
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-slate-400 transition-colors text-xs font-bold uppercase tracking-widest"
          >
            <ChevronRight className="w-4 h-4" />
            Exit Admin
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 bg-black/20 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold tracking-tight uppercase font-display italic">{activeTab} <span className="not-italic text-slate-600">Module</span></h2>
            {loading && <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />}
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => refreshData()}
              className="p-2 bg-white/5 border border-white/5 rounded-lg hover:bg-white/10 transition-all text-slate-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-black/10">
          <AnimatePresence mode="wait">
            {activeTab === 'status' && (
              <motion.div key="status" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatusMetric label="System Health" value={data?.status?.status || 'Unknown'} icon={<Activity />} color="text-emerald-400" />
                  <StatusMetric label="App Version" value={data?.status?.version || '0.0.0'} icon={<Database />} color="text-purple-400" />
                  <StatusMetric label="Uptime" value={`${Math.floor((data?.status?.uptime || 0) / 3600)}h ${Math.floor(((data?.status?.uptime || 0) % 3600) / 60)}m`} icon={<Clock />} color="text-cyan-400" />
                </div>
                
                <div className="p-8 rounded-3xl border border-white/10 bg-white/5 space-y-6">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em]">Hardware & Runtime</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-slate-600 font-bold tracking-widest">Memory RSS</p>
                      <p className="text-lg font-mono font-bold text-white tracking-tighter">{Math.round((data?.status?.memory?.rss || 0) / 1024 / 1024)} MB</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-slate-600 font-bold tracking-widest">Heap Total</p>
                      <p className="text-lg font-mono font-bold text-white tracking-tighter">{Math.round((data?.status?.memory?.heapTotal || 0) / 1024 / 1024)} MB</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-slate-600 font-bold tracking-widest">Environment</p>
                      <p className="text-lg font-mono font-bold text-cyan-400 tracking-tighter capitalize">{data?.status?.environment || 'unknown'}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase text-slate-600 font-bold tracking-widest">Last Poll</p>
                      <p className="text-lg font-mono font-bold text-white tracking-tighter">{new Date(data?.status?.timestamp).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {data?.settings?.map((s: any) => (
                    <div key={s.key} className="p-6 rounded-3xl border border-white/10 bg-white/5 space-y-4 hover:border-purple-500/30 transition-all group">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-white tracking-tight">{s.label}</h4>
                          <p className="text-[10px] text-slate-500 font-mono mt-1 font-bold">KEY: {s.key}</p>
                        </div>
                        <span className="px-2 py-1 bg-white/5 rounded text-[8px] font-bold text-slate-600 uppercase tracking-widest border border-white/5">{s.category}</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-light">{s.description}</p>
                      <div>
                        {s.type === 'boolean' ? (
                          <button 
                            onClick={() => updateSetting(s.key, !s.value)}
                            className={`w-full py-3 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${s.value ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}
                          >
                            {s.value ? 'ENABLED' : 'DISABLED'}
                          </button>
                        ) : (
                          <input 
                            type={s.type === 'number' ? 'number' : 'text'}
                            value={s.value}
                            onChange={(e) => updateSetting(s.key, s.type === 'number' ? Number(e.target.value) : e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'flags' && (
              <motion.div key="flags" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {data?.flags?.map((f: any) => (
                    <div key={f.key} className="p-6 rounded-3xl border border-white/10 bg-white/5 space-y-4 hover:border-cyan-500/30 transition-all group">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-bold text-white tracking-tight">{f.label}</h4>
                          <p className="text-[10px] text-slate-500 font-mono mt-1 font-bold">KEY: {f.key}</p>
                        </div>
                        <div className={`w-3 h-3 rounded-full shadow-lg ${f.enabled ? 'bg-cyan-500 shadow-cyan-500/20' : 'bg-slate-800'}`}></div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed font-light">{f.description}</p>
                      <button 
                        onClick={() => updateFlag(f.key, !f.enabled)}
                        className={`w-full py-4 rounded-xl border text-[10px] font-bold uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 ${f.enabled ? 'bg-cyan-500 text-black border-cyan-400 shadow-xl shadow-cyan-500/10' : 'bg-white/5 text-slate-500 border-white/5'}`}
                      >
                        {f.enabled ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {f.enabled ? 'ACTIVE_GATE' : 'DISABLED_GATE'}
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div key="logs" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                   <div className="flex items-center gap-4">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Memory Buffer: {data?.logs?.length || 0} / 1000</span>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={exportLogs} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/5 rounded-lg text-[9px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-all">
                       <Download className="w-3 h-3" /> Export JSON
                     </button>
                     <button onClick={clearLogs} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-[9px] font-bold text-red-400 hover:bg-red-500/20 hover:text-red-300 uppercase tracking-widest transition-all">
                       <Trash2 className="w-3 h-3" /> WIPE_BUFFER
                     </button>
                   </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-black/40 border-b border-white/10">
                        <tr>
                          <th className="px-6 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">TS_UTC</th>
                          <th className="px-6 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">MODULE</th>
                          <th className="px-6 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">LEVEL</th>
                          <th className="px-6 py-4 text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">PAYLOAD_EVT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {data?.logs?.map((l: any) => (
                          <tr key={l.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 text-[10px] text-slate-500 whitespace-nowrap">{new Date(l.timestamp).toLocaleTimeString()}</td>
                            <td className="px-6 py-4 text-[10px] text-cyan-400 font-bold uppercase">{l.module}</td>
                            <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                                l.severity === 'error' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                l.severity === 'warn' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                l.severity === 'debug' ? 'bg-purple-500/10 text-purple-500 border border-purple-500/20' :
                                'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              }`}>
                                {l.severity}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-[10px] text-slate-400 truncate max-w-md" title={JSON.stringify(l.metadata)}>
                              <span className="text-slate-200 font-sans">{l.message}</span>
                              {l.metadata && <span className="ml-2 text-slate-700 italic">({JSON.stringify(l.metadata).slice(0, 50)}...)</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'errors' && (
              <motion.div key="errors" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.3em]">Critical Exception Map</h3>
                </div>
                <div className="grid gap-4">
                  {data?.logs?.filter((l: any) => l.severity === 'error').map((l: any) => (
                    <div key={l.id} className="p-6 bg-red-500/5 border border-red-500/10 rounded-2xl space-y-3 relative overflow-hidden group">
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500 group-hover:w-2 transition-all"></div>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="text-xs font-bold font-mono text-red-400">{l.metadata?.code || 'SYS_001'}</span>
                        </div>
                        <span className="text-[9px] text-slate-600 font-mono font-bold">{new Date(l.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-sm font-bold text-white tracking-tight">{l.message}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                           <p className="text-[8px] text-slate-600 uppercase font-bold tracking-widest mb-1">Source Pipeline</p>
                           <p className="text-[10px] text-cyan-400 font-mono">{l.module}</p>
                        </div>
                        <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                           <p className="text-[8px] text-slate-600 uppercase font-bold tracking-widest mb-1">Impact Level</p>
                           <p className="text-[10px] text-red-500 font-mono capitalize">{l.severity}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {data?.logs?.filter((l: any) => l.severity === 'error').length === 0 && (
                    <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-[40px]">
                      <CheckCircle className="w-12 h-12 text-emerald-500/20 mx-auto mb-4" />
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No Critical Errors Tracked</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// --- Internal Components ---

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${
        active 
          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' 
          : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
      }`}
    >
      <span className={active ? 'text-white' : 'text-slate-600'}>{icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
      {active && <ChevronRight className="w-4 h-4 ml-auto" />}
    </button>
  );
}

function StatusMetric({ label, value, icon, color }: { label: string, value: string, icon: React.ReactNode, color: string }) {
  return (
    <div className="p-6 rounded-3xl border border-white/10 bg-white/5 flex items-center gap-6 hover:border-white/20 transition-all group">
      <div className={`p-4 rounded-2xl bg-white/5 border border-white/5 group-hover:scale-110 transition-transform ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.2em] mb-1">{label}</p>
        <p className="text-xl font-display font-bold tracking-tight text-white uppercase italic">{value}</p>
      </div>
    </div>
  );
}
