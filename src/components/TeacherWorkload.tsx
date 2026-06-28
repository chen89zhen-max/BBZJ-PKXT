import React, { useMemo, useState } from "react";
import { useAppContext } from "../context";
import {
  Users,
  BookOpen,
  Clock,
  Filter,
  Search,
  Download,
  BarChart2,
  GraduationCap,
  Layers,
  Building2,
  Calendar,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Info,
  LayoutDashboard,
  ChevronRight,
  PieChart,
} from "lucide-react";
import * as xlsx from "xlsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const calculateAge = (idCard?: string) => {
  if (!idCard || idCard.length !== 18) return null;
  const birthYear = parseInt(idCard.substring(6, 10));
  const birthMonth = parseInt(idCard.substring(10, 12));
  const birthDay = parseInt(idCard.substring(12, 14));

  const today = new Date();
  let age = today.getFullYear() - birthYear;
  if (
    today.getMonth() + 1 < birthMonth ||
    (today.getMonth() + 1 === birthMonth && today.getDate() < birthDay)
  ) {
    age--;
  }
  return age;
};

export function TeacherWorkload() {
  const { state } = useAppContext();
  const [activeTab, setActiveTab] = useState<
    "overview" | "majors" | "classes" | "teachers"
  >("overview");

  // --- Teacher Workload State & Filters (Tab 4) ---
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedGender, setSelectedGender] = useState<string>("all");
  const [selectedAgeRange, setSelectedAgeRange] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showTeacherDashboard, setShowTeacherDashboard] =
    useState<boolean>(false);

  // --- Classes View State & Filters (Tab 3) ---
  const [classMajorFilter, setClassMajorFilter] = useState<string>("all");
  const [classGradeFilter, setClassGradeFilter] = useState<string>("all");
  const [classStatusFilter, setClassStatusFilter] = useState<string>("all");
  const [classTypeFilter, setClassTypeFilter] = useState<string>("all");
  const [classSearchQuery, setClassSearchQuery] = useState<string>("");

  // -------------------------------------------------------------------------
  // 1. DATA PREPARATION: States & Global Filters
  // -------------------------------------------------------------------------

  const [chartFilters, setChartFilters] = useState({
    gradeId: "all",
    deptId: "all",
    majorId: "all",
  });
  const [gradeChartMetric, setGradeChartMetric] = useState<
    "students" | "classes"
  >("students");

  // Teaching schedules lookup map
  const scheduleMap = useMemo(() => {
    const map: Record<string, number> = {};
    state.schedules.forEach((s) => {
      map[`${s.classId}:::${s.subjectId}`] = s.hours;
    });
    return map;
  }, [state.schedules]);

  // Active filtered administrative classes (excluding graduated, duplicate classes)
  const filteredChartClasses = useMemo(() => {
    return state.classes.filter((c) => {
      const isAdmin =
        !c.name.includes("(复排)") && !c.name.includes("（复排）");
      if (!isAdmin) return false;
      if (c.status === "已毕业" || c.status === "合并解散") return false;

      if (chartFilters.gradeId !== "all" && c.gradeId !== chartFilters.gradeId)
        return false;

      if (chartFilters.deptId !== "all" || chartFilters.majorId !== "all") {
        const major = state.majors.find((m) => m.id === c.majorId);
        if (!major) return false;

        if (chartFilters.majorId !== "all" && major.id !== chartFilters.majorId)
          return false;
        if (
          chartFilters.deptId !== "all" &&
          major.departmentId !== chartFilters.deptId
        )
          return false;
      }

      return true;
    });
  }, [state.classes, state.majors, chartFilters]);

  // Classes count metrics (reactive to filters)
  const classMetrics = useMemo(() => {
    const adminClasses = state.classes.filter(
      (c) => !c.name.includes("(复排)") && !c.name.includes("（复排）"),
    );
    const filtered = adminClasses.filter((c) => {
      if (chartFilters.gradeId !== "all" && c.gradeId !== chartFilters.gradeId)
        return false;

      if (chartFilters.deptId !== "all" || chartFilters.majorId !== "all") {
        const major = state.majors.find((m) => m.id === c.majorId);
        if (!major) return false;

        if (chartFilters.majorId !== "all" && major.id !== chartFilters.majorId)
          return false;
        if (
          chartFilters.deptId !== "all" &&
          major.departmentId !== chartFilters.deptId
        )
          return false;
      }
      return true;
    });

    const total = filtered.length;
    const active = filtered.filter(
      (c) => c.status !== "已毕业" && c.status !== "合并解散",
    ).length;
    const inSchool = filtered.filter((c) => c.status === "正常在校").length;
    const internship = filtered.filter((c) => c.status === "外出实习").length;
    const returned = filtered.filter((c) => c.status === "实习返校").length;
    const graduated = filtered.filter((c) => c.status === "已毕业").length;

    return { total, active, inSchool, internship, returned, graduated };
  }, [state.classes, state.majors, chartFilters]);

  // Student enrollment metrics (reactive to filters)
  const studentMetrics = useMemo(() => {
    const adminClasses = state.classes.filter(
      (c) => !c.name.includes("(复排)") && !c.name.includes("（复排）"),
    );
    const filtered = adminClasses.filter((c) => {
      if (chartFilters.gradeId !== "all" && c.gradeId !== chartFilters.gradeId)
        return false;

      if (chartFilters.deptId !== "all" || chartFilters.majorId !== "all") {
        const major = state.majors.find((m) => m.id === c.majorId);
        if (!major) return false;

        if (chartFilters.majorId !== "all" && major.id !== chartFilters.majorId)
          return false;
        if (
          chartFilters.deptId !== "all" &&
          major.departmentId !== chartFilters.deptId
        )
          return false;
      }
      return true;
    });

    const activeClasses = filtered.filter(
      (c) => c.status !== "已毕业" && c.status !== "合并解散",
    );
    const totalInSchool = activeClasses
      .filter((c) => c.status === "正常在校")
      .reduce((sum, c) => sum + (c.studentCount || 0), 0);
    const totalInternship = activeClasses
      .filter((c) => c.status === "外出实习")
      .reduce((sum, c) => sum + (c.studentCount || 0), 0);
    const totalReturned = activeClasses
      .filter((c) => c.status === "实习返校")
      .reduce((sum, c) => sum + (c.studentCount || 0), 0);
    const grandTotal = totalInSchool + totalInternship + totalReturned;

    return {
      totalInSchool,
      totalInternship,
      totalReturned,
      grandTotal,
      graduated: filtered
        .filter((c) => c.status === "已毕业")
        .reduce((sum, c) => sum + (c.studentCount || 0), 0),
    };
  }, [state.classes, state.majors, chartFilters]);

  // Total teaching hours (reactive to filters)
  const totalSchoolHours = useMemo(() => {
    const adminClasses = state.classes.filter(
      (c) => !c.name.includes("(复排)") && !c.name.includes("（复排）"),
    );
    const filtered = adminClasses.filter((c) => {
      if (chartFilters.gradeId !== "all" && c.gradeId !== chartFilters.gradeId)
        return false;

      if (chartFilters.deptId !== "all" || chartFilters.majorId !== "all") {
        const major = state.majors.find((m) => m.id === c.majorId);
        if (!major) return false;

        if (chartFilters.majorId !== "all" && major.id !== chartFilters.majorId)
          return false;
        if (
          chartFilters.deptId !== "all" &&
          major.departmentId !== chartFilters.deptId
        )
          return false;
      }
      return true;
    });

    const classIds = new Set(filtered.map((c) => c.id));
    return state.schedules.reduce((sum, s) => {
      if (classIds.has(s.classId)) {
        return sum + (s.hours || 0);
      }
      return sum;
    }, 0);
  }, [state.schedules, state.classes, state.majors, chartFilters]);

  // Total teachers count (reactive to filters)
  const filteredTeachersCount = useMemo(() => {
    let list = state.teachers;
    if (chartFilters.deptId !== "all") {
      const dept = state.departments.find((d) => d.id === chartFilters.deptId);
      if (dept) {
        list = list.filter((t) => t.department === dept.name);
      }
    }
    if (chartFilters.majorId !== "all" || chartFilters.gradeId !== "all") {
      const matchingClasses = state.classes.filter((c) => {
        if (chartFilters.gradeId !== "all" && c.gradeId !== chartFilters.gradeId)
          return false;
        if (chartFilters.majorId !== "all" && c.majorId !== chartFilters.majorId)
          return false;
        return true;
      });
      const classIds = new Set(matchingClasses.map((c) => c.id));
      const matchingSchedules = state.schedules.filter((s) =>
        classIds.has(s.classId),
      );
      const teacherIds = new Set(
        matchingSchedules.map((s) => s.teacherId).filter(Boolean),
      );
      if (teacherIds.size > 0) {
        list = list.filter((t) => teacherIds.has(t.id));
      } else {
        return 0;
      }
    }
    return list.length;
  }, [
    state.teachers,
    state.departments,
    state.classes,
    state.schedules,
    chartFilters,
  ]);

  // Grade-wise Student & Class Count (reactive to filters)
  const gradeStats = useMemo(() => {
    const adminClasses = state.classes.filter(
      (c) => !c.name.includes("(复排)") && !c.name.includes("（复排）"),
    );
    const filteredClasses = adminClasses.filter((c) => {
      if (chartFilters.deptId !== "all" || chartFilters.majorId !== "all") {
        const major = state.majors.find((m) => m.id === c.majorId);
        if (!major) return false;

        if (chartFilters.majorId !== "all" && major.id !== chartFilters.majorId)
          return false;
        if (
          chartFilters.deptId !== "all" &&
          major.departmentId !== chartFilters.deptId
        )
          return false;
      }
      return true;
    });

    return state.grades
      .map((grade) => {
        const gradeClasses = filteredClasses.filter(
          (c) =>
            c.gradeId === grade.id &&
            c.status !== "已毕业" &&
            c.status !== "合并解散",
        );
        const classCount = gradeClasses.length;
        const studentCount = gradeClasses.reduce(
          (sum, c) => sum + (c.studentCount || 0),
          0,
        );
        return {
          name: grade.name,
          班级数: classCount,
          学生人数: studentCount,
        };
      })
      .filter((g) => g.班级数 > 0 || g.学生人数 > 0);
  }, [state.classes, state.grades, state.majors, chartFilters]);

  // Major-wise Student Distribution (reactive to filters)
  const majorStats = useMemo(() => {
    const adminClasses = state.classes.filter(
      (c) =>
        !c.name.includes("(复排)") &&
        !c.name.includes("（复排）") &&
        c.status !== "已毕业" &&
        c.status !== "合并解散",
    );
    const filteredClasses = adminClasses.filter((c) => {
      if (chartFilters.gradeId !== "all" && c.gradeId !== chartFilters.gradeId)
        return false;

      if (chartFilters.deptId !== "all" || chartFilters.majorId !== "all") {
        const major = state.majors.find((m) => m.id === c.majorId);
        if (!major) return false;

        if (chartFilters.majorId !== "all" && major.id !== chartFilters.majorId)
          return false;
        if (
          chartFilters.deptId !== "all" &&
          major.departmentId !== chartFilters.deptId
        )
          return false;
      }
      return true;
    });

    return state.majors
      .map((major) => {
        const majorClasses = filteredClasses.filter(
          (c) => c.majorId === major.id,
        );
        const studentCount = majorClasses.reduce(
          (sum, c) => sum + (c.studentCount || 0),
          0,
        );
        const classCount = majorClasses.length;
        return {
          name: major.name,
          班级数: classCount,
          学生人数: studentCount,
        };
      })
      .filter((m) => m.班级数 > 0 || m.学生人数 > 0)
      .sort((a, b) => b["学生人数"] - a["学生人数"])
      .slice(0, 8); // Top 8 majors
  }, [state.majors, state.classes, chartFilters]);

  // Class Categories Breakdown (Ordinary, College Entrance, 3+2 etc.)
  const classTypeBreakdown = useMemo(() => {
    const types: Record<string, number> = {};
    let totalActive = 0;
    filteredChartClasses.forEach((c) => {
      const type = c.type || "普通班";
      types[type] = (types[type] || 0) + 1;
      totalActive++;
    });
    return Object.entries(types)
      .map(([name, count]) => ({
        name,
        count,
        percentage:
          totalActive > 0 ? Math.round((count / totalActive) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredChartClasses]);

  // Class Status Breakdown for Gauges
  const classStatusBreakdown = useMemo(() => {
    let inSchool = 0,
      internship = 0,
      returned = 0;
    let total = 0;
    filteredChartClasses.forEach((c) => {
      total++;
      if (c.status === "正常在校") inSchool++;
      if (c.status === "外出实习") internship++;
      if (c.status === "实习返校") returned++;
    });
    total = total || 1;
    return [
      {
        name: "正常在校",
        count: inSchool,
        color: "bg-emerald-500",
        textColor: "text-emerald-700",
        bgColor: "bg-emerald-50",
        percentage: Math.round((inSchool / total) * 100),
      },
      {
        name: "外出实习",
        count: internship,
        color: "bg-orange-500",
        textColor: "text-orange-700",
        bgColor: "bg-orange-50",
        percentage: Math.round((internship / total) * 100),
      },
      {
        name: "实习返校",
        count: returned,
        color: "bg-indigo-500",
        textColor: "text-indigo-700",
        bgColor: "bg-indigo-50",
        percentage: Math.round((returned / total) * 100),
      },
    ];
  }, [filteredChartClasses]);

  // -------------------------------------------------------------------------
  // 3. DATA PREPARATION: Tab 2 (Majors & Departments Details)
  // -------------------------------------------------------------------------
  const deptSummaryList = useMemo(() => {
    return state.departments.map((dept) => {
      const deptMajors = state.majors.filter((m) => m.departmentId === dept.id);
      const deptMajorIds = new Set(deptMajors.map((m) => m.id));
      const deptClasses = state.classes.filter((c) => {
        if (!deptMajorIds.has(c.majorId)) return false;
        if (chartFilters.gradeId !== "all" && c.gradeId !== chartFilters.gradeId)
          return false;
        return true;
      });
      const adminDeptClasses = deptClasses.filter(
        (c) => !c.name.includes("(复排)") && !c.name.includes("（复排）"),
      );
      const studentCount = adminDeptClasses.reduce(
        (sum, c) => sum + (c.studentCount || 0),
        0,
      );
      const classIds = new Set(deptClasses.map((c) => c.id));
      const deptSchedules = state.schedules.filter((s) =>
        classIds.has(s.classId),
      );
      const totalHours = deptSchedules.reduce((sum, s) => sum + s.hours, 0);
      const teachersInDept = state.teachers.filter(
        (t) => t.department === dept.name,
      ).length;

      // Calculate subjects directly assigned to this department or its majors
      const deptSubjects = state.subjects.filter(
        (s) =>
          s.departmentId === dept.id ||
          (s.majorId && deptMajorIds.has(s.majorId)),
      ).length;

      return {
        id: dept.id,
        name: dept.name,
        majorCount: deptMajors.length,
        classCount: adminDeptClasses.length,
        studentCount,
        teacherCount: teachersInDept,
        subjectCount: deptSubjects,
        totalHours,
        avgHoursPerClass:
          adminDeptClasses.length > 0
            ? (totalHours / adminDeptClasses.length).toFixed(1)
            : "0",
      };
    });
  }, [
    state.departments,
    state.majors,
    state.classes,
    state.teachers,
    state.schedules,
    state.subjects,
    chartFilters.gradeId,
  ]);

  const majorDetailedList = useMemo(() => {
    return state.majors
      .map((major) => {
        const dept = state.departments.find((d) => d.id === major.departmentId);
        const majorClasses = state.classes.filter(
          (c) => c.majorId === major.id,
        );
        const adminMajorClasses = majorClasses.filter(
          (c) => !c.name.includes("(复排)") && !c.name.includes("（复排）"),
        );
        const studentCount = adminMajorClasses.reduce(
          (sum, c) => sum + (c.studentCount || 0),
          0,
        );

        const classIds = new Set(majorClasses.map((c) => c.id));
        const majorSchedules = state.schedules.filter((s) =>
          classIds.has(s.classId),
        );
        const totalHours = majorSchedules.reduce((sum, s) => sum + s.hours, 0);

        // Active vs Internship
        const inSchoolCount = adminMajorClasses.filter(
          (c) => c.status === "正常在校",
        ).length;
        const internshipCount = adminMajorClasses.filter(
          (c) => c.status === "外出实习",
        ).length;
        const returnedCount = adminMajorClasses.filter(
          (c) => c.status === "实习返校",
        ).length;
        const graduatedCount = adminMajorClasses.filter(
          (c) => c.status === "已毕业",
        ).length;

        return {
          id: major.id,
          name: major.name,
          deptName: dept?.name || "未知专业部",
          classCount: adminMajorClasses.length,
          inSchoolCount,
          internshipCount,
          returnedCount,
          graduatedCount,
          studentCount,
          totalHours,
          enrollmentTarget: major.enrollmentTarget || 0,
          avgClassSize:
            adminMajorClasses.length > 0
              ? Math.round(studentCount / adminMajorClasses.length)
              : 0,
        };
      })
      .sort((a, b) => b.studentCount - a.studentCount);
  }, [state.majors, state.classes, state.departments, state.schedules]);

  // -------------------------------------------------------------------------
  // 4. DATA PREPARATION: Tab 3 (Class Status & Operations Detail)
  // -------------------------------------------------------------------------
  const filteredClassesList = useMemo(() => {
    let result = state.classes;

    if (classMajorFilter !== "all") {
      result = result.filter((c) => c.majorId === classMajorFilter);
    }
    if (classGradeFilter !== "all") {
      result = result.filter((c) => c.gradeId === classGradeFilter);
    }
    if (classStatusFilter !== "all") {
      result = result.filter(
        (c) => (c.status || "正常在校") === classStatusFilter,
      );
    }
    if (classTypeFilter !== "all") {
      result = result.filter((c) => c.type === classTypeFilter);
    }
    if (classSearchQuery.trim()) {
      const query = classSearchQuery.trim().toLowerCase();
      result = result.filter((c) => {
        const major = state.majors.find((m) => m.id === c.majorId);
        const headteacher = state.teachers.find(
          (t) => t.id === c.headTeacherId,
        );
        return (
          c.name.toLowerCase().includes(query) ||
          (c.classroom && c.classroom.toLowerCase().includes(query)) ||
          (major && major.name.toLowerCase().includes(query)) ||
          (headteacher && headteacher.name.toLowerCase().includes(query))
        );
      });
    }

    return result.map((c) => {
      const major = state.majors.find((m) => m.id === c.majorId);
      const grade = state.grades.find((g) => g.id === c.gradeId);
      const dept = major
        ? state.departments.find((d) => d.id === major.departmentId)
        : null;
      const headteacher = state.teachers.find((t) => t.id === c.headTeacherId);

      // Calculate scheduled hours for this class
      const classSchedules = state.schedules.filter((s) => s.classId === c.id);
      const totalHours = classSchedules.reduce((sum, s) => sum + s.hours, 0);
      const subjectCount = classSchedules.filter((s) => s.hours > 0).length;

      return {
        ...c,
        majorName: major?.name || "未知专业",
        deptName: dept?.name || "未知专业部",
        gradeName: grade?.name || "未指定",
        headTeacherName: headteacher?.name || "未分配",
        totalHours,
        subjectCount,
      };
    });
  }, [
    state.classes,
    state.majors,
    state.departments,
    state.grades,
    state.teachers,
    state.schedules,
    classMajorFilter,
    classGradeFilter,
    classStatusFilter,
    classTypeFilter,
    classSearchQuery,
  ]);

  // -------------------------------------------------------------------------
  // 5. DATA PREPARATION: Tab 4 (Teacher Workloads Detail)
  // -------------------------------------------------------------------------
  const workloadData = useMemo(() => {
    let filteredTeachers = state.teachers;

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filteredTeachers = filteredTeachers.filter((t) =>
        t.name.toLowerCase().includes(query),
      );
    }

    if (selectedDepartment !== "all") {
      filteredTeachers = filteredTeachers.filter(
        (t) => (t.department || "未分配") === selectedDepartment,
      );
    }
    if (selectedSubject !== "all") {
      filteredTeachers = filteredTeachers.filter(
        (t) => (t.primarySubject || "未分配") === selectedSubject,
      );
    }
    if (selectedGender !== "all") {
      filteredTeachers = filteredTeachers.filter(
        (t) => (t.gender || "未知") === selectedGender,
      );
    }
    if (selectedAgeRange !== "all") {
      filteredTeachers = filteredTeachers.filter((t) => {
        const age = calculateAge(t.idCard);
        if (age === null) return selectedAgeRange === "unknown";
        if (selectedAgeRange === "under30") return age < 30;
        if (selectedAgeRange === "30to40") return age >= 30 && age <= 40;
        if (selectedAgeRange === "40to50") return age > 40 && age <= 50;
        if (selectedAgeRange === "over50") return age > 50;
        return true;
      });
    }

    const data = filteredTeachers.map((teacher) => {
      const teacherSchedules = state.schedules.filter(
        (s) =>
          s.teacherId === teacher.id &&
          s.hours > 0 &&
          state.classes.some((c) => c.id === s.classId && c.name) &&
          state.subjects.some((sub) => sub.id === s.subjectId && sub.name),
      );
      const totalHours = teacherSchedules.reduce((sum, s) => sum + s.hours, 0);

      // Group by department for detailed view
      const deptBreakdown = teacherSchedules.reduce(
        (acc, schedule) => {
          const cls = state.classes.find((c) => c.id === schedule.classId);
          const grade = state.grades.find((g) => g.id === cls?.gradeId);
          const major = state.majors.find((m) => m.id === cls?.majorId);
          const dept = state.departments.find(
            (d) => d.id === major?.departmentId,
          );
          const subject = state.subjects.find(
            (s) => s.id === schedule.subjectId,
          );

          const deptName = dept?.name || "未知专业部";
          const fullClassName = grade
            ? `${grade.name}${cls?.name}`
            : cls?.name || "未知班级";

          if (!acc[deptName]) {
            acc[deptName] = [];
          }
          acc[deptName].push({
            className: fullClassName,
            subjectName: subject?.name || "未知科目",
            hours: schedule.hours,
          });
          return acc;
        },
        {} as Record<
          string,
          { className: string; subjectName: string; hours: number }[]
        >,
      );

      return {
        ...teacher,
        totalHours,
        schedules: teacherSchedules,
        deptBreakdown,
      };
    });

    return data.sort((a, b) => {
      if (sortOrder === "asc") return a.totalHours - b.totalHours;
      return b.totalHours - a.totalHours;
    });
  }, [
    state.teachers,
    state.schedules,
    state.classes,
    state.majors,
    state.departments,
    state.subjects,
    selectedDepartment,
    selectedSubject,
    selectedGender,
    selectedAgeRange,
    searchQuery,
    sortOrder,
  ]);

  const teacherDepartments = useMemo(() => {
    const depts = new Set<string>();
    state.teachers.forEach((t) => depts.add(t.department || "未分配"));
    return Array.from(depts).sort();
  }, [state.teachers]);

  const teacherSubjects = useMemo(() => {
    const subs = new Set<string>();
    state.teachers.forEach((t) => subs.add(t.primarySubject || "未分配"));
    return Array.from(subs).sort();
  }, [state.teachers]);

  // Collapsible teacher statistics dashboard data
  const teacherDashboardData = useMemo(() => {
    const activeTeachers = workloadData.filter((t) => t.totalHours > 0);
    const avgSchoolWorkload =
      activeTeachers.length > 0
        ? (
            activeTeachers.reduce((sum, t) => sum + t.totalHours, 0) /
            activeTeachers.length
          ).toFixed(1)
        : "0.0";

    const getStatsByGroup = (groupFn: (t: any) => string) => {
      const groups: Record<
        string,
        { totalHours: number; count: number; subjects: Set<string> }
      > = {};
      activeTeachers.forEach((t) => {
        const key = groupFn(t);
        if (!groups[key])
          groups[key] = { totalHours: 0, count: 0, subjects: new Set() };
        groups[key].totalHours += t.totalHours;
        groups[key].count += 1;
        t.schedules.forEach((s) => groups[key].subjects.add(s.subjectId));
      });

      return Object.entries(groups)
        .map(([name, data]) => ({
          name,
          avgWorkload: parseFloat((data.totalHours / data.count).toFixed(1)),
          teacherCount: data.count,
          courseCount: data.subjects.size,
        }))
        .sort((a, b) => b.teacherCount - a.teacherCount);
    };

    const statsByDept = getStatsByGroup((t) => t.department || "未分配");
    const statsByGender = getStatsByGroup((t) => t.gender || "未知");
    const statsByAge = getStatsByGroup((t) => {
      const age = calculateAge(t.idCard);
      if (age === null) return "未知";
      if (age < 30) return "30岁以下";
      if (age <= 40) return "30-40岁";
      if (age <= 50) return "40-50岁";
      return "50岁以上";
    });

    const totalCourses = new Set(
      activeTeachers.flatMap((t) => t.schedules.map((s) => s.subjectId)),
    ).size;

    return {
      activeTeachersCount: activeTeachers.length,
      avgSchoolWorkload,
      totalCourses,
      statsByDept,
      statsByGender,
      statsByAge,
    };
  }, [workloadData]);

  // Export workload to Excel
  const handleExportExcel = () => {
    const data = workloadData.map((teacher) => {
      const details = Object.entries(teacher.deptBreakdown)
        .map(([deptName, classes]) => {
          const classDetails = classes
            .map((c) => `${c.className} - ${c.subjectName} (${c.hours}节)`)
            .join(", ");
          return `【${deptName}】: ${classDetails}`;
        })
        .join("；\n");

      return {
        教师姓名: teacher.name,
        性别: teacher.gender || "未知",
        年龄: calculateAge(teacher.idCard) || "未知",
        所属产业部: teacher.department || "未分配",
        任教科目: teacher.primarySubject || "未分配",
        "总课时/周": teacher.totalHours,
        授课详情: details || "暂无排课",
      };
    });

    const ws = xlsx.utils.json_to_sheet(data);

    ws["!cols"] = [
      { wch: 12 }, // 教师姓名
      { wch: 6 }, // 性别
      { wch: 6 }, // 年龄
      { wch: 15 }, // 所属产业部
      { wch: 15 }, // 任教科目
      { wch: 12 }, // 总课时/周
      { wch: 80 }, // 授课详情
    ];

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "教师工作量统计");

    const fileName = `教师工作量统计_${new Date().toISOString().split("T")[0]}.xlsx`;
    xlsx.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header & Tab Navigation */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-600" />
            全校数据研判与师资看板
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            一站式监控全校专业、班级、学生规模及师资教学工作负荷
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner border border-slate-200 self-start xl:self-auto flex-wrap">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "overview"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            学校数据总览
          </button>
          <button
            onClick={() => setActiveTab("majors")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "majors"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Layers className="w-4 h-4" />
            专业与专业部
          </button>
          <button
            onClick={() => setActiveTab("classes")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "classes"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Building2 className="w-4 h-4" />
            班级运行态势
          </button>
          <button
            onClick={() => setActiveTab("teachers")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "teachers"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <Users className="w-4 h-4" />
            教师工作量统计
          </button>
        </div>
      </div>

      {/* 2. TAB CONTENT: 1. OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-fade-in">
          {/* Global Dashboard Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                <Filter className="w-4 h-4" />
              </span>
              <div>
                <h4 className="text-sm font-bold text-slate-700">看板数据筛选</h4>
                <p className="text-xs text-slate-400">选择维度进行穿透，支持各图表及指标联动</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <div className="flex flex-col gap-1 w-full sm:w-40">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">年级维度</span>
                <select
                  value={chartFilters.gradeId}
                  onChange={(e) =>
                    setChartFilters({
                      ...chartFilters,
                      gradeId: e.target.value,
                    })
                  }
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                >
                  <option value="all">所有年级</option>
                  {state.grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 w-full sm:w-40">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">产业部维度</span>
                <select
                  value={chartFilters.deptId}
                  onChange={(e) =>
                    setChartFilters({
                      ...chartFilters,
                      deptId: e.target.value,
                      majorId: "all", // Reset major when changing department
                    })
                  }
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                >
                  <option value="all">所有产业部</option>
                  {state.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1 w-full sm:w-48">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">专业维度</span>
                <select
                  value={chartFilters.majorId}
                  onChange={(e) =>
                    setChartFilters({
                      ...chartFilters,
                      majorId: e.target.value,
                    })
                  }
                  className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 bg-slate-50 outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                >
                  <option value="all">所有专业</option>
                  {state.majors
                    .filter(
                      (m) =>
                        chartFilters.deptId === "all" ||
                        m.departmentId === chartFilters.deptId,
                    )
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                </select>
              </div>

              {(chartFilters.gradeId !== "all" || chartFilters.deptId !== "all" || chartFilters.majorId !== "all") && (
                <button
                  onClick={() => setChartFilters({ gradeId: "all", deptId: "all", majorId: "all" })}
                  className="sm:mt-4 text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline cursor-pointer"
                >
                  重置
                </button>
              )}
            </div>
          </div>

          {/* Big Stat Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  在校班级数
                </span>
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Building2 className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-800">
                    {classMetrics.active}
                  </span>
                  <span className="text-sm text-slate-500">个</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  总班级: {classMetrics.total} | 毕业: {classMetrics.graduated}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  开设专业数
                </span>
                <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-800">
                    {state.majors.length}
                  </span>
                  <span className="text-sm text-slate-500">个</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  涵盖专业部: {state.departments.length} 个
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  在校生规模
                </span>
                <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <GraduationCap className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-800">
                    {studentMetrics.grandTotal}
                  </span>
                  <span className="text-sm text-slate-500">人</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  均班:{" "}
                  {classMetrics.active > 0
                    ? Math.round(
                        studentMetrics.grandTotal / classMetrics.active,
                      )
                    : 0}{" "}
                  人/班
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  教师总数
                </span>
                <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-800">
                    {filteredTeachersCount}
                  </span>
                  <span className="text-sm text-slate-500">人</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  师生比 1 :{" "}
                  {filteredTeachersCount > 0
                    ? (
                        studentMetrics.grandTotal / filteredTeachersCount
                      ).toFixed(1)
                    : "0"}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  全校周总课时
                </span>
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-800">
                    {totalSchoolHours}
                  </span>
                  <span className="text-sm text-slate-500">节/周</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  活跃学科: {state.subjects.length} 门
                </p>
              </div>
            </div>
          </div>

          {/* Charts & Distributions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Grade Students Bar Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  各阶段/年级规模与分布
                </h3>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setGradeChartMetric("students")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${gradeChartMetric === "students" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    学生人数
                  </button>
                  <button
                    onClick={() => setGradeChartMetric("classes")}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${gradeChartMetric === "classes" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    班级数
                  </button>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={gradeStats}
                    margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    {gradeChartMetric === "students" ? (
                      <>
                        <YAxis
                          stroke="#6366f1"
                          tick={{ fontSize: 11 }}
                          label={{
                            value: "学生人数 (人)",
                            angle: -90,
                            position: "insideLeft",
                            style: {
                              textAnchor: "middle",
                              fontSize: 11,
                              fill: "#6366f1",
                            },
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Bar
                          dataKey="学生人数"
                          fill="#6366f1"
                          radius={[4, 4, 0, 0]}
                        />
                      </>
                    ) : (
                      <>
                        <YAxis
                          stroke="#10b981"
                          tick={{ fontSize: 11 }}
                          label={{
                            value: "班级数 (个)",
                            angle: -90,
                            position: "insideLeft",
                            style: {
                              textAnchor: "middle",
                              fontSize: 11,
                              fill: "#10b981",
                            },
                          }}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: "8px",
                            border: "none",
                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                          }}
                        />
                        <Bar
                          dataKey="班级数"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: Progress Gages for Class Status & Types */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-6">
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-3.5 flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-slate-400" />
                  班级运行状态构成比
                </h3>
                <div className="space-y-3">
                  {classStatusBreakdown.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-600 flex items-center gap-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${item.color}`}
                          />
                          {item.name}
                        </span>
                        <span className="text-slate-500">
                          {item.count} 班 ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-slate-400" />
                    在校班级类型分布
                  </h3>
                </div>
                <div className="space-y-3">
                  {classTypeBreakdown.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      暂无类型分布
                    </p>
                  ) : (
                    classTypeBreakdown.map((item, idx) => {
                      const colors = [
                        "bg-indigo-500",
                        "bg-sky-500",
                        "bg-violet-500",
                        "bg-pink-500",
                      ];
                      const activeColor = colors[idx % colors.length];
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-slate-600">{item.name}</span>
                            <span className="text-slate-500">
                              {item.count} 班 ({item.percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${activeColor}`}
                              style={{ width: `${item.percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Top Majors & Department Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Top Majors Chart */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
              <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-slate-400" />
                全校规模前八专业在校生排行 (含班级数)
              </h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={majorStats}
                    layout="vertical"
                    margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={110}
                      tick={{ fontSize: 11, fill: "#475569" }}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="学生人数"
                      name="在校生数"
                      fill="#4f46e5"
                      radius={[0, 4, 4, 0]}
                      barSize={12}
                    />
                    <Bar
                      dataKey="班级数"
                      name="班级个数"
                      fill="#10b981"
                      radius={[0, 4, 4, 0]}
                      barSize={8}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Column: Major Department Summary Table */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-400" />
                  专业部办学规模对比
                </h3>
                <div className="divide-y divide-slate-100 overflow-y-auto max-h-[260px] pr-1">
                  {deptSummaryList.map((dept, idx) => (
                    <div
                      key={idx}
                      className="py-3 flex items-center justify-between hover:bg-slate-50 transition-colors px-1 rounded-lg"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-sm text-slate-800">
                          {dept.name}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{dept.majorCount}专业</span>
                          <span>•</span>
                          <span>{dept.classCount}班</span>
                          <span>•</span>
                          <span>{dept.teacherCount}教师</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm text-indigo-600 block">
                          {dept.studentCount}人
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          周课时 {dept.totalHours} 节
                        </span>
                      </div>
                    </div>
                  ))}
                  {deptSummaryList.length === 0 && (
                    <p className="text-xs text-slate-400 italic py-4 text-center">
                      暂无专业部数据
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setActiveTab("majors")}
                className="w-full flex items-center justify-center gap-1.5 py-2 mt-4 bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-100 rounded-lg text-xs font-semibold transition-all shadow-sm"
              >
                查看专业结构明细
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB CONTENT: 2. MAJORS */}
      {activeTab === "majors" && (
        <div className="space-y-6 animate-fade-in">
          {/* Key Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase block">
                专业部数量
              </span>
              <span className="text-2xl font-extrabold text-slate-800 mt-1 block">
                {state.departments.length} 个
              </span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase block">
                开设专业总数
              </span>
              <span className="text-2xl font-extrabold text-slate-800 mt-1 block">
                {state.majors.length} 个
              </span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase block">
                规划总招生指标
              </span>
              <span className="text-2xl font-extrabold text-slate-800 mt-1 block">
                {state.majors.reduce(
                  (sum, m) => sum + (m.enrollmentTarget || 0),
                  0,
                )}{" "}
                人
              </span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 uppercase block">
                实际在校生人数
              </span>
              <span className="text-2xl font-extrabold text-indigo-700 mt-1 block">
                {studentMetrics.grandTotal} 人
              </span>
            </div>
          </div>

          {/* Dept & Majors Detailed Grid */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-800">
                全校专业分布与教学指标对照表
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                展示专业对应的招生指标、班级数、在校生人数及平均班额指标
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-600 font-medium">
                  <tr>
                    <th className="px-6 py-3 w-44">专业名称</th>
                    <th className="px-6 py-3 w-44">所属专业部</th>
                    <th className="px-6 py-3 text-center">总班级数</th>
                    <th className="px-6 py-3 text-center">在校班级结构</th>
                    <th className="px-6 py-3 text-right">在校人数</th>
                    <th className="px-6 py-3 text-right">规划招生目标</th>
                    <th className="px-6 py-3 text-right">平均班额</th>
                    <th className="px-6 py-3 text-right">周课时量</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {majorDetailedList.map((major) => {
                    const achievementRate =
                      major.enrollmentTarget > 0
                        ? Math.round(
                            (major.studentCount / major.enrollmentTarget) * 100,
                          )
                        : null;

                    return (
                      <tr
                        key={major.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {major.name}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {major.deptName}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700">
                          {major.classCount}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                            {major.inSchoolCount > 0 && (
                              <span className="bg-emerald-50 text-emerald-700 px-1 rounded">
                                在校:{major.inSchoolCount}
                              </span>
                            )}
                            {major.internshipCount > 0 && (
                              <span className="bg-orange-50 text-orange-700 px-1 rounded">
                                实习:{major.internshipCount}
                              </span>
                            )}
                            {major.returnedCount > 0 && (
                              <span className="bg-indigo-50 text-indigo-700 px-1 rounded">
                                返校:{major.returnedCount}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-extrabold text-indigo-600">
                          {major.studentCount}人
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600">
                          {major.enrollmentTarget > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="font-semibold">
                                {major.enrollmentTarget}人
                              </span>
                              {achievementRate !== null && (
                                <span
                                  className={`text-[10px] font-bold ${achievementRate >= 100 ? "text-emerald-600" : "text-amber-600"}`}
                                >
                                  达成率 {achievementRate}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">
                              未指定
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-600 font-semibold">
                          {major.avgClassSize} 人/班
                        </td>
                        <td className="px-6 py-4 text-right text-indigo-700 font-bold">
                          {major.totalHours} 节
                        </td>
                      </tr>
                    );
                  })}
                  {majorDetailedList.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-8 text-center text-slate-500 italic"
                      >
                        暂无专业结构数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB CONTENT: 3. CLASSES */}
      {activeTab === "classes" && (
        <div className="space-y-6 animate-fade-in">
          {/* Advanced Filters */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-indigo-600" />
                班级态势多维筛选
              </h3>
              <div className="relative w-full lg:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="搜索班级、教室、班主任..."
                  value={classSearchQuery}
                  onChange={(e) => setClassSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">
                  专业方向
                </label>
                <select
                  value={classMajorFilter}
                  onChange={(e) => setClassMajorFilter(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">
                    所有专业方向 ({state.majors.length})
                  </option>
                  {state.majors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">
                  年级
                </label>
                <select
                  value={classGradeFilter}
                  onChange={(e) => setClassGradeFilter(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">所有年级</option>
                  {state.grades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">
                  在校状态 (课时管理)
                </label>
                <select
                  value={classStatusFilter}
                  onChange={(e) => setClassStatusFilter(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">所有状态</option>
                  <option value="正常在校">正常在校 (可排课)</option>
                  <option value="外出实习">外出实习 (不排课/课时清零)</option>
                  <option value="实习返校">实习返校 (可排课)</option>
                  <option value="已毕业">已毕业 (不排课/课时清零)</option>
                  <option value="合并解散">合并解散 (不排课/课时清零)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">
                  班级类型
                </label>
                <select
                  value={classTypeFilter}
                  onChange={(e) => setClassTypeFilter(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">所有班级类型</option>
                  {state.classCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table list of classes */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800">
                  全校班级状态与课时覆盖明细
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  当前已筛选出 {filteredClassesList.length} 个班级，包含{" "}
                  {filteredClassesList.reduce(
                    (sum, c) => sum + (c.studentCount || 0),
                    0,
                  )}{" "}
                  名学生
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg font-medium">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>
                  温馨提示: “外出实习”、“已毕业” 和 “合并解散”
                  状态班级不排课，已排课时自动归零。
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-600 font-medium">
                  <tr>
                    <th className="px-6 py-3.5">班级名称</th>
                    <th className="px-6 py-3.5">专业与年级</th>
                    <th className="px-6 py-3.5">类型</th>
                    <th className="px-6 py-3.5">班主任</th>
                    <th className="px-6 py-3.5">固定教室</th>
                    <th className="px-6 py-3.5 text-center">人数</th>
                    <th className="px-6 py-3.5 text-center">当前状态</th>
                    <th className="px-6 py-3.5 text-right w-36">
                      已排/覆盖课时
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClassesList.map((cls) => {
                    const isDisabled =
                      cls.status === "外出实习" ||
                      cls.status === "已毕业" ||
                      cls.status === "合并解散";

                    return (
                      <tr
                        key={cls.id}
                        className={`hover:bg-slate-50 transition-colors ${isDisabled ? "bg-slate-50/50" : ""}`}
                      >
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {cls.name}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-700 text-xs">
                              {cls.majorName}
                            </span>
                            <span className="text-[11px] text-slate-400 mt-0.5">
                              {cls.deptName} • {cls.gradeName}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            {cls.type || "普通班"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {cls.headTeacherName === "未分配" ? (
                            <span className="text-xs text-rose-500 italic font-medium flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              未分配
                            </span>
                          ) : (
                            <span className="text-xs text-slate-700 font-semibold flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                              {cls.headTeacherName}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-600">
                          {cls.classroom || (
                            <span className="text-slate-400 italic">
                              未指定
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700">
                          {cls.studentCount || 0}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-bold border ${
                              cls.status === "外出实习"
                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                : cls.status === "实习返校"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                  : cls.status === "已毕业"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : cls.status === "合并解散"
                                      ? "bg-slate-100 text-slate-500 border-slate-200"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                cls.status === "外出实习"
                                  ? "bg-orange-500"
                                  : cls.status === "实习返校"
                                    ? "bg-indigo-500"
                                    : cls.status === "已毕业"
                                      ? "bg-rose-500"
                                      : cls.status === "合并解散"
                                        ? "bg-slate-400"
                                        : "bg-emerald-500"
                              }`}
                            />
                            {cls.status || "正常在校"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {isDisabled ? (
                            <span className="text-[11px] font-bold text-slate-400 italic">
                              不排课 (清零)
                            </span>
                          ) : cls.totalHours > 0 ? (
                            <div className="flex flex-col items-end">
                              <span className="font-extrabold text-indigo-600">
                                {cls.totalHours} 节/周
                              </span>
                              <span className="text-[10px] text-slate-400">
                                覆盖 {cls.subjectCount} 门课程
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-amber-600 font-medium inline-flex items-center gap-1 justify-end bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                              <AlertCircle className="w-3 h-3" />
                              未排课
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredClassesList.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-8 text-center text-slate-500 italic"
                      >
                        未检索到符合条件的班级
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAB CONTENT: 4. TEACHERS */}
      {activeTab === "teachers" && (
        <div className="space-y-6 animate-fade-in">
          {/* Workload Filter Header */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-indigo-600" />
                  师资与工作量维度筛选
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 lg:flex-initial">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="搜索教师姓名..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full lg:w-44"
                  />
                </div>

                <button
                  onClick={() => setShowTeacherDashboard(!showTeacherDashboard)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all text-xs font-semibold shadow-sm"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  {showTeacherDashboard ? "折叠统计图" : "展开统计图"}
                </button>

                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all text-xs font-semibold shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  导出统计 Excel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">
                  产业部
                </label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">所有产业部</option>
                  {teacherDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">
                  主教科型
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">所有学科</option>
                  {teacherSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">
                  性别
                </label>
                <select
                  value={selectedGender}
                  onChange={(e) => setSelectedGender(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">所有性别</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                  <option value="未知">未知</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">
                  年龄区间
                </label>
                <select
                  value={selectedAgeRange}
                  onChange={(e) => setSelectedAgeRange(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">所有年龄段</option>
                  <option value="under30">30岁以下</option>
                  <option value="30to40">30-40岁</option>
                  <option value="40to50">40-50岁</option>
                  <option value="over50">50岁以上</option>
                  <option value="unknown">未知</option>
                </select>
              </div>
            </div>
          </div>

          {/* Collapsible Teacher Stats dashboard chart boxes */}
          {showTeacherDashboard && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-8 mb-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                  <p className="text-sm font-medium text-indigo-600">
                    本筛选下排课教师
                  </p>
                  <p className="text-3xl font-bold text-indigo-900 mt-1">
                    {teacherDashboardData.activeTeachersCount}{" "}
                    <span className="text-sm font-normal text-indigo-700">
                      人
                    </span>
                  </p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                  <p className="text-sm font-medium text-emerald-600">
                    平均工作负荷
                  </p>
                  <p className="text-3xl font-bold text-emerald-900 mt-1">
                    {teacherDashboardData.avgSchoolWorkload}{" "}
                    <span className="text-sm font-normal text-emerald-700">
                      课时/周
                    </span>
                  </p>
                </div>
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
                  <p className="text-sm font-medium text-amber-600">
                    任课教学课程总数
                  </p>
                  <p className="text-3xl font-bold text-amber-900 mt-1">
                    {teacherDashboardData.totalCourses}{" "}
                    <span className="text-sm font-normal text-amber-700">
                      门
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Dept Chart */}
                <div className="h-80">
                  <h3 className="text-sm font-bold text-slate-700 mb-4 text-center">
                    各产业部教师平均周课时与课程数
                  </h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={teacherDashboardData.statsByDept}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        stroke="#6366f1"
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#10b981"
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Legend />
                      <Bar
                        yAxisId="left"
                        dataKey="avgWorkload"
                        name="平均工作量 (课时)"
                        fill="#6366f1"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        yAxisId="right"
                        dataKey="courseCount"
                        name="任教课程数"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Age Chart */}
                <div className="h-80">
                  <h3 className="text-sm font-bold text-slate-700 mb-4 text-center">
                    各年龄段平均周课时与分布人数
                  </h3>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={teacherDashboardData.statsByAge}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="avgWorkload"
                        name="平均工作量 (课时)"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="teacherCount"
                        name="排课教师人数"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Workload Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-6 py-4 font-semibold w-52">
                    教师姓名与部门
                  </th>
                  <th className="px-6 py-4 font-semibold">
                    授课班级课程与课时明细
                  </th>
                  <th
                    className="px-6 py-4 font-semibold text-right w-36 cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={() =>
                      setSortOrder(sortOrder === "desc" ? "asc" : "desc")
                    }
                  >
                    <div className="flex items-center justify-end gap-1">
                      总课时/周
                      <div className="flex flex-col -space-y-1">
                        <span
                          className={`text-[8px] ${sortOrder === "asc" ? "text-indigo-600" : "text-slate-300"}`}
                        >
                          ▲
                        </span>
                        <span
                          className={`text-[8px] ${sortOrder === "desc" ? "text-indigo-600" : "text-slate-300"}`}
                        >
                          ▼
                        </span>
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workloadData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-6 py-8 text-center text-slate-500 italic"
                    >
                      未检索到符合条件的教师工作量数据
                    </td>
                  </tr>
                ) : (
                  workloadData.map((teacher) => (
                    <tr
                      key={teacher.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 align-top pt-5">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                            {teacher.name.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-extrabold text-slate-800 text-sm">
                              {teacher.name}
                              {teacher.gender && (
                                <span className="text-xs font-normal text-slate-500 ml-1">
                                  ({teacher.gender})
                                </span>
                              )}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {calculateAge(teacher.idCard)
                                ? `${calculateAge(teacher.idCard)}岁`
                                : "年龄未知"}
                            </span>
                            <div className="text-xs text-slate-500 mt-1.5 flex flex-col gap-0.5">
                              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] w-max font-semibold">
                                {teacher.department || "未指派部门"}
                              </span>
                              <span className="text-[10px] text-slate-400 mt-1">
                                主教科型: {teacher.primarySubject || "无"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {teacher.schedules.length === 0 ? (
                          <span className="text-slate-400 italic text-xs">
                            暂无任课与课时分配
                          </span>
                        ) : (
                          <div className="space-y-3">
                            {Object.entries(teacher.deptBreakdown).map(
                              ([deptName, items], idx) => (
                                <div
                                  key={idx}
                                  className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                                >
                                  <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                                    {deptName}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {(items as any[]).map((item, i) => (
                                      <span
                                        key={i}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 text-xs shadow-sm font-medium"
                                      >
                                        {item.className}
                                        <span className="text-slate-400 font-normal">
                                          |
                                        </span>
                                        <span className="text-slate-500 font-semibold">
                                          {item.subjectName}
                                        </span>
                                        <span className="text-indigo-600 font-extrabold bg-indigo-50 px-1 rounded ml-0.5">
                                          {item.hours}节
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right align-top pt-6">
                        <span
                          className={`inline-flex items-center justify-center px-3.5 py-1 rounded-full font-extrabold text-sm border shadow-sm ${
                            teacher.totalHours > 20
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : teacher.totalHours > 12
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : teacher.totalHours > 0
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-50 text-slate-400 border-slate-200"
                          }`}
                        >
                          {teacher.totalHours} 节/周
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
