import React, { useState, useMemo, useEffect } from "react";
import { useAppContext } from "../context";
import {
  Building2,
  Users,
  GraduationCap,
  TrendingUp,
  Calculator,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Calendar,
  RefreshCw,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Save,
  Edit3,
  Trash2,
  Plus,
  Download,
  Upload,
  ArrowUpDown,
} from "lucide-react";
import { ConfirmModal } from "./ConfirmModal";
import * as xlsx from "xlsx";
import { SearchableTeacherSelect } from "./SearchableTeacherSelect";

function getDefaultWeeklyHours(name: string): number {
  if (
    [
      "普通班",
      "3+2",
      "普通班（团队）",
      "3+2（团队）",
      "五年制",
      "春招班",
    ].includes(name)
  ) {
    return 30;
  }
  if (["培优班", "中职云班"].includes(name)) {
    return 34;
  }
  if (["综合高中普通", "综合高中艺体", "综合高中云班"].includes(name)) {
    return 40;
  }
  return 30;
}

export function SemesterPlanner() {
  const {
    state,
    updateMajorEnrollmentTarget,
    presetClassesForMajor,
    updateClassStatus,
    transitionAcademicYear,
    addClass,
    updateClass,
    deleteClass,
    importClasses,
    updateClassCategoryHours,
  } = useAppContext();

  const [activeSubTab, setActiveSubTab] = useState<
    "status" | "enrollment" | "forecast" | "switch"
  >("status");

  // Input states for forecast parameters (persisted in localStorage)
  const [onCampusHours, setOnCampusHours] = useState<number>(() => {
    const saved = localStorage.getItem("semester_planner_on_campus_hours");
    return saved ? parseInt(saved, 10) || 31 : 31;
  });
  const [internshipHours, setInternshipHours] = useState<number>(() => {
    const saved = localStorage.getItem("semester_planner_internship_hours");
    return saved !== null && !isNaN(parseInt(saved, 10))
      ? parseInt(saved, 10)
      : 0;
  });
  const [teacherStandardHours, setTeacherStandardHours] = useState<number>(
    () => {
      const saved = localStorage.getItem(
        "semester_planner_teacher_standard_hours",
      );
      return saved ? parseInt(saved, 10) || 14 : 14;
    },
  );

  // Persist forecast parameters to localStorage when they change
  useEffect(() => {
    localStorage.setItem(
      "semester_planner_on_campus_hours",
      onCampusHours.toString(),
    );
  }, [onCampusHours]);

  useEffect(() => {
    localStorage.setItem(
      "semester_planner_internship_hours",
      internshipHours.toString(),
    );
  }, [internshipHours]);

  useEffect(() => {
    localStorage.setItem(
      "semester_planner_teacher_standard_hours",
      teacherStandardHours.toString(),
    );
  }, [teacherStandardHours]);

  // States for preset generator
  const [targetCohort, setTargetCohort] = useState<string>("");
  const [majorPresets, setMajorPresets] = useState<
    Record<string, { target: number; classSize: number; classType: string }>
  >({});

  // Confirm Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  // For Forecast Tab multi-dimensional toggles
  const [forecastView, setForecastView] = useState<
    "dept" | "major" | "subject"
  >("dept");

  // Sort states for subject forecast
  const [subjectSortField, setSubjectSortField] = useState<
    "name" | "type" | "hours" | "needed" | "actual" | "ratio" | "gap"
  >("gap");
  const [subjectSortOrder, setSubjectSortOrder] = useState<"asc" | "desc">(
    "asc",
  );

  // For Class Editing / Creation
  const [showClassModal, setShowClassModal] = useState<boolean>(false);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classForm, setClassForm] = useState<{
    majorId: string;
    gradeId: string;
    name: string;
    type: string;
    classroom: string;
    studentCount: number;
    headTeacherId: string;
    status: "正常在校" | "外出实习" | "实习返校" | "已毕业";
  }>({
    majorId: "",
    gradeId: "",
    name: "",
    type: "普通班",
    classroom: "",
    studentCount: 40,
    headTeacherId: "",
    status: "正常在校",
  });

  const [importResultModal, setImportResultModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  }>({ isOpen: false, title: "", message: "" });

  // Sorting state for classes
  const [classSortKey, setClassSortKey] = useState<
    "name" | "grade" | "major" | null
  >(null);
  const [classSortOrder, setClassSortOrder] = useState<"asc" | "desc">("asc");

  // Filtering state for departments' classes
  const [deptFilters, setDeptFilters] = useState<
    Record<
      string,
      {
        gradeId?: string;
        majorId?: string;
        classType?: string;
        status?: string;
      }
    >
  >({});

  // State for toggling department blocks
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>(
    {},
  );

  const toggleDeptCollapse = (deptId: string) => {
    setCollapsedDepts((prev) => ({ ...prev, [deptId]: !prev[deptId] }));
  };

  const updateDeptFilter = (
    deptId: string,
    filterKey: "gradeId" | "majorId" | "classType" | "status",
    value: string,
  ) => {
    setDeptFilters((prev) => ({
      ...prev,
      [deptId]: {
        ...prev[deptId],
        [filterKey]: value,
      },
    }));
  };

  const handleSort = (key: "name" | "grade" | "major") => {
    if (classSortKey === key) {
      setClassSortOrder(classSortOrder === "asc" ? "desc" : "asc");
    } else {
      setClassSortKey(key);
      setClassSortOrder("asc");
    }
  };

  // Get active departments, majors, classes
  const departments = state.departments;
  const majors = state.majors;
  const classes = state.classes;
  const teachers = state.teachers;

  // Class action helper functions
  const startAddClass = (defaultDeptId?: string) => {
    const firstMajor =
      majors.find((m) =>
        defaultDeptId ? m.departmentId === defaultDeptId : true,
      ) || majors[0];
    const firstGrade = state.grades[0];
    const firstType = state.classCategories[0]?.name || "普通班";

    setClassForm({
      majorId: firstMajor?.id || "",
      gradeId: firstGrade?.id || "",
      name: "",
      type: firstType,
      classroom: "",
      studentCount: 40,
      headTeacherId: "",
      status: "正常在校",
    });
    setEditingClassId(null);
    setShowClassModal(true);
  };

  const startEditClass = (cls: any) => {
    setClassForm({
      majorId: cls.majorId,
      gradeId: cls.gradeId,
      name: cls.name,
      type: cls.type || "普通班",
      classroom: cls.classroom || "",
      studentCount: cls.studentCount || 0,
      headTeacherId: cls.headTeacherId || "",
      status: cls.status || "正常在校",
    });
    setEditingClassId(cls.id);
    setShowClassModal(true);
  };

  const handleSaveClass = () => {
    if (!classForm.name.trim()) {
      alert("请填写班级名称");
      return;
    }
    if (!classForm.majorId) {
      alert("请选择专业");
      return;
    }
    if (!classForm.gradeId) {
      alert("请选择年级");
      return;
    }

    if (editingClassId) {
      updateClass({
        id: editingClassId,
        ...classForm,
      } as any);
    } else {
      addClass(classForm as any);
    }
    setShowClassModal(false);
    setEditingClassId(null);
  };

  const handleDeleteClassClick = (cls: any) => {
    setConfirmModal({
      isOpen: true,
      title: "确认删除班级",
      message: `确定要删除班级【${cls.name}】吗？这将同步清空该班级的所有排课数据。此操作无法撤销。`,
      onConfirm: () => {
        deleteClass(cls.id);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  const downloadClassTemplate = () => {
    const ws = xlsx.utils.json_to_sheet([
      {
        所属专业: "计算机应用",
        年级: "2023级",
        班级名称: "23计算机1班",
        班级类型: "普通班",
        教室: "教学楼101",
        人数: 45,
        班主任姓名: "张三",
        班主任身份证: "110105199001011234",
      },
    ]);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "班级导入模板");
    xlsx.writeFile(wb, "班级导入模板.xlsx");
  };

  const handleClassImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = xlsx.utils.sheet_to_json(ws);

        const parsedData = data.map((row: any) => {
          const majorName = String(
            row["所属专业"] || row["major"] || "",
          ).trim();
          const major = state.majors.find((m) => m.name === majorName);

          const gradeName = String(row["年级"] || row["grade"] || "").trim();
          const grade = state.grades.find((g) => g.name === gradeName);

          const teacherName = String(
            row["班主任姓名"] || row["headTeacher"] || "",
          ).trim();
          const teacherIdCard = String(
            row["班主任身份证"] || row["headTeacherIdCard"] || "",
          ).trim();
          let headTeacherId = "";
          if (teacherIdCard) {
            const teacher = state.teachers.find(
              (t) => t.idCard === teacherIdCard,
            );
            if (teacher) headTeacherId = teacher.id;
          } else if (teacherName) {
            const teacher = state.teachers.find((t) => t.name === teacherName);
            if (teacher) headTeacherId = teacher.id;
          }

          const typeName = String(
            row["班级类型"] || row["type"] || "普通班",
          ).trim();
          const category = state.classCategories.find(
            (c) => c.name === typeName,
          );

          return {
            majorId: major?.id || "",
            gradeId: grade?.id || "",
            name: String(row["班级名称"] || row["name"] || "").trim(),
            type: category?.name || typeName,
            classroom: String(row["教室"] || row["classroom"] || "").trim(),
            studentCount:
              parseInt(row["人数"] || row["studentCount"] || "0") || 0,
            headTeacherId,
            status: "正常在校",
          };
        });

        const result = importClasses(parsedData as any);

        setImportResultModal({
          isOpen: true,
          title: "导入结果",
          message: `成功导入 ${result.added} 个班级，更新 ${result.updated} 个班级，失败 ${result.failed} 个班级（请检查专业、年级、班级名称是否填写正确）。`,
        });
      } catch (err: any) {
        alert("解析 Excel 失败，请确保格式正确：" + err.message);
      }
      e.target.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const hasInitializedTargetCohort = React.useRef(false);

  // Initialize preset parameters for majors
  React.useEffect(() => {
    const initialPresets: typeof majorPresets = {};
    majors.forEach((m) => {
      initialPresets[m.id] = {
        target: m.enrollmentTarget || 120,
        classSize: 40,
        classType: state.classCategories[0]?.name || "普通班",
      };
    });
    setMajorPresets(initialPresets);

    // Auto-select latest grade as default cohort if empty
    if (!hasInitializedTargetCohort.current && state.grades.length > 0) {
      // Find the maximum cohort year, e.g. "2026级", guess "2027级"
      const cohorts = state.grades
        .map((g) => parseInt(g.name.replace(/[^0-9]/g, "")))
        .filter((n) => !isNaN(n));
      if (cohorts.length > 0) {
        const nextCohort = Math.max(...cohorts) + 1;
        setTargetCohort(`${nextCohort}级`);
      } else {
        setTargetCohort("2026级");
      }
      hasInitializedTargetCohort.current = true;
    }
  }, [majors, state.grades, state.classCategories]);

  const getClassStatus = (cls: any) => {
    return cls.status || "正常在校";
  };

  // 1. Calculations for Class Status board
  const classesByDept = useMemo(() => {
    const result: Record<string, typeof classes> = {};
    classes.forEach((cls) => {
      const major = majors.find((m) => m.id === cls.majorId);
      if (!major) return;
      const dept = departments.find((d) => d.id === major.departmentId);
      const deptName = dept?.name || "未分配产业部";
      if (!result[deptName]) result[deptName] = [];
      result[deptName].push(cls);
    });
    return result;
  }, [classes, majors, departments]);

  // Dynamic class hours calculation
  const getClassWeeklyHours = (cls: any) => {
    const status = cls.status || "正常在校";
    if (status === "已毕业" || status === "合并解散" || cls.isPreset) return 0;
    if (status === "外出实习") return internshipHours;

    // Find category to see if weeklyHours is customized
    const category = state.classCategories.find(
      (cc: any) => cc.name === cls.type,
    );
    if (category && category.weeklyHours !== undefined) {
      return category.weeklyHours;
    }
    return getDefaultWeeklyHours(cls.type);
  };

  // 2. Department Forecast Calculations
  const deptForecasts = useMemo(() => {
    return departments.map((dept) => {
      const deptMajors = majors.filter((m) => m.departmentId === dept.id);
      const majorIds = new Set(deptMajors.map((m) => m.id));
      const deptClasses = classes.filter(
        (c) => majorIds.has(c.majorId) && !c.isPreset,
      );

      let totalWeeklyHours = 0;
      let onCampusCount = 0;
      let internshipCount = 0;
      let returnedCount = 0;
      let graduatedCount = 0;
      let totalAdminClasses = 0;

      deptClasses.forEach((c) => {
        const status = getClassStatus(c);
        const isAdmin =
          !c.name.includes("(复排)") && !c.name.includes("（复排）");

        if (status !== "已毕业" && status !== "合并解散") {
          totalWeeklyHours += getClassWeeklyHours(c);
        }

        if (isAdmin) {
          totalAdminClasses++;
          if (status === "已毕业" || status === "合并解散") {
            graduatedCount++;
          } else if (status === "正常在校") {
            onCampusCount++;
          } else if (status === "实习返校") {
            returnedCount++;
          } else if (status === "外出实习") {
            internshipCount++;
          }
        }
      });

      const teachersNeeded = totalWeeklyHours / teacherStandardHours;
      const actualTeachers = teachers.filter((t) => t.department === dept.name);

      return {
        id: dept.id,
        name: dept.name,
        totalClasses: totalAdminClasses,
        onCampusCount,
        internshipCount,
        returnedCount,
        graduatedCount,
        totalWeeklyHours,
        teachersNeeded: parseFloat(teachersNeeded.toFixed(1)),
        actualTeachersCount: actualTeachers.length,
        gap: parseFloat((teachersNeeded - actualTeachers.length).toFixed(1)),
      };
    });
  }, [
    departments,
    majors,
    classes,
    teachers,
    state.classCategories,
    internshipHours,
    teacherStandardHours,
  ]);

  // 3. Major Forecast Calculations
  const majorForecasts = useMemo(() => {
    return majors.map((m) => {
      const majorClasses = classes.filter(
        (c) => c.majorId === m.id && !c.isPreset,
      );
      const dept = departments.find((d) => d.id === m.departmentId);

      let totalWeeklyHours = 0;
      let onCampusCount = 0;
      let internshipCount = 0;
      let returnedCount = 0;
      let graduatedCount = 0;
      let totalAdminClasses = 0;

      majorClasses.forEach((c) => {
        const status = getClassStatus(c);
        const isAdmin =
          !c.name.includes("(复排)") && !c.name.includes("（复排）");

        if (status !== "已毕业" && status !== "合并解散") {
          totalWeeklyHours += getClassWeeklyHours(c);
        }

        if (isAdmin) {
          totalAdminClasses++;
          if (status === "已毕业" || status === "合并解散") {
            graduatedCount++;
          } else if (status === "正常在校") {
            onCampusCount++;
          } else if (status === "实习返校") {
            returnedCount++;
          } else if (status === "外出实习") {
            internshipCount++;
          }
        }
      });

      const majorSubjects = state.subjects.filter((s) => s.majorId === m.id);
      const majorSubjectNames = new Set(majorSubjects.map((s) => s.name));
      const majorTeachers = teachers.filter(
        (t) =>
          t.primarySubject === m.name ||
          majorSubjectNames.has(t.primarySubject || ""),
      );

      const teachersNeeded = totalWeeklyHours / teacherStandardHours;

      return {
        id: m.id,
        name: m.name,
        deptName: dept?.name || "无部门",
        totalClasses: totalAdminClasses,
        onCampusCount,
        internshipCount,
        returnedCount,
        graduatedCount,
        totalWeeklyHours,
        teachersNeeded: parseFloat(teachersNeeded.toFixed(1)),
        actualTeachersCount: majorTeachers.length,
        gap: parseFloat((teachersNeeded - majorTeachers.length).toFixed(1)),
      };
    });
  }, [
    majors,
    departments,
    classes,
    teachers,
    state.classCategories,
    state.subjects,
    internshipHours,
    teacherStandardHours,
  ]);

  // 4. Subject Forecast Calculations
  const subjectForecasts = useMemo(() => {
    const subjectNames = Array.from(new Set(state.subjects.map((s) => s.name)));

    return subjectNames
      .map((subName, idx) => {
        const matchingSubjects = state.subjects.filter(
          (s) => s.name === subName,
        );
        const subIds = new Set(matchingSubjects.map((s) => s.id));

        const totalWeeklyHours = state.schedules
          .filter((sch) => {
            const c = state.classes.find((cls) => cls.id === sch.classId);
            return (
              subIds.has(sch.subjectId) &&
              c &&
              !c.isPreset &&
              c.status !== "已毕业" &&
              c.status !== "合并解散"
            );
          })
          .reduce((sum, sch) => sum + sch.hours, 0);

        const subTeachers = teachers.filter(
          (t) => t.primarySubject === subName,
        );
        const teachersNeeded = totalWeeklyHours / teacherStandardHours;
        const sampleSubject = matchingSubjects[0];
        const dept = sampleSubject?.departmentId
          ? departments.find((d) => d.id === sampleSubject.departmentId)
          : null;

        return {
          id: `sub-forecast-${idx}`,
          name: subName,
          type: sampleSubject?.type || "专业课",
          deptName: dept?.name || "基础课",
          totalWeeklyHours,
          teachersNeeded: parseFloat(teachersNeeded.toFixed(1)),
          actualTeachersCount: subTeachers.length,
          gap: parseFloat((teachersNeeded - subTeachers.length).toFixed(1)),
        };
      })
      .sort((a, b) => {
        let valA: any =
          a[
            subjectSortField === "hours"
              ? "totalWeeklyHours"
              : subjectSortField === "needed"
                ? "teachersNeeded"
                : subjectSortField === "actual"
                  ? "actualTeachersCount"
                  : subjectSortField === "ratio"
                    ? "gap" /* handled below */
                    : subjectSortField
          ];
        let valB: any =
          b[
            subjectSortField === "hours"
              ? "totalWeeklyHours"
              : subjectSortField === "needed"
                ? "teachersNeeded"
                : subjectSortField === "actual"
                  ? "actualTeachersCount"
                  : subjectSortField === "ratio"
                    ? "gap" /* handled below */
                    : subjectSortField
          ];

        if (subjectSortField === "ratio") {
          const ratioA =
            a.teachersNeeded === 0
              ? 0
              : a.actualTeachersCount / a.teachersNeeded;
          const ratioB =
            b.teachersNeeded === 0
              ? 0
              : b.actualTeachersCount / b.teachersNeeded;
          valA = ratioA;
          valB = ratioB;
        }

        if (valA < valB) return subjectSortOrder === "asc" ? -1 : 1;
        if (valA > valB) return subjectSortOrder === "asc" ? 1 : -1;
        return 0;
      });
  }, [
    state.subjects,
    state.schedules,
    state.classes,
    teachers,
    departments,
    teacherStandardHours,
    subjectSortField,
    subjectSortOrder,
  ]);

  // Handle preset generator submission
  const handleGeneratePresets = (majorId: string) => {
    const params = majorPresets[majorId];
    if (!params) return;

    const classCount = Math.max(1, Math.ceil(params.target / params.classSize));

    // Find or create Grade ID for target cohort
    let targetGrade = state.grades.find((g) => g.name === targetCohort);

    // Set confirm modal
    setConfirmModal({
      isOpen: true,
      title: "确认生成预设班级",
      message: `将为专业【${majors.find((m) => m.id === majorId)?.name}】预设 ${classCount} 个班级（针对 ${targetCohort}，每班大约 ${params.classSize} 人），确定执行吗？`,
      onConfirm: () => {
        // Save target in major first
        updateMajorEnrollmentTarget(majorId, params.target);

        // Generate classes
        const presetsList = [];
        for (let i = 1; i <= classCount; i++) {
          presetsList.push({
            name: `${targetCohort}${majors.find((m) => m.id === majorId)?.name}预设${i}班`,
            studentCount:
              i === classCount && params.target % params.classSize !== 0
                ? params.target % params.classSize
                : params.classSize,
            type: params.classType,
          });
        }

        // We use a dummy or existing grade ID if cohort exists, or let it map to newGradeName
        // If the grade doesn't exist, we will use a temporary ID or create it.
        // For simplicity, find if exists, otherwise generate a temp ID or wait for year switch to link.
        const gradeId = targetGrade?.id || "temp-new-grade";

        presetClassesForMajor(majorId, gradeId, presetsList);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      },
    });
  };

  // Handle inline change of class status
  const handleStatusChange = (classId: string, value: any) => {
    const cls = classes.find((c) => c.id === classId);
    if (!cls) return;
    updateClassStatus(classId, value);
  };

  // Handle academic year promotion transition
  const handleYearTransition = () => {
    if (!targetCohort.trim()) {
      alert("请先输入新招收的年级名称");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: "⚠️ 确认进行全校学年升级切换 ⚠️",
      message: `一键升级后将自动执行以下操作：
1. 备份当前各产业部的排课数据为历史存档；
2. 自动计算各年级毕业状态（早于${targetCohort}三届的年级自动转为“已毕业”）；
3. 激活预先设置的【${targetCohort}】新生班级；
4. 清空当期主排课表，为您开启下学期全新排课设计。
此操作不可逆，确定现在执行升级切换吗？`,
      onConfirm: () => {
        transitionAcademicYear(targetCohort);
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        setActiveSubTab("status"); // Switch back to status tab to view upgraded classes
      },
    });
  };

  // Calculated totals
  const totals = useMemo(() => {
    let requiredTeachers = 0;
    let actualTeachers = 0;
    let totalClasses = 0;
    let totalPresetClasses = classes.filter((c) => c.isPreset).length;

    deptForecasts.forEach((df) => {
      requiredTeachers += df.teachersNeeded;
      actualTeachers += df.actualTeachersCount;
      totalClasses += df.totalClasses;
    });

    return {
      requiredTeachers: parseFloat(requiredTeachers.toFixed(1)),
      actualTeachers,
      totalClasses,
      totalPresetClasses,
      gap: parseFloat((requiredTeachers - actualTeachers).toFixed(1)),
    };
  }, [deptForecasts, classes]);

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-gradient-to-r from-indigo-900 to-slate-800 p-6 rounded-2xl text-white shadow-md">
        <div>
          <span className="bg-indigo-500/30 text-indigo-200 text-xs px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider">
            学期切换与工作规划
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight mt-2">
            下学期教学工作与教师需求规划
          </h2>
          <p className="text-indigo-200 text-sm mt-1.5 max-w-2xl">
            在学期末，根据新生招生预期和各年级状态（返校、实习），预设班级结构，智能测算师资缺口，最终一键安全过渡到下学期教学任务。
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white/10 p-3 rounded-xl border border-white/10 shrink-0 text-right">
          <div>
            <p className="text-xs text-indigo-200">
              全校预估班级总数 / 预设 draft
            </p>
            <p className="text-xl font-bold">
              {totals.totalClasses}{" "}
              <span className="text-sm font-normal text-indigo-300">
                个激活班
              </span>{" "}
              + {totals.totalPresetClasses}{" "}
              <span className="text-sm font-normal text-indigo-300">
                个预设
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-200 bg-white p-1 rounded-xl shadow-sm">
        <button
          onClick={() => setActiveSubTab("status")}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeSubTab === "status"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Building2 className="w-4 h-4" />
          在校班级与状态管理
        </button>
        <button
          onClick={() => setActiveSubTab("enrollment")}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeSubTab === "enrollment"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          招生预设与新生建班
        </button>
        <button
          onClick={() => setActiveSubTab("forecast")}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeSubTab === "forecast"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Calculator className="w-4 h-4" />
          师资缺口测算
        </button>
        <button
          onClick={() => setActiveSubTab("switch")}
          className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${
            activeSubTab === "switch"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Calendar className="w-4 h-4" />
          学年升级一键切换
        </button>
      </div>

      {/* Tab Content */}
      <div className="transition-all duration-200">
        {/* Tab 1: Class Status Board */}
        {activeSubTab === "status" && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm flex gap-3 shadow-sm">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">班级状态与排课关联说明：</span>
                在下方表格中更改班级的状态后，将直接联动影响“师资需求测算”。
                处于“正常在校”或“实习返校”状态的班级会按标准安排全量周课时；处于“外出实习”状态的班级将仅保留极少量/零实习指导课时；“已毕业”或“合并解散”班级将不产生任何课时需求。
              </div>
            </div>

            {/* Class Operations Command Row (Integrated from Settings per Requirement 3) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                  <Building2 className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    在校班级建制与属性管理
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    直接在此模块添加、编辑、删除或通过 Excel
                    批量导入全校班级，确保排课与规划一体化
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={downloadClassTemplate}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> 下载导入模板
                </button>
                <label className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> 导入班级Excel
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={handleClassImport}
                  />
                </label>
                <button
                  onClick={() => startAddClass()}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
                >
                  <Plus className="w-4 h-4" /> 添加在校班级
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {departments.map((dept) => {
                const allDeptClasses = classes.filter((cls) => {
                  const major = majors.find((m) => m.id === cls.majorId);
                  return major?.departmentId === dept.id;
                });

                // Apply per-department filters
                const filters = deptFilters[dept.id] || {};
                let deptClasses = allDeptClasses.filter((cls) => {
                  if (filters.gradeId && cls.gradeId !== filters.gradeId)
                    return false;
                  if (filters.majorId && cls.majorId !== filters.majorId)
                    return false;
                  if (
                    filters.classType &&
                    (cls.type || "普通班") !== filters.classType
                  )
                    return false;
                  if (
                    filters.status &&
                    (cls.status || "正常在校") !== filters.status
                  )
                    return false;
                  return true;
                });

                if (classSortKey) {
                  deptClasses = [...deptClasses].sort((a, b) => {
                    let valA = "";
                    let valB = "";

                    if (classSortKey === "name") {
                      const gradeA =
                        state.grades.find((g) => g.id === a.gradeId)?.name ||
                        "";
                      const gradeB =
                        state.grades.find((g) => g.id === b.gradeId)?.name ||
                        "";
                      valA = gradeA + (a.name || "");
                      valB = gradeB + (b.name || "");
                    } else if (classSortKey === "grade") {
                      const gradeA =
                        state.grades.find((g) => g.id === a.gradeId)?.name ||
                        "";
                      const gradeB =
                        state.grades.find((g) => g.id === b.gradeId)?.name ||
                        "";
                      valA = gradeA;
                      valB = gradeB;
                    } else if (classSortKey === "major") {
                      const majorA =
                        majors.find((m) => m.id === a.majorId)?.name || "";
                      const majorB =
                        majors.find((m) => m.id === b.majorId)?.name || "";
                      valA = majorA;
                      valB = majorB;
                    }

                    return classSortOrder === "asc"
                      ? valA.localeCompare(valB, "zh-CN", { numeric: true })
                      : valB.localeCompare(valA, "zh-CN", { numeric: true });
                  });
                }

                return (
                  <div
                    key={dept.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    <div
                      className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => toggleDeptCollapse(dept.id)}
                    >
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        {collapsedDepts[dept.id] ? (
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        {dept.name}
                        <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium ml-1">
                          共 {allDeptClasses.length} 个班级
                          {deptClasses.length !== allDeptClasses.length &&
                            ` (已筛选: ${deptClasses.length} 个)`}
                        </span>
                      </h3>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startAddClass(dept.id);
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50/50 hover:bg-indigo-100 px-2 py-1 rounded"
                      >
                        <Plus className="w-3.5 h-3.5" /> 在本科室建班
                      </button>
                    </div>

                    {!collapsedDepts[dept.id] && (
                      <>
                        {/* Department-level filters toolbar */}
                        <div className="px-6 py-3 bg-slate-50/40 border-b border-slate-150 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                              筛选年级
                            </label>
                            <select
                              value={filters.gradeId || ""}
                              onChange={(e) =>
                                updateDeptFilter(
                                  dept.id,
                                  "gradeId",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-700 font-bold focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
                            >
                              <option value="">全部年级</option>
                              {state.grades.map((g) => (
                                <option key={g.id} value={g.id}>
                                  {g.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                              筛选专业
                            </label>
                            <select
                              value={filters.majorId || ""}
                              onChange={(e) =>
                                updateDeptFilter(
                                  dept.id,
                                  "majorId",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-700 font-bold focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
                            >
                              <option value="">全部专业</option>
                              {majors
                                .filter((m) => m.departmentId === dept.id)
                                .map((m) => (
                                  <option key={m.id} value={m.id}>
                                    {m.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                              筛选班级类型
                            </label>
                            <select
                              value={filters.classType || ""}
                              onChange={(e) =>
                                updateDeptFilter(
                                  dept.id,
                                  "classType",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-700 font-bold focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
                            >
                              <option value="">全部班级类型</option>
                              {state.classCategories.map((c) => (
                                <option key={c.id} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                              筛选当前状态
                            </label>
                            <select
                              value={filters.status || ""}
                              onChange={(e) =>
                                updateDeptFilter(
                                  dept.id,
                                  "status",
                                  e.target.value,
                                )
                              }
                              className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-xs text-slate-700 font-bold focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all shadow-sm"
                            >
                              <option value="">全部状态</option>
                              <option value="正常在校">正常在校</option>
                              <option value="外出实习">外出实习</option>
                              <option value="实习返校">实习返校</option>
                              <option value="已毕业">已毕业</option>
                              <option value="合并解散">合并解散</option>
                            </select>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-sm">
                            <thead>
                              <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-xs font-bold uppercase select-none">
                                <th
                                  className="px-6 py-3 cursor-pointer hover:bg-slate-200/60 transition-colors group"
                                  onClick={() => handleSort("name")}
                                >
                                  <div className="flex items-center gap-1.5">
                                    班级名称
                                    <ArrowUpDown
                                      className={`w-3.5 h-3.5 transition-colors ${
                                        classSortKey === "name"
                                          ? "text-indigo-600 font-bold"
                                          : "text-slate-400 group-hover:text-slate-600"
                                      }`}
                                    />
                                  </div>
                                </th>
                                <th
                                  className="px-6 py-3 cursor-pointer hover:bg-slate-200/60 transition-colors group"
                                  onClick={() => handleSort("major")}
                                >
                                  <div className="flex items-center gap-1.5">
                                    所属专业
                                    <ArrowUpDown
                                      className={`w-3.5 h-3.5 transition-colors ${
                                        classSortKey === "major"
                                          ? "text-indigo-600 font-bold"
                                          : "text-slate-400 group-hover:text-slate-600"
                                      }`}
                                    />
                                  </div>
                                </th>
                                <th
                                  className="px-6 py-3 cursor-pointer hover:bg-slate-200/60 transition-colors group"
                                  onClick={() => handleSort("grade")}
                                >
                                  <div className="flex items-center gap-1.5">
                                    所属年级/级
                                    <ArrowUpDown
                                      className={`w-3.5 h-3.5 transition-colors ${
                                        classSortKey === "grade"
                                          ? "text-indigo-600 font-bold"
                                          : "text-slate-400 group-hover:text-slate-600"
                                      }`}
                                    />
                                  </div>
                                </th>
                                <th className="px-6 py-3">班级类型</th>
                                <th className="px-6 py-3">当前状态</th>
                                <th className="px-6 py-3">人数</th>
                                <th className="px-6 py-3">班主任</th>
                                <th className="px-6 py-3">排课属性</th>
                                <th className="px-6 py-3 text-right">操作</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {deptClasses.length === 0 ? (
                                <tr>
                                  <td
                                    colSpan={9}
                                    className="px-6 py-8 text-center text-slate-400"
                                  >
                                    该专业部下暂无班级数据
                                  </td>
                                </tr>
                              ) : (
                                deptClasses.map((cls) => {
                                  const status = getClassStatus(cls);
                                  const major = majors.find(
                                    (m) => m.id === cls.majorId,
                                  );
                                  const grade = state.grades.find(
                                    (g) => g.id === cls.gradeId,
                                  );
                                  const clsHours = getClassWeeklyHours(cls);

                                  return (
                                    <tr
                                      key={cls.id}
                                      className={`hover:bg-slate-50 transition-colors ${cls.isPreset ? "bg-amber-50/40" : ""}`}
                                    >
                                      <td className="px-6 py-4 font-bold text-slate-800">
                                        <div className="flex items-center gap-2">
                                          {(grade?.name || "") + cls.name}
                                          {cls.isPreset && (
                                            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded border border-amber-200">
                                              预设草稿
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-6 py-4 text-slate-600">
                                        {major?.name || "-"}
                                      </td>
                                      <td className="px-6 py-4 font-mono text-slate-500">
                                        {grade?.name || "未知级"}
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200">
                                          {cls.type || "普通班"}
                                        </span>
                                      </td>
                                      <td className="px-6 py-3">
                                        <select
                                          value={status}
                                          onChange={(e) =>
                                            handleStatusChange(
                                              cls.id,
                                              e.target.value,
                                            )
                                          }
                                          className={`border rounded px-2.5 py-1 text-xs font-semibold ${
                                            status === "正常在校"
                                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                              : status === "外出实习"
                                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                                : status === "实习返校"
                                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                  : "bg-slate-50 text-slate-600 border-slate-200"
                                          }`}
                                        >
                                          <option value="正常在校">
                                            正常在校
                                          </option>
                                          <option value="外出实习">
                                            外出实习
                                          </option>
                                          <option value="实习返校">
                                            实习返校
                                          </option>
                                          <option value="已毕业">已毕业</option>
                                          <option value="合并解散">
                                            合并解散
                                          </option>
                                        </select>
                                      </td>
                                      <td className="px-6 py-4 font-mono text-slate-600">
                                        {cls.studentCount}人
                                      </td>
                                      <td className="px-6 py-4 text-slate-600">
                                        {state.teachers.find(
                                          (t) => t.id === cls.headTeacherId,
                                        )?.name || "未指定"}
                                      </td>
                                      <td className="px-6 py-4 text-xs">
                                        {cls.isPreset ? (
                                          <span className="text-amber-600 font-semibold">
                                            不参与当前排课
                                          </span>
                                        ) : status === "正常在校" ||
                                          status === "实习返校" ? (
                                          <span className="text-emerald-600 font-semibold">
                                            标准排课 ({clsHours}课时)
                                          </span>
                                        ) : status === "外出实习" ? (
                                          <span className="text-orange-600 font-semibold">
                                            指导排课 ({clsHours}课时)
                                          </span>
                                        ) : (
                                          <span className="text-slate-400">
                                            已停用 (0课时)
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4 text-right whitespace-nowrap">
                                        <div className="flex justify-end gap-1.5">
                                          <button
                                            onClick={() => startEditClass(cls)}
                                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                            title="编辑班级"
                                          >
                                            <Edit3 className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={() =>
                                              handleDeleteClassClick(cls)
                                            }
                                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                            title="删除班级"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Enrollment and presets */}
        {activeSubTab === "enrollment" && (
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
                <span className="text-xs font-semibold text-indigo-200">
                  目标招收年级：
                </span>
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
              {departments.map((dept) => {
                const deptMajors = majors.filter(
                  (m) => m.departmentId === dept.id,
                );

                return (
                  <div
                    key={dept.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
                  >
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-indigo-600" />
                        {dept.name}
                      </h4>
                    </div>

                    <div className="p-6 space-y-4 flex-1">
                      {deptMajors.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-6">
                          该产业部下暂无专业信息
                        </p>
                      ) : (
                        deptMajors.map((m) => {
                          const preset = majorPresets[m.id] || {
                            target: 120,
                            classSize: 40,
                            classType: "普通班",
                          };
                          const predictedClasses =
                            Math.ceil(preset.target / preset.classSize) || 0;
                          const hasGeneratedPresets = classes.some(
                            (c) => c.majorId === m.id && c.isPreset,
                          );

                          return (
                            <div
                              key={m.id}
                              className="bg-slate-50 rounded-lg p-4 border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-indigo-200 transition-colors"
                            >
                              <div className="space-y-1">
                                <h5 className="font-bold text-slate-800 text-sm">
                                  {m.name} 专业
                                </h5>
                                <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1 font-medium">
                                  <span>预期招生: {preset.target} 人</span>
                                  <span>标准班额: {preset.classSize} 人</span>
                                  <span>类别: {preset.classType}</span>
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto shrink-0">
                                <div className="grid grid-cols-2 sm:flex items-center gap-2">
                                  <div className="flex flex-col">
                                    <label className="text-[10px] text-slate-400 font-semibold">
                                      招生数
                                    </label>
                                    <input
                                      type="number"
                                      value={preset.target}
                                      onChange={(e) => {
                                        const val =
                                          parseInt(e.target.value) || 0;
                                        setMajorPresets({
                                          ...majorPresets,
                                          [m.id]: { ...preset, target: val },
                                        });
                                      }}
                                      className="border border-slate-300 rounded px-2 py-1 text-xs w-20 text-center font-bold"
                                    />
                                  </div>
                                  <div className="flex flex-col">
                                    <label className="text-[10px] text-slate-400 font-semibold">
                                      班额
                                    </label>
                                    <input
                                      type="number"
                                      value={preset.classSize}
                                      onChange={(e) => {
                                        const val =
                                          parseInt(e.target.value) || 40;
                                        setMajorPresets({
                                          ...majorPresets,
                                          [m.id]: { ...preset, classSize: val },
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
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                      : "bg-indigo-600 text-white hover:bg-indigo-700"
                                  }`}
                                >
                                  {hasGeneratedPresets
                                    ? "重新生成预设"
                                    : "一键生成预设"}
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
        {activeSubTab === "forecast" && (
          <div className="space-y-6 animate-fade-in">
            {/* Standard Config Cards */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-indigo-600" />
                教学课时与排课基准设置
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">
                    在校/返校班级 周教学总课时 (全局参考)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={onCampusHours}
                      onChange={(e) =>
                        setOnCampusHours(parseInt(e.target.value) || 0)
                      }
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold w-full focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-400 font-medium shrink-0">
                      节/周
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    正常在校班级、实习返校班级默认的每周教学总课时参考值。
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">
                    外出实习班级 周指导课时
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={internshipHours}
                      onChange={(e) =>
                        setInternshipHours(parseInt(e.target.value) || 0)
                      }
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold w-full focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-400 font-medium shrink-0">
                      节/周
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    全班离校在外实习期间，安排给指导教师的周指导/联络课时。
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">
                    教师标准教学工作量
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={teacherStandardHours}
                      onChange={(e) =>
                        setTeacherStandardHours(parseInt(e.target.value) || 0)
                      }
                      className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-bold w-full focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-400 font-medium shrink-0">
                      节/周
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    每位全职教师每周的合理标准代课课时。用于测算所需师资。
                  </p>
                </div>
              </div>

              {/* Requirement 2: Custom Class Type Hours Config Tool */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    各类型班级的周教学标准课时设置：
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    修改后将直接实时联动排课系统的算力内核与师资缺口测算
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {state.classCategories.map((cat) => {
                    const value =
                      cat.weeklyHours !== undefined
                        ? cat.weeklyHours
                        : getDefaultWeeklyHours(cat.name);
                    return (
                      <div
                        key={cat.id}
                        className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between hover:border-slate-300 transition-colors"
                      >
                        <span className="text-xs font-bold text-slate-700 truncate max-w-[100px]">
                          {cat.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            value={value}
                            onChange={(e) =>
                              updateClassCategoryHours(
                                cat.id,
                                parseInt(e.target.value) || 0,
                              )
                            }
                            className="w-12 text-center bg-white border border-slate-300 rounded px-1 py-0.5 text-xs font-bold text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <span className="text-[10px] text-slate-400">节</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* School level Dashboard summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-sm flex flex-col justify-between">
                <span className="text-xs text-slate-400 font-bold">
                  全校理论周课时总需求
                </span>
                <span className="text-3xl font-extrabold mt-2 font-mono">
                  {classes
                    .filter((c) => !c.isPreset)
                    .reduce((sum, c) => sum + getClassWeeklyHours(c), 0)}{" "}
                  <span className="text-xs font-normal text-slate-400">节</span>
                </span>
              </div>
              <div className="bg-indigo-50 p-5 rounded-xl border border-indigo-100 shadow-sm flex flex-col justify-between text-indigo-900">
                <span className="text-xs text-indigo-600 font-bold">
                  测算所需专任教师
                </span>
                <span className="text-3xl font-extrabold mt-2 font-mono">
                  {parseFloat(
                    (
                      classes
                        .filter((c) => !c.isPreset)
                        .reduce((sum, c) => sum + getClassWeeklyHours(c), 0) /
                      teacherStandardHours
                    ).toFixed(1),
                  )}{" "}
                  <span className="text-xs font-normal text-indigo-500">
                    人
                  </span>
                </span>
              </div>
              <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100 shadow-sm flex flex-col justify-between text-emerald-900">
                <span className="text-xs text-emerald-600 font-bold">
                  当前在岗教职工
                </span>
                <span className="text-3xl font-extrabold mt-2 font-mono">
                  {totals.actualTeachers}{" "}
                  <span className="text-xs font-normal text-emerald-500">
                    人
                  </span>
                </span>
              </div>
              <div
                className={`p-5 rounded-xl border shadow-sm flex flex-col justify-between ${
                  parseFloat(
                    (
                      classes
                        .filter((c) => !c.isPreset)
                        .reduce((sum, c) => sum + getClassWeeklyHours(c), 0) /
                        teacherStandardHours -
                      totals.actualTeachers
                    ).toFixed(1),
                  ) > 0
                    ? "bg-rose-50 border-rose-100 text-rose-950"
                    : "bg-emerald-50 border-emerald-100 text-emerald-950"
                }`}
              >
                <span className="text-xs font-bold text-slate-500">
                  理论教师缺口数量
                </span>
                <span className="text-3xl font-extrabold mt-2 font-mono">
                  {parseFloat(
                    (
                      classes
                        .filter((c) => !c.isPreset)
                        .reduce((sum, c) => sum + getClassWeeklyHours(c), 0) /
                        teacherStandardHours -
                      totals.actualTeachers
                    ).toFixed(1),
                  ) > 0
                    ? `+${parseFloat((classes.filter((c) => !c.isPreset).reduce((sum, c) => sum + getClassWeeklyHours(c), 0) / teacherStandardHours - totals.actualTeachers).toFixed(1))}`
                    : parseFloat(
                        (
                          classes
                            .filter((c) => !c.isPreset)
                            .reduce(
                              (sum, c) => sum + getClassWeeklyHours(c),
                              0,
                            ) /
                            teacherStandardHours -
                          totals.actualTeachers
                        ).toFixed(1),
                      )}{" "}
                  <span className="text-xs font-normal text-slate-500">人</span>
                </span>
              </div>
            </div>

            {/* Requirement 1: Segmented View Navigation Panel */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    多维度师资缺口精准测算
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {forecastView === "dept" &&
                      "按科室/专业部汇总全校各大板块的师资和课时需求"}
                    {forecastView === "major" &&
                      "下钻精准到各专业，对比招生目标、在校生及相关专业教师"}
                    {forecastView === "subject" &&
                      "对比当前学期已安排的学科课时总数和教师主授学科，精准计算学科缺口"}
                  </p>
                </div>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 self-stretch md:self-auto">
                <button
                  onClick={() => setForecastView("dept")}
                  className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                    forecastView === "dept"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  按专业部测算
                </button>
                <button
                  onClick={() => setForecastView("major")}
                  className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                    forecastView === "major"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  按专业精准测算
                </button>
                <button
                  onClick={() => setForecastView("subject")}
                  className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-md transition-all ${
                    forecastView === "subject"
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  按学科精准测算
                </button>
              </div>
            </div>

            {/* Dimensional Breakdown Layouts */}
            {forecastView === "dept" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                {deptForecasts.map((df) => (
                  <div
                    key={df.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h4 className="font-bold text-slate-800 text-sm">
                        {df.name}
                      </h4>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          df.gap > 0
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {df.gap > 0
                          ? `缺口 ${df.gap} 人`
                          : `富余 ${Math.abs(df.gap)} 人`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-400">在校运行班级数:</span>
                        <p className="text-base font-bold text-slate-800 mt-0.5">
                          {df.totalClasses} 个班
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          (在校 {df.onCampusCount} / 实习 {df.internshipCount} /
                          返校 {df.returnedCount})
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">
                          测算周总课时需求:
                        </span>
                        <p className="text-base font-bold text-slate-800 mt-0.5">
                          {df.totalWeeklyHours} 节课
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">测算需专任教师:</span>
                        <p className="text-base font-bold text-slate-800 mt-0.5">
                          {df.teachersNeeded} 人
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">目前在册教师数:</span>
                        <p className="text-base font-bold text-indigo-700 mt-0.5">
                          {df.actualTeachersCount} 人
                        </p>
                      </div>
                    </div>

                    {/* Visual ratio bar */}
                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>教师配比率</span>
                        <span>
                          {df.teachersNeeded > 0
                            ? Math.round(
                                (df.actualTeachersCount / df.teachersNeeded) *
                                  100,
                              )
                            : 100}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            df.gap > 2
                              ? "bg-red-500"
                              : df.gap > 0
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${Math.min(100, df.teachersNeeded > 0 ? (df.actualTeachersCount / df.teachersNeeded) * 100 : 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {forecastView === "major" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                {majorForecasts.map((mf) => (
                  <div
                    key={mf.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          <GraduationCap className="w-4 h-4 text-indigo-600" />
                          {mf.name}
                        </h4>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-semibold mt-1 inline-block">
                          {mf.deptName}
                        </span>
                      </div>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          mf.gap > 0
                            ? "bg-rose-100 text-rose-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {mf.gap > 0
                          ? `缺口 ${mf.gap} 人`
                          : `富余 ${Math.abs(mf.gap)} 人`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-400">运行班级数:</span>
                        <p className="text-base font-bold text-slate-800 mt-0.5">
                          {mf.totalClasses} 个班
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          (在校 {mf.onCampusCount} / 实习 {mf.internshipCount} /
                          返校 {mf.returnedCount})
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">
                          测算周总课时需求:
                        </span>
                        <p className="text-base font-bold text-slate-800 mt-0.5">
                          {mf.totalWeeklyHours} 节课
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">测算需专任教师:</span>
                        <p className="text-base font-bold text-slate-800 mt-0.5">
                          {mf.teachersNeeded} 人
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">
                          目前在册专任教师:
                        </span>
                        <p className="text-base font-bold text-indigo-700 mt-0.5">
                          {mf.actualTeachersCount} 人
                        </p>
                      </div>
                    </div>

                    {/* Visual ratio bar */}
                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                        <span>师资配置满足率</span>
                        <span>
                          {mf.teachersNeeded > 0
                            ? Math.round(
                                (mf.actualTeachersCount / mf.teachersNeeded) *
                                  100,
                              )
                            : 100}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            mf.gap > 1
                              ? "bg-red-500"
                              : mf.gap > 0
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${Math.min(100, mf.teachersNeeded > 0 ? (mf.actualTeachersCount / mf.teachersNeeded) * 100 : 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {forecastView === "subject" && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
                  <h4 className="font-bold text-slate-800 text-sm">
                    全校学科课时需求与教师资源精准测算表
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    系统将提取当前学年教学大纲或排课明细内的所有学科已排总课时，对比登记了该主售学科（Primary
                    Subject）的专任教师，提供精准到学科维度的供需对比。
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600 font-bold text-xs uppercase">
                      <tr>
                        <th
                          className="px-6 py-3 cursor-pointer hover:bg-slate-200"
                          onClick={() => {
                            setSubjectSortOrder(
                              subjectSortField === "name" &&
                                subjectSortOrder === "asc"
                                ? "desc"
                                : "asc",
                            );
                            setSubjectSortField("name");
                          }}
                        >
                          <div className="flex items-center gap-1">
                            学科名称{" "}
                            {subjectSortField === "name" &&
                              (subjectSortOrder === "asc" ? "↑" : "↓")}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 cursor-pointer hover:bg-slate-200"
                          onClick={() => {
                            setSubjectSortOrder(
                              subjectSortField === "type" &&
                                subjectSortOrder === "asc"
                                ? "desc"
                                : "asc",
                            );
                            setSubjectSortField("type");
                          }}
                        >
                          <div className="flex items-center gap-1">
                            学科类别{" "}
                            {subjectSortField === "type" &&
                              (subjectSortOrder === "asc" ? "↑" : "↓")}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-right cursor-pointer hover:bg-slate-200"
                          onClick={() => {
                            setSubjectSortOrder(
                              subjectSortField === "hours" &&
                                subjectSortOrder === "asc"
                                ? "desc"
                                : "asc",
                            );
                            setSubjectSortField("hours");
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            已排课时需求/周{" "}
                            {subjectSortField === "hours" &&
                              (subjectSortOrder === "asc" ? "↑" : "↓")}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-right cursor-pointer hover:bg-slate-200"
                          onClick={() => {
                            setSubjectSortOrder(
                              subjectSortField === "needed" &&
                                subjectSortOrder === "asc"
                                ? "desc"
                                : "asc",
                            );
                            setSubjectSortField("needed");
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            测算所需教师{" "}
                            {subjectSortField === "needed" &&
                              (subjectSortOrder === "asc" ? "↑" : "↓")}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-right cursor-pointer hover:bg-slate-200"
                          onClick={() => {
                            setSubjectSortOrder(
                              subjectSortField === "actual" &&
                                subjectSortOrder === "asc"
                                ? "desc"
                                : "asc",
                            );
                            setSubjectSortField("actual");
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            现有专任教师{" "}
                            {subjectSortField === "actual" &&
                              (subjectSortOrder === "asc" ? "↑" : "↓")}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-center w-64 cursor-pointer hover:bg-slate-200"
                          onClick={() => {
                            setSubjectSortOrder(
                              subjectSortField === "ratio" &&
                                subjectSortOrder === "asc"
                                ? "desc"
                                : "asc",
                            );
                            setSubjectSortField("ratio");
                          }}
                        >
                          <div className="flex items-center justify-center gap-1">
                            师资配置比例{" "}
                            {subjectSortField === "ratio" &&
                              (subjectSortOrder === "asc" ? "↑" : "↓")}
                          </div>
                        </th>
                        <th
                          className="px-6 py-3 text-right cursor-pointer hover:bg-slate-200"
                          onClick={() => {
                            setSubjectSortOrder(
                              subjectSortField === "gap" &&
                                subjectSortOrder === "asc"
                                ? "desc"
                                : "asc",
                            );
                            setSubjectSortField("gap");
                          }}
                        >
                          <div className="flex items-center justify-end gap-1">
                            缺口/富余{" "}
                            {subjectSortField === "gap" &&
                              (subjectSortOrder === "asc" ? "↑" : "↓")}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {subjectForecasts.map((sf) => (
                        <tr
                          key={sf.id}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="px-6 py-4 font-bold text-slate-800">
                            {sf.name}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sf.type === "文化基础课"
                                  ? "bg-blue-50 text-blue-700 border border-blue-100"
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              }`}
                            >
                              {sf.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold font-mono text-indigo-600">
                            {sf.totalWeeklyHours} 节
                          </td>
                          <td className="px-6 py-4 text-right font-medium font-mono text-slate-700">
                            {sf.teachersNeeded} 人
                          </td>
                          <td className="px-6 py-4 text-right font-medium font-mono text-slate-700">
                            {sf.actualTeachersCount} 人
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    sf.gap > 0
                                      ? "bg-rose-500"
                                      : "bg-emerald-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(100, sf.teachersNeeded > 0 ? (sf.actualTeachersCount / sf.teachersNeeded) * 100 : 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs font-bold text-slate-600 font-mono w-10 text-right">
                                {sf.teachersNeeded > 0
                                  ? Math.round(
                                      (sf.actualTeachersCount /
                                        sf.teachersNeeded) *
                                        100,
                                    )
                                  : 100}
                                %
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span
                              className={`inline-flex px-2 py-1 rounded text-xs font-bold ${
                                sf.gap > 0
                                  ? "bg-rose-50 text-rose-700 border border-rose-100"
                                  : sf.gap < 0
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                    : "bg-slate-50 text-slate-500"
                              }`}
                            >
                              {sf.gap > 0
                                ? `缺 ${sf.gap} 人`
                                : sf.gap < 0
                                  ? `余 ${Math.abs(sf.gap)} 人`
                                  : "供需平衡"}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {subjectForecasts.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-6 py-8 text-center text-slate-400 italic"
                          >
                            暂无任何学科排课及课时数据，无法进行学科师资测算
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Academic Year Switch */}
        {activeSubTab === "switch" && (
          <div className="max-w-2xl mx-auto bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden p-8 space-y-6">
            <div className="text-center space-y-2">
              <Calendar className="w-12 h-12 text-indigo-600 mx-auto animate-bounce" />
              <h3 className="text-xl font-bold text-slate-800">
                一键学年升级切换
              </h3>
              <p className="text-slate-500 text-xs max-w-lg mx-auto">
                学年结束，新的教学周期即将开始。通过此安全面板一键平滑完成班级在校年级递增，清理旧排课表，激活新生班级。
              </p>
            </div>

            <div className="border border-slate-100 bg-slate-50 rounded-lg p-5 text-xs text-slate-600 space-y-3">
              <h4 className="font-bold text-slate-700">升级演进逻辑示意：</h4>
              <div className="grid grid-cols-5 items-center gap-2 text-center font-bold font-mono">
                <span className="bg-indigo-100 text-indigo-800 p-1.5 rounded">
                  新生预设
                </span>
                <span className="text-slate-400">➔</span>
                <span className="bg-emerald-100 text-emerald-800 p-1.5 rounded">
                  正式在校 (1-2年级)
                </span>
                <span className="text-slate-400">➔</span>
                <span className="bg-orange-100 text-orange-800 p-1.5 rounded">
                  已毕业 (满3年)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-2">
                例如，执行激活【2026级】升级后：
                <br />• 所有的班级对应的{" "}
                <span className="font-bold">
                  2024级、2025级等年级标识保持永久不变
                </span>
                ；
                <br />•
                距离2026级有3年及以上差距的班级（如2023级、2022级）状态将自动变更为{" "}
                <span className="font-bold">已毕业</span>；
                <br />•
                距离2026级有2年差距的班级（如2024级）仍将保留原有状态（建议您手动批量调整为外出实习）；
                <br />•
                所有预先生成的新生预设班级草稿（如2026级）将一键激活为正式班级，状态设为正常在校。
              </p>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-800 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-red-600" />
                安全机制保护：
              </p>
              <p className="leading-relaxed">
                切换将会自动将当前全校五个专业部的所有排课细节归档保存（包含任课老师、上课周时等）。您之后随时可以通过“排课主页
                ➔ 排课归档管理 ➔
                恢复存档”重新回到之前的排课设计版本，请放心操作。
              </p>
            </div>

            <div className="border-t border-slate-100 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-500 shrink-0">
                  激活新招生年级:
                </span>
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
          onCancel={() =>
            setConfirmModal((prev) => ({ ...prev, isOpen: false }))
          }
        />
      )}

      {/* Class Form Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                {editingClassId ? "编辑班级信息" : "添加全新在校班级"}
              </h3>
              <button
                onClick={() => setShowClassModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    班级名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={classForm.name}
                    onChange={(e) =>
                      setClassForm({ ...classForm, name: e.target.value })
                    }
                    placeholder="如: 24高职机电1班"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    所属专业 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={classForm.majorId}
                    onChange={(e) =>
                      setClassForm({ ...classForm, majorId: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- 请选择专业 --</option>
                    {majors.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    所属年级 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={classForm.gradeId}
                    onChange={(e) =>
                      setClassForm({ ...classForm, gradeId: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">-- 请选择年级 --</option>
                    {state.grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    班级类型
                  </label>
                  <select
                    value={classForm.type}
                    onChange={(e) =>
                      setClassForm({ ...classForm, type: e.target.value })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500"
                  >
                    {state.classCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    教室地点
                  </label>
                  <input
                    type="text"
                    value={classForm.classroom}
                    onChange={(e) =>
                      setClassForm({ ...classForm, classroom: e.target.value })
                    }
                    placeholder="如: 实训楼302"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    在校人数
                  </label>
                  <input
                    type="number"
                    value={classForm.studentCount}
                    onChange={(e) =>
                      setClassForm({
                        ...classForm,
                        studentCount: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    班主任
                  </label>
                  <SearchableTeacherSelect
                    value={classForm.headTeacherId}
                    onChange={(val) =>
                      setClassForm({ ...classForm, headTeacherId: val })
                    }
                    teachers={teachers}
                    placeholder="-- 选择或搜索班主任 (无) --"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    班级状态
                  </label>
                  <select
                    value={classForm.status}
                    onChange={(e) =>
                      setClassForm({
                        ...classForm,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="正常在校">正常在校</option>
                    <option value="外出实习">外出实习</option>
                    <option value="实习返校">实习返校</option>
                    <option value="已毕业">已毕业</option>
                    <option value="合并解散">合并解散</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setShowClassModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveClass}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" /> 保存并应用
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Result Modal */}
      {importResultModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                {importResultModal.title}
              </h3>
            </div>
            <div className="p-6 text-sm text-slate-600 leading-relaxed">
              {importResultModal.message}
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() =>
                  setImportResultModal((prev) => ({ ...prev, isOpen: false }))
                }
                className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
