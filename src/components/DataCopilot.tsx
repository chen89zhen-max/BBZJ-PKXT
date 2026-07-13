import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User, Loader2, Sparkles } from 'lucide-react';
import { useAppContext } from '../context';
import Markdown from 'react-markdown';

export const DataCopilot: React.FC = () => {
  const { state } = useAppContext();
  const [messages, setMessages] = useState<{role: 'user'|'assistant', content: string}[]>([
    {
      role: 'assistant',
      content: '你好！我是AI数据研判助手。你可以问我关于全校师资、排课、专业运行态势的任何问题。例如：\n- "目前哪个专业部的师资最紧缺？"\n- "帮我分析一下汽修专业的班额情况。"\n- "全校有多少个在外实习的班级？"'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Create a focused summary of the state with full details of teachers and classes
      const dataContext = {
        departments: state.departments.map(d => d.name),
        majors: state.majors.map(m => ({ 
          name: m.name, 
          dept: state.departments.find(d => d.id === m.departmentId)?.name 
        })),
        classes: state.classes.map(c => ({
          name: c.name,
          major: state.majors.find(m => m.id === c.majorId)?.name || '未知专业',
          grade: state.grades.find(g => g.id === c.gradeId)?.name || '未知年级',
          studentCount: c.studentCount,
          status: c.status || '正常在校'
        })),
        teachers: state.teachers.map(t => ({
          name: t.name,
          dept: t.department || '未知部门',
          subject: t.primarySubject || '未知科目',
          type: t.employmentType || '在编'
        })),
        schedulesTotal: state.schedules.length
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: userMessage,
          dataContext,
          apiConfig: state.apiConfig
        })
      });

      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，AI 助手遇到了一些问题，无法回答您的提问。请检查系统 API 配置。' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px] animate-fade-in">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            AI 数据研判助手
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">Beta</span>
          </h3>
          <p className="text-xs text-slate-500">基于大模型的数据洞察与分析 (DeepSeek / OpenAI 兼容 API)</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-indigo-600 shadow-sm'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-indigo-600 text-white rounded-tr-none' 
                : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'
            }`}>
              {msg.role === 'user' ? (
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              ) : (
                <div className="text-sm markdown-body prose prose-slate prose-sm max-w-none">
                  <Markdown>{msg.content}</Markdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-indigo-600 shadow-sm flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-5 py-4 shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
              <span className="text-sm text-slate-500">正在思考分析中...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-2 max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
            placeholder="询问关于全校数据的任何问题..."
            className="flex-1 pl-4 pr-12 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center disabled:opacity-50 hover:bg-indigo-700 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
