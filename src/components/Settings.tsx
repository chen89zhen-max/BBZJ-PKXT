import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useAppContext } from '../context';
import { Plus, Building2, UserCircle, BookOpen, Tags, Trash2, Edit2, Save, X, GraduationCap, Users, Upload, Download, ArrowUp, ArrowDown, Search, GripVertical } from 'lucide-react';
import { Class, SubjectType, Teacher, Subject } from '../types';
import * as xlsx from 'xlsx';
import { SearchableTeacherSelect } from './SearchableTeacherSelect';
import { ConfirmModal } from './ConfirmModal';
import { PromptModal } from './PromptModal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableSubjectItem({ 
  subject, 
  isAdmin, 
  user, 
  state, 
  canEdit, 
  selectedSubjects, 
  toggleSubjectSelection, 
  startEditSubject, 
  deleteSubject 
}: { 
  subject: Subject; 
  isAdmin: boolean; 
  user: any; 
  state: any; 
  canEdit: boolean; 
  selectedSubjects: Set<string>; 
  toggleSubjectSelection: (id: string) => void; 
  startEditSubject: (s: Subject) => void; 
  deleteSubject: (id: string) => void; 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subject.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const isProfessional = subject.type === '中职专业课';

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`flex flex-col bg-white px-3 py-2 rounded-lg border ${isDragging ? 'border-indigo-500 shadow-md' : 'border-slate-200'} text-sm gap-1 group`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {canEdit && (
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
              <GripVertical className="w-4 h-4" />
            </div>
          )}
          {isAdmin && (
            <input 
              type="checkbox" 
              checked={selectedSubjects.has(subject.id)} 
              onChange={() => toggleSubjectSelection(subject.id)} 
              className="cursor-pointer" 
            />
          )}
          <span className="font-medium">{subject.name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${subject.type === '中职专业课' ? 'bg-orange-100 text-orange-700' : subject.type.includes('综合高中') ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{subject.type}</span>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => startEditSubject(subject)} 
              className="text-slate-400 hover:text-indigo-600 p-1"
              title="编辑"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => deleteSubject(subject.id)} 
              className="text-slate-400 hover:text-rose-600 p-1 ml-1"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      {isProfessional && subject.departmentId && (
        <div className="text-xs text-slate-500 flex gap-2 ml-6">
          <span>产业部: {state.departments.find((d: any) => d.id === subject.departmentId)?.name || '未知'}</span>
          {subject.majorId && <span>专业: {state.majors.find((m: any) => m.id === subject.majorId)?.name || '未知'}</span>}
        </div>
      )}
    </div>
  );
}

