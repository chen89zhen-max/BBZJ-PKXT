import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context';
import { Department, Grade, Major, Class, Subject, Teacher } from '../types';
import { SearchableTeacherSelect } from './SearchableTeacherSelect';

export function MatrixSchedule({ department }: { department: Department }) {
  const { state, updateSchedule } = useAppContext();
  
  const [selectedGradeId, setSelectedGradeId] = useState<string>(state.grades[0]?.id || '');
  const [selectedMajorId, setSelectedMajorId] = useState<string>('all');

  // Filter majors for this department
  const deptMajors = useMemo(() => state.majors.filter(m => m.departmentId === department.id), [state.majors, department.id]);
  const deptMajorIds = new Set(deptMajors.map(m => m.id));

  // Filter classes for this department and selected grade
  const classes = useMemo(() => {
    return state.classes.filter(c => 
      deptMajorIds.has(c.majorId) && 
      c.gradeId === selectedGradeId &&
      (selectedMajorId === 'all' || c.majorId === selectedMajorId)
    );
  }, [state.classes, deptMajorIds, selectedGradeId, selectedMajorId]);

  // Handle cell updates
  const handleCellChange = (classId: string, subjectId: string, field: 'teacherId' | 'hours', value: string | number) => {
    const existing = state.schedules.find(s => s.classId === classId && s.subjectId === subjectId);
    
    let teacherId = existing?.teacherId || '';
    let hours = existing?.hours || 0;

    if (field === 'teacherId') {
      teacherId = value as string;
      if (teacherId && hours === 0) hours = 2; // Default to 2 hours if just assigned a teacher
    } else {
      hours = value as number;
    }

    updateSchedule(classId, subjectId, teacherId, hours);
  };

  if (!selectedGradeId) {
    return <div>请先添加年级数据</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{department.name} - 排课矩阵</h2>
          <p className="text-sm text-slate-500 mt-1">全局掌控各班级、各科目的排课情况</p>
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <label className="text-sm font-medium text-slate-600 pl-2">年级:</label>
          <select 
            value={selectedGradeId} 
            onChange={e => setSelectedGradeId(e.target.value)}
            className="border-none bg-slate-50 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {state.grades.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          
          <label className="text-sm font-medium text-slate-600 pl-2">专业:</label>
          <select 
            value={selectedMajorId} 
            onChange={e => setSelectedMajorId(e.target.value)}
            className="border-none bg-slate-50 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none max-w-[200px]"
          >
            <option value="all">全部专业</option>
            {deptMajors.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-sm text-slate-500">
          该年级下暂无班级数据。
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="min-w-full border-collapse text-sm text-center">
              <thead className="bg-slate-100 sticky top-0 z-20 shadow-sm">
                {/* Row 1: 班级 */}
                <tr>
                  <th colSpan={3} className="border border-slate-300 p-2 bg-slate-200 font-semibold sticky left-0 z-30">班级</th>
                  {classes.map(c => (
                    <th key={c.id} colSpan={2} className="border border-slate-300 p-2 font-bold text-slate-800 bg-slate-100">
                      {c.name}
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
                {/* Row 6: Column Headers */}
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
                {state.subjects.map((subject, index) => {
                  // Calculate total hours for this subject across currently shown classes
                  const totalHours = classes.reduce((sum, c) => {
                    const sch = state.schedules.find(s => s.classId === c.id && s.subjectId === subject.id);
                    return sum + (sch?.hours || 0);
                  }, 0);

                  return (
                    <tr key={subject.id} className="hover:bg-slate-50 transition-colors">
                      <td className="border border-slate-300 p-2 sticky left-0 bg-white z-10 text-slate-500">{index + 1}</td>
                      <td className="border border-slate-300 p-2 sticky left-[64px] bg-white z-10 font-medium text-left text-slate-800">{subject.name}</td>
                      <td className="border border-slate-300 p-2 sticky left-[256px] bg-white z-10 font-bold text-indigo-600">{totalHours > 0 ? totalHours : ''}</td>
                      
                      {classes.map(c => {
                        const schedule = state.schedules.find(s => s.classId === c.id && s.subjectId === subject.id);
                        
                        return (
                          <React.Fragment key={`${c.id}-${subject.id}`}>
                            <td className="border border-slate-300 p-0 relative group">
                              <SearchableTeacherSelect
                                value={schedule?.teacherId || ''}
                                onChange={(val) => handleCellChange(c.id, subject.id, 'teacherId', val)}
                                teachers={state.teachers}
                                placeholder=""
                                className="h-full"
                                buttonClassName="w-full h-full min-h-[40px] px-2 py-1 bg-transparent border-none outline-none focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-500 text-center cursor-pointer group-hover:bg-indigo-50/50 transition-colors flex items-center justify-center"
                                hideChevron
                              />
                            </td>
                            <td className="border border-slate-300 p-0 relative group">
                              <input
                                type="number"
                                min="0"
                                value={schedule?.hours || ''}
                                onChange={(e) => handleCellChange(c.id, subject.id, 'hours', parseInt(e.target.value) || 0)}
                                className="w-full h-full min-h-[40px] px-1 py-1 bg-transparent border-none outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 text-center group-hover:bg-indigo-50/50 transition-colors"
                              />
                            </td>
                          </React.Fragment>
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
    </div>
  );
}
