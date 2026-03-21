import React, { useState } from 'react';
import { BookOpen, Lock, User, ArrowRight } from 'lucide-react';

export const Login = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) throw new Error('Invalid credentials');
      const data = await response.json();
      onLogin(data.user);
    } catch (err) {
      setError('用户名或密码错误，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Pane - Image & Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-indigo-950">
        {/* Scenery Background */}
        <img 
          src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop" 
          alt="Scenery" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-indigo-900/60 to-purple-900/80" />
        
        {/* Abstract Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-indigo-500/20 blur-3xl"></div>
          <div className="absolute bottom-1/4 right-10 w-72 h-72 rounded-full bg-purple-500/20 blur-3xl"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-between p-16 h-full w-full">
          <div className="flex items-center gap-3 text-white">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-xl">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-semibold tracking-wide">教学计划设置系统</span>
          </div>

          <div className="space-y-6 max-w-2xl">
            <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight tracking-wider whitespace-nowrap">
              重庆市北碚职业教育中心
            </h1>
            {/* Decorative graphic line replacing the text paragraph */}
            <div className="w-20 h-1.5 bg-indigo-400/80 rounded-full"></div>
          </div>

          <div className="text-indigo-200/60 text-sm font-light">
            © {new Date().getFullYear()} 重庆市北碚职业教育中心 | @ChenZhen
          </div>
        </div>
      </div>

      {/* Right Pane - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-24 bg-slate-50 lg:bg-white">
        <div className="w-full max-w-md">
          
          {/* Mobile Header (Only visible on small screens) */}
          <div className="lg:hidden flex flex-col items-center text-center space-y-4 mb-10">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 whitespace-nowrap">重庆市北碚职业教育中心</h1>
              <p className="text-slate-500 mt-1 text-sm">教学计划设置系统</p>
            </div>
          </div>

          {/* Simplified Form Header */}
          <div className="hidden lg:block mb-10">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">系统登录</h2>
            <div className="w-10 h-1 bg-indigo-600 rounded-full mt-4"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 animate-in fade-in slide-in-from-top-2">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              {/* Inputs without labels to reduce text, using placeholders and icons */}
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="text"
                  placeholder="用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                  required
                />
              </div>

              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="password"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading}
              className="group relative w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg shadow-indigo-600/20 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  登录
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
          
          <div className="lg:hidden text-center text-slate-400 text-xs mt-12">
            © {new Date().getFullYear()} 重庆市北碚职业教育中心 | @ChenZhen
          </div>
        </div>
      </div>
    </div>
  );
};
