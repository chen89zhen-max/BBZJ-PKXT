import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useAppContext } from '../context';
import { Department, Grade, Major, Class, Subject, Teacher, Schedule } from '../types';
import { SearchableTeacherSelect } from './SearchableTeacherSelect';
import { Download, Trash2, Maximize, Minimize, Save, X, History, Archive as ArchiveIcon } from 'lucide-react';
import * as xlsx from 'xlsx';
import { ConfirmModal } from './ConfirmModal';
import { PromptModal } from './PromptModal';
import { Archive } from '../types';

// Memoized Cell Component to prevent unnecessary re-renders
  const ScheduleCell = memo(({ 
    classId, 
    subjectId, 
    teacherId, 
    hours, 
    isModified, 
    teachers, 
    canEdit,
    onChange 
  }: { 
    classId: string, 
    subjectId: string, 
    teacherId: string, 
    hours: number | string, 
    isModified: boolean, 
    teachers: Teacher[], 
    canEdit: boolean,
    onChange: (classId: string, subjectId: string, field: 'teacherId' | 'hours', value: string | number) => void 
  }) => {
  return (
    <React.Fragment>
          <td className={`border border-slate-300 p-0 relative group ${isModified ? 'bg-amber-50/50' : ''}`}>
            <SearchableTeacherSelect
              value={teacherId}
              onChange={(val) => onChange(classId, subjectId, 'teacherId', val)}
              teachers={teachers}
              disabled={!canEdit}
              placeholder=""
              className="h-full"
              buttonClassName={`w-full h-full min-h-[40px] px-2 py-1 bg-transparent border-none outline-none focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 text-center cursor-pointer group-hover:bg-indigo-50/50 transition-colors flex items-center justify-center ${isModified ? 'text-amber-700 font-medium' : ''}`}
              hideChevron
            />
          </td>
          <td className={`border border-slate-300 p-0 relative group ${isModified ? 'bg-amber-50/50' : ''}`}>
            <input
              type="number"
              min="0"
              value={hours}
              disabled={!canEdit}
              onChange={(e) => onChange(classId, subjectId, 'hours', parseInt(e.target.value) || 0)}
              className={`w-full h-full min-h-[40px] px-1 py-1 bg-transparent border-none outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 text-center group-hover:bg-indigo-50/50 transition-colors ${isModified ? 'text-amber-700 font-medium' : ''} ${!canEdit ? 'cursor-not-allowed' : ''}`}
            />
          </td>
    </React.Fragment>
  );
});

ScheduleCell.displayName = 'ScheduleCell';

