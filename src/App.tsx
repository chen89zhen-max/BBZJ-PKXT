import React, { useState, Component, ErrorInfo, ReactNode } from 'react';
import { AppProvider, useAppContext } from './context';
import { MatrixSchedule } from './components/MatrixSchedule';
import { TeacherWorkload } from './components/TeacherWorkload';
import { Settings } from './components/Settings';
import { LayoutDashboard, Users, Settings as SettingsIcon, Wifi, WifiOff, AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
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

  // Ensure activeTab is valid
  const currentDept = state.departments.find(d => d.id === activeTab) || state.departments[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800">全校排课与工作量统计系统</h1>
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
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-4">
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
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-full mx-auto">
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

