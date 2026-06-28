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
    addTeacher, addTeachers, updateTeacher, updateTeachers, deleteTeacher, deleteTeachers,
    addSubject, addSubjects, updateSubject, updateSubjects, deleteSubject, deleteSubjects, reorderSubject, updateSubjectsOrder,
    addClassCategory, deleteClassCategory,
    addGrade, deleteGrade,
    clearSchedules
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<'org' | 'teacher' | 'subject' | 'dict'>('org');

  // Teacher Filter state
  const [teacherDeptFilter, setTeacherDeptFilter] = useState<string>('');
  const [teacherSubjectFilter, setTeacherSubjectFilter] = useState<string>('');
  const [teacherGenderFilter, setTeacherGenderFilter] = useState<string>('');

  // Teacher Batch Update state
  const [teacherBatchDept, setTeacherBatchDept] = useState<string>('');
  const [teacherBatchSubject, setTeacherBatchSubject] = useState<string>('');
  const [teacherBatchGender, setTeacherBatchGender] = useState<string>('');

  // Subject Filter state
  const [subjectTypeFilter, setSubjectTypeFilter] = useState<string>('');
  const [subjectDeptFilter, setSubjectDeptFilter] = useState<string>('');
  const [subjectMajorFilter, setSubjectMajorFilter] = useState<string>('');

  // Subject Batch Update state
  const [subjectBatchType, setSubjectBatchType] = useState<string>('');
  const [subjectBatchDept, setSubjectBatchDept] = useState<string>('');
  const [subjectBatchMajor, setSubjectBatchMajor] = useState<string>('');

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
  const [teacherSortField, setTeacherSortField] = useState<'name' | 'department' | 'primarySubject' | 'gender'>('name');
  const [teacherSortOrder, setTeacherSortOrder] = useState<'asc' | 'desc'>('asc');
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
      headTeacherId: '',
      status: '正常在校'
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
    try {
      const verifyRes = await fetch('/api/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: password.trim() })
      });
      const verifyData = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok || !verifyData.valid) {
        setImportResultModal({
          isOpen: true,
          title: '密码错误',
          message: '您输入的超级管理员密码不正确，操作已取消。'
        });
        setShowImportBackupPrompt(false);
        return;
      }
    } catch (e) {
      setImportResultModal({
        isOpen: true,
        title: '验证失败',
        message: '无法验证管理员密码，请重试或检查服务器状态。'
      });
      setShowImportBackupPrompt(false);
      return;
    }

    try {
      const response = await fetch('/api/state/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ...pendingBackupData, password: password.trim() })
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

  const applyTeacherBatchDept = (deptName: string) => {
    if (!deptName) return;
    const teachersToUpdate = state.teachers
      .filter(t => selectedTeachers.has(t.id))
      .map(t => ({ ...t, department: deptName }));
    updateTeachers(teachersToUpdate);
    setSelectedTeachers(new Set());
    setTeacherBatchDept('');
  };

  const applyTeacherBatchSubject = (subjectName: string) => {
    if (!subjectName) return;
    const teachersToUpdate = state.teachers
      .filter(t => selectedTeachers.has(t.id))
      .map(t => ({ ...t, primarySubject: subjectName }));
    updateTeachers(teachersToUpdate);
    setSelectedTeachers(new Set());
    setTeacherBatchSubject('');
  };

  const applyTeacherBatchGender = (gender: '男' | '女') => {
    const teachersToUpdate = state.teachers
      .filter(t => selectedTeachers.has(t.id))
      .map(t => ({ ...t, gender }));
    updateTeachers(teachersToUpdate);
    setSelectedTeachers(new Set());
    setTeacherBatchGender('');
  };

  const applySubjectBatchType = (type: SubjectType) => {
    const subjectsToUpdate = state.subjects
      .filter(s => selectedSubjects.has(s.id))
      .map(s => {
        const isProfessional = type === '中职专业课';
        return {
          ...s,
          type,
          departmentId: isProfessional ? s.departmentId : undefined,
          majorId: isProfessional ? s.majorId : undefined
        };
      });
    updateSubjects(subjectsToUpdate);
    setSelectedSubjects(new Set());
    setSubjectBatchType('');
  };

  const applySubjectBatchDept = (deptId: string) => {
    if (!deptId) return;
    const subjectsToUpdate = state.subjects
      .filter(s => selectedSubjects.has(s.id))
      .map(s => ({ ...s, departmentId: deptId, majorId: undefined }));
    updateSubjects(subjectsToUpdate);
    setSelectedSubjects(new Set());
    setSubjectBatchDept('');
  };

  const applySubjectBatchMajor = (majorId: string) => {
    if (!majorId) return;
    const subjectsToUpdate = state.subjects
      .filter(s => selectedSubjects.has(s.id))
      .map(s => {
        const major = state.majors.find(m => m.id === majorId);
        return {
          ...s,
          majorId,
          departmentId: major ? major.departmentId : s.departmentId
        };
      });
    updateSubjects(subjectsToUpdate);
    setSelectedSubjects(new Set());
    setSubjectBatchMajor('');
  };

  const filteredTeachers = useMemo(() => {
    let list = state.teachers;
    if (teacherSearchQuery.trim()) {
      const query = teacherSearchQuery.toLowerCase();
      list = list.filter(t => 
        t.name.toLowerCase().includes(query) || 
        t.department?.toLowerCase().includes(query) ||
        t.primarySubject?.toLowerCase().includes(query)
      );
    }
    if (teacherDeptFilter) {
      list = list.filter(t => t.department === teacherDeptFilter);
    }
    if (teacherSubjectFilter) {
      list = list.filter(t => t.primarySubject === teacherSubjectFilter);
    }
    if (teacherGenderFilter) {
      list = list.filter(t => t.gender === teacherGenderFilter);
    }
    
    // Sort
    list = [...list].sort((a, b) => {
      let valA = a[teacherSortField] || '';
      let valB = b[teacherSortField] || '';
      
      let comparison = valA.localeCompare(valB, 'zh-CN');
      
      return teacherSortOrder === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [state.teachers, teacherSearchQuery, teacherDeptFilter, teacherSubjectFilter, teacherGenderFilter, teacherSortField, teacherSortOrder]);

  const filteredSubjects = useMemo(() => {
    let list = state.subjects;
    if (subjectSearchQuery.trim()) {
      const query = subjectSearchQuery.toLowerCase();
      list = list.filter(s => 
        s.name.toLowerCase().includes(query) || 
        s.type.toLowerCase().includes(query)
      );
    }
    if (subjectTypeFilter) {
      list = list.filter(s => s.type === subjectTypeFilter);
    }
    if (subjectDeptFilter) {
      list = list.filter(s => s.departmentId === subjectDeptFilter);
    }
    if (subjectMajorFilter) {
      list = list.filter(s => s.majorId === subjectMajorFilter);
    }
    return list;
  }, [state.subjects, subjectSearchQuery, subjectTypeFilter, subjectDeptFilter, subjectMajorFilter]);

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
          onClick={() => setActiveTab('teacher')}
          className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'teacher' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          教师管理
        </button>
        <button 
          onClick={() => setActiveTab('subject')}
          className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'subject' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          科目管理
        </button>
        <button 
          onClick={() => setActiveTab('dict')}
          className={`pb-3 px-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'dict' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          年级与类别字典
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
                              <label className="block text-xs text-slate-500 mb-1">在校状态</label>
                              <select value={classForm.status || '正常在校'} onChange={e => setClassForm({...classForm, status: e.target.value as any})} className="w-full px-2 py-1 border rounded">
                                <option value="正常在校">正常在校</option>
                                <option value="外出实习">外出实习 (自动清空排课)</option>
                                <option value="实习返校">实习返校</option>
                                <option value="已毕业">已毕业 (自动清空排课)</option>
                                <option value="合并解散">合并解散 (自动清空排课)</option>
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
                            <div className="col-span-2">
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
                            <div className="flex items-center gap-2 flex-wrap">
                              {canEdit && (
                                <input type="checkbox" checked={selectedClasses.has(cls.id)} onChange={() => toggleClassSelection(cls.id)} className="cursor-pointer" />
                              )}
                              <h4 className="font-bold text-slate-800">{cls.name}</h4>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                                (cls.status || '正常在校') === '正常在校' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                (cls.status || '正常在校') === '外出实习' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                (cls.status || '正常在校') === '实习返校' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                (cls.status || '正常在校') === '合并解散' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                                'bg-rose-50 text-rose-700 border-rose-100'
                              }`}>
                                {cls.status || '正常在校'}
                              </span>
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

      {activeTab === 'teacher' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Add/Edit Teacher */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-indigo-600" />
                {editingTeacherId ? '编辑教师' : '添加教师'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {editingTeacherId ? '修改当前教师的基础属性和任教学科' : '向系统录入一位新的教师信息'}
              </p>
            </div>

            {editingTeacherId ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">姓名 *</label>
                  <input type="text" value={teacherForm.name || ''} onChange={e => setTeacherForm({...teacherForm, name: e.target.value})} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-indigo-500" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">性别</label>
                  <select value={teacherForm.gender || ''} onChange={e => setTeacherForm({...teacherForm, gender: e.target.value as any})} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-indigo-500">
                    <option value="">未知</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">身份证号</label>
                  <input type="text" value={teacherForm.idCard || ''} onChange={e => setTeacherForm({...teacherForm, idCard: e.target.value})} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">所属产业部</label>
                  {user?.role === 'USER' && user.departmentIds && user.departmentIds.length === 1 ? (
                    <input type="text" value={userDeptNames[0] || ''} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm disabled:bg-slate-50" disabled />
                  ) : (
                    <select 
                      value={teacherForm.department || ''} 
                      onChange={e => setTeacherForm({...teacherForm, department: e.target.value})} 
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                    >
                      <option value="">请选择产业部</option>
                      {user?.role === 'USER' ? (
                        userDeptNames.map(name => <option key={name} value={name}>{name}</option>)
                      ) : (
                        state.departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)
                      )}
                      {teacherForm.department && !(user?.role === 'USER' ? userDeptNames : state.departments.map(d => d.name)).includes(teacherForm.department) && (
                        <option value={teacherForm.department}>{teacherForm.department}</option>
                      )}
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">主要任教学科</label>
                  <input type="text" value={teacherForm.primarySubject || ''} onChange={e => setTeacherForm({...teacherForm, primarySubject: e.target.value})} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-indigo-500" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setEditingTeacherId(null); setTeacherForm({}); }} className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 rounded text-sm hover:bg-slate-50">取消</button>
                  <button onClick={() => { if (teacherForm.name?.trim()) { updateTeacher(teacherForm as Teacher); setEditingTeacherId(null); setTeacherForm({}); } }} className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">保存修改</button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                if(newTeacherName.trim()) { 
                  addTeacher({
                    name: newTeacherName.trim(),
                    gender: newTeacherGender as any,
                    idCard: newTeacherIdCard.trim(),
                    department: user?.role === 'USER' && user.departmentIds?.length === 1 ? (userDeptNames[0] || '') : newTeacherDepartment.trim(),
                    primarySubject: newTeacherPrimarySubject.trim()
                  }); 
                  setNewTeacherName(''); 
                  setNewTeacherGender('');
                  setNewTeacherIdCard('');
                  setNewTeacherDepartment('');
                  setNewTeacherPrimarySubject('');
                } 
              }} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">姓名 *</label>
                  <input type="text" value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} placeholder="教师姓名" className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">性别</label>
                  <select value={newTeacherGender} onChange={(e) => setNewTeacherGender(e.target.value as any)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm">
                    <option value="">选择性别</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">身份证号</label>
                  <input type="text" value={newTeacherIdCard} onChange={(e) => setNewTeacherIdCard(e.target.value)} placeholder="输入身份证号" className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">所属产业部</label>
                  {user?.role === 'USER' && user.departmentIds && user.departmentIds.length === 1 ? (
                    <input type="text" value={userDeptNames[0] || ''} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm disabled:bg-slate-50" disabled />
                  ) : (
                    <select 
                      value={newTeacherDepartment || ''} 
                      onChange={(e) => setNewTeacherDepartment(e.target.value)} 
                      className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
                    >
                      <option value="">请选择产业部</option>
                      {user?.role === 'USER' ? (
                        userDeptNames.map(name => <option key={name} value={name}>{name}</option>)
                      ) : (
                        state.departments.map(d => <option key={d.name} value={d.name}>{d.name}</option>)
                      )}
                    </select>
                  )}
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">主要任教学科</label>
                  <input type="text" value={newTeacherPrimarySubject} onChange={(e) => setNewTeacherPrimarySubject(e.target.value)} placeholder="例如：语文、电子" className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" />
                </div>
                <button type="submit" disabled={!newTeacherName.trim()} className="w-full bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1 font-medium mt-2"><Plus className="w-4 h-4" /> 添加教师</button>
              </form>
            )}

            {/* Batch Excel Actions */}
            {(isAdmin || user?.role === 'USER') && (
              <div className="border-t border-slate-100 pt-4 mt-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Excel 批量操作</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={downloadTeacherTemplate} className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-2 py-1.5 rounded text-xs flex items-center justify-center gap-1 border border-slate-200">
                    <Download className="w-3.5 h-3.5" /> 模板下载
                  </button>
                  <label className="cursor-pointer bg-slate-50 hover:bg-slate-100 text-slate-600 px-2 py-1.5 rounded text-xs flex items-center justify-center gap-1 border border-slate-200">
                    <Upload className="w-3.5 h-3.5" /> 导入数据
                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleTeacherImport} />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Teacher Table & Filters */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            {/* Header / Filter Toolbar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <h3 className="font-bold text-slate-800">教师档案列表 ({filteredTeachers.length}人)</h3>
                
                {/* Search query */}
                <div className="relative w-full md:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="搜索姓名/学科/属性..." value={teacherSearchQuery} onChange={e => setTeacherSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 bg-white shadow-sm" />
                </div>
              </div>

              {/* Filters list */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400">快速过滤:</span>
                <select value={teacherDeptFilter} onChange={e => setTeacherDeptFilter(e.target.value)} className="border border-slate-300 rounded px-2 py-1 bg-white">
                  <option value="">全部产业部</option>
                  {Array.from(new Set(state.teachers.map(t => t.department).filter(Boolean))).map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                  {state.departments.map(d => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>

                <select value={teacherSubjectFilter} onChange={e => setTeacherSubjectFilter(e.target.value)} className="border border-slate-300 rounded px-2 py-1 bg-white">
                  <option value="">全部任教学科</option>
                  {Array.from(new Set(state.teachers.map(t => t.primarySubject).filter(Boolean))).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>

                <select value={teacherGenderFilter} onChange={e => setTeacherGenderFilter(e.target.value)} className="border border-slate-300 rounded px-2 py-1 bg-white">
                  <option value="">全部性别</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>

                {(teacherDeptFilter || teacherSubjectFilter || teacherGenderFilter || teacherSearchQuery) && (
                  <button onClick={() => { setTeacherDeptFilter(''); setTeacherSubjectFilter(''); setTeacherGenderFilter(''); setTeacherSearchQuery(''); }} className="text-indigo-600 hover:text-indigo-800 font-medium ml-1">清除过滤</button>
                )}
              </div>

              {/* Bulk operations bar */}
              {selectedTeachers.size > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-indigo-900">
                  <div className="font-semibold">已选中 {selectedTeachers.size} 位教师</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Batch Change Dept */}
                    <div className="flex items-center gap-1">
                      <select value={teacherBatchDept} onChange={e => setTeacherBatchDept(e.target.value)} className="border border-indigo-200 rounded px-1.5 py-1 bg-white">
                        <option value="">统一部门</option>
                        {state.departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                      </select>
                      <button onClick={() => applyTeacherBatchDept(teacherBatchDept)} className="bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">应用</button>
                    </div>

                    {/* Batch Change Subject */}
                    <div className="flex items-center gap-1">
                      <input type="text" placeholder="统一学科" value={teacherBatchSubject} onChange={e => setTeacherBatchSubject(e.target.value)} className="border border-indigo-200 rounded px-1.5 py-1 bg-white w-24" />
                      <button onClick={() => applyTeacherBatchSubject(teacherBatchSubject)} className="bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">应用</button>
                    </div>

                    {/* Batch Change Gender */}
                    <div className="flex items-center gap-1">
                      <select value={teacherBatchGender} onChange={e => setTeacherBatchGender(e.target.value)} className="border border-indigo-200 rounded px-1.5 py-1 bg-white">
                        <option value="">统一性别</option>
                        <option value="男">男</option>
                        <option value="女">女</option>
                      </select>
                      <button onClick={() => { if (teacherBatchGender) applyTeacherBatchGender(teacherBatchGender as any); }} className="bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">应用</button>
                    </div>

                    <button onClick={handleBatchDeleteTeachers} className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1 rounded hover:bg-rose-100 flex items-center gap-1 font-semibold ml-2">
                      <Trash2 className="w-3.5 h-3.5" /> 批量删除
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Table layout */}
            <div className="flex-1 overflow-auto max-h-[500px]">
              <table className="w-full text-sm text-left text-slate-600 border-collapse">
                <thead className="text-xs text-slate-700 bg-slate-50 sticky top-0 border-b border-slate-100">
                  <tr>
                    <th className="p-3 w-10">
                      <input type="checkbox" checked={filteredTeachers.length > 0 && selectedTeachers.size === filteredTeachers.length} onChange={e => {
                        if (e.target.checked) setSelectedTeachers(new Set(filteredTeachers.map(t => t.id)));
                        else setSelectedTeachers(new Set());
                      }} className="cursor-pointer" />
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => {
                      if (teacherSortField === 'name') setTeacherSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setTeacherSortField('name'); setTeacherSortOrder('asc'); }
                    }}>
                      <div className="flex items-center gap-1">姓名 {teacherSortField === 'name' && <span className="text-indigo-600">{teacherSortOrder === 'asc' ? '↑' : '↓'}</span>}</div>
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => {
                      if (teacherSortField === 'gender') setTeacherSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setTeacherSortField('gender'); setTeacherSortOrder('asc'); }
                    }}>
                      <div className="flex items-center gap-1">性别 {teacherSortField === 'gender' && <span className="text-indigo-600">{teacherSortOrder === 'asc' ? '↑' : '↓'}</span>}</div>
                    </th>
                    <th className="p-3">身份证号</th>
                    <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => {
                      if (teacherSortField === 'department') setTeacherSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setTeacherSortField('department'); setTeacherSortOrder('asc'); }
                    }}>
                      <div className="flex items-center gap-1">所属产业部 {teacherSortField === 'department' && <span className="text-indigo-600">{teacherSortOrder === 'asc' ? '↑' : '↓'}</span>}</div>
                    </th>
                    <th className="p-3 cursor-pointer hover:bg-slate-100 transition-colors select-none" onClick={() => {
                      if (teacherSortField === 'primarySubject') setTeacherSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                      else { setTeacherSortField('primarySubject'); setTeacherSortOrder('asc'); }
                    }}>
                      <div className="flex items-center gap-1">任教学科 {teacherSortField === 'primarySubject' && <span className="text-indigo-600">{teacherSortOrder === 'asc' ? '↑' : '↓'}</span>}</div>
                    </th>
                    <th className="p-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTeachers.map(t => {
                    const isSelected = selectedTeachers.has(t.id);
                    const canEdit = isAdmin || (user?.role === 'USER' && userDeptNames.includes(t.department || ''));
                    return (
                      <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                        <td className="p-3">
                          <input type="checkbox" checked={isSelected} onChange={() => {
                            const next = new Set(selectedTeachers);
                            if (next.has(t.id)) next.delete(t.id);
                            else next.add(t.id);
                            setSelectedTeachers(next);
                          }} className="cursor-pointer" />
                        </td>
                        <td className="p-3 font-semibold text-slate-900">{t.name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${t.gender === '男' ? 'bg-blue-50 text-blue-700 border border-blue-100' : t.gender === '女' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 'bg-slate-100 text-slate-600'}`}>{t.gender || '未知'}</span>
                        </td>
                        <td className="p-3 font-mono text-slate-500 text-xs">{t.idCard || '-'}</td>
                        <td className="p-3">{t.department || '-'}</td>
                        <td className="p-3">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 text-xs">{t.primarySubject || '-'}</span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            {canEdit && (
                              <button onClick={() => { setEditingTeacherId(t.id); setTeacherForm(t); }} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded" title="编辑"><Edit2 className="w-4 h-4" /></button>
                            )}
                            {isAdmin && (
                              <button onClick={() => deleteTeacher(t.id)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded" title="删除"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTeachers.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">暂无符合条件的教师数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subject' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel: Add/Edit Subject */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                {editingSubjectId ? '编辑科目' : '添加科目'}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {editingSubjectId ? '修改当前学科/科目的属性关联' : '向系统录入一门新的课程科目'}
              </p>
            </div>

            {editingSubjectId ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">科目名称 *</label>
                  <input type="text" value={subjectForm.name || ''} onChange={e => setSubjectForm({...subjectForm, name: e.target.value})} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-indigo-500" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">科目类别</label>
                  <select value={subjectForm.type || '中职公共基础课'} onChange={e => setSubjectForm({...subjectForm, type: e.target.value as SubjectType, departmentId: '', majorId: ''})} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-indigo-500">
                    <option value="中职公共基础课">中职公共基础课</option>
                    <option value="中职专业课">中职专业课</option>
                    <option value="综合高中文化课">综合高中文化课</option>
                    <option value="综合高中技能课">综合高中技能课</option>
                  </select>
                </div>
                {subjectForm.type === '中职专业课' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">关联产业部</label>
                      <select value={subjectForm.departmentId || ''} onChange={e => setSubjectForm({...subjectForm, departmentId: e.target.value, majorId: ''})} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs">
                        <option value="">选择产业部</option>
                        {state.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">关联专业</label>
                      <select value={subjectForm.majorId || ''} onChange={e => setSubjectForm({...subjectForm, majorId: e.target.value})} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs">
                        <option value="">选择专业</option>
                        {state.majors.filter(m => m.departmentId === subjectForm.departmentId).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setEditingSubjectId(null); setSubjectForm({}); }} className="flex-1 px-3 py-2 border border-slate-200 text-slate-600 rounded text-sm hover:bg-slate-50">取消</button>
                  <button onClick={() => { if (subjectForm.name?.trim()) { updateSubject(subjectForm as Subject); setEditingSubjectId(null); setSubjectForm({}); } }} className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">保存修改</button>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                if(newSubjectName.trim()) { 
                  addSubject(
                    newSubjectName.trim(),
                    newSubjectType,
                    newSubjectType === '中职专业课' ? newSubjectDepartmentId : undefined,
                    newSubjectType === '中职专业课' ? newSubjectMajorId : undefined
                  ); 
                  setNewSubjectName(''); 
                  setNewSubjectDepartmentId('');
                  setNewSubjectMajorId('');
                } 
              }} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">科目名称 *</label>
                  <input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="例如：电子技术基础" className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm" required />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">科目类别</label>
                  <select value={newSubjectType} onChange={(e) => setNewSubjectType(e.target.value as SubjectType)} className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm">
                    <option value="中职公共基础课">中职公共基础课</option>
                    <option value="中职专业课">中职专业课</option>
                    <option value="综合高中文化课">综合高中文化课</option>
                    <option value="综合高中技能课">综合高中技能课</option>
                  </select>
                </div>
                {newSubjectType === '中职专业课' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">关联产业部</label>
                      <select value={newSubjectDepartmentId} onChange={e => { setNewSubjectDepartmentId(e.target.value); setNewSubjectMajorId(''); }} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs" required>
                        <option value="">选择产业部</option>
                        {state.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 block mb-1">关联专业</label>
                      <select value={newSubjectMajorId} onChange={e => setNewSubjectMajorId(e.target.value)} className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs" required>
                        <option value="">选择专业</option>
                        {state.majors.filter(m => m.departmentId === newSubjectDepartmentId).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <button type="submit" disabled={!newSubjectName.trim()} className="w-full bg-indigo-600 text-white px-3 py-2 rounded text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-1 font-medium mt-2"><Plus className="w-4 h-4" /> 添加科目</button>
              </form>
            )}

            {/* Batch Excel Actions */}
            {(isAdmin || user?.role === 'USER') && (
              <div className="border-t border-slate-100 pt-4 mt-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Excel 批量操作</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={downloadSubjectTemplate} className="bg-slate-50 hover:bg-slate-100 text-slate-600 px-2 py-1.5 rounded text-xs flex items-center justify-center gap-1 border border-slate-200">
                    <Download className="w-3.5 h-3.5" /> 模板下载
                  </button>
                  <label className="cursor-pointer bg-slate-50 hover:bg-slate-100 text-slate-600 px-2 py-1.5 rounded text-xs flex items-center justify-center gap-1 border border-slate-200">
                    <Upload className="w-3.5 h-3.5" /> 导入数据
                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleSubjectImport} />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Subject Table & Filters */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            {/* Header / Filters Toolbar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <h3 className="font-bold text-slate-800">教学科目列表 ({filteredSubjects.length}门)</h3>
                
                {/* Search query */}
                <div className="relative w-full md:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="搜索科目名称..." value={subjectSearchQuery} onChange={e => setSubjectSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-indigo-500 bg-white shadow-sm" />
                </div>
              </div>

              {/* Filters list */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-400">快速过滤:</span>
                <select value={subjectTypeFilter} onChange={e => { setSubjectTypeFilter(e.target.value); setSubjectMajorFilter(''); }} className="border border-slate-300 rounded px-2 py-1 bg-white">
                  <option value="">全部类型</option>
                  <option value="中职公共基础课">中职公共基础课</option>
                  <option value="中职专业课">中职专业课</option>
                  <option value="综合高中文化课">综合高中文化课</option>
                  <option value="综合高中技能课">综合高中技能课</option>
                </select>

                <select value={subjectDeptFilter} onChange={e => { setSubjectDeptFilter(e.target.value); setSubjectMajorFilter(''); }} className="border border-slate-300 rounded px-2 py-1 bg-white">
                  <option value="">关联产业部</option>
                  {state.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>

                <select value={subjectMajorFilter} onChange={e => setSubjectMajorFilter(e.target.value)} className="border border-slate-300 rounded px-2 py-1 bg-white" disabled={!subjectDeptFilter && !state.majors.length}>
                  <option value="">关联专业</option>
                  {state.majors
                    .filter(m => !subjectDeptFilter || m.departmentId === subjectDeptFilter)
                    .map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                  }
                </select>

                {(subjectTypeFilter || subjectDeptFilter || subjectMajorFilter || subjectSearchQuery) && (
                  <button onClick={() => { setSubjectTypeFilter(''); setSubjectDeptFilter(''); setSubjectMajorFilter(''); setSubjectSearchQuery(''); }} className="text-indigo-600 hover:text-indigo-800 font-medium ml-1">清除过滤</button>
                )}
              </div>

              {/* Bulk actions bar */}
              {selectedSubjects.size > 0 && (
                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-indigo-900">
                  <div className="font-semibold">已选中 {selectedSubjects.size} 个科目</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Batch Change Type */}
                    <div className="flex items-center gap-1">
                      <select value={subjectBatchType} onChange={e => setSubjectBatchType(e.target.value)} className="border border-indigo-200 rounded px-1.5 py-1 bg-white">
                        <option value="">统一类型</option>
                        <option value="中职公共基础课">中职公共基础课</option>
                        <option value="中职专业课">中职专业课</option>
                        <option value="综合高中文化课">综合高中文化课</option>
                        <option value="综合高中技能课">综合高中技能课</option>
                      </select>
                      <button onClick={() => { if (subjectBatchType) applySubjectBatchType(subjectBatchType as any); }} className="bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">应用</button>
                    </div>

                    {/* Batch Change Dept */}
                    <div className="flex items-center gap-1">
                      <select value={subjectBatchDept} onChange={e => setSubjectBatchDept(e.target.value)} className="border border-indigo-200 rounded px-1.5 py-1 bg-white">
                        <option value="">统一产业部</option>
                        {state.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <button onClick={() => applySubjectBatchDept(subjectBatchDept)} className="bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">应用</button>
                    </div>

                    {/* Batch Change Major */}
                    <div className="flex items-center gap-1">
                      <select value={subjectBatchMajor} onChange={e => setSubjectBatchMajor(e.target.value)} className="border border-indigo-200 rounded px-1.5 py-1 bg-white">
                        <option value="">统一专业</option>
                        {state.majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                      <button onClick={() => applySubjectBatchMajor(subjectBatchMajor)} className="bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700">应用</button>
                    </div>

                    <button onClick={handleBatchDeleteSubjects} className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1 rounded hover:bg-rose-100 flex items-center gap-1 font-semibold ml-2">
                      <Trash2 className="w-3.5 h-3.5" /> 批量删除
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Table layout */}
            <div className="flex-1 overflow-auto max-h-[500px]">
              <table className="w-full text-sm text-left text-slate-600 border-collapse">
                <thead className="text-xs text-slate-700 bg-slate-50 sticky top-0 border-b border-slate-100">
                  <tr>
                    <th className="p-3 w-10">
                      <input type="checkbox" checked={filteredSubjects.length > 0 && selectedSubjects.size === filteredSubjects.length} onChange={e => {
                        if (e.target.checked) setSelectedSubjects(new Set(filteredSubjects.map(s => s.id)));
                        else setSelectedSubjects(new Set());
                      }} className="cursor-pointer" />
                    </th>
                    <th className="p-3">科目名称</th>
                    <th className="p-3">类型</th>
                    <th className="p-3">关联产业部</th>
                    <th className="p-3">关联专业</th>
                    <th className="p-3 text-center w-24">顺序</th>
                    <th className="p-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubjects.map((s, index) => {
                    const isSelected = selectedSubjects.has(s.id);
                    const canEdit = isAdmin || (user?.role === 'USER' && user.departmentIds?.includes(s.departmentId || ''));
                    const deptName = state.departments.find(d => d.id === s.departmentId)?.name;
                    const majorName = state.majors.find(m => m.id === s.majorId)?.name;
                    return (
                      <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/40' : ''}`}>
                        <td className="p-3">
                          <input type="checkbox" checked={isSelected} onChange={() => {
                            const next = new Set(selectedSubjects);
                            if (next.has(s.id)) next.delete(s.id);
                            else next.add(s.id);
                            setSelectedSubjects(next);
                          }} className="cursor-pointer" />
                        </td>
                        <td className="p-3 font-semibold text-slate-900">{s.name}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-xs border ${
                            s.type === '中职公共基础课' ? 'bg-teal-50 text-teal-700 border-teal-100' :
                            s.type === '中职专业课' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                            s.type === '综合高中文化课' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                            'bg-orange-50 text-orange-700 border-orange-100'
                          }`}>
                            {s.type}
                          </span>
                        </td>
                        <td className="p-3">{deptName || '-'}</td>
                        <td className="p-3">{majorName || '-'}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => reorderSubject(s.id, 'up')} disabled={index === 0} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 disabled:opacity-30">
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => reorderSubject(s.id, 'down')} disabled={index === filteredSubjects.length - 1} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 disabled:opacity-30">
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            {canEdit && (
                              <button onClick={() => { setEditingSubjectId(s.id); setSubjectForm(s); }} className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded" title="编辑"><Edit2 className="w-4 h-4" /></button>
                            )}
                            {isAdmin && (
                              <button onClick={() => deleteSubject(s.id)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded" title="删除"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSubjects.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">暂无符合条件的科目数据</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dict' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Class Categories */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
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
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
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
        onConfirm={async (password) => {
          try {
            const verifyRes = await fetch('/api/verify-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ password: password.trim() })
            });
            const verifyData = await verifyRes.json().catch(() => ({}));
            if (verifyRes.ok && verifyData.valid) {
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
          } catch (e) {
            setShowClearClassesPrompt(false);
            setImportResultModal({
              isOpen: true,
              title: '验证失败',
              message: '无法验证管理员密码，请重试或检查服务器状态。'
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
        onConfirm={async (password) => {
          try {
            const verifyRes = await fetch('/api/verify-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ password: password.trim() })
            });
            const verifyData = await verifyRes.json().catch(() => ({}));
            if (verifyRes.ok && verifyData.valid) {
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
          } catch (e) {
            setShowClearSchedulesPrompt(false);
            setImportResultModal({
              isOpen: true,
              title: '验证失败',
              message: '无法验证管理员密码，请重试或检查服务器状态。'
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
