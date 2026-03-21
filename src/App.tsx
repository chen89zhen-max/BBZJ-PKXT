import React, { useState, Component, ErrorInfo, ReactNode, useEffect } from 'react';
import { AppProvider, useAppContext } from './context';
import { MatrixSchedule } from './components/MatrixSchedule';
import { TeacherWorkload } from './components/TeacherWorkload';
import { Settings } from './components/Settings';
import { LayoutDashboard, Users, Settings as SettingsIcon, Wifi, WifiOff, AlertTriangle, Menu, ChevronLeft } from 'lucide-react';
import schoolLogo from './assets/school-logo.png';

// 欢迎页动画组件
function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-100 animate-fade-out">
      <img src={schoolLogo} alt="校徽" className="w-48 h-48 mb-6" />
      <h1 className="text-4xl font-semibold text-slate-800" style={{ fontFamily: "'Dancing Script', cursive" }}>重庆市北碚职业教育中心</h1>
      <div className="absolute bottom-8 text-slate-500 opacity-70">
        @ChenZhen
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap');
        
        @keyframes fadeOut {
          0% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; visibility: hidden; }
        }
        .animate-fade-out {
          animation: fadeOut 3s forwards;
        }
      `}</style>
    </div>
  );
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-2xl w-full border border-red-100">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-8 h-8" />
              <h1 className="text-2xl font-bold">应用程序发生错误</h1>
            </div>
            <div className="bg-red-50 p-4 rounded-lg overflow-auto max-h-96">
              <pre className="text-sm text-red-800 whitespace-pre-wrap">
                {this.state.error?.toString()}
                {'\n\n'}
                {this.state.error?.stack}
              </pre>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function MainContent() {
  const { state, connected } = useAppContext();
  const [activeTab, setActiveTab] = useState('dept-1'); // Default to first dept if exists
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);

  // Ensure activeTab is valid
  const currentDept = state.departments.find(d => d.id === activeTab) || state.departments[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {showWelcome && <WelcomeScreen onComplete={() => setShowWelcome(false)} />}
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            title={isSidebarOpen ? "收起侧边栏" : "展开侧边栏"}
          >
            <Menu className="w-5 h-5" />
          </button>
          <img src={schoolLogo} alt="校徽" className="w-10 h-10 object-contain" />
          <h1 className="text-xl font-semibold text-slate-800">教学计划设置系统</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {connected ? (
            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full font-medium">
              <Wifi className="w-4 h-4" />
              实时同步中
            </span>
          ) : (
            <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-3 py-1 rounded-full font-medium">
              <WifiOff className="w-4 h-4" />
              已断开连接
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`bg-white border-r border-slate-200 flex flex-col h-full transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'w-64 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full overflow-hidden'
          }`}
        >
          <div className="p-4 flex-1 overflow-y-auto min-w-[16rem]">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">专业部排课</h2>
            <nav className="space-y-1">
              {state.departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => setActiveTab(dept.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === dept.id
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${activeTab === dept.id ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                  {dept.name}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-200 mt-auto">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">全局统计与设置</h2>
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('workload')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'workload'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                教师工作量统计
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <SettingsIcon className="w-4 h-4" />
                基础数据设置
              </button>
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-8 flex flex-col">
          <div className="max-w-full mx-auto flex-1">
            {activeTab === 'workload' ? (
              <TeacherWorkload />
            ) : activeTab === 'settings' ? (
              <Settings />
            ) : currentDept ? (
              <MatrixSchedule department={currentDept} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                请先在设置中添加专业部
              </div>
            )}
          </div>
          <footer className="mt-8 text-center text-sm text-slate-400 border-t border-slate-200 pt-4">
            © 2026 北碚职教教学计划设置系统 | ChenZhen 开发
          </footer>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

