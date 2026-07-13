const fs = require('fs');
const content = fs.readFileSync('src/components/TeacherWorkload.tsx', 'utf8');

const replacement = `  const departmentDetailedList = useMemo(() => {
    const validDepts = state.departments.filter(d => !['公共基础学院', '行政干部', '职员与工勤'].includes(d.name));
    
    return validDepts.map(dept => {
      const majors = majorDetailedList.filter(m => m.deptName === dept.name);
      return {
        id: dept.id,
        name: dept.name,
        majors,
        classCount: majors.reduce((sum, m) => sum + m.classCount, 0),
        studentCount: majors.reduce((sum, m) => sum + m.studentCount, 0),
        inSchoolCount: majors.reduce((sum, m) => sum + m.inSchoolCount, 0),
        internshipCount: majors.reduce((sum, m) => sum + m.internshipCount, 0),
        totalHours: majors.reduce((sum, m) => sum + m.totalHours, 0),
        enrollmentTarget: majors.reduce((sum, m) => sum + m.enrollmentTarget, 0),
        avgClassSize: majors.length > 0 ? Math.round(majors.reduce((sum, m) => sum + m.studentCount, 0) / (majors.reduce((sum, m) => sum + m.classCount, 0) || 1)) : 0
      };
    }).sort((a, b) => b.studentCount - a.studentCount);
  }, [state.departments, majorDetailedList]);`;

const newContent = content.replace(
  "  }, [state.majors, state.classes, state.departments, state.schedules]);",
  "  }, [state.majors, state.classes, state.departments, state.schedules]);\n\n" + replacement
);

fs.writeFileSync('src/components/TeacherWorkload.tsx', newContent);
