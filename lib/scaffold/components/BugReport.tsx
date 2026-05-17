'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { scaffold } from '@/lib/scaffold/client';

export default function BugReportTrigger() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await scaffold.log(message, 'BUG_REPORT', 'warn', {
        userAgent: navigator.userAgent,
        windowSize: { w: window.innerWidth, h: window.innerHeight },
      });
      setIsSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsSuccess(false);
        setMessage('');
      }, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-slate-900 border border-white/10 text-slate-500 hover:text-white hover:border-white/20 shadow-2xl transition-all group z-[90]"
      >
        <AlertTriangle className="w-5 h-5 group-hover:rotate-12 transition-transform" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-end p-6 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-[#0a0a0c] border border-white/10 rounded-3xl p-6 shadow-2xl pointer-events-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Signal Error</h3>
                <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isSuccess ? (
                <div className="py-12 text-center space-y-4">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Report Transmitted</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest leading-relaxed">
                    Detected an anomaly? Describe the logic drift for our neural architects.
                  </p>
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe the issue..."
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-xs italic text-slate-300 h-32 focus:border-purple-500 outline-none transition-all"
                  />
                  <button 
                    disabled={isSubmitting || !message}
                    className="w-full py-4 bg-white text-black text-[10px] font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-3 hover:bg-slate-200 transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Transmitting...' : 'Send Bug Report'}
                    <Send className="w-3 h-3" />
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
