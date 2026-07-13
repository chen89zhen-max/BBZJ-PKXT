import React, { useState, Component, ErrorInfo, ReactNode, useEffect } from 'react';
import { AppProvider, useAppContext } from './context';
import { MatrixSchedule } from './components/MatrixSchedule';
import { TeacherWorkload } from './components/TeacherWorkload';
import { SemesterPlanner } from './components/SemesterPlanner';
import { Settings } from './components/Settings';
import { UserManagement } from './components/UserManagement';
import { ClassroomManager } from './components/ClassroomManager';
import { TalentProgramManager } from './components/TalentProgramManager';
import { Login } from './components/Login';
import { LayoutDashboard, Users, Settings as SettingsIcon, Wifi, WifiOff, AlertTriangle, Menu, ChevronLeft, LogOut, UserCog, Calendar, BarChart2, Building2, BookOpen } from 'lucide-react';

// 欢迎页动画组件已移除

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

function MainContent({ user, onLogout }: { user: any, onLogout: () => void }) {
  const { state, connected } = useAppContext();
  const [activeTab, setActiveTab] = useState('dept-1'); // Default to first dept if exists
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsSidebarOpen(true);
      else setIsSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const nonSchedulingDepts = ['公共基础学院', '行政干部', '职员与工勤'];
  // Ensure activeTab is valid and not a non-scheduling dept unless explicitly requested
  const currentDept = state.departments.find(d => d.id === activeTab) || state.departments.filter(d => !nonSchedulingDepts.includes(d.name))[0];

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    onLogout();
  };

  const canAccess = (tab: string) => {
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;
    if (tab === 'workload' || tab === 'settings') return true;
    // USER role can view all departments but edit only their own (handled in components)
    return true;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-all active:scale-95"
            title={isSidebarOpen ? "收起侧边栏" : "展开侧边栏"}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">教学计划设置系统</h1>
            <span className="text-xs text-slate-500 font-medium">北碚职教中心</span>
          </div>
        </div>
        <div className="flex items-center gap-5 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col hidden sm:flex">
              <span className="text-slate-700 font-semibold">{user.username}</span>
              <span className="text-xs text-slate-500">{user.role}</span>
            </div>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>
          {connected ? (
            <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50/80 px-3 py-1.5 rounded-full font-medium border border-emerald-100 shadow-sm transition-colors">
              <Wifi className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">实时同步中</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-rose-600 bg-rose-50/80 px-3 py-1.5 rounded-full font-medium border border-rose-100 shadow-sm transition-colors">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">已断开连接</span>
            </span>
          )}
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-all font-medium">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">退出</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 z-30 lg:hidden transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <aside
          className={`bg-white border-r border-slate-200 flex flex-col h-full transition-all duration-300 ease-in-out shadow-sm absolute lg:relative z-40 ${
            isSidebarOpen ? 'w-64 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full overflow-hidden'
          }`}
        >
          <div className="p-5 flex-1 overflow-y-auto min-w-[16rem]">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">专业部排课</h2>
            <nav className="space-y-1.5">
              {state.departments.filter(d => !nonSchedulingDepts.includes(d.name)).map((dept) => (
                canAccess(dept.id) && (
                  <button
                    key={dept.id}
                    onClick={() => setActiveTab(dept.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === dept.id
                        ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full shadow-sm transition-colors ${activeTab === dept.id ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                    {dept.name}
                  </button>
                )
              ))}
            </nav>
          </div>

          <div className="p-5 border-t border-slate-100 mt-auto bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">全局统计与设置</h2>
            <nav className="space-y-1.5">
              {canAccess('workload') && (
                <button
                  onClick={() => setActiveTab('workload')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'workload'
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95'
                  }`}
                >
                  <BarChart2 className="w-4 h-4" />
                  数据看板与师资统计
                </button>
              )}
              {canAccess('planner') && (
                <button
                  onClick={() => setActiveTab('planner')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'planner'
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95'
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                  学期与学年规划
                </button>
              )}
              {canAccess('talent') && (
                <button
                  onClick={() => setActiveTab('talent')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'talent'
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  人才培养方案库
                </button>
              )}
              {canAccess('classroom') && (
                <button
                  onClick={() => setActiveTab('classroom')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'classroom'
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  教室安排
                </button>
              )}
              {canAccess('settings') && (
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'settings'
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95'
                  }`}
                >
                  <SettingsIcon className="w-4 h-4" />
                  基础数据设置
                </button>
              )}
              {user.role === 'SUPER_ADMIN' && (
                <button
                  onClick={() => setActiveTab('users')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'users'
                      ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95'
                  }`}
                >
                  <UserCog className="w-4 h-4" />
                  用户管理
                </button>
              )}
            </nav>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto p-4 md:p-8 flex flex-col w-full">
          <div className="max-w-full mx-auto flex-1">
            {activeTab === 'workload' ? (
              <TeacherWorkload />
            ) : activeTab === 'planner' ? (
              <SemesterPlanner />
            ) : activeTab === 'talent' ? (
              <TalentProgramManager />
            ) : activeTab === 'classroom' ? (
              <ClassroomManager />
            ) : activeTab === 'settings' ? (
              <Settings />
            ) : activeTab === 'users' ? (
              <UserManagement />
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
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Checking authentication...');
    fetch('/api/me')
      .then(res => {
        console.log('Auth response status:', res.status);
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then(data => {
        console.log('Auth data:', data);
        if (data.user) setUser(data.user);
        setLoading(false);
      })
      .catch((err) => {
        if (err.message === 'Not authenticated') {
          console.log('User is not authenticated. Redirecting to login.');
        } else {
          console.error('Auth check failed:', err);
        }
        setUser(null);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Login onLogin={setUser} />;

  return (
    <ErrorBoundary>
      <AppProvider user={user}>
        <MainContent user={user} onLogout={() => setUser(null)} />
      </AppProvider>
    </ErrorBoundary>
  );
}