export function MatrixSchedule({ department }: { department: Department }) {
  const { state, user, batchUpdateSchedules, clearDepartmentSchedules, createArchive, restoreArchive, deleteArchive } = useAppContext();
  
  const canEdit = useMemo(() => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;
    return user.departmentIds?.includes(department.id);
  }, [user, department.id]);

  const [selectedGradeId, setSelectedGradeId] = useState<string>('all');
  const [selectedMajorId, setSelectedMajorId] = useState<string>('all');
  
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{title: string, message: string, type: 'danger' | 'warning' | 'info'} | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [newArchiveName, setNewArchiveName] = useState('');
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<string | null>(null);
  const [showDeleteArchiveConfirm, setShowDeleteArchiveConfirm] = useState<string | null>(null);

  // Local state for pending edits
  const [pendingSchedules, setPendingSchedules] = useState<Record<string, { teacherId: string, hours: number }>>({});
  const hasPendingChanges = Object.keys(pendingSchedules).length > 0;

  // Create a lookup map for faster access to schedules
  const scheduleMap = useMemo(() => {
    const map: Record<string, Schedule> = {};
    state.schedules.forEach(s => {
      map[`${s.classId}:::${s.subjectId}`] = s;
    });
    return map;
  }, [state.schedules]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Filter majors for this department
  const deptMajors = useMemo(() => state.majors.filter(m => m.departmentId === department.id), [state.majors, department.id]);
  
  const deptMajorIds = useMemo(() => new Set(deptMajors.map(m => m.id)), [deptMajors]);

  // Filter classes for this department and selected grade
  const classes = useMemo(() => {
    const filtered = state.classes.filter(c => 
      deptMajorIds.has(c.majorId) && 
      (selectedGradeId === 'all' || c.gradeId === selectedGradeId) &&
      (selectedMajorId === 'all' || c.majorId === selectedMajorId)
    );

    // 排序逻辑：
    // 1. 同一专业
    // 2. 按年级排序
    // 3. 同一班级名称（含复排）的数字序号
    return filtered.sort((a, b) => {
      // 1. 按专业名称排序
      const majorNameA = state.majors.find(m => m.id === a.majorId)?.name || '';
      const majorNameB = state.majors.find(m => m.id === b.majorId)?.name || '';
      if (majorNameA !== majorNameB) {
        return majorNameA.localeCompare(majorNameB, 'zh-CN');
      }

      // 2. 按年级排序 (使用 grades 数组的顺序)
      const gradeOrderA = state.grades.findIndex(g => g.id === a.gradeId);
      const gradeOrderB = state.grades.findIndex(g => g.id === b.gradeId);
      if (gradeOrderA !== gradeOrderB) {
        return gradeOrderA - gradeOrderB;
      }

      // 3. 提取基础班级名称（去除“（复排）”）用于比较
      const baseNameA = a.name.replace('（复排）', '');
      const baseNameB = b.name.replace('（复排）', '');

      // 4. 提取班级名称中的数字部分进行数值排序
      const numA = parseInt(baseNameA.match(/\d+/)?.[0] || '0', 10);
      const numB = parseInt(baseNameB.match(/\d+/)?.[0] || '0', 10);

      if (numA !== numB) {
        return numA - numB;
      }

      // 5. 如果基础名称和数字都相同，复排班级排在后面
      return a.name.includes('（复排）') ? 1 : -1;
    });
  }, [state.classes, state.grades, state.majors, deptMajorIds, selectedGradeId, selectedMajorId, department]);

  // 获取带年级前缀的班级名称
  const getFullClassName = (c: any) => {
    const grade = state.grades.find(g => g.id === c.gradeId)?.name || '';
    return `${grade}${c.name}`;
  };

  // Filter subjects: public courses + professional courses for this department
  const filteredSubjects = useMemo(() => {
    return state.subjects.filter(s => {
      // 城南工作部（综合高中）只显示综合高中课程
      if (department.name === '城南工作部（综合高中）') {
        return ['综合高中文化课', '综合高中技能课'].includes(s.type);
      }
      
      // 城南工作部（中职）不显示综合高中课程
      if (department.name === '城南工作部（中职）') {
        if (['综合高中文化课', '综合高中技能课'].includes(s.type)) return false;
      } else {
        // 其他部门，如果包含“综合高中”则显示综合高中课程，否则不显示
        if (['综合高中文化课', '综合高中技能课'].includes(s.type)) {
          return department.name.includes('综合高中');
        }
      }
      
      // 中职专业课 需要匹配部门
      if (s.type === '中职专业课') {
        return !s.departmentId || s.departmentId === department.id;
      }
      
      // 中职公共基础课 默认全显示
      return true;
    });
  }, [state.subjects, department.id, department.name]);

  // Handle cell updates - Memoized to prevent cell re-renders
  const handleCellChange = useCallback((classId: string, subjectId: string, field: 'teacherId' | 'hours', value: string | number) => {
    const key = `${classId}:::${subjectId}`;
    
    setPendingSchedules(prev => {
      const existingGlobal = scheduleMap[key];
      const existingPending = prev[key];
      
      let teacherId = existingPending ? existingPending.teacherId : (existingGlobal?.teacherId || '');
      let hours = existingPending ? existingPending.hours : (existingGlobal?.hours || 0);

      if (field === 'teacherId') {
        teacherId = value as string;
        if (teacherId && hours === 0) hours = 2; // Default to 2 hours if just assigned a teacher
      } else {
        hours = value as number;
      }

      // Check if it matches global state
      const matchesGlobal = (existingGlobal?.teacherId || '') === teacherId && (existingGlobal?.hours || 0) === hours;

      const next = { ...prev };
      if (matchesGlobal) {
        delete next[key];
      } else {
        next[key] = { teacherId, hours };
      }
      return next;
    });
  }, [scheduleMap]);

  const handleSaveChanges = () => {
    const updates = Object.entries(pendingSchedules).map(([key, data]) => {
      const [classId, subjectId] = key.split(':::');
      return {
        classId,
        subjectId,
        teacherId: data.teacherId,
        hours: data.hours
      };
    });
    
    batchUpdateSchedules(updates);
    setPendingSchedules({});
    setAlertMessage({
      title: '保存成功',
      message: '排课修改已成功保存。',
      type: 'info'
    });
  };

  const handleDiscardChanges = () => {
    setPendingSchedules({});
  };

  const handleClearSchedules = () => {
    setShowPasswordPrompt(true);
  };

  const handlePasswordSubmit = (password: string) => {
    setShowPasswordPrompt(false);
    if (password === 'Bbzj@1234') {
      setShowConfirmClear(true);
    } else {
      setAlertMessage({
        title: '密码错误',
        message: '您输入的超级管理员密码不正确，操作已取消。',
        type: 'danger'
      });
    }
  };

  const confirmClearSchedules = () => {
    setShowConfirmClear(false);
    clearDepartmentSchedules(department.id);
    setAlertMessage({
      title: '操作成功',
      message: `【${department.name}】的排课记录已成功清空。`,
      type: 'info'
    });
  };

  const handleExportExcel = () => {
    const aoa: any[][] = [];
    
    // Row 1: 班级
    const row1 = ['班级', '', ''];
    classes.forEach(c => {
      row1.push(c.name);
      row1.push('');
    });
    aoa.push(row1);

    // Row 2: 类别
    const row2: any[] = ['类别', '', ''];
    classes.forEach(c => {
      row2.push(c.type || '');
      row2.push('');
    });
    aoa.push(row2);

    // Row 3: 教室
    const row3: any[] = ['教室', '', ''];
    classes.forEach(c => {
      row3.push(c.classroom || '');
      row3.push('');
    });
    aoa.push(row3);

    // Row 4: 人数
    const row4: any[] = ['人数', '', ''];
    classes.forEach(c => {
      row4.push(c.studentCount || 0);
      row4.push('');
    });
    aoa.push(row4);

    // Row 5: 班主任
    const row5: any[] = ['班主任', '', ''];
    classes.forEach(c => {
      const headTeacher = state.teachers.find(t => t.id === c.headTeacherId);
      row5.push(headTeacher?.name || '');
      row5.push('');
    });
    aoa.push(row5);

    // Row 6: 总课时
    const row6: any[] = ['总课时', '', ''];
    let grandTotal = 0;
    classes.forEach(c => {
      let classSum = 0;
      filteredSubjects.forEach(subject => {
        const key = `${c.id}:::${subject.id}`;
        const existingGlobal = scheduleMap[key];
        const pending = pendingSchedules[key];
        const hours = pending ? pending.hours : (existingGlobal?.hours || 0);
        classSum += hours;
      });
      row6.push(classSum || '');
      row6.push('');
      grandTotal += classSum;
    });
    row6[2] = grandTotal || '';
    aoa.push(row6);

    // Row 7: Headers
    const row7 = ['序号', '科目', '总课时'];
    classes.forEach(() => {
      row7.push('任课教师');
      row7.push('课时');
    });
    aoa.push(row7);

    // Data rows
    filteredSubjects.forEach((subject, index) => {
      const row = [index + 1, subject.name];
      
      let totalHours = 0;
      const classData: any[] = [];
      
      classes.forEach(c => {
        const key = `${c.id}:::${subject.id}`;
        const existingGlobal = scheduleMap[key];
        const pending = pendingSchedules[key];
        
        const teacherId = pending ? pending.teacherId : (existingGlobal?.teacherId || '');
        const hours = pending ? pending.hours : (existingGlobal?.hours || 0);
        
        const teacher = state.teachers.find(t => t.id === teacherId);
        classData.push(teacher?.name || '');
        classData.push(hours || '');
        totalHours += (hours || 0);
      });

      row.push(totalHours || '');
      aoa.push([...row, ...classData]);
    });

    const ws = xlsx.utils.aoa_to_sheet(aoa);
    
    // Merge cells for headers
    const merges: xlsx.Range[] = [];
    // Merge class, type, classroom, studentCount, headTeacher, totalHours headers
    for (let i = 0; i < 6; i++) {
      merges.push({ s: { r: i, c: 0 }, e: { r: i, c: 2 } });
      for (let j = 0; j < classes.length; j++) {
        merges.push({ s: { r: i, c: 3 + j * 2 }, e: { r: i, c: 4 + j * 2 } });
      }
    }
    ws['!merges'] = merges;

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, '排课表');
    xlsx.writeFile(wb, `${department.name}排课表.xlsx`);
  };

  const deptArchives = useMemo(() => {
    return (state.archives || [])
      .filter(a => a.departmentId === department.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [state.archives, department.id]);

  const handleCreateArchive = () => {
    if (!newArchiveName.trim()) {
      setAlertMessage({
        title: '提示',
        message: '请输入存档名称，例如“2024-2025 第一学期最终版”',
        type: 'warning'
      });
      return;
    }
    createArchive(department.id, newArchiveName.trim());
    setNewArchiveName('');
    setAlertMessage({
      title: '存档成功',
      message: `当前排课方案已成功存档为“${newArchiveName}”。`,
      type: 'info'
    });
  };

  const handleRestoreArchive = (archiveId: string) => {
    const archive = state.archives.find(a => a.id === archiveId);
    if (!archive) return;
    restoreArchive(archiveId);
    setShowRestoreConfirm(null);
    setShowArchiveModal(false);
    setAlertMessage({
      title: '恢复成功',
      message: `已成功恢复到存档“${archive.name}”的数据状态。`,
      type: 'info'
    });
  };

  const handleDeleteArchive = (archiveId: string) => {
    deleteArchive(archiveId);
    setShowDeleteArchiveConfirm(null);
  };

  return (
    <div className={`flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[100] rounded-none' : 'h-full'}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-slate-800">【{department.name}】排课矩阵</h2>
          
          <div className="flex items-center gap-2">
            <select 
              value={selectedGradeId}
              onChange={(e) => setSelectedGradeId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">所有年级</option>
              {state.grades.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            <select 
              value={selectedMajorId}
              onChange={(e) => setSelectedMajorId(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="all">所有专业</option>
              {deptMajors.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Actions */}
          <div className="flex items-center gap-2">
            {hasPendingChanges && (
              <>
                <button 
                  onClick={handleSaveChanges}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white border border-indigo-700 rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
                >
                  <Save className="w-4 h-4" /> 保存修改
                </button>
                <button 
                  onClick={handleDiscardChanges}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-600 border border-slate-300 rounded-md hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                  <X className="w-4 h-4" /> 取消
                </button>
                <div className="w-px h-6 bg-slate-200 mx-1"></div>
              </>
            )}
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-700 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors text-sm font-medium"
            >
              {isFullscreen ? <><Minimize className="w-4 h-4" /> 退出全屏</> : <><Maximize className="w-4 h-4" /> 全屏排课</>}
            </button>
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" /> 导出Excel
            </button>
            <button 
              onClick={() => setShowArchiveModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100 transition-colors text-sm font-medium"
            >
              <History className="w-4 h-4" /> 存档/历史
            </button>
            {canEdit && (
              <button 
                onClick={handleClearSchedules}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md hover:bg-rose-100 transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" /> 清空排课
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Matrix Table */}
      {classes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
          <p className="text-lg">该筛选条件下没有班级</p>
          <p className="text-sm">请尝试更改年级或专业筛选条件</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto bg-slate-100 p-4">
          <div className="bg-white rounded border border-slate-300 shadow-sm inline-block min-w-full">
            <table className="w-full border-collapse border border-slate-300 min-w-max">
              <thead className="sticky top-0 z-40 bg-slate-50">
                {/* Row 1: 班级 */}
                <tr>
                  <th colSpan={3} className="border border-slate-300 p-2 bg-slate-200 font-semibold sticky left-0 z-30 w-[320px]">班级</th>
                  {classes.map(c => (
                    <th key={c.id} colSpan={2} className="border border-slate-300 p-2 font-bold text-slate-800 bg-slate-100">
                      {getFullClassName(c)}
                    </th>
                  ))}
                </tr>
                {/* Row 2: 类别 */}
                <tr>
                  <th colSpan={3} className="border border-slate-300 p-2 bg-slate-200 font-semibold sticky left-0 z-30">类别</th>
                  {classes.map(c => (
                    <th key={c.id} colSpan={2} className="border border-slate-300 p-2 text-slate-600 bg-white">
                      {c.type}
                    </th>
                  ))}
                </tr>
                {/* Row 3: 教室 */}
                <tr>
                  <th colSpan={3} className="border border-slate-300 p-2 bg-slate-200 font-semibold sticky left-0 z-30">教室</th>
                  {classes.map(c => (
                    <th key={c.id} colSpan={2} className="border border-slate-300 p-2 text-slate-600 bg-white">
                      {c.classroom}
                    </th>
                  ))}
                </tr>
                {/* Row 4: 人数 */}
                <tr>
                  <th colSpan={3} className="border border-slate-300 p-2 bg-slate-200 font-semibold sticky left-0 z-30">人数</th>
                  {classes.map(c => (
                    <th key={c.id} colSpan={2} className="border border-slate-300 p-2 text-slate-600 bg-white">
                      {c.studentCount}
                    </th>
                  ))}
                </tr>
                {/* Row 5: 班主任 */}
                <tr>
                  <th colSpan={3} className="border border-slate-300 p-2 bg-slate-200 font-semibold sticky left-0 z-30">班主任</th>
                  {classes.map(c => {
                    const headTeacher = state.teachers.find(t => t.id === c.headTeacherId);
                    return (
                      <th key={c.id} colSpan={2} className="border border-slate-300 p-2 text-slate-600 bg-white">
                        {headTeacher?.name || '-'}
                      </th>
                    );
                  })}
                </tr>
                {/* Row 6: 总课时 */}
                <tr>
                  <th colSpan={2} className="border border-slate-300 p-2 bg-slate-200 font-semibold sticky left-0 z-30">总课时</th>
                  <th className="border border-slate-300 p-2 bg-slate-200 font-bold text-indigo-700 sticky left-[256px] z-30">
                    {classes.reduce((grandSum, c) => {
                      return grandSum + filteredSubjects.reduce((classSum, subject) => {
                        const key = `${c.id}:::${subject.id}`;
                        const existingGlobal = scheduleMap[key];
                        const pending = pendingSchedules[key];
                        const hours = pending ? pending.hours : (existingGlobal?.hours || 0);
                        return classSum + hours;
                      }, 0);
                    }, 0)}
                  </th>
                  {classes.map(c => {
                    const classTotal = filteredSubjects.reduce((sum, subject) => {
                      const key = `${c.id}:::${subject.id}`;
                      const existingGlobal = scheduleMap[key];
                      const pending = pendingSchedules[key];
                      const hours = pending ? pending.hours : (existingGlobal?.hours || 0);
                      return sum + hours;
                    }, 0);
                    return (
                      <th key={c.id} colSpan={2} className="border border-slate-300 p-2 text-indigo-700 bg-indigo-50/50 font-bold">
                        {classTotal > 0 ? classTotal : ''}
                      </th>
                    );
                  })}
                </tr>
                {/* Row 7: Column Headers */}
                <tr>
                  <th className="border border-slate-300 p-2 bg-slate-200 font-semibold sticky left-0 z-30 w-16">序号</th>
                  <th className="border border-slate-300 p-2 bg-slate-200 font-semibold sticky left-[64px] z-30 w-48">科目</th>
                  <th className="border border-slate-300 p-2 bg-slate-200 font-semibold sticky left-[256px] z-30 w-20">总课时</th>
                  {classes.map(c => (
                    <React.Fragment key={c.id}>
                      <th className="border border-slate-300 p-2 bg-slate-100 font-medium w-28">任课教师</th>
                      <th className="border border-slate-300 p-2 bg-slate-100 font-medium w-16">课时</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredSubjects.map((subject, index) => {
                  // Calculate total hours for this subject across currently shown classes
                  const totalHours = classes.reduce((sum, c) => {
                    const key = `${c.id}:::${subject.id}`;
                    const existingGlobal = scheduleMap[key];
                    const pending = pendingSchedules[key];
                    const hours = pending ? pending.hours : (existingGlobal?.hours || 0);
                    return sum + hours;
                  }, 0);

                  return (
                    <tr key={subject.id} className="hover:bg-slate-50 transition-colors">
                      <td className="border border-slate-300 p-2 sticky left-0 bg-white z-10 text-slate-500">{index + 1}</td>
                      <td className="border border-slate-300 p-2 sticky left-[64px] bg-white z-10 font-medium text-left text-slate-800">{subject.name}</td>
                      <td className="border border-slate-300 p-2 sticky left-[256px] bg-white z-10 font-bold text-indigo-600">{totalHours > 0 ? totalHours : ''}</td>
                      
                      {classes.map(c => {
                        const key = `${c.id}:::${subject.id}`;
                        const existingGlobal = scheduleMap[key];
                        const pending = pendingSchedules[key];
                        
                        const teacherId = pending ? pending.teacherId : (existingGlobal?.teacherId || '');
                        const hours = pending ? pending.hours : (existingGlobal?.hours || '');
                        const isModified = !!pending;
                        
                        return (
                          <ScheduleCell
                            key={`${c.id}-${subject.id}`}
                            classId={c.id}
                            subjectId={subject.id}
                            teacherId={teacherId}
                            hours={hours}
                            isModified={isModified}
                            teachers={state.teachers}
                            canEdit={canEdit}
                            onChange={handleCellChange}
                          />
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PromptModal
        isOpen={showPasswordPrompt}
        title="需要超级管理员权限"
        message={`请输入超级管理员密码以执行清空【${department.name}】排课记录操作：`}
        placeholder="请输入密码"
        isPassword={true}
        onConfirm={handlePasswordSubmit}
        onCancel={() => setShowPasswordPrompt(false)}
      />

      <ConfirmModal
        isOpen={showConfirmClear}
        title="警告：危险操作"
        message={`此操作将不可逆地清空【${department.name}】的所有排课记录！您确定要继续吗？`}
        type="danger"
        confirmText="确认清空"
        onConfirm={confirmClearSchedules}
        onCancel={() => setShowConfirmClear(false)}
      />

      <ConfirmModal
        isOpen={alertMessage !== null}
        title={alertMessage?.title || ''}
        message={alertMessage?.message || ''}
        type={alertMessage?.type || 'info'}
        confirmText="知道了"
        onConfirm={() => setAlertMessage(null)}
        onCancel={() => setAlertMessage(null)}
      />

      {/* Archive Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" /> 排课存档管理 - {department.name}
              </h3>
              <button onClick={() => setShowArchiveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-auto flex-1">
              {canEdit && (
                <div className="mb-8 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                  <h4 className="text-sm font-bold text-indigo-800 mb-3">创建新存档</h4>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newArchiveName}
                      onChange={(e) => setNewArchiveName(e.target.value)}
                      placeholder="输入存档名称，如：2024秋季学期初稿"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button 
                      onClick={handleCreateArchive}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <ArchiveIcon className="w-4 h-4" /> 存档当前排课
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-indigo-600">提示：每个产业部最多保留10个存档，超出后将自动覆盖最早的存档。</p>
                </div>
              )}

              <h4 className="text-sm font-bold text-slate-700 mb-3">历史存档记录 ({deptArchives.length}/10)</h4>
              {deptArchives.length === 0 ? (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-lg">
                  暂无历史存档记录
                </div>
              ) : (
                <div className="space-y-3">
                  {deptArchives.map((archive) => (
                    <div key={archive.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-indigo-200 transition-colors group">
                      <div className="flex-1">
                        <div className="font-bold text-slate-800">{archive.name}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          存档时间：{new Date(archive.timestamp).toLocaleString('zh-CN')} | 
                          包含记录：{archive.schedules.length} 条
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowRestoreConfirm(archive.id)}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md hover:bg-emerald-100 transition-colors text-xs font-medium"
                        >
                          恢复此存档
                        </button>
                        {canEdit && (
                          <button 
                            onClick={() => setShowDeleteArchiveConfirm(archive.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                            title="删除存档"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end">
              <button 
                onClick={() => setShowArchiveModal(false)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showRestoreConfirm !== null}
        title="确认恢复存档"
        message="恢复存档将覆盖当前该产业部的所有排课记录！建议在恢复前先对当前状态进行存档。您确定要继续吗？"
        type="warning"
        confirmText="确认恢复"
        onConfirm={() => showRestoreConfirm && handleRestoreArchive(showRestoreConfirm)}
        onCancel={() => setShowRestoreConfirm(null)}
      />

      <ConfirmModal
        isOpen={showDeleteArchiveConfirm !== null}
        title="确认删除存档"
        message="您确定要永久删除这个历史存档吗？此操作不可撤销。"
        type="danger"
        confirmText="确认删除"
        onConfirm={() => showDeleteArchiveConfirm && handleDeleteArchive(showDeleteArchiveConfirm)}
        onCancel={() => setShowDeleteArchiveConfirm(null)}
      />
    </div>
  );
}