export function Settings() {
  const { 
    state, user,
    addDepartment, updateDepartment, deleteDepartment,
    addMajor, updateMajor, deleteMajor,
    addClass, updateClass, deleteClass, deleteClasses, clearClasses, importClasses, importMajors,
    addTeacher, addTeachers, updateTeacher, deleteTeacher, deleteTeachers,
    addSubject, addSubjects, updateSubject, deleteSubject, deleteSubjects, reorderSubject, updateSubjectsOrder,
    addClassCategory, deleteClassCategory,
    addGrade, deleteGrade,
    clearSchedules
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'org' | 'dict'>('org');

  // Org State
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedMajorId, setSelectedMajorId] = useState<string>('');
  
  // Forms State
  const [newDeptName, setNewDeptName] = useState('');
  const [newMajorName, setNewMajorName] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherGender, setNewTeacherGender] = useState<'男' | '女' | ''>('');
  const [newTeacherIdCard, setNewTeacherIdCard] = useState('');
  const [newTeacherDepartment, setNewTeacherDepartment] = useState('');
  const [newTeacherPrimarySubject, setNewTeacherPrimarySubject] = useState('');
  
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectType, setNewSubjectType] = useState<SubjectType>('中职公共基础课');
  const [newSubjectDepartmentId, setNewSubjectDepartmentId] = useState('');
  const [newSubjectMajorId, setNewSubjectMajorId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newGradeName, setNewGradeName] = useState('');

  // Search State
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');

  // Edit State
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [teacherForm, setTeacherForm] = useState<Partial<Teacher>>({});
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [subjectForm, setSubjectForm] = useState<Partial<Subject>>({});

  // Batch Delete State
  const [selectedTeachers, setSelectedTeachers] = useState<Set<string>>(new Set());
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set());
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set());

  // Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [importResultModal, setImportResultModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: '', message: '' });

  // Class Edit State
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classForm, setClassForm] = useState<Partial<Class>>({});

  // Dept/Major Edit State
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editDeptName, setEditDeptName] = useState('');
  const [editingMajorId, setEditingMajorId] = useState<string | null>(null);
  const [editMajorName, setEditMajorName] = useState('');

  const [showClearClassesPrompt, setShowClearClassesPrompt] = useState(false);
  const [showClearSchedulesPrompt, setShowClearSchedulesPrompt] = useState(false);
  const [showImportBackupPrompt, setShowImportBackupPrompt] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState<any>(null);

  useEffect(() => {
    if (user?.role === 'USER' && user.departmentIds?.[0]) {
      setSelectedDeptId(user.departmentIds[0]);
    }
  }, [user]);

  const canEditDept = (deptId: string | undefined) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;
    return user.role === 'USER' && user.departmentIds?.includes(deptId || '');
  };

  const canEditMajor = (majorId: string | undefined) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') return true;
    const major = state.majors.find(m => m.id === majorId);
    return user.role === 'USER' && user.departmentIds?.includes(major?.departmentId || '');
  };

  const userDeptNames = state.departments
    .filter(d => user?.departmentIds?.includes(d.id))
    .map(d => d.name);
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';

  // DND Sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handlers
  const toggleTeacherSelection = (id: string) => {
    const newSet = new Set(selectedTeachers);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedTeachers(newSet);
  };

  const toggleSubjectSelection = (id: string) => {
    const newSet = new Set(selectedSubjects);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedSubjects(newSet);
  };

  const toggleClassSelection = (id: string) => {
    const newSet = new Set(selectedClasses);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedClasses(newSet);
  };

  const handleBatchDeleteTeachers = () => {
    if (selectedTeachers.size === 0) return;
    setConfirmModal({
      isOpen: true,
      title: '确认删除',
      message: `确定要删除选中的 ${selectedTeachers.size} 名教师吗？此操作不可恢复。`,
      onConfirm: () => {
        deleteTeachers(Array.from(selectedTeachers));
        setSelectedTeachers(new Set());
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleBatchDeleteSubjects = () => {
    if (selectedSubjects.size === 0) return;
    setConfirmModal({
      isOpen: true,
      title: '确认删除',
      message: `确定要删除选中的 ${selectedSubjects.size} 个科目吗？此操作不可恢复。`,
      onConfirm: () => {
        deleteSubjects(Array.from(selectedSubjects));
        setSelectedSubjects(new Set());
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleBatchDeleteClasses = () => {
    if (selectedClasses.size === 0) return;
    setConfirmModal({
      isOpen: true,
      title: '确认删除',
      message: `确定要删除选中的 ${selectedClasses.size} 个班级吗？此操作不可恢复。`,
      onConfirm: () => {
        deleteClasses(Array.from(selectedClasses));
        setSelectedClasses(new Set());
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = state.subjects.findIndex(s => s.id === active.id);
      const newIndex = state.subjects.findIndex(s => s.id === over.id);
      
      const newSubjects = arrayMove(state.subjects, oldIndex, newIndex);
      updateSubjectsOrder(newSubjects);
    }
  };

  const startEditTeacher = (teacher: Teacher) => {
    setEditingTeacherId(teacher.id);
    setTeacherForm(teacher);
  };

  const saveTeacher = () => {
    if (editingTeacherId && teacherForm.name) {
      updateTeacher({ ...teacherForm as Teacher, id: editingTeacherId });
      setEditingTeacherId(null);
    }
  };

  const startEditSubject = (subject: Subject) => {
    setEditingSubjectId(subject.id);
    setSubjectForm(subject);
  };

  const saveSubject = () => {
    if (editingSubjectId && subjectForm.name) {
      updateSubject({ ...subjectForm as Subject, id: editingSubjectId });
      setEditingSubjectId(null);
    }
  };

  const handleAddDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    addDepartment(newDeptName.trim());
    setNewDeptName('');
  };

  const handleAddMajor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMajorName.trim() || !selectedDeptId) return;
    addMajor(selectedDeptId, newMajorName.trim());
    setNewMajorName('');
  };

  const handleMajorImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = xlsx.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = xlsx.utils.sheet_to_json(ws);
      
      const majorsToAdd = data.map((row: any) => ({
        name: String(row['专业名称'] || row['name'] || '').trim(),
        departmentName: String(row['所属产业部'] || row['department'] || '').trim()
      })).filter(m => m.name && m.departmentName);

      const result = importMajors(majorsToAdd);
      
      setImportResultModal({
        isOpen: true,
        title: '导入结果',
        message: `成功导入 ${result.added} 个专业，更新 ${result.updated} 个专业，失败 ${result.failed} 个专业（请检查产业部名称是否填写正确）。`
      });
      
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const downloadMajorTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([{
      '专业名称': '计算机应用',
      '所属产业部': '信息技术产业部'
    }]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, '专业导入模板');
    xlsx.writeFile(wb, '专业导入模板.xlsx');
  };

  const handleAddClass = () => {
    if (!selectedMajorId) return;
    addClass({
      majorId: selectedMajorId,
      gradeId: state.grades[0]?.id || '',
      name: '新班级',
      type: state.classCategories[0]?.name || '普通班',
      classroom: '',
      studentCount: 0,
      headTeacherId: ''
    });
  };

  const saveClass = (cls: Class) => {
    updateClass({ ...cls, ...classForm });
    setEditingClassId(null);
  };

  const startEditClass = (cls: Class) => {
    setEditingClassId(cls.id);
    setClassForm(cls);
  };

  const handleClassImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = xlsx.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = xlsx.utils.sheet_to_json(ws);
      
      const parsedData = data.map((row: any) => {
        // Find major by name
        const majorName = String(row['所属专业'] || row['major'] || '').trim();
        const major = state.majors.find(m => m.name === majorName);
        
        // Find grade by name
        const gradeName = String(row['年级'] || row['grade'] || '').trim();
        const grade = state.grades.find(g => g.name === gradeName);
        
        // Find head teacher by name or ID card
        const teacherName = String(row['班主任姓名'] || row['headTeacher'] || '').trim();
        const teacherIdCard = String(row['班主任身份证'] || row['headTeacherIdCard'] || '').trim();
        let headTeacherId = '';
        if (teacherIdCard) {
          const teacher = state.teachers.find(t => t.idCard === teacherIdCard);
          if (teacher) headTeacherId = teacher.id;
        } else if (teacherName) {
          const teacher = state.teachers.find(t => t.name === teacherName);
          if (teacher) headTeacherId = teacher.id;
        }

        // Find class category
        const typeName = String(row['班级类型'] || row['type'] || '普通班').trim();
        const category = state.classCategories.find(c => c.name === typeName);

        return {
          majorId: major?.id || '',
          gradeId: grade?.id || '',
          name: String(row['班级名称'] || row['name'] || '').trim(),
          type: category?.name || typeName,
          classroom: String(row['教室'] || row['classroom'] || '').trim(),
          studentCount: parseInt(row['人数'] || row['studentCount'] || '0') || 0,
          headTeacherId
        };
      });

      const result = importClasses(parsedData);
      
      setImportResultModal({
        isOpen: true,
        title: '导入结果',
        message: `成功导入 ${result.added} 个班级，更新 ${result.updated} 个班级，失败 ${result.failed} 个班级（请检查专业、年级、班级名称是否填写正确）。`
      });
      
      // Reset input
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const downloadClassTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([{
      '所属专业': '计算机应用',
      '年级': '2023级',
      '班级名称': '23计算机1班',
      '班级类型': '普通班',
      '教室': '教学楼101',
      '人数': 45,
      '班主任姓名': '张三',
      '班主任身份证': '110105199001011234'
    }]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, '班级导入模板');
    xlsx.writeFile(wb, '班级导入模板.xlsx');
  };

  const handleTeacherImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = xlsx.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = xlsx.utils.sheet_to_json(ws);
      
      const teachersToAdd = data.map((row: any) => ({
        name: row['姓名'] || row['name'] || '',
        gender: row['性别'] || row['gender'] || '',
        idCard: row['身份证号码'] || row['idCard'] || '',
        department: row['所属产业部'] || row['department'] || '',
        primarySubject: row['主要任教学科'] || row['primarySubject'] || ''
      })).filter(t => t.name);

      if (teachersToAdd.length > 0) {
        addTeachers(teachersToAdd);
      }
      e.target.value = ''; // reset
    };
    reader.readAsBinaryString(file);
  };

  const downloadTeacherTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([{
      '姓名': '张三',
      '性别': '男',
      '身份证号码': '110105199001011234',
      '所属产业部': '信息技术部',
      '主要任教学科': '计算机基础'
    }]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, '教师导入模板');
    xlsx.writeFile(wb, '教师导入模板.xlsx');
  };

  const handleSubjectImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = xlsx.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = xlsx.utils.sheet_to_json(ws);
      
      const validTypes = ['中职公共基础课', '中职专业课', '综合高中文化课', '综合高中技能课'];
      
      const subjectsToAdd = data.map((row: any) => {
        let type = row['类型'] || row['type'] || '中职公共基础课';
        if (!validTypes.includes(type)) type = '中职公共基础课';
        
        const isProfessional = type === '中职专业课';
        
        const deptName = row['所属产业部'] || row['department'] || '';
        const majorName = row['所属专业'] || row['major'] || '';
        
        let departmentId = undefined;
        let majorId = undefined;
        
        if (isProfessional) {
          if (deptName) {
            const dept = state.departments.find(d => d.name === deptName);
            if (dept) departmentId = dept.id;
          }
          if (majorName) {
            const major = state.majors.find(m => m.name === majorName);
            if (major) majorId = major.id;
          }
        }
        
        return {
          name: row['名称'] || row['name'] || '',
          type: type as SubjectType,
          departmentId,
          majorId
        };
      }).filter(s => s.name);

      if (subjectsToAdd.length > 0) {
        addSubjects(subjectsToAdd);
      }
      e.target.value = ''; // reset
    };
    reader.readAsBinaryString(file);
  };

  const downloadSubjectTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([
      {
        '名称': '高等数学',
        '类型': '中职公共基础课',
        '所属产业部': '',
        '所属专业': ''
      },
      {
        '名称': 'C语言程序设计',
        '类型': '中职专业课',
        '所属产业部': '信息技术产业部',
        '所属专业': '计算机应用'
      }
    ]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, '科目导入模板');
    xlsx.writeFile(wb, '科目导入模板.xlsx');
  };

  const handleExportSystemData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `teaching_system_backup_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportSystemData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        setPendingBackupData(json);
        setShowImportBackupPrompt(true);
      } catch (err) {
        setImportResultModal({
          isOpen: true,
          title: '导入失败',
          message: '文件格式错误，请确保选择的是有效的系统备份 JSON 文件。'
        });
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const confirmImportBackup = async (password: string) => {
    if (password !== 'Bbzj@1234') {
      setImportResultModal({
        isOpen: true,
        title: '密码错误',
        message: '您输入的超级管理员密码不正确，操作已取消。'
      });
      setShowImportBackupPrompt(false);
      return;
    }

    try {
      const response = await fetch('/api/state/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(pendingBackupData)
      });

      if (response.ok) {
        setImportResultModal({
          isOpen: true,
          title: '导入成功',
          message: '全量数据已成功恢复，系统将自动刷新。'
        });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Import failed');
      }
    } catch (err: any) {
      setImportResultModal({
        isOpen: true,
        title: '导入失败',
        message: `服务器处理备份文件时出错：${err.message || '请检查文件内容'}`
      });
    }
    setShowImportBackupPrompt(false);
  };

  const filteredTeachers = useMemo(() => {
    if (!teacherSearchQuery.trim()) return state.teachers;
    const query = teacherSearchQuery.toLowerCase();
    return state.teachers.filter(t => 
      t.name.toLowerCase().includes(query) || 
      t.department?.toLowerCase().includes(query) ||
      t.primarySubject?.toLowerCase().includes(query)
    );
  }, [state.teachers, teacherSearchQuery]);

  const filteredSubjects = useMemo(() => {
    if (!subjectSearchQuery.trim()) return state.subjects;
    const query = subjectSearchQuery.toLowerCase();
    return state.subjects.filter(s => 
      s.name.toLowerCase().includes(query) || 
      s.type.toLowerCase().includes(query)
    );
  }, [state.subjects, subjectSearchQuery]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">基础数据设置</h2>
        <p className="text-sm text-slate-500 mt-1">管理全校的组织架构、班级属性及基础字典</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('org')}
          className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'org' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          组织架构与班级
        </button>
        <button 
          onClick={() => setActiveTab('dict')}
          className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'dict' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          教师、科目与字典
        </button>
      </div>

      {activeTab === 'org' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Departments */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" /> 产业部
              </h3>
              {isAdmin && (
                <form onSubmit={handleAddDept} className="mt-3 flex gap-2">
                  <input type="text" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder="新产业部..." className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
                  <button type="submit" disabled={!newDeptName.trim()} className="bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm"><Plus className="w-4 h-4" /></button>
                </form>
              )}
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-1">
              {state.departments.map(dept => {
                const canEdit = canEditDept(dept.id);
                return (
                  <div 
                    key={dept.id} 
                    onClick={() => { setSelectedDeptId(dept.id); setSelectedMajorId(''); }}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedDeptId === dept.id ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50 border border-transparent'}`}
                  >
                    {editingDeptId === dept.id ? (
                      <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                        <input 
                          type="text" 
                          value={editDeptName} 
                          onChange={e => setEditDeptName(e.target.value)} 
                          className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                          autoFocus
                        />
                        <button onClick={() => {
                          if (editDeptName.trim()) {
                            updateDepartment(dept.id, editDeptName.trim());
                          }
                          setEditingDeptId(null);
                        }} className="text-emerald-600 hover:text-emerald-700"><Save className="w-4 h-4" /></button>
                        <button onClick={() => setEditingDeptId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <>
                        <span className="font-medium text-slate-700 text-sm">{dept.name}</span>
                        {canEdit && (
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setEditingDeptId(dept.id); setEditDeptName(dept.name); }} className="text-slate-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                            {isAdmin && (
                              <button onClick={(e) => { e.stopPropagation(); deleteDepartment(dept.id); }} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Majors */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-600" /> 专业
                </h3>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button onClick={downloadMajorTemplate} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-300">
                      <Download className="w-3 h-3" /> 模板
                    </button>
                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-300">
                      <Upload className="w-3 h-3" /> 导入
                      <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleMajorImport} />
                    </label>
                  </div>
                )}
              </div>
              {canEditDept(selectedDeptId) && (
                <form onSubmit={handleAddMajor} className="mt-3 flex gap-2">
                  <input type="text" value={newMajorName} onChange={(e) => setNewMajorName(e.target.value)} placeholder="新专业..." disabled={!selectedDeptId} className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm disabled:bg-slate-100" />
                  <button type="submit" disabled={!newMajorName.trim() || !selectedDeptId} className="bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700 disabled:opacity-50 text-sm"><Plus className="w-4 h-4" /></button>
                </form>
              )}
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-1">
              {!selectedDeptId ? (
                <div className="text-center text-slate-400 text-sm mt-10">请先选择左侧产业部</div>
              ) : (
                state.majors.filter(m => m.departmentId === selectedDeptId).map(major => {
                  const canEdit = canEditDept(selectedDeptId);
                  return (
                    <div 
                      key={major.id} 
                      onClick={() => setSelectedMajorId(major.id)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedMajorId === major.id ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50 border border-transparent'}`}
                    >
                      {editingMajorId === major.id ? (
                        <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
                          <input 
                            type="text" 
                            value={editMajorName} 
                            onChange={e => setEditMajorName(e.target.value)} 
                            className="flex-1 px-2 py-1 border border-slate-300 rounded text-sm"
                            autoFocus
                          />
                          <button onClick={() => {
                            if (editMajorName.trim()) {
                              updateMajor(major.id, editMajorName.trim());
                            }
                            setEditingMajorId(null);
                          }} className="text-emerald-600 hover:text-emerald-700"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setEditingMajorId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <>
                          <span className="font-medium text-slate-700 text-sm">{major.name}</span>
                          {canEdit && (
                            <div className="flex items-center gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setEditingMajorId(major.id); setEditMajorName(major.name); }} className="text-slate-400 hover:text-emerald-600"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={(e) => { e.stopPropagation(); deleteMajor(major.id); }} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Classes */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-600" /> 班级
                </h3>
                {canEditMajor(selectedMajorId) && (
                  <div className="flex gap-2">
                    <button onClick={downloadClassTemplate} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-300">
                      <Download className="w-3 h-3" /> 下载模板
                    </button>
                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-300">
                      <Upload className="w-3 h-3" /> 导入Excel
                      <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleClassImport} />
                    </label>
                  </div>
                )}
              </div>
              <div className="flex justify-end items-center">
                {canEditMajor(selectedMajorId) && (
                  <button onClick={handleAddClass} disabled={!selectedMajorId} className="bg-amber-600 text-white px-3 py-1.5 rounded-md hover:bg-amber-700 disabled:opacity-50 text-sm flex items-center gap-1">
                    <Plus className="w-4 h-4" /> 添加班级
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-2">
              {!selectedMajorId ? (
                <div className="text-center text-slate-400 text-sm mt-10">请先选择左侧专业</div>
              ) : (
                <>
                  {state.classes.filter(c => c.majorId === selectedMajorId).length > 0 && canEditMajor(selectedMajorId) && (
                    <div className="flex justify-between items-center px-2 py-1 bg-slate-100 rounded text-sm mb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={
                          state.classes.filter(c => c.majorId === selectedMajorId).length > 0 &&
                          state.classes.filter(c => c.majorId === selectedMajorId).every(c => selectedClasses.has(c.id))
                        } onChange={(e) => {
                          const filtered = state.classes.filter(c => c.majorId === selectedMajorId);
                          if (e.target.checked) {
                            const newSet = new Set(selectedClasses);
                            filtered.forEach(c => newSet.add(c.id));
                            setSelectedClasses(newSet);
                          } else {
                            const newSet = new Set(selectedClasses);
                            filtered.forEach(c => newSet.delete(c.id));
                            setSelectedClasses(newSet);
                          }
                        }} />
                        <span className="text-slate-600">全选本专业</span>
                      </label>
                      {selectedClasses.size > 0 && (
                        <button onClick={handleBatchDeleteClasses} className="text-rose-600 hover:text-rose-700 font-medium text-xs bg-rose-50 px-2 py-1 rounded border border-rose-200">批量删除 ({selectedClasses.size})</button>
                      )}
                    </div>
                  )}
                  {state.classes.filter(c => c.majorId === selectedMajorId).map(cls => {
                    const canEdit = canEditMajor(selectedMajorId);
                    return (
                    <div key={cls.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                      {editingClassId === cls.id ? (
                        <div className="space-y-3 text-sm">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">所属专业</label>
                              <select value={classForm.majorId || ''} onChange={e => setClassForm({...classForm, majorId: e.target.value})} className="w-full px-2 py-1 border rounded">
                                {state.majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">班级名称</label>
                              <input type="text" value={classForm.name || ''} onChange={e => setClassForm({...classForm, name: e.target.value})} className="w-full px-2 py-1 border rounded" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">年级</label>
                              <select value={classForm.gradeId || ''} onChange={e => setClassForm({...classForm, gradeId: e.target.value})} className="w-full px-2 py-1 border rounded">
                                {state.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">类别</label>
                              <select value={classForm.type || ''} onChange={e => setClassForm({...classForm, type: e.target.value})} className="w-full px-2 py-1 border rounded">
                                {state.classCategories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">教室</label>
                              <input type="text" value={classForm.classroom || ''} onChange={e => setClassForm({...classForm, classroom: e.target.value})} className="w-full px-2 py-1 border rounded" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">人数</label>
                              <input type="number" value={classForm.studentCount || 0} onChange={e => setClassForm({...classForm, studentCount: parseInt(e.target.value)})} className="w-full px-2 py-1 border rounded" />
                            </div>
                            <div>
                              <label className="block text-xs text-slate-500 mb-1">班主任</label>
                              <SearchableTeacherSelect
                                value={classForm.headTeacherId || ''}
                                onChange={val => setClassForm({...classForm, headTeacherId: val})}
                                teachers={state.teachers}
                                placeholder="无"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setEditingClassId(null)} className="px-3 py-1 text-slate-500 hover:bg-slate-100 rounded">取消</button>
                            <button onClick={() => saveClass(cls)} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">保存</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              {canEdit && (
                                <input type="checkbox" checked={selectedClasses.has(cls.id)} onChange={() => toggleClassSelection(cls.id)} className="cursor-pointer" />
                              )}
                              <h4 className="font-bold text-slate-800">{cls.name}</h4>
                            </div>
                            {canEdit && (
                              <div className="flex gap-1">
                                <button onClick={() => startEditClass(cls)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => deleteClass(cls.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            )}
                          </div>
                          <div className={`grid grid-cols-2 gap-y-1 text-xs text-slate-600 ${canEdit ? 'pl-5' : ''}`}>
                            <div><span className="text-slate-400">类别:</span> {cls.type}</div>
                            <div><span className="text-slate-400">年级:</span> {state.grades.find(g => g.id === cls.gradeId)?.name}</div>
                            <div><span className="text-slate-400">教室:</span> {cls.classroom || '-'}</div>
                            <div><span className="text-slate-400">人数:</span> {cls.studentCount}</div>
                            <div className="col-span-2"><span className="text-slate-400">班主任:</span> {state.teachers.find(t => t.id === cls.headTeacherId)?.name || '-'}</div>
                          </div>
                        </>
                      )}
                    </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dict' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Teachers */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <UserCircle className="w-4 h-4 text-emerald-600" /> 教师管理
                </h3>
                {(isAdmin || user?.role === 'USER') && (
                  <div className="flex gap-2">
                    <button onClick={downloadTeacherTemplate} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-300">
                      <Download className="w-3 h-3" /> 下载模板
                    </button>
                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-300">
                      <Upload className="w-3 h-3" /> 导入Excel
                      <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleTeacherImport} />
                    </label>
                  </div>
                )}
              </div>
              <div className="mt-3 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜索教师姓名、部门或学科..."
                  value={teacherSearchQuery}
                  onChange={(e) => setTeacherSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              {(isAdmin || user?.role === 'USER') && (
                <form onSubmit={(e) => { 
                  e.preventDefault(); 
                  if(newTeacherName.trim()) { 
                    addTeacher({
                      name: newTeacherName.trim(),
                      gender: newTeacherGender as any,
                      idCard: newTeacherIdCard.trim(),
                      department: user?.role === 'USER' ? (newTeacherDepartment || userDeptNames[0] || '') : newTeacherDepartment.trim(),
                      primarySubject: newTeacherPrimarySubject.trim()
                    }); 
                    setNewTeacherName(''); 
                    setNewTeacherGender('');
                    setNewTeacherIdCard('');
                    setNewTeacherDepartment('');
                    setNewTeacherPrimarySubject('');
                  } 
                }} className="mt-3 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} placeholder="姓名 (必填)" className="px-3 py-1.5 border border-slate-300 rounded-md text-sm" required />
                    <select value={newTeacherGender} onChange={(e) => setNewTeacherGender(e.target.value as any)} className="px-3 py-1.5 border border-slate-300 rounded-md text-sm">
                      <option value="">性别</option>
                      <option value="男">男</option>
                      <option value="女">女</option>
                    </select>
                    <input type="text" value={newTeacherIdCard} onChange={(e) => setNewTeacherIdCard(e.target.value)} placeholder="身份证号码" className="col-span-2 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
                    {user?.role === 'USER' && user.departmentIds && user.departmentIds.length > 1 ? (
                      <select 
                        value={newTeacherDepartment || userDeptNames[0]} 
                        onChange={(e) => setNewTeacherDepartment(e.target.value)}
                        className="px-3 py-1.5 border border-slate-300 rounded-md text-sm"
                      >
                        {userDeptNames.map(name => <option key={name} value={name}>{name}</option>)}
                      </select>
                    ) : (
                      <input 
                        type="text" 
                        value={user?.role === 'USER' ? (userDeptNames[0] || '') : newTeacherDepartment} 
                        onChange={(e) => setNewTeacherDepartment(e.target.value)} 
                        placeholder="所属产业部" 
                        className="px-3 py-1.5 border border-slate-300 rounded-md text-sm disabled:bg-slate-50" 
                        disabled={user?.role === 'USER'}
                      />
                    )}
                    <input type="text" value={newTeacherPrimarySubject} onChange={(e) => setNewTeacherPrimarySubject(e.target.value)} placeholder="主要任教学科" className="px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
                  </div>
                  <button type="submit" disabled={!newTeacherName.trim()} className="w-full bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700 disabled:opacity-50 text-sm flex items-center justify-center gap-1"><Plus className="w-4 h-4" /> 添加教师</button>
                </form>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-2">
                {filteredTeachers.length > 0 && isAdmin && (
                  <div className="flex justify-between items-center px-2 py-1 bg-slate-100 rounded text-sm mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={selectedTeachers.size === filteredTeachers.length && filteredTeachers.length > 0} onChange={(e) => {
                        if (e.target.checked) setSelectedTeachers(new Set(filteredTeachers.map(t => t.id)));
                        else setSelectedTeachers(new Set());
                      }} />
                      <span className="text-slate-600">全选</span>
                    </label>
                    {selectedTeachers.size > 0 && (
                      <button onClick={handleBatchDeleteTeachers} className="text-rose-600 hover:text-rose-700 font-medium text-xs bg-rose-50 px-2 py-1 rounded border border-rose-200">批量删除 ({selectedTeachers.size})</button>
                    )}
                  </div>
                )}
                {filteredTeachers.map(t => {
                  const canEdit = isAdmin || (user?.role === 'USER' && userDeptNames.includes(t.department || ''));
                  return (
                    <div key={t.id} className="flex flex-col bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-sm gap-2 group">
                      {editingTeacherId === t.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" value={teacherForm.name || ''} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} className="px-2 py-1 border rounded" placeholder="姓名" />
                            <select value={teacherForm.gender || ''} onChange={e => setTeacherForm({...teacherForm, gender: e.target.value as any})} className="px-2 py-1 border rounded">
                              <option value="">性别</option>
                              <option value="男">男</option>
                              <option value="女">女</option>
                            </select>
                            <input type="text" value={teacherForm.idCard || ''} onChange={e => setTeacherForm({...teacherForm, idCard: e.target.value})} className="col-span-2 px-2 py-1 border rounded" placeholder="身份证" />
                            <input type="text" value={teacherForm.department || ''} onChange={e => setTeacherForm({...teacherForm, department: e.target.value})} className="px-2 py-1 border rounded" placeholder="部门" />
                            <input type="text" value={teacherForm.primarySubject || ''} onChange={e => setTeacherForm({...teacherForm, primarySubject: e.target.value})} className="px-2 py-1 border rounded" placeholder="学科" />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingTeacherId(null)} className="text-slate-500 hover:text-slate-700 text-xs">取消</button>
                            <button onClick={saveTeacher} className="text-indigo-600 hover:text-indigo-700 font-medium text-xs">保存</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {isAdmin && (
                                <input type="checkbox" checked={selectedTeachers.has(t.id)} onChange={() => toggleTeacherSelection(t.id)} className="cursor-pointer" />
                              )}
                              <div className="flex flex-col">
                                <span className="font-medium">{t.name} {t.gender && `(${t.gender})`}</span>
                              </div>
                            </div>
                            {canEdit && (
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => startEditTeacher(t)} className="text-slate-400 hover:text-indigo-600 p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => deleteTeacher(t.id)} className="text-slate-400 hover:text-rose-600 p-1"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1 ml-0">
                            {t.idCard && <span>身份证: {t.idCard.length === 18 ? `${t.idCard.substring(0, 6)}****${t.idCard.substring(14)}` : t.idCard}</span>}
                            {t.department && <span>产业部: {t.department}</span>}
                            {t.primarySubject && <span>学科: {t.primarySubject}</span>}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Subjects */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-600" /> 科目管理
                </h3>
                {(isAdmin || user?.role === 'USER') && (
                  <div className="flex gap-2">
                    <button onClick={downloadSubjectTemplate} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-300">
                      <Download className="w-3 h-3" /> 下载模板
                    </button>
                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-300">
                      <Upload className="w-3 h-3" /> 导入Excel
                      <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleSubjectImport} />
                    </label>
                  </div>
                )}
              </div>
              <div className="mt-3 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜索科目名称或类型..."
                  value={subjectSearchQuery}
                  onChange={(e) => setSubjectSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              {(isAdmin || user?.role === 'USER') && (
                <form onSubmit={(e) => { 
                  e.preventDefault(); 
                  if(newSubjectName.trim()) { 
                    const isProfessional = newSubjectType === '中职专业课';
                    const deptId = user?.role === 'USER' ? (newSubjectDepartmentId || user.departmentIds?.[0] || '') : newSubjectDepartmentId;
                    addSubject(
                      newSubjectName.trim(), 
                      newSubjectType, 
                      isProfessional ? deptId : undefined, 
                      isProfessional ? newSubjectMajorId : undefined
                    ); 
                    setNewSubjectName(''); 
                  } 
                }} className="mt-3 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="新科目名称..." className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
                    <select value={newSubjectType} onChange={(e) => setNewSubjectType(e.target.value as SubjectType)} className="px-2 border border-slate-300 rounded-md text-sm">
                      <option value="中职公共基础课">中职公共基础课</option>
                      <option value="中职专业课">中职专业课</option>
                      <option value="综合高中文化课">综合高中文化课</option>
                      <option value="综合高中技能课">综合高中技能课</option>
                    </select>
                  </div>
                  {newSubjectType === '中职专业课' && (
                    <div className="flex gap-2">
                      <select 
                        value={user?.role === 'USER' ? (newSubjectDepartmentId || user.departmentIds?.[0] || '') : newSubjectDepartmentId} 
                        onChange={(e) => { setNewSubjectDepartmentId(e.target.value); setNewSubjectMajorId(''); }} 
                        className="flex-1 px-2 py-1.5 border border-slate-300 rounded-md text-sm disabled:bg-slate-50"
                        disabled={user?.role === 'USER' && (!user.departmentIds || user.departmentIds.length <= 1)}
                      >
                        <option value="">选择产业部...</option>
                        {state.departments
                          .filter(d => user?.role !== 'USER' || user.departmentIds?.includes(d.id))
                          .map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                      </select>
                      <select 
                        value={newSubjectMajorId} 
                        onChange={(e) => setNewSubjectMajorId(e.target.value)} 
                        className="flex-1 px-2 py-1.5 border border-slate-300 rounded-md text-sm disabled:bg-slate-50" 
                        disabled={user?.role === 'USER' ? (!user.departmentIds || user.departmentIds.length === 0) : !newSubjectDepartmentId}
                      >
                        <option value="">选择专业(可选)...</option>
                        {state.majors.filter(m => {
                          const currentDeptId = user?.role === 'USER' ? (newSubjectDepartmentId || user.departmentIds?.[0]) : newSubjectDepartmentId;
                          return m.departmentId === currentDeptId;
                        }).map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <button type="submit" disabled={!newSubjectName.trim() || (newSubjectType === '中职专业课' && (user?.role === 'USER' ? (!user.departmentIds || user.departmentIds.length === 0) : !newSubjectDepartmentId))} className="w-full bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm flex items-center justify-center gap-1"><Plus className="w-4 h-4" /> 添加科目</button>
                </form>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-2">
                {filteredSubjects.length > 0 && isAdmin && (
                  <div className="flex justify-between items-center px-2 py-1 bg-slate-100 rounded text-sm mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={selectedSubjects.size === filteredSubjects.length && filteredSubjects.length > 0} onChange={(e) => {
                        if (e.target.checked) setSelectedSubjects(new Set(filteredSubjects.map(s => s.id)));
                        else setSelectedSubjects(new Set());
                      }} />
                      <span className="text-slate-600">全选</span>
                    </label>
                    {selectedSubjects.size > 0 && (
                      <button onClick={handleBatchDeleteSubjects} className="text-rose-600 hover:text-rose-700 font-medium text-xs bg-rose-50 px-2 py-1 rounded border border-rose-200">批量删除 ({selectedSubjects.size})</button>
                    )}
                  </div>
                )}

                {editingSubjectId ? (
                  <div className="bg-white p-3 rounded-lg border border-indigo-200 shadow-sm space-y-3 mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="text-xs font-bold text-indigo-600 uppercase">编辑科目</h4>
                      <button onClick={() => setEditingSubjectId(null)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        value={subjectForm.name || ''} 
                        onChange={e => setSubjectForm({...subjectForm, name: e.target.value})} 
                        className="w-full px-2 py-1.5 border rounded text-sm" 
                        placeholder="科目名称" 
                      />
                      <select 
                        value={subjectForm.type || ''} 
                        onChange={e => setSubjectForm({...subjectForm, type: e.target.value as any})} 
                        className="w-full px-2 py-1.5 border rounded text-sm"
                      >
                        <option value="中职公共基础课">中职公共基础课</option>
                        <option value="中职专业课">中职专业课</option>
                        <option value="综合高中文化课">综合高中文化课</option>
                        <option value="综合高中技能课">综合高中技能课</option>
                      </select>
                      {subjectForm.type === '中职专业课' && (
                        <div className="grid grid-cols-2 gap-2">
                          <select 
                            value={subjectForm.departmentId || ''} 
                            onChange={e => setSubjectForm({...subjectForm, departmentId: e.target.value, majorId: ''})} 
                            className="px-2 py-1.5 border rounded text-xs"
                          >
                            <option value="">选择产业部</option>
                            {state.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                          <select 
                            value={subjectForm.majorId || ''} 
                            onChange={e => setSubjectForm({...subjectForm, majorId: e.target.value})} 
                            className="px-2 py-1.5 border rounded text-xs"
                          >
                            <option value="">选择专业</option>
                            {state.majors.filter(m => m.departmentId === subjectForm.departmentId).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button onClick={() => setEditingSubjectId(null)} className="px-3 py-1 text-slate-500 hover:bg-slate-100 rounded text-xs">取消</button>
                      <button onClick={saveSubject} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-xs">保存修改</button>
                    </div>
                  </div>
                ) : null}

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={filteredSubjects.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {filteredSubjects.map(s => (
                        <SortableSubjectItem 
                          key={s.id} 
                          subject={s} 
                          isAdmin={isAdmin} 
                          user={user} 
                          state={state} 
                          canEdit={isAdmin || (user?.role === 'USER' && user.departmentIds?.includes(s.departmentId || ''))}
                          selectedSubjects={selectedSubjects}
                          toggleSubjectSelection={toggleSubjectSelection}
                          startEditSubject={startEditSubject}
                          deleteSubject={deleteSubject}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </div>

          {/* Class Categories */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Tags className="w-4 h-4 text-amber-600" /> 班级类别字典
              </h3>
              {isAdmin && (
                <form onSubmit={(e) => { e.preventDefault(); if(newCategoryName.trim()) { addClassCategory(newCategoryName.trim()); setNewCategoryName(''); } }} className="mt-3 flex gap-2">
                  <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="新类别名称..." className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
                  <button type="submit" disabled={!newCategoryName.trim()} className="bg-amber-600 text-white px-3 py-1.5 rounded-md hover:bg-amber-700 disabled:opacity-50 text-sm"><Plus className="w-4 h-4" /></button>
                </form>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="flex flex-wrap gap-2">
                {state.classCategories.map(c => (
                  <div key={c.id} className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full text-sm border border-amber-200 text-amber-800">
                    {c.name}
                    {isAdmin && <button onClick={() => deleteClassCategory(c.id)} className="text-amber-400 hover:text-rose-600 ml-1"><X className="w-3 h-3" /></button>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Grades */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Tags className="w-4 h-4 text-purple-600" /> 年级字典
              </h3>
              {isAdmin && (
                <form onSubmit={(e) => { e.preventDefault(); if(newGradeName.trim()) { addGrade(newGradeName.trim()); setNewGradeName(''); } }} className="mt-3 flex gap-2">
                  <input type="text" value={newGradeName} onChange={(e) => setNewGradeName(e.target.value)} placeholder="新年级名称..." className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
                  <button type="submit" disabled={!newGradeName.trim()} className="bg-purple-600 text-white px-3 py-1.5 rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm"><Plus className="w-4 h-4" /></button>
                </form>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="flex flex-wrap gap-2">
                {state.grades.map(g => (
                  <div key={g.id} className="flex items-center gap-1 bg-purple-50 px-3 py-1.5 rounded-full text-sm border border-purple-200 text-purple-800">
                    {g.name}
                    {isAdmin && <button onClick={() => deleteGrade(g.id)} className="text-purple-400 hover:text-rose-600 ml-1"><X className="w-3 h-3" /></button>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Maintenance Section */}
      {isAdmin && (
        <div className="mt-12 p-6 bg-slate-50 rounded-xl border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Save className="w-5 h-5 text-indigo-600" /> 系统全量数据维护与备份
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-700">数据导出 (全量备份)</h4>
              <p className="text-xs text-slate-500">将当前系统所有数据（组织、教师、科目、排课、存档等）导出为 JSON 文件，用于迁移或更新前的安全备份。</p>
              <button 
                onClick={handleExportSystemData}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
              >
                <Download className="w-4 h-4" /> 导出全量备份 (JSON)
              </button>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-700">数据导入 (全量恢复)</h4>
              <p className="text-xs text-slate-500">从备份文件恢复系统数据。注意：这将覆盖当前系统中的所有数据，且不可撤销。</p>
              <div className="flex gap-2">
                <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-sm font-medium">
                  <Upload className="w-4 h-4" /> 选择备份文件并导入
                  <input type="file" accept=".json" className="hidden" onChange={handleImportSystemData} />
                </label>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200">
            <h4 className="text-sm font-bold text-rose-600 mb-2">危险操作区域</h4>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => setShowClearSchedulesPrompt(true)} 
                className="bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-md hover:bg-rose-100 text-sm flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" /> 一键清除全校排课
              </button>
              <button 
                onClick={() => setShowClearClassesPrompt(true)} 
                className="bg-rose-50 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-md hover:bg-rose-100 text-sm flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" /> 一键清除全校班级
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        type="danger"
        confirmText="确认删除"
      />

      {importResultModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-slate-800 mb-2">{importResultModal.title}</h3>
              <p className="text-slate-600 mb-6">{importResultModal.message}</p>
              <div className="flex justify-end">
                <button
                  onClick={() => setImportResultModal({ ...importResultModal, isOpen: false })}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PromptModal
        isOpen={showClearClassesPrompt}
        title="清除全校班级"
        message="此操作将删除所有班级及其排课数据，且不可恢复。请输入超级管理员密码以确认："
        isPassword={true}
        onConfirm={(password) => {
          if (password === 'Bbzj@1234') {
            clearClasses();
            setShowClearClassesPrompt(false);
            setImportResultModal({
              isOpen: true,
              title: '操作成功',
              message: '已成功清除全校所有班级数据。'
            });
          } else {
            setShowClearClassesPrompt(false);
            setImportResultModal({
              isOpen: true,
              title: '密码错误',
              message: '您输入的超级管理员密码不正确，操作已取消。'
            });
          }
        }}
        onCancel={() => setShowClearClassesPrompt(false)}
      />

      <PromptModal
        isOpen={showClearSchedulesPrompt}
        title="清除全校排课"
        message="此操作将删除全校所有排课数据，且不可恢复。请输入超级管理员密码以确认："
        isPassword={true}
        onConfirm={(password) => {
          if (password === 'Bbzj@1234') {
            clearSchedules();
            setShowClearSchedulesPrompt(false);
            setImportResultModal({
              isOpen: true,
              title: '操作成功',
              message: '已成功清除全校所有排课数据。'
            });
          } else {
            setShowClearSchedulesPrompt(false);
            setImportResultModal({
              isOpen: true,
              title: '密码错误',
              message: '您输入的超级管理员密码不正确，操作已取消。'
            });
          }
        }}
        onCancel={() => setShowClearSchedulesPrompt(false)}
      />

      <PromptModal
        isOpen={showImportBackupPrompt}
        title="确认恢复系统备份"
        message="警告：恢复备份将彻底覆盖当前系统中的所有数据（除了用户账号）。此操作不可撤销！请输入超级管理员密码以确认："
        isPassword={true}
        onConfirm={confirmImportBackup}
        onCancel={() => setShowImportBackupPrompt(false)}
      />
    </div>
  );
}
