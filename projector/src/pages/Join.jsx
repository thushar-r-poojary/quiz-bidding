import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonitorPlay } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSocket } from '../hooks/useSocket';

const Join = () => {
  const [quizCode, setQuizCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const socket = useSocket();

  const handleJoin = (e) => {
    e.preventDefault();
    if (quizCode && socket) {
      setIsLoading(true);
      setError('');
      
      socket.emit('validateQuizCode', { quizCode }, (response) => {
        setIsLoading(false);
        if (response.error) {
          setError(response.error);
        } else if (response.success && response.quizId) {
          navigate(`/projector?id=${response.quizId}`);
        }
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl"
      >
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-cyan-500/10 rounded-2xl">
            <MonitorPlay className="w-12 h-12 text-cyan-400" />
          </div>
        </div>
        
        <h2 className="text-3xl font-black text-center text-white mb-2 tracking-tight">Projector</h2>
        <p className="text-slate-400 text-center mb-8">Enter the quiz code to display</p>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quiz Code</label>
            <input 
              type="text" 
              value={quizCode}
              onChange={(e) => setQuizCode(e.target.value)}
              className="w-full px-5 py-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-white font-mono text-xl text-center placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 uppercase transition-all"
              placeholder="e.g. QZ-8F42"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center font-medium">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading || !socket}
            className="w-full py-4 mt-4 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-2xl transition-all shadow-xl shadow-cyan-900/20 active:scale-[0.98]"
          >
            {isLoading ? 'Connecting...' : 'Launch Projector'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Join;
