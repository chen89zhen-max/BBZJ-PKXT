import React, { useMemo } from 'react';
import { useAppContext } from '../context';
import { Users, BookOpen, Clock } from 'lucide-react';

export function TeacherWorkload() {
  const { state } = useAppContext();

  const workloadData = useMemo(() => {
    return state.teachers.map((teacher) => {
      const teacherSchedules = state.schedules.filter((s) => s.teacherId === teacher.id);
      const totalHours = teacherSchedules.reduce((sum, s) => sum + s.hours, 0);
      
      // Group by department for detailed view
      const deptBreakdown = teacherSchedules.reduce((acc, schedule) => {
        const cls = state.classes.find(c => c.id === schedule.classId);
        const major = state.majors.find(m => m.id === cls?.majorId);
        const dept = state.departments.find(d => d.id === major?.departmentId);
        const subject = state.subjects.find(s => s.id === schedule.subjectId);
        
        const deptName = dept ? dept.name : '未知专业部';
        
        if (!acc[deptName]) {
          acc[deptName] = [];
        }
        acc[deptName].push({
          className: cls?.name || '未知班级',
          subjectName: subject?.name || '未知科目',
          hours: schedule.hours
        });
        return acc;
      }, {} as Record<string, { className: string, subjectName: string, hours: number }[]>);

      return {
        ...teacher,
        totalHours,
        schedules: teacherSchedules,
        deptBreakdown
      };
    }).sort((a, b) => b.totalHours - a.totalHours);
  }, [state.teachers, state.schedules, state.classes, state.majors, state.departments, state.subjects]);

  const totalSchoolHours = workloadData.reduce((sum, t) => sum + t.totalHours, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">教师工作量统计</h2>
        <p className="text-sm text-slate-500 mt-1">实时汇总全校教师在各专业部的排课情况</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">在职教师</p>
            <p className="text-2xl font-bold text-slate-800">{state.teachers.length} <span className="text-sm font-normal text-slate-500">人</span></p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">开设科目</p>
            <p className="text-2xl font-bold text-slate-800">{state.subjects.length} <span className="text-sm font-normal text-slate-500">门</span></p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-lg text-amber-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">全校总课时</p>
            <p className="text-2xl font-bold text-slate-800">{totalSchoolHours} <span className="text-sm font-normal text-slate-500">课时/周</span></p>
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="px-6 py-4 font-medium w-48">教师姓名</th>
              <th className="px-6 py-4 font-medium">授课详情 (专业部 / 班级 / 科目 / 课时)</th>
              <th className="px-6 py-4 font-medium text-right w-32">总课时/周</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {workloadData.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                  暂无教师数据
                </td>
              </tr>
            ) : (
              workloadData.map((teacher) => (
                <tr key={teacher.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-800 align-top pt-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {teacher.name.charAt(0)}
                      </div>
                      {teacher.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {teacher.schedules.length === 0 ? (
                      <span className="text-slate-400 italic">暂无排课</span>
                    ) : (
                      <div className="space-y-3">
                        {Object.entries(teacher.deptBreakdown).map(([deptName, items], idx) => (
                          <div key={idx} className="bg-slate-50 rounded-md p-3 border border-slate-100">
                            <div className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">{deptName}</div>
                            <div className="flex flex-wrap gap-2">
                              {(items as any[]).map((item, i) => (
                                <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 text-xs shadow-sm">
                                  {item.className} - {item.subjectName}
                                  <span className="text-slate-400 font-mono bg-slate-100 px-1 rounded">{item.hours}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right align-top pt-6">
                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full font-bold text-sm ${
                      teacher.totalHours > 20 ? 'bg-rose-100 text-rose-700' :
                      teacher.totalHours > 12 ? 'bg-amber-100 text-amber-700' :
                      teacher.totalHours > 0 ? 'bg-emerald-100 text-emerald-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {teacher.totalHours}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
