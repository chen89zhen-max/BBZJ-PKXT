import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context';
import { 
  Plus, 
  Trash2, 
  BookOpen, 
  Search, 
  GraduationCap, 
  FileText 
} from 'lucide-react';
import { TalentProgram, TalentProgramCourse } from '../types';

export function TalentProgramManager() {
  const { 
    state, 
    addTalentProgram, 
    updateTalentProgram, 
    deleteTalentProgram 
  } = useAppContext();

  // Selected Program for detail view/editing
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  
  // Modals / Editors
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGradeId, setFilterGradeId] = useState('all');
  const [filterMajorId, setFilterMajorId] = useState('all');

  // New Program Form State
  const [programForm, setProgramForm] = useState({
    name: '',
    majorId: '',
    gradeId: '',
  });

  // Course Add State (inside detailed editor)
  const [newCourseSubjectId, setNewCourseSubjectId] = useState('');

  // Selected Program data
  const selectedProgram = useMemo(() => {
    return (state.talentPrograms || []).find(p => p.id === selectedProgramId) || null;
  }, [state.talentPrograms, selectedProgramId]);

  // Filtered Programs List
  const filteredPrograms = useMemo(() => {
    return (state.talentPrograms || []).filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchGrade = filterGradeId === 'all' || p.gradeId === filterGradeId;
      const matchMajor = filterMajorId === 'all' || p.majorId === filterMajorId;
      return matchSearch && matchGrade && matchMajor;
    });
  }, [state.talentPrograms, searchQuery, filterGradeId, filterMajorId]);

  // Get distinct subject IDs in the current program for matrix view
  const uniqueSubjectIds = useMemo(() => {
    if (!selectedProgram) return [];
    const subjectsSet = new Set<string>();
    selectedProgram.courses.forEach(c => {
      if (c.subjectId) {
        subjectsSet.add(c.subjectId);
      }
    });
    return Array.from(subjectsSet);
  }, [selectedProgram]);

  const handleCreateProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!programForm.name.trim()) {
      alert('请输入方案名称！');
      return;
    }
    if (!programForm.majorId) {
      alert('请选择专业！');
      return;
    }
    if (!programForm.gradeId) {
      alert('请选择年级！');
      return;
    }

    const newProgram: Omit<TalentProgram, 'id'> = {
      name: programForm.name.trim(),
      majorId: programForm.majorId,
      gradeId: programForm.gradeId,
      courses: []
    };

    const added = addTalentProgram(newProgram);
    setShowCreateModal(false);
    setProgramForm({ name: '', majorId: '', gradeId: '' });
    if (added && added.id) {
      setSelectedProgramId(added.id);
    }
  };

  const handleDeleteProgram = (id: string, name: string) => {
    if (window.confirm(`确定要删除“${name}”方案吗？该方案中配置的所有课程信息都将被永久清除。`)) {
      deleteTalentProgram(id);
      if (selectedProgramId === id) {
        setSelectedProgramId(null);
      }
    }
  };

  // Add a subject to the matrix view (creates a placeholder course for term 1 with 0 hours)
  const handleAddSubject = () => {
    if (!selectedProgram) return;
    if (!newCourseSubjectId) {
      alert('请选择需要添加的科目！');
      return;
    }

    // Check if subject is already in the program
    const exists = uniqueSubjectIds.includes(newCourseSubjectId);
    if (exists) {
      alert('方案中已包含该科目！');
      return;
    }

    // Create a default placeholder course entry so this subject is listed in the matrix
    const placeholderCourse: TalentProgramCourse = {
      subjectId: newCourseSubjectId,
      weeklyHours: 0,
      term: 1
    };

    const updatedProgram = {
      ...selectedProgram,
      courses: [...selectedProgram.courses, placeholderCourse]
    };

    updateTalentProgram(updatedProgram);
    setNewCourseSubjectId('');
  };

  // Update hours for a specific subject and term
  const handleHoursChange = (subjectId: string, term: number, hours: number) => {
    if (!selectedProgram) return;

    let updatedCourses = [...selectedProgram.courses];
    const existingIndex = updatedCourses.findIndex(c => c.subjectId === subjectId && c.term === term);

    if (hours > 0) {
      if (existingIndex >= 0) {
        // Update hours on existing course entry
        updatedCourses[existingIndex] = {
          ...updatedCourses[existingIndex],
          weeklyHours: hours
        };
      } else {
        // Create new course entry for this term
        updatedCourses.push({
          subjectId,
          term,
          weeklyHours: hours
        });
      }
    } else {
      // If hours is 0 or cleared, remove this term course entry
      if (existingIndex >= 0) {
        updatedCourses.splice(existingIndex, 1);
      }
      
      // Ensure we keep at least one placeholder if all terms are 0, so the subject doesn't disappear from the UI
      const stillHasSems = updatedCourses.some(c => c.subjectId === subjectId);
      if (!stillHasSems) {
        updatedCourses.push({
          subjectId,
          term: 1,
          weeklyHours: 0
        });
      }
    }

    updateTalentProgram({
      ...selectedProgram,
      courses: updatedCourses
    });
  };

  // Completely remove a subject from the program (removes all terms course entries)
  const handleRemoveSubject = (subjectId: string) => {
    if (!selectedProgram) return;

    const updatedCourses = selectedProgram.courses.filter(c => c.subjectId !== subjectId);
    updateTalentProgram({
      ...selectedProgram,
      courses: updatedCourses
    });
  };

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden">
      {/* Left Sidebar: Plan List */}
      <div className="w-80 border-r border-slate-200 bg-white flex flex-col shrink-0 h-full">
        {/* Header Search & Actions */}
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              <BookOpen className="w-5 h-5 text-indigo-600" /> 方案库列表
            </h3>
            <button
              onClick={() => {
                const firstMajor = state.majors[0]?.id || '';
                const firstGrade = state.grades[0]?.id || '';
                setProgramForm({ name: '', majorId: firstMajor, gradeId: firstGrade });
                setShowCreateModal(true);
              }}
              className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 transition-colors"
              title="创建培养方案"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索培养方案..."
              className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Filters Selects */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">年级筛选</label>
              <select
                value={filterGradeId}
                onChange={(e) => setFilterGradeId(e.target.value)}
                className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-slate-50 text-slate-700 outline-none"
              >
                <option value="all">所有年级</option>
                {state.grades.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 mb-0.5">专业筛选</label>
              <select
                value={filterMajorId}
                onChange={(e) => setFilterMajorId(e.target.value)}
                className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-slate-50 text-slate-700 outline-none"
              >
                <option value="all">所有专业</option>
                {state.majors.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Directory Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
          {filteredPrograms.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              暂无匹配的人才培养方案
            </div>
          ) : (
            filteredPrograms.map(p => {
              const grade = state.grades.find(g => g.id === p.gradeId)?.name || '';
              const major = state.majors.find(m => m.id === p.majorId)?.name || '';
              const isSelected = p.id === selectedProgramId;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProgramId(p.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all flex items-start justify-between group ${isSelected ? 'bg-indigo-50 border-l-4 border-indigo-600 shadow-sm' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}
                >
                  <div className="space-y-1 min-w-0 pr-2">
                    <div className={`font-bold text-sm truncate ${isSelected ? 'text-indigo-800' : 'text-slate-800'}`}>
                      {p.name}
                    </div>
                    <div className="flex flex-wrap gap-1 text-[10px] text-slate-500">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                        {grade}
                      </span>
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium truncate max-w-[120px]">
                        {major}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteProgram(p.id, p.name);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="删除此方案"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Course Configuration */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
        {selectedProgram ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Detail Header */}
            <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-600 text-white font-bold text-xs px-2 py-0.5 rounded">
                    人才培养方案
                  </span>
                  <h2 className="text-base font-bold text-slate-800">{selectedProgram.name}</h2>
                </div>
                <p className="text-xs text-slate-500">
                  适用年级：<span className="font-bold text-slate-700">{state.grades.find(g => g.id === selectedProgram.gradeId)?.name || '未知年级'}</span> | 
                  适用专业：<span className="font-bold text-slate-700">{state.majors.find(m => m.id === selectedProgram.majorId)?.name || '未知专业'}</span> | 
                  已配科目：<span className="font-bold text-slate-700">{uniqueSubjectIds.length} 门</span>
                </p>
              </div>

              {/* Add Course Control */}
              <div className="flex items-center gap-2">
                <select
                  value={newCourseSubjectId}
                  onChange={(e) => setNewCourseSubjectId(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700 w-52"
                >
                  <option value="">-- 选择要添加的科目 --</option>
                  {state.subjects.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                  ))}
                </select>
                <button
                  onClick={handleAddSubject}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-xs font-bold transition-all shadow-sm shrink-0"
                >
                  <Plus className="w-4 h-4" /> 添加科目
                </button>
              </div>
            </div>

            {/* Program Courses Grid */}
            <div className="flex-1 p-6 overflow-auto">
              {uniqueSubjectIds.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center max-w-xl mx-auto my-12 space-y-3">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-700">尚未配置课程计划</h4>
                  <p className="text-xs text-slate-500">此方案中还没有任何课程。请在右上角下拉菜单中选择一个科目，并点击“添加科目”按钮以初始化学期周课时配置。</p>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-bold text-slate-500">
                        <th className="p-3 w-12 text-center">序号</th>
                        <th className="p-3 w-48">科目名称</th>
                        <th className="p-3 w-32">课程类别</th>
                        {[1, 2, 3, 4, 5, 6].map(term => (
                          <th key={term} className="p-3 text-center w-24">
                            第 {term} 学期
                          </th>
                        ))}
                        <th className="p-3 w-16 text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {uniqueSubjectIds.map((subId, idx) => {
                        const subject = state.subjects.find(s => s.id === subId);
                        return (
                          <tr key={subId} className="hover:bg-slate-50 transition-all">
                            <td className="p-3 text-center text-slate-400 text-xs font-mono">{idx + 1}</td>
                            <td className="p-3 font-medium text-slate-800">{subject?.name || '未知科目'}</td>
                            <td className="p-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                subject?.type === '中职公共基础课' ? 'bg-blue-50 text-blue-700' :
                                subject?.type === '中职专业课' ? 'bg-purple-50 text-purple-700' :
                                'bg-emerald-50 text-emerald-700'
                              }`}>
                                {subject?.type || '其他'}
                              </span>
                            </td>
                            {[1, 2, 3, 4, 5, 6].map(term => {
                              // Find existing record
                              const courseItem = selectedProgram.courses.find(c => c.subjectId === subId && c.term === term);
                              const value = courseItem ? courseItem.weeklyHours : 0;
                              return (
                                <td key={term} className="p-3 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="40"
                                    value={value || ''}
                                    onChange={(e) => {
                                      const num = parseInt(e.target.value, 10);
                                      handleHoursChange(subId, term, isNaN(num) ? 0 : num);
                                    }}
                                    placeholder="0"
                                    className={`w-14 text-center py-1 border rounded text-xs outline-none focus:ring-1 focus:ring-indigo-500 ${value > 0 ? 'border-indigo-300 font-bold bg-indigo-50/40 text-indigo-700' : 'border-slate-200 text-slate-400 bg-white'}`}
                                  />
                                </td>
                              );
                            })}
                            <td className="p-3 text-center">
                              <button
                                onClick={() => handleRemoveSubject(subId)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="移除该课程"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      💡 提示：输入正数将标记该学期开设该课程（例如 4 代表每周 4 节）。不设课请填 0 或留空。
                    </span>
                    <span className="font-medium text-indigo-600">
                      所有数据均支持实时自动保存和多终端云端同步。
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 text-center">
            <GraduationCap className="w-16 h-16 text-slate-300 mb-3 stroke-[1.5]" />
            <p className="text-base font-bold text-slate-600">欢迎进入人才培养方案库</p>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              人才培养方案是各年级各专业的核心教学计划。在这里配置完成后，可在排课矩阵中一键导入，极大降低重复输入的排课成本。请在左侧列表中选择一个方案或新建方案。
            </p>
          </div>
        )}
      </div>

      {/* Create Program Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleCreateProgram} className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" /> 新建人才培养方案
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">方案名称</label>
                <input
                  type="text"
                  required
                  value={programForm.name}
                  onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                  placeholder="例如：2024级康养休闲专业人才培养方案"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">适用年级</label>
                  <select
                    value={programForm.gradeId}
                    onChange={(e) => setProgramForm({ ...programForm, gradeId: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                  >
                    {state.grades.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">适用专业</label>
                  <select
                    value={programForm.majorId}
                    onChange={(e) => setProgramForm({ ...programForm, majorId: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-indigo-500 outline-none text-slate-700"
                  >
                    {state.majors.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 rounded-b-xl">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
              >
                确认创建
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
