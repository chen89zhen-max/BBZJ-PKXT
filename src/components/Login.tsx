import React, { useState } from 'react';

export const Login = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
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
      setError('用户名或密码错误');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="mb-8 flex flex-col items-center">
        <img src="/school-logo.png" alt="校徽" className="w-24 h-24 mb-4 object-contain" />
        <h1 className="text-2xl font-bold text-slate-800">重庆市北碚职业教育中心</h1>
        <p className="text-slate-500 mt-2">教学计划设置系统</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 bg-white rounded-2xl shadow-xl w-96 border border-slate-100">
        <h2 className="text-xl font-bold mb-6 text-slate-800 text-center">用户登录</h2>
        {error && (
          <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm mb-4 border border-rose-100">
            {error}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
            <input
              type="text"
              placeholder="请输入用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
            <input
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>
        <button 
          type="submit" 
          className="w-full mt-8 p-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          登录
        </button>
      </form>

      <footer className="mt-12 text-slate-400 text-sm">
        © 2026 重庆市北碚职业教育中心 | @ChenZhen
      </footer>
    </div>
  );
};
