import React, { useState, useRef } from 'react';
import { useAppContext } from '../context';
import { Plus, Building2, UserCircle, BookOpen, Tags, Trash2, Edit2, Save, X, GraduationCap, Users, Upload, Download } from 'lucide-react';
import { Class } from '../types';
import * as xlsx from 'xlsx';

export function Settings() {
  const { 
    state, 
    addDepartment, deleteDepartment,
    addMajor, deleteMajor,
    addClass, updateClass, deleteClass,
    addTeacher, addTeachers, deleteTeacher,
    addSubject, addSubjects, deleteSubject,
    addClassCategory, deleteClassCategory
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
  const [newSubjectType, setNewSubjectType] = useState<'公共课' | '专业课'>('公共课');
  const [newCategoryName, setNewCategoryName] = useState('');

  // Class Edit State
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classForm, setClassForm] = useState<Partial<Class>>({});

  // Handlers
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
      
      const subjectsToAdd = data.map((row: any) => {
        let type = row['类型'] || row['type'] || '公共课';
        if (type !== '公共课' && type !== '专业课') type = '公共课';
        return {
          name: row['名称'] || row['name'] || '',
          type: type as '公共课' | '专业课'
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
    const ws = xlsx.utils.json_to_sheet([{
      '名称': '高等数学',
      '类型': '公共课'
    }]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, '科目导入模板');
    xlsx.writeFile(wb, '科目导入模板.xlsx');
  };

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
              <form onSubmit={handleAddDept} className="mt-3 flex gap-2">
                <input type="text" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder="新产业部..." className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
                <button type="submit" disabled={!newDeptName.trim()} className="bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm"><Plus className="w-4 h-4" /></button>
              </form>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-1">
              {state.departments.map(dept => (
                <div 
                  key={dept.id} 
                  onClick={() => { setSelectedDeptId(dept.id); setSelectedMajorId(''); }}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedDeptId === dept.id ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50 border border-transparent'}`}
                >
                  <span className="font-medium text-slate-700 text-sm">{dept.name}</span>
                  <button onClick={(e) => { e.stopPropagation(); deleteDepartment(dept.id); }} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Majors */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-emerald-600" /> 专业
              </h3>
              <form onSubmit={handleAddMajor} className="mt-3 flex gap-2">
                <input type="text" value={newMajorName} onChange={(e) => setNewMajorName(e.target.value)} placeholder="新专业..." disabled={!selectedDeptId} className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm disabled:bg-slate-100" />
                <button type="submit" disabled={!newMajorName.trim() || !selectedDeptId} className="bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700 disabled:opacity-50 text-sm"><Plus className="w-4 h-4" /></button>
              </form>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-1">
              {!selectedDeptId ? (
                <div className="text-center text-slate-400 text-sm mt-10">请先选择左侧产业部</div>
              ) : (
                state.majors.filter(m => m.departmentId === selectedDeptId).map(major => (
                  <div 
                    key={major.id} 
                    onClick={() => setSelectedMajorId(major.id)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedMajorId === major.id ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50 border border-transparent'}`}
                  >
                    <span className="font-medium text-slate-700 text-sm">{major.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); deleteMajor(major.id); }} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Classes */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" /> 班级
              </h3>
              <button onClick={handleAddClass} disabled={!selectedMajorId} className="bg-amber-600 text-white px-3 py-1.5 rounded-md hover:bg-amber-700 disabled:opacity-50 text-sm flex items-center gap-1">
                <Plus className="w-4 h-4" /> 添加班级
              </button>
            </div>
            <div className="flex-1 overflow-auto p-2 space-y-2">
              {!selectedMajorId ? (
                <div className="text-center text-slate-400 text-sm mt-10">请先选择左侧专业</div>
              ) : (
                state.classes.filter(c => c.majorId === selectedMajorId).map(cls => (
                  <div key={cls.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                    {editingClassId === cls.id ? (
                      <div className="space-y-3 text-sm">
                        <div className="grid grid-cols-2 gap-2">
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
                            <select value={classForm.headTeacherId || ''} onChange={e => setClassForm({...classForm, headTeacherId: e.target.value})} className="w-full px-2 py-1 border rounded">
                              <option value="">无</option>
                              {state.teachers.map(t => <option key={t.id} value={t.id}>{t.name} {t.idCard ? `(${t.idCard.length === 18 ? t.idCard.substring(14) : t.idCard})` : ''}</option>)}
                            </select>
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
                          <h4 className="font-bold text-slate-800">{cls.name}</h4>
                          <div className="flex gap-1">
                            <button onClick={() => startEditClass(cls)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => deleteClass(cls.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600">
                          <div><span className="text-slate-400">类别:</span> {cls.type}</div>
                          <div><span className="text-slate-400">年级:</span> {state.grades.find(g => g.id === cls.gradeId)?.name}</div>
                          <div><span className="text-slate-400">教室:</span> {cls.classroom || '-'}</div>
                          <div><span className="text-slate-400">人数:</span> {cls.studentCount}</div>
                          <div className="col-span-2"><span className="text-slate-400">班主任:</span> {state.teachers.find(t => t.id === cls.headTeacherId)?.name || '-'}</div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'dict' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Teachers */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <UserCircle className="w-4 h-4 text-emerald-600" /> 教师管理
                </h3>
                <div className="flex gap-2">
                  <button onClick={downloadTeacherTemplate} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-300">
                    <Download className="w-3 h-3" /> 下载模板
                  </button>
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-300">
                    <Upload className="w-3 h-3" /> 导入Excel
                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleTeacherImport} />
                  </label>
                </div>
              </div>
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                if(newTeacherName.trim()) { 
                  addTeacher({
                    name: newTeacherName.trim(),
                    gender: newTeacherGender as any,
                    idCard: newTeacherIdCard.trim(),
                    department: newTeacherDepartment.trim(),
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
                  <input type="text" value={newTeacherDepartment} onChange={(e) => setNewTeacherDepartment(e.target.value)} placeholder="所属产业部" className="px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
                  <input type="text" value={newTeacherPrimarySubject} onChange={(e) => setNewTeacherPrimarySubject(e.target.value)} placeholder="主要任教学科" className="px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
                </div>
                <button type="submit" disabled={!newTeacherName.trim()} className="w-full bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-700 disabled:opacity-50 text-sm flex items-center justify-center gap-1"><Plus className="w-4 h-4" /> 添加教师</button>
              </form>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-2">
                {state.teachers.map(t => (
                  <div key={t.id} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{t.name} {t.gender && `(${t.gender})`}</span>
                      <div className="text-xs text-slate-500 flex gap-2 mt-0.5">
                        {t.idCard && <span>身份证: {t.idCard}</span>}
                        {t.department && <span>产业部: {t.department}</span>}
                        {t.primarySubject && <span>学科: {t.primarySubject}</span>}
                      </div>
                    </div>
                    <button onClick={() => deleteTeacher(t.id)} className="text-slate-400 hover:text-rose-600 ml-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
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
                <div className="flex gap-2">
                  <button onClick={downloadSubjectTemplate} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-300">
                    <Download className="w-3 h-3" /> 下载模板
                  </button>
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded text-xs flex items-center gap-1 border border-slate-300">
                    <Upload className="w-3 h-3" /> 导入Excel
                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleSubjectImport} />
                  </label>
                </div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); if(newSubjectName.trim()) { addSubject(newSubjectName.trim(), newSubjectType); setNewSubjectName(''); } }} className="mt-3 flex flex-col gap-2">
                <div className="flex gap-2">
                  <input type="text" value={newSubjectName} onChange={(e) => setNewSubjectName(e.target.value)} placeholder="新科目名称..." className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
                  <select value={newSubjectType} onChange={(e) => setNewSubjectType(e.target.value as any)} className="px-2 border border-slate-300 rounded-md text-sm">
                    <option value="公共课">公共课</option>
                    <option value="专业课">专业课</option>
                  </select>
                </div>
                <button type="submit" disabled={!newSubjectName.trim()} className="w-full bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm flex items-center justify-center gap-1"><Plus className="w-4 h-4" /> 添加科目</button>
              </form>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-2">
                {state.subjects.map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.type === '公共课' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{s.type}</span>
                    </div>
                    <button onClick={() => deleteSubject(s.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Class Categories */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Tags className="w-4 h-4 text-amber-600" /> 班级类别字典
              </h3>
              <form onSubmit={(e) => { e.preventDefault(); if(newCategoryName.trim()) { addClassCategory(newCategoryName.trim()); setNewCategoryName(''); } }} className="mt-3 flex gap-2">
                <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="新类别名称..." className="flex-1 px-3 py-1.5 border border-slate-300 rounded-md text-sm" />
                <button type="submit" disabled={!newCategoryName.trim()} className="bg-amber-600 text-white px-3 py-1.5 rounded-md hover:bg-amber-700 disabled:opacity-50 text-sm"><Plus className="w-4 h-4" /></button>
              </form>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="flex flex-wrap gap-2">
                {state.classCategories.map(c => (
                  <div key={c.id} className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full text-sm border border-amber-200 text-amber-800">
                    {c.name}
                    <button onClick={() => deleteClassCategory(c.id)} className="text-amber-400 hover:text-rose-600 ml-1"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
