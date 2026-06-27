import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context';
import { 
  Building2, Users, GraduationCap, TrendingUp, Calculator, 
  Sparkles, CheckCircle, AlertCircle, Calendar, RefreshCw, 
  HelpCircle, ChevronRight, Save, Edit3, Trash2, Plus
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

export function SemesterPlanner() {
  const { 
    state, 
    updateMajorEnrollmentTarget, 
    presetClassesForMajor, 
    updateClassStatusAndStage, 
    transitionAcademicYear 
  } = useAppContext();

  const [activeSubTab, setActiveSubTab] = useState<'status' | 'enrollment' | 'forecast' | 'switch'>('status');

  // Input states for forecast parameters
  const [onCampusHours, setOnCampusHours] = useState<number>(28);
  const [internshipHours, setInternshipHours] = useState<number>(2);
  const [teacherStandardHours, setTeacherStandardHours] = useState<number>(14);

  // States for preset generator
  const [targetCohort, setTargetCohort] = useState<string>('');
  const [majorPresets, setMajorPresets] = useState<Record<string, { target: number; classSize: number; classType: string }>>({});

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  // Get active departments, majors, classes
  const departments = state.departments;
  const majors = state.majors;
  const classes = state.classes;
  const teachers = state.teachers;

  // Initialize preset parameters for majors
  React.useEffect(() => {
    const initialPresets: typeof majorPresets = {};
    majors.forEach(m => {
      initialPresets[m.id] = {
        target: m.enrollmentTarget || 120,
        classSize: 40,
        classType: state.classCategories[0]?.name || '普通班'
      };
    });
    setMajorPresets(initialPresets);
    
    // Auto-select latest grade as default cohort if empty
    if (!targetCohort && state.grades.length > 0) {
      // Find the maximum cohort year, e.g. "2026级", guess "2027级"
      const cohorts = state.grades.map(g => parseInt(g.name.replace(/[^0-9]/g, ''))).filter(n => !isNaN(n));
      if (cohorts.length > 0) {
        const nextCohort = Math.max(...cohorts) + 1;
        setTargetCohort(`${nextCohort}级`);
      } else {
        setTargetCohort('2026级');
      }
    }
  }, [majors, state.grades, state.classCategories]);

  // Helper to get helper text for classes with missing fields
  const getClassStage = (cls: any) => {
    if (cls.stage) return cls.stage;
    const grade = state.grades.find(g => g.id === cls.gradeId);
    if (!grade) return '高一';
    if (grade.name.includes('2023')) return '高三';
    if (grade.name.includes('2024')) return '高二';
    if (grade.name.includes('2025')) return '高一';
    return '高一';
  };

  const getClassStatus = (cls: any) => {
    return cls.status || '正常在校';
  };

  // 1. Calculations for Class Status board
  const classesByDept = useMemo(() => {
    const result: Record<string, typeof classes> = {};
    classes.forEach(cls => {
      const major = majors.find(m => m.id === cls.majorId);
      if (!major) return;
      const dept = departments.find(d => d.id === major.departmentId);
      const deptName = dept?.name || '未分配产业部';
      if (!result[deptName]) result[deptName] = [];
      result[deptName].push(cls);
    });
    return result;
  }, [classes, majors, departments]);

  // 2. Forecast Calculations
  const deptForecasts = useMemo(() => {
    return departments.map(dept => {
      const deptMajors = majors.filter(m => m.departmentId === dept.id);
      const majorIds = new Set(deptMajors.map(m => m.id));
      const deptClasses = classes.filter(c => majorIds.has(c.majorId) && !c.isPreset);

      let totalWeeklyHours = 0;
      let onCampusCount = 0;
      let internshipCount = 0;
      let returnedCount = 0;
      let graduatedCount = 0;

      deptClasses.forEach(c => {
        const status = getClassStatus(c);
        if (status === '正常在校') {
          totalWeeklyHours += onCampusHours;
          onCampusCount++;
        } else if (status === '实习返校') {
          totalWeeklyHours += onCampusHours;
          returnedCount++;
        } else if (status === '外出实习') {
          totalWeeklyHours += internshipHours;
          internshipCount++;
        } else if (status === '已毕业') {
          graduatedCount++;
        }
      });

      const teachersNeeded = totalWeeklyHours / teacherStandardHours;
      // Get actual teachers in this department
      const actualTeachers = teachers.filter(t => t.department === dept.name);

      return {
        id: dept.id,
        name: dept.name,
        totalClasses: deptClasses.length,
        onCampusCount,
        internshipCount,
        returnedCount,
        graduatedCount,
        totalWeeklyHours,
        teachersNeeded: parseFloat(teachersNeeded.toFixed(1)),
        actualTeachersCount: actualTeachers.length,
        gap: parseFloat((teachersNeeded - actualTeachers.length).toFixed(1))
      };
    });
  }, [departments, majors, classes, teachers, onCampusHours, internshipHours, teacherStandardHours]);

  // Handle preset generator submission
  const handleGeneratePresets = (majorId: string) => {
    const params = majorPresets[majorId];
    if (!params) return;

    const classCount = Math.max(1, Math.ceil(params.target / params.classSize));
    
    // Find or create Grade ID for target cohort
    let targetGrade = state.grades.find(g => g.name === targetCohort);
    
    // Set confirm modal
    setConfirmModal({
      isOpen: true,
      title: '确认生成预设班级',
      message: `将为专业【${majors.find(m => m.id === majorId)?.name}】预设 ${classCount} 个班级（针对 ${targetCohort}，每班大约 ${params.classSize} 人），确定执行吗？`,
      onConfirm: () => {
        // Save target in major first
        updateMajorEnrollmentTarget(majorId, params.target);

        // Generate classes
        const presetsList = [];
        for (let i = 1; i <= classCount; i++) {
          presetsList.push({
            name: `${targetCohort}${majors.find(m => m.id === majorId)?.name}预设${i}班`,
            studentCount: i === classCount && params.target % params.classSize !== 0 
              ? params.target % params.classSize 
              : params.classSize,
            type: params.classType
          });
        }

        // We use a dummy or existing grade ID if cohort exists, or let it map to newGradeName
        // If the grade doesn't exist, we will use a temporary ID or create it.
        // For simplicity, find if exists, otherwise generate a temp ID or wait for year switch to link.
        const gradeId = targetGrade?.id || 'temp-new-grade';

        presetClassesForMajor(majorId, gradeId, presetsList);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Handle inline change of class stage and status
  const handleStatusChange = (classId: string, value: any) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;
    updateClassStatusAndStage(classId, value, getClassStage(cls));
  };

  const handleStageChange = (classId: string, value: any) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return;
    updateClassStatusAndStage(classId, getClassStatus(cls) as any, value);
  };

  // Handle academic year promotion transition
  const handleYearTransition = () => {
    if (!targetCohort.trim()) {
      alert('请先输入新招收的年级名称');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: '⚠️ 确认进行全校学年升级切换 ⚠️',
      message: `一键升级后将自动执行以下操作：
1. 备份当前各产业部的排课数据为历史存档；
2. 现有班级年级自动递增（高一 ➔ 高二，高二 ➔ 高三，高三 ➔ 已毕业）；
3. 激活预先设置的【${targetCohort}】新生班级；
4. 清空当期主排课表，为您开启下学期全新排课设计。
此操作不可逆，确定现在执行升级切换吗？`,
      onConfirm: () => {
        transitionAcademicYear(targetCohort);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setActiveSubTab('status'); // Switch back to status tab to view upgraded classes
      }
    });
  };

  // Calculated totals
  const totals = useMemo(() => {
    let requiredTeachers = 0;
    let actualTeachers = 0;
    let totalClasses = 0;
    let totalPresetClasses = classes.filter(c => c.isPreset).length;

    deptForecasts.forEach(df => {
      requiredTeachers += df.teachersNeeded;
      actualTeachers += df.actualTeachersCount;
      totalClasses += df.totalClasses;
    });

    return {
      requiredTeachers: parseFloat(requiredTeachers.toFixed(1)),
      actualTeachers,
      totalClasses,
      totalPresetClasses,
      gap: parseFloat((requiredTeachers - actualTeachers).toFixed(1))
    };
  }, [deptForecasts, classes]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-gradient-to-r from-indigo-900 to-slate-800 p-6 rounded-2xl text-white shadow-md">
        <div>
          <span className="bg-indigo-500/30 text-indigo-200 text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">学期切换与工作规划</span>
          <h2 className="text-3xl font-extrabold tracking-tight mt-2">下学期教学工作与教师需求规划</h2>
          <p className="text-indigo-200 text-sm mt-1.5 max-w-2xl">
            在学期末，根据新生招生预期和各年级状态（返校、实习），预设班级结构，智能测算师资缺口，最终一键安全过渡到下学期教学任务。
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 p-3 rounded-xl border border-white/10 shrink-0 text-right">
          <div>
            <p className="text-xs text-indigo-200">全校预估班级总数 / 预设 draft</p>
            <p className="text-xl font-bold">{totals.totalClasses} <span className="text-sm font-normal text-indigo-300">个激活班</span> + {totals.totalPresetClasses} <span className="text-sm font-normal text-indigo-300">个预设</span></p>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-xl shadow-sm">
        <button
          onClick={() => setActiveSubTab('status')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeSubTab === 'status' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          在校班级与状态管理
        </button>
        <button
          onClick={() => setActiveSubTab('enrollment')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeSubTab === 'enrollment' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          招生预设与新生建班
        </button>
        <button
          onClick={() => setActiveSubTab('forecast')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeSubTab === 'forecast' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calculator className="w-4 h-4" />
          师资缺口测算
        </button>
        <button
          onClick={() => setActiveSubTab('switch')}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeSubTab === 'switch' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          学年升级一键切换
        </button>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-200">
        
        {/* Tab 1: Class Status Board */}
        {activeSubTab === 'status' && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm flex gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">班级状态与排课关联说明：</span>
                在下方表格中更改班级的状态后，将直接联动影响“师资需求测算”。
                处于“正常在校”或“实习返校”状态的班级会按标准安排全量周课时；处于“外出实习”状态的班级将仅保留极少量/零实习指导课时；“已毕业”班级将不产生任何课时需求。
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {departments.map(dept => {
                const deptClasses = classes.filter(cls => {
                  const major = majors.find(m => m.id === cls.majorId);
                  return major?.departmentId === dept.id;
                });

                return (
                  <div key={dept.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        {dept.name}
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium ml-1">
                          共 {deptClasses.length} 个班级
                        </span>
                      </h3>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-xs font-bold uppercase">
                            <th className="px-6 py-3">班级名称</th>
                            <th className="px-6 py-3">所属专业</th>
                            <th className="px-6 py-3">所属年级/级</th>
                            <th className="px-6 py-3">阶段 (升级可变)</th>
                            <th className="px-6 py-3">当前状态</th>
                            <th className="px-6 py-3">人数</th>
                            <th className="px-6 py-3">班主任</th>
                            <th className="px-6 py-3">排课属性</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {deptClasses.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                                该专业部下暂无班级数据
                              </td>
                            </tr>
                          ) : (
                            deptClasses.map(cls => {
                              const stage = getClassStage(cls);
                              const status = getClassStatus(cls);
                              const major = majors.find(m => m.id === cls.majorId);
                              const grade = state.grades.find(g => g.id === cls.gradeId);

                              return (
                                <tr key={cls.id} className={`hover:bg-slate-50 transition-colors ${cls.isPreset ? 'bg-amber-50/40' : ''}`}>
                                  <td className="px-6 py-4 font-bold text-slate-800">
                                    <div className="flex items-center gap-2">
                                      {cls.name}
                                      {cls.isPreset && (
                                        <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded border border-amber-200">
                                          预设草稿
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-slate-600">{major?.name || '-'}</td>
                                  <td className="px-6 py-4 font-mono text-slate-500">{grade?.name || '未知级'}</td>
                                  <td className="px-6 py-3">
                                    <select
                                      value={stage}
                                      onChange={(e) => handleStageChange(cls.id, e.target.value)}
                                      className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-medium"
                                    >
                                      <option value="高一">高一</option>
                                      <option value="高二">高二</option>
                                      <option value="高三">高三</option>
                                      <option value="已毕业">已毕业</option>
                                    </select>
                                  </td>
                                  <td className="px-6 py-3">
                                    <select
                                      value={status}
                                      onChange={(e) => handleStatusChange(cls.id, e.target.value)}
                                      className={`border rounded px-2.5 py-1 text-xs font-semibold ${
                                        status === '正常在校' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        status === '外出实习' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                        status === '实习返校' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                        'bg-slate-50 text-slate-600 border-slate-200'
                                      }`}
                                    >
                                      <option value="正常在校">正常在校</option>
                                      <option value="外出实习">外出实习</option>
                                      <option value="实习返校">实习返校</option>
                                      <option value="已毕业">已毕业</option>
                                    </select>
                                  </td>
                                  <td className="px-6 py-4 font-mono text-slate-600">{cls.studentCount}人</td>
                                  <td className="px-6 py-4 text-slate-600">
                                    {state.teachers.find(t => t.id === cls.headTeacherId)?.name || '未指定'}
                                  </td>
                                  <td className="px-6 py-4 text-xs">
                                    {cls.isPreset ? (
                                      <span className="text-amber-600 font-semibold">不参与当前排课</span>
                                    ) : status === '正常在校' || status === '实习返校' ? (
                                      <span className="text-emerald-600 font-semibold">标准排课 (28课时)</span>
                                    ) : status === '外出实习' ? (
                                      <span className="text-orange-600 font-semibold">极简排课 (2课时)</span>
                                    ) : (
                                      <span className="text-slate-400">已停用</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Enrollment and presets */}
        {activeSubTab === 'enrollment' && (
          <div className="space-y-6">
            <div className="bg-indigo-900 text-white rounded-xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
                  下学期新生入学预建班级工具
                </h3>
                <p className="text-indigo-200 text-xs">
                  在此预设新一届新生的各个专业的招生指标，并可以一键生成预设新生班级草稿。学年升级切换时，这些草稿会自动激活转正。
                </p>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg border border-white/20 shrink-0">
                <span className="text-xs font-semibold text-indigo-200">目标招收年级：</span>
                <input
                  type="text"
                  value={targetCohort}
                  onChange={(e) => setTargetCohort(e.target.value)}
                  placeholder="如 2026级"
                  className="bg-slate-800 text-white border border-slate-600 rounded px-2 py-1 text-sm font-bold w-24 text-center focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {departments.map(dept => {
                const deptMajors = majors.filter(m => m.departmentId === dept.id);

                return (
                  <div key={dept.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        {dept.name}
                      </h4>
                    </div>

                    <div className="p-6 space-y-4 flex-1">
                      {deptMajors.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">该产业部下暂无专业信息</p>
                      ) : (
                        deptMajors.map(m => {
                          const preset = majorPresets[m.id] || { target: 120, classSize: 40, classType: '普通班' };
                          const predictedClasses = Math.ceil(preset.target / preset.classSize) || 0;
                          const hasGeneratedPresets = classes.some(c => c.majorId === m.id && c.isPreset);

                          return (
                            <div key={m.id} className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-indigo-200 transition-colors">
                              <div className="space-y-1">
                                <h5 className="font-bold text-slate-800 text-sm">{m.name} 专业</h5>
                                <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1 font-medium">
                                  <span>预期招生: {preset.target} 人</span>
                                  <span>标准班额: {preset.classSize} 人</span>
                                  <span>类别: {preset.classType}</span>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto shrink-0">
                                <div className="grid grid-cols-2 sm:flex items-center gap-2">
                                  <div className="flex flex-col">
                                    <label className="text-[10px] text-slate-400 font-semibold">招生数</label>
                                    <input
                                      type="number"
                                      value={preset.target}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        setMajorPresets({
                                          ...majorPresets,
                                          [m.id]: { ...preset, target: val }
                                        });
                                      }}
                                      className="border border-slate-300 rounded px-2 py-1 text-xs w-20 text-center font-bold"
                                    />
                                  </div>
                                  <div className="flex flex-col">
                                    <label className="text-[10px] text-slate-400 font-semibold">班额</label>
                                    <input
                                      type="number"
                                      value={preset.classSize}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 40;
                                        setMajorPresets({
                                          ...majorPresets,
                                          [m.id]: { ...preset, classSize: val }
                                        });
                                      }}
                                      className="border border-slate-300 rounded px-2 py-1 text-xs w-16 text-center font-semibold"
                                    />
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleGeneratePresets(m.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center justify-center gap-1 ${
                                    hasGeneratedPresets 
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                  }`}
                                >
                                  {hasGeneratedPresets ? '重新生成预设' : '一键生成预设'}
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Forecast */}
        {activeSubTab === 'forecast' && (
          <div className="space-y-6">
            {/* Standard Config Cards */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-600" />
                教学课时与排课基准设置
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">在校/返校班级 周教学总课时</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={onCampusHours}
                      onChange={(e) => setOnCampusHours(parseInt(e.target.value) || 0)}
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold w-full focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-400 font-medium shrink-0">节/周</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    正常在校班级、实习返校班级每周安排的课程总节数。
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">外出实习班级 周指导课时</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={internshipHours}
                      onChange={(e) => setInternshipHours(parseInt(e.target.value) || 0)}
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold w-full focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-400 font-medium shrink-0">节/周</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    全班离校在外实习期间，安排给指导教师的周指导/联络课时。
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">教师标准教学工作量</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={teacherStandardHours}
                      onChange={(e) => setTeacherStandardHours(parseInt(e.target.value) || 0)}
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold w-full focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-400 font-medium shrink-0">节/周</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    每位全职教师每周的合理标准代课课时。用于测算所需师资。
                  </p>
                </div>
              </div>
            </div>

            {/* School level Dashboard summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-bold">全校理论周课时总需求</span>
                <span className="text-3xl font-extrabold mt-2 font-mono">
                  {deptForecasts.reduce((sum, df) => sum + df.totalWeeklyHours, 0)} <span className="text-xs font-normal text-slate-400">节</span>
                </span>
              </div>
              <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-between text-indigo-900">
                <span className="text-xs text-indigo-600 font-bold">测算所需专任教师</span>
                <span className="text-3xl font-extrabold mt-2 font-mono">
                  {totals.requiredTeachers} <span className="text-xs font-normal text-indigo-500">人</span>
                </span>
              </div>
              <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-between text-emerald-900">
                <span className="text-xs text-emerald-600 font-bold">当前在岗教职工</span>
                <span className="text-3xl font-extrabold mt-2 font-mono">
                  {totals.actualTeachers} <span className="text-xs font-normal text-emerald-500">人</span>
                </span>
              </div>
              <div className={`p-5 rounded-xl border shadow-sm flex flex-col justify-between ${
                totals.gap > 0 ? 'bg-rose-50 border-rose-100 text-rose-950' : 'bg-emerald-50 border-emerald-100 text-emerald-950'
              }`}>
                <span className="text-xs font-bold text-slate-500">理论教师缺口数量</span>
                <span className="text-3xl font-extrabold mt-2 font-mono">
                  {totals.gap > 0 ? `+${totals.gap}` : totals.gap} <span className="text-xs font-normal text-slate-500">人</span>
                </span>
              </div>
            </div>

            {/* Department Breakdown Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {deptForecasts.map(df => (
                <div key={df.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-slate-800 text-sm">{df.name}</h4>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                      df.gap > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {df.gap > 0 ? `缺口 ${df.gap} 人` : `富余 ${Math.abs(df.gap)} 人`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs text-slate-600">
                    <div>
                      <span className="text-slate-400">在校运行班级数:</span>
                      <p className="text-base font-bold text-slate-800 mt-0.5">{df.totalClasses} 个班</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        (在校 {df.onCampusCount} / 实习 {df.internshipCount} / 返校 {df.returnedCount})
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">测算周总课时需求:</span>
                      <p className="text-base font-bold text-slate-800 mt-0.5">{df.totalWeeklyHours} 节课</p>
                    </div>
                    <div>
                      <span className="text-slate-400">测算需专任教师:</span>
                      <p className="text-base font-bold text-slate-800 mt-0.5">{df.teachersNeeded} 人</p>
                    </div>
                    <div>
                      <span className="text-slate-400">目前在册教师数:</span>
                      <p className="text-base font-bold text-indigo-700 mt-0.5">{df.actualTeachersCount} 人</p>
                    </div>
                  </div>

                  {/* Visual ratio bar */}
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                      <span>教师配比率</span>
                      <span>{df.teachersNeeded > 0 ? Math.round((df.actualTeachersCount / df.teachersNeeded) * 100) : 100}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          df.gap > 2 ? 'bg-red-500' : df.gap > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, df.teachersNeeded > 0 ? (df.actualTeachersCount / df.teachersNeeded) * 100 : 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Academic Year Switch */}
        {activeSubTab === 'switch' && (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden p-8 space-y-6">
            <div className="text-center space-y-2">
              <Calendar className="w-12 h-12 text-indigo-600 mx-auto animate-bounce" />
              <h3 className="text-xl font-bold text-slate-800">一键学年升级切换</h3>
              <p className="text-slate-500 text-xs max-w-lg mx-auto">
                学年结束，新的教学周期即将开始。通过此安全面板一键平滑完成班级在校年级递增，清理旧排课表，激活新生班级。
              </p>
            </div>

            <div className="border border-slate-100 bg-slate-50 rounded-lg p-5 text-xs text-slate-600 space-y-3">
              <h4 className="font-bold text-slate-700">升级演进逻辑示意：</h4>
              <div className="grid grid-cols-7 items-center gap-2 text-center font-bold font-mono">
                <span className="bg-indigo-100 text-indigo-800 p-1.5 rounded">新生预设</span>
                <span className="text-slate-400">➔</span>
                <span className="bg-emerald-100 text-emerald-800 p-1.5 rounded">高一</span>
                <span className="text-slate-400">➔</span>
                <span className="bg-blue-100 text-blue-800 p-1.5 rounded">高二</span>
                <span className="text-slate-400">➔</span>
                <span className="bg-orange-100 text-orange-800 p-1.5 rounded">高三 (实习)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-2">
                例如，执行升级后：
                <br />• 2025级班级阶段将由 <span className="font-bold">高一</span> 变更为 <span className="font-bold">高二</span>；
                <br />• 2024级班级阶段将由 <span className="font-bold">高二</span> 变更为 <span className="font-bold">高三</span>；
                <br />• 2023级班级阶段将由 <span className="font-bold">高三</span> 变更为 <span className="font-bold">已毕业</span> (状态更改为“已毕业”)；
                <br />• 所有预先生成的新生预设班级草稿一键激活为 <span className="font-bold">高一</span> 年级并正常在校；
                <br />• 所有的班级对应 <span className="font-bold">2024级、2025级等标识保持永久不变</span>。
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-red-600" />
                安全机制保护：
              </p>
              <p className="leading-relaxed">
                切换将会自动将当前全校五个专业部的所有排课细节归档保存（包含任课老师、上课周时等）。您之后随时可以通过“排课主页 ➔ 排课归档管理 ➔ 恢复存档”重新回到之前的排课设计版本，请放心操作。
              </p>
            </div>

            <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-500 shrink-0">激活新招生年级:</span>
                <input
                  type="text"
                  value={targetCohort}
                  onChange={(e) => setTargetCohort(e.target.value)}
                  placeholder="如 2026级"
                  className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold w-full sm:w-32 focus:ring-1 focus:ring-indigo-500 text-center"
                />
              </div>

              <button
                onClick={handleYearTransition}
                className="w-full sm:w-auto bg-indigo-600 text-white hover:bg-indigo-700 px-6 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 shrink-0"
              >
                <RefreshCw className="w-4 h-4" />
                开始全校一键学年升级
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Confirm Modal */}
      {confirmModal.isOpen && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
}
