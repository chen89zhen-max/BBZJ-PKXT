import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";
import {
  AppState,
  Schedule,
  Department,
  Teacher,
  Major,
  Grade,
  Class,
  Subject,
  ClassCategory,
  SubjectType,
  User,
  Archive,
  TalentProgram,
  TalentProgramCourse,
} from "./types";
import { v4 as uuidv4 } from "uuid";

interface AppContextType {
  state: AppState;
  user: Partial<User> | null;
  updateSchedule: (
    classId: string,
    subjectId: string,
    teacherId: string,
    hours: number,
    assistantTeacherId?: string,
  ) => void;
  batchUpdateSchedules: (
    updates: {
      classId: string;
      subjectId: string;
      teacherId: string;
      hours: number;
      assistantTeacherId?: string;
    }[],
  ) => void;

  // Departments
  addDepartment: (name: string) => void;
  updateDepartment: (id: string, name: string) => void;
  deleteDepartment: (id: string) => void;

  // Majors
  addMajor: (departmentId: string, name: string) => void;
  updateMajor: (id: string, name: string) => void;
  deleteMajor: (id: string) => void;

  // Grades
  addGrade: (name: string) => void;
  deleteGrade: (id: string) => void;

  // Classes
  addClass: (cls: Omit<Class, "id">) => void;
  updateClass: (cls: Class) => void;
  deleteClass: (id: string) => void;
  deleteClasses: (ids: string[]) => void;
  clearClasses: () => void;
  importClasses: (classes: Omit<Class, "id">[]) => {
    added: number;
    updated: number;
    failed: number;
  };
  importMajors: (majors: { name: string; departmentName: string }[]) => {
    added: number;
    updated: number;
    failed: number;
  };

  // Teachers
  addTeacher: (teacher: Omit<Teacher, "id">) => void;
  addTeachers: (teachers: (Omit<Teacher, "id"> & { id?: string })[]) => void;
  updateTeacher: (teacher: Teacher) => void;
  updateTeachers: (teachers: Teacher[]) => void;
  deleteTeacher: (id: string) => void;
  deleteTeachers: (ids: string[]) => void;

  // Subjects
  addSubject: (
    name: string,
    type: SubjectType,
    departmentId?: string,
    majorId?: string,
    code?: string,
  ) => void;
  addSubjects: (subjects: (Omit<Subject, "id"> & { id?: string })[]) => void;
  updateSubject: (subject: Subject) => void;
  updateSubjects: (subjects: Subject[]) => void;
  deleteSubject: (id: string) => void;
  deleteSubjects: (ids: string[]) => void;
  reorderSubject: (id: string, direction: "up" | "down") => void;
  updateSubjectsOrder: (subjects: Subject[]) => void;

  // Class Categories
  addClassCategory: (name: string) => void;
  deleteClassCategory: (id: string) => void;
  updateClassCategoryHours: (id: string, hours: number) => void;
  updateClassCategoryGradeHours: (id: string, gradeId: string, hours: number | undefined) => void;

  // Buildings & Classrooms
  addBuilding: (name: string) => void;
  updateBuilding: (id: string, name: string) => void;
  deleteBuilding: (id: string) => void;
  addFloor: (buildingId: string, level: string) => void;
  deleteFloor: (buildingId: string, floorId: string) => void;
  addClassroom: (buildingId: string, floorId: string, name: string) => void;
  updateClassroom: (buildingId: string, floorId: string, classroomId: string, name: string) => void;
  deleteClassroom: (
    buildingId: string,
    floorId: string,
    classroomId: string,
  ) => void;
  assignClassToRoom: (
    buildingId: string,
    floorId: string,
    classroomId: string,
    classId: string | undefined,
  ) => void;
  clearAllClassroomAssignments: () => void;
  clearDepartmentClassroomAssignments: (departmentId: string) => void;

  // Schedules
  clearSchedules: () => void;
  clearDepartmentSchedules: (departmentId: string) => void;

  // Archives
  createArchive: (departmentId: string, name: string) => void;
  restoreArchive: (archiveId: string) => void;
  deleteArchive: (archiveId: string) => void;

  // Planning
  updateMajorEnrollmentTarget: (majorId: string, target: number) => void;
  presetClassesForMajor: (
    majorId: string,
    gradeId: string,
    classes: { name: string; studentCount: number; type: string }[],
  ) => void;
  transitionAcademicYear: (newGradeName: string) => void;
  updateClassStatus: (
    classId: string,
    status: "正常在校" | "外出实习" | "已毕业" | "合并解散",
  ) => void;

  // Talent Programs
  addTalentProgram: (program: Omit<TalentProgram, "id">) => TalentProgram;
  updateTalentProgram: (program: TalentProgram) => void;
  deleteTalentProgram: (id: string) => void;
  importTalentProgramToSchedules: (
    programId: string,
    classIds: string[],
    term: number,
  ) => void;

  connected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{
  children: ReactNode;
  user: Partial<User> | null;
}> = ({ children, user }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [state, setState] = useState<AppState>({
    departments: [],
    majors: [],
    grades: [],
    classes: [],
    teachers: [],
    subjects: [],
    schedules: [],
    archives: [],
    classCategories: [],
    users: [],
    buildings: [],
  });

  useEffect(() => {
    // Connect to the same host/port
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on("connect", () => {
      setConnected(true);
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
    });

    newSocket.on("state:sync", (newState: AppState) => {
      setState(newState);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const broadcastState = (newState: AppState) => {
    setState(newState);
    if (socket) {
      socket.emit("state:update", newState);
    }
  };

  const updateSchedule = (
    classId: string,
    subjectId: string,
    teacherId: string,
    hours: number,
    assistantTeacherId?: string,
  ) => {
    const existingIndex = state.schedules.findIndex(
      (s) => s.classId === classId && s.subjectId === subjectId,
    );
    let newSchedules = [...state.schedules];

    if (existingIndex >= 0) {
      if (hours <= 0) {
        newSchedules.splice(existingIndex, 1);
      } else {
        newSchedules[existingIndex] = {
          ...newSchedules[existingIndex],
          teacherId,
          hours,
          assistantTeacherId: assistantTeacherId || undefined,
        };
      }
    } else if (hours > 0) {
      newSchedules.push({
        id: uuidv4(),
        classId,
        subjectId,
        teacherId,
        hours,
        assistantTeacherId: assistantTeacherId || undefined,
      });
    }

    broadcastState({ ...state, schedules: newSchedules });
  };

  const batchUpdateSchedules = (
    updates: {
      classId: string;
      subjectId: string;
      teacherId: string;
      hours: number;
      assistantTeacherId?: string;
    }[],
  ) => {
    let newSchedules = [...state.schedules];

    updates.forEach((update) => {
      const { classId, subjectId, teacherId, hours, assistantTeacherId } = update;
      const existingIndex = newSchedules.findIndex(
        (s) => s.classId === classId && s.subjectId === subjectId,
      );

      if (existingIndex >= 0) {
        if (hours <= 0) {
          newSchedules.splice(existingIndex, 1);
        } else {
          newSchedules[existingIndex] = {
            ...newSchedules[existingIndex],
            teacherId,
            hours,
            assistantTeacherId: assistantTeacherId || undefined,
          };
        }
      } else if (hours > 0) {
        newSchedules.push({
          id: uuidv4(),
          classId,
          subjectId,
          teacherId,
          hours,
          assistantTeacherId: assistantTeacherId || undefined,
        });
      }
    });

    broadcastState({ ...state, schedules: newSchedules });
  };

  const clearSchedules = () => {
    broadcastState({ ...state, schedules: [] });
  };

  const clearDepartmentSchedules = (departmentId: string) => {
    const deptMajors = state.majors.filter(
      (m) => m.departmentId === departmentId,
    );
    const deptMajorIds = new Set(deptMajors.map((m) => m.id));
    const deptClassIds = new Set(
      state.classes.filter((c) => deptMajorIds.has(c.majorId)).map((c) => c.id),
    );

    // Also remove any schedules that point to non-existent classes or subjects
    const validClassIds = new Set(state.classes.map((c) => c.id));
    const validSubjectIds = new Set(state.subjects.map((s) => s.id));
    const validTeacherIds = new Set(state.teachers.map((t) => t.id));

    broadcastState({
      ...state,
      schedules: state.schedules.filter((s) => {
        // Remove if it belongs to this department
        if (deptClassIds.has(s.classId)) return false;

        // Remove if it's orphaned (points to non-existent class, subject, or teacher)
        if (
          !validClassIds.has(s.classId) ||
          !validSubjectIds.has(s.subjectId) ||
          (s.teacherId && !validTeacherIds.has(s.teacherId))
        )
          return false;

        return true;
      }),
    });
  };

  // Departments
  const addDepartment = (name: string) => {
    broadcastState({
      ...state,
      departments: [...state.departments, { id: uuidv4(), name }],
    });
  };
  const updateDepartment = (id: string, name: string) => {
    broadcastState({
      ...state,
      departments: state.departments.map((d) =>
        d.id === id ? { ...d, name } : d,
      ),
    });
  };
  const deleteDepartment = (id: string) => {
    const remainingMajors = state.majors.filter((m) => m.departmentId !== id);
    const remainingMajorIds = new Set(remainingMajors.map((m) => m.id));
    const remainingClasses = state.classes.filter((c) =>
      remainingMajorIds.has(c.majorId),
    );
    const remainingClassIds = new Set(remainingClasses.map((c) => c.id));
    const remainingSubjectIds = new Set(
      state.subjects.filter((s) => s.departmentId !== id).map((s) => s.id),
    );

    broadcastState({
      ...state,
      departments: state.departments.filter((d) => d.id !== id),
      majors: remainingMajors,
      classes: remainingClasses,
      subjects: state.subjects.filter((s) => s.departmentId !== id),
      schedules: state.schedules.filter(
        (s) =>
          remainingClassIds.has(s.classId) &&
          remainingSubjectIds.has(s.subjectId)
      ),
    });
  };

  // Majors
  const addMajor = (departmentId: string, name: string) => {
    broadcastState({
      ...state,
      majors: [...state.majors, { id: uuidv4(), departmentId, name }],
    });
  };
  const updateMajor = (id: string, name: string) => {
    broadcastState({
      ...state,
      majors: state.majors.map((m) => (m.id === id ? { ...m, name } : m)),
    });
  };
  const deleteMajor = (id: string) => {
    const remainingClasses = state.classes.filter((c) => c.majorId !== id);
    const remainingClassIds = new Set(remainingClasses.map((c) => c.id));
    const remainingSubjectIds = new Set(
      state.subjects.filter((s) => s.majorId !== id).map((s) => s.id),
    );

    broadcastState({
      ...state,
      majors: state.majors.filter((m) => m.id !== id),
      classes: remainingClasses,
      subjects: state.subjects.filter((s) => s.majorId !== id),
      schedules: state.schedules.filter(
        (s) =>
          remainingClassIds.has(s.classId) &&
          remainingSubjectIds.has(s.subjectId)
      ),
    });
  };

  // Grades
  const addGrade = (name: string) => {
    broadcastState({
      ...state,
      grades: [...state.grades, { id: uuidv4(), name }],
    });
  };
  const deleteGrade = (id: string) => {
    broadcastState({
      ...state,
      grades: state.grades.filter((g) => g.id !== id),
    });
  };

  // Classes
  const addClass = (cls: Omit<Class, "id">) => {
    broadcastState({
      ...state,
      classes: [...state.classes, { ...cls, id: uuidv4() }],
    });
  };
  const updateClass = (cls: Class) => {
    let updatedSchedules = state.schedules;
    if (
      cls.status === "外出实习" ||
      cls.status === "已毕业" ||
      cls.status === "合并解散"
    ) {
      updatedSchedules = state.schedules.filter((s) => s.classId !== cls.id);
    }
    broadcastState({
      ...state,
      classes: state.classes.map((c) => (c.id === cls.id ? cls : c)),
      schedules: updatedSchedules,
    });
  };
  const deleteClass = (id: string) => {
    const remainingClasses = state.classes.filter((c) => c.id !== id);

    broadcastState({
      ...state,
      classes: remainingClasses,
      schedules: state.schedules.filter(
        (s) => s.classId !== id
      ),
    });
  };
  const deleteClasses = (ids: string[]) => {
    const idSet = new Set(ids);
    const remainingClasses = state.classes.filter((c) => !idSet.has(c.id));

    broadcastState({
      ...state,
      classes: remainingClasses,
      schedules: state.schedules.filter(
        (s) => !idSet.has(s.classId)
      ),
    });
  };
  const clearClasses = () => {
    broadcastState({ ...state, classes: [], schedules: [] });
  };
  const importClasses = (classesToAdd: Omit<Class, "id">[]) => {
    let added = 0;
    let updated = 0;
    let failed = 0;

    const newClasses = [...state.classes];

    classesToAdd.forEach((cls) => {
      if (!cls.name || !cls.majorId || !cls.gradeId) {
        failed++;
        return;
      }

      const existingIndex = newClasses.findIndex(
        (c) =>
          c.name === cls.name &&
          c.majorId === cls.majorId &&
          c.gradeId === cls.gradeId,
      );
      if (existingIndex >= 0) {
        newClasses[existingIndex] = { ...newClasses[existingIndex], ...cls };
        updated++;
      } else {
        newClasses.push({ ...cls, id: uuidv4() });
        added++;
      }
    });

    broadcastState({ ...state, classes: newClasses });
    return { added, updated, failed };
  };

  const importMajors = (
    majorsToAdd: { name: string; departmentName: string }[],
  ) => {
    let added = 0;
    let updated = 0;
    let failed = 0;

    const newMajors = [...state.majors];

    majorsToAdd.forEach((m) => {
      if (!m.name || !m.departmentName) {
        failed++;
        return;
      }

      const dept = state.departments.find((d) => d.name === m.departmentName);
      if (!dept) {
        failed++;
        return;
      }

      const existingIndex = newMajors.findIndex(
        (major) => major.name === m.name && major.departmentId === dept.id,
      );
      if (existingIndex >= 0) {
        newMajors[existingIndex] = {
          ...newMajors[existingIndex],
          name: m.name,
          departmentId: dept.id,
        };
        updated++;
      } else {
        newMajors.push({ id: uuidv4(), name: m.name, departmentId: dept.id });
        added++;
      }
    });

    broadcastState({ ...state, majors: newMajors });
    return { added, updated, failed };
  };

  // Teachers
  const addTeacher = (teacher: Omit<Teacher, "id">) => {
    const existingIndex = state.teachers.findIndex((t) => {
      if (teacher.idCard && t.idCard) {
        return t.idCard === teacher.idCard;
      }
      return t.name === teacher.name;
    });

    if (existingIndex >= 0) {
      const updatedTeachers = [...state.teachers];
      updatedTeachers[existingIndex] = {
        ...updatedTeachers[existingIndex],
        ...teacher,
        id: updatedTeachers[existingIndex].id,
      };
      broadcastState({ ...state, teachers: updatedTeachers });
    } else {
      broadcastState({
        ...state,
        teachers: [...state.teachers, { ...teacher, id: uuidv4() }],
      });
    }
  };
  const addTeachers = (newTeachers: (Omit<Teacher, "id"> & { id?: string })[]) => {
    let updatedTeachers = [...state.teachers];

    newTeachers.forEach((newT) => {
      // Find existing teacher by id, idCard (if provided), or by name
      const existingIndex = updatedTeachers.findIndex((t) => {
        if (newT.id && t.id === newT.id) return true;
        if (newT.idCard && t.idCard) {
          return t.idCard === newT.idCard;
        }
        return t.name === newT.name;
      });

      if (existingIndex >= 0) {
        // Update existing
        updatedTeachers[existingIndex] = {
          ...updatedTeachers[existingIndex],
          ...newT,
          // Preserve the original ID if not explicitly overridden by newT.id (which it is above, but just to be safe)
          id: updatedTeachers[existingIndex].id,
        };
      } else {
        // Add new
        updatedTeachers.push({ ...newT, id: newT.id || uuidv4() });
      }
    });

    broadcastState({ ...state, teachers: updatedTeachers });
  };
  const updateTeacher = (teacher: Teacher) => {
    broadcastState({
      ...state,
      teachers: state.teachers.map((t) => (t.id === teacher.id ? teacher : t)),
    });
  };
  const updateTeachers = (teachersToUpdate: Teacher[]) => {
    const updatedMap = new Map(teachersToUpdate.map((t) => [t.id, t]));
    const newTeachers = state.teachers.map((t) =>
      updatedMap.has(t.id) ? updatedMap.get(t.id)! : t,
    );
    broadcastState({ ...state, teachers: newTeachers });
  };
  const deleteTeacher = (id: string) => {
    const remainingTeachers = state.teachers.filter((t) => t.id !== id);

    broadcastState({
      ...state,
      teachers: remainingTeachers,
      schedules: state.schedules.map((s) => {
        let updated = { ...s };
        if (s.teacherId === id) updated.teacherId = "";
        if ((s as any).assistantTeacherId === id) (updated as any).assistantTeacherId = "";
        return updated;
      }),
    });
  };
  const deleteTeachers = (ids: string[]) => {
    const idSet = new Set(ids);
    const remainingTeachers = state.teachers.filter((t) => !idSet.has(t.id));

    broadcastState({
      ...state,
      teachers: remainingTeachers,
      schedules: state.schedules.map((s) => {
        let updated = { ...s };
        if (idSet.has(s.teacherId)) updated.teacherId = "";
        if ((s as any).assistantTeacherId && idSet.has((s as any).assistantTeacherId)) (updated as any).assistantTeacherId = "";
        return updated;
      }),
    });
  };

  // Subjects
  const addSubject = (
    name: string,
    type: SubjectType,
    departmentId?: string,
    majorId?: string,
    code?: string,
  ) => {
    const exists = state.subjects.some(
      (s) =>
        s.name === name &&
        s.departmentId === departmentId &&
        s.majorId === majorId,
    );
    if (exists) return;
    broadcastState({
      ...state,
      subjects: [
        ...state.subjects,
        { id: uuidv4(), name, type, departmentId, majorId, code },
      ],
    });
  };
  const addSubjects = (newSubjects: (Omit<Subject, "id"> & { id?: string })[]) => {
    let updatedSubjects = [...state.subjects];

    newSubjects.forEach((s) => {
      const existingIndex = updatedSubjects.findIndex((ex) => {
        if (s.id && ex.id === s.id) return true;
        if (s.code && ex.code === s.code) return true;
        return ex.name === s.name &&
          ex.departmentId === s.departmentId &&
          ex.majorId === s.majorId;
      });

      if (existingIndex >= 0) {
        updatedSubjects[existingIndex] = {
          ...updatedSubjects[existingIndex],
          ...s,
          id: updatedSubjects[existingIndex].id
        };
      } else {
        updatedSubjects.push({ ...s, id: s.id || uuidv4() });
      }
    });

    broadcastState({ ...state, subjects: updatedSubjects });
  };
  const updateSubject = (subject: Subject) => {
    broadcastState({
      ...state,
      subjects: state.subjects.map((s) => (s.id === subject.id ? subject : s)),
    });
  };
  const updateSubjects = (subjectsToUpdate: Subject[]) => {
    const updatedMap = new Map(subjectsToUpdate.map((s) => [s.id, s]));
    const newSubjects = state.subjects.map((s) =>
      updatedMap.has(s.id) ? updatedMap.get(s.id)! : s,
    );
    broadcastState({ ...state, subjects: newSubjects });
  };
  const deleteSubject = (id: string) => {
    const remainingSubjects = state.subjects.filter((s) => s.id !== id);

    broadcastState({
      ...state,
      subjects: remainingSubjects,
      schedules: state.schedules.filter((s) => s.subjectId !== id),
    });
  };
  const deleteSubjects = (ids: string[]) => {
    const idSet = new Set(ids);
    const remainingSubjects = state.subjects.filter((s) => !idSet.has(s.id));

    broadcastState({
      ...state,
      subjects: remainingSubjects,
      schedules: state.schedules.filter((s) => !idSet.has(s.subjectId)),
    });
  };

  const reorderSubject = (id: string, direction: "up" | "down") => {
    const index = state.subjects.findIndex((s) => s.id === id);
    if (index === -1) return;
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === state.subjects.length - 1) return;

    const newSubjects = [...state.subjects];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSubjects[index], newSubjects[targetIndex]] = [
      newSubjects[targetIndex],
      newSubjects[index],
    ];

    broadcastState({ ...state, subjects: newSubjects });
  };

  const updateSubjectsOrder = (subjects: Subject[]) => {
    broadcastState({ ...state, subjects });
  };

  // Class Categories
  const addClassCategory = (name: string) => {
    broadcastState({
      ...state,
      classCategories: [...state.classCategories, { id: uuidv4(), name }],
    });
  };
  const deleteClassCategory = (id: string) => {
    broadcastState({
      ...state,
      classCategories: state.classCategories.filter((c) => c.id !== id),
    });
  };
  const updateClassCategoryHours = (id: string, hours: number) => {
    broadcastState({
      ...state,
      classCategories: state.classCategories.map((c) =>
        c.id === id ? { ...c, weeklyHours: hours } : c,
      ),
    });
  };
  const updateClassCategoryGradeHours = (id: string, gradeId: string, hours: number | undefined) => {
    broadcastState({
      ...state,
      classCategories: state.classCategories.map((c) => {
        if (c.id === id) {
          const newGradeHours = { ...(c.gradeHours || {}) };
          if (hours === undefined) {
            delete newGradeHours[gradeId];
          } else {
            newGradeHours[gradeId] = hours;
          }
          return {
            ...c,
            gradeHours: newGradeHours,
          };
        }
        return c;
      }),
    });
  };

  // Buildings & Classrooms
  const addBuilding = (name: string) => {
    broadcastState({
      ...state,
      buildings: [
        ...(state.buildings || []),
        { id: uuidv4(), name, floors: [] },
      ],
    });
  };

  const updateBuilding = (id: string, name: string) => {
    broadcastState({
      ...state,
      buildings: (state.buildings || []).map((b) =>
        b.id === id ? { ...b, name } : b,
      ),
    });
  };

  const deleteBuilding = (id: string) => {
    broadcastState({
      ...state,
      buildings: (state.buildings || []).filter((b) => b.id !== id),
    });
  };

  const addFloor = (buildingId: string, level: string) => {
    broadcastState({
      ...state,
      buildings: (state.buildings || []).map((b) =>
        b.id === buildingId
          ? {
              ...b,
              floors: [...b.floors, { id: uuidv4(), level, classrooms: [] }],
            }
          : b,
      ),
    });
  };

  const deleteFloor = (buildingId: string, floorId: string) => {
    broadcastState({
      ...state,
      buildings: (state.buildings || []).map((b) =>
        b.id === buildingId
          ? {
              ...b,
              floors: b.floors.filter((f) => f.id !== floorId),
            }
          : b,
      ),
    });
  };

  const addClassroom = (buildingId: string, floorId: string, name: string) => {
    broadcastState({
      ...state,
      buildings: (state.buildings || []).map((b) =>
        b.id === buildingId
          ? {
              ...b,
              floors: b.floors.map((f) =>
                f.id === floorId
                  ? {
                      ...f,
                      classrooms: [...f.classrooms, { id: uuidv4(), name }],
                    }
                  : f,
              ),
            }
          : b,
      ),
    });
  };

  const updateClassroom = (buildingId: string, floorId: string, classroomId: string, name: string) => {
    broadcastState({
      ...state,
      buildings: (state.buildings || []).map((b) =>
        b.id === buildingId
          ? {
              ...b,
              floors: b.floors.map((f) =>
                f.id === floorId
                  ? {
                      ...f,
                      classrooms: f.classrooms.map(c => c.id === classroomId ? { ...c, name } : c),
                    }
                  : f,
              ),
            }
          : b,
      ),
    });
  };

  const deleteClassroom = (
    buildingId: string,
    floorId: string,
    classroomId: string,
  ) => {
    broadcastState({
      ...state,
      buildings: (state.buildings || []).map((b) =>
        b.id === buildingId
          ? {
              ...b,
              floors: b.floors.map((f) =>
                f.id === floorId
                  ? {
                      ...f,
                      classrooms: f.classrooms.filter(
                        (c) => c.id !== classroomId,
                      ),
                    }
                  : f,
              ),
            }
          : b,
      ),
    });
  };

  const assignClassToRoom = (
    buildingId: string,
    floorId: string,
    classroomId: string,
    classId: string | undefined,
  ) => {
    const building = (state.buildings || []).find((b) => b.id === buildingId);
    const floor = building?.floors.find((f) => f.id === floorId);
    const classroom = floor?.classrooms.find((c) => c.id === classroomId);
    const roomName = classroom?.name || "";

    // First, find if this class was already assigned to another room and clear it
    let newBuildings = (state.buildings || []).map((b) => ({
      ...b,
      floors: b.floors.map((f) => ({
        ...f,
        classrooms: f.classrooms.map((c) => {
          // If assigning a class, remove it from any other room
          if (classId && c.classId === classId && c.id !== classroomId) {
            return { ...c, classId: undefined };
          }
          // Target room assignment
          if (b.id === buildingId && f.id === floorId && c.id === classroomId) {
            return { ...c, classId };
          }
          return c;
        }),
      })),
    }));

    // Update the class's text field too
    let newClasses = state.classes;
    if (classId) {
      newClasses = state.classes.map(
        (c) =>
          c.id === classId
            ? { ...c, classroom: roomName }
            : c.classroom === roomName
              ? { ...c, classroom: "" }
              : c, // Clear room for other class if they had it text-wise
      );
    } else {
      // Removing a class from a room
      newClasses = state.classes.map((c) =>
        c.classroom === roomName ? { ...c, classroom: "" } : c,
      );
    }

    broadcastState({
      ...state,
      buildings: newBuildings,
      classes: newClasses,
    });
  };

  const clearAllClassroomAssignments = () => {
    broadcastState({
      ...state,
      classes: state.classes.map(c => ({ ...c, classroom: "" })),
      buildings: (state.buildings || []).map(b => ({
        ...b,
        floors: b.floors.map(f => ({
          ...f,
          classrooms: f.classrooms.map(c => ({ ...c, classId: undefined }))
        }))
      }))
    });
  };

  const clearDepartmentClassroomAssignments = (departmentId: string) => {
    const deptMajors = state.majors.filter((m) => m.departmentId === departmentId);
    const deptMajorIds = new Set(deptMajors.map((m) => m.id));
    const deptClassIds = new Set(
      state.classes.filter((c) => deptMajorIds.has(c.majorId)).map((c) => c.id),
    );

    broadcastState({
      ...state,
      classes: state.classes.map(c => deptClassIds.has(c.id) ? { ...c, classroom: "" } : c),
      buildings: (state.buildings || []).map(b => ({
        ...b,
        floors: b.floors.map(f => ({
          ...f,
          classrooms: f.classrooms.map(c => {
            if (c.classId && deptClassIds.has(c.classId)) {
              return { ...c, classId: undefined };
            }
            return c;
          })
        }))
      }))
    });
  };

  // Archives
  const createArchive = (departmentId: string, name: string) => {
    // A department's schedules are those where the class belongs to a major in that department
    const deptMajors = state.majors.filter(
      (m) => m.departmentId === departmentId,
    );
    const deptMajorIds = new Set(deptMajors.map((m) => m.id));
    const deptClassIds = new Set(
      state.classes.filter((c) => deptMajorIds.has(c.majorId)).map((c) => c.id),
    );

    // Also include schedules where the subject belongs to the department (for cross-department teaching)
    // Actually, the requirement says "只存档和恢复各自产业部的排课数据" (only archive/restore this department's schedule data).
    // The matrix schedule shows classes belonging to the department. So we archive schedules for these classes.
    const schedulesToArchive = state.schedules.filter((s) =>
      deptClassIds.has(s.classId),
    );

    const newArchive: Archive = {
      id: uuidv4(),
      departmentId,
      name,
      timestamp: new Date().toISOString(),
      schedules: schedulesToArchive,
    };

    let newArchives = [...(state.archives || [])];
    const deptArchives = newArchives.filter(
      (a) => a.departmentId === departmentId,
    );

    if (deptArchives.length >= 10) {
      // Find the oldest one for this department
      const oldest = [...deptArchives].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )[0];
      newArchives = newArchives.filter((a) => a.id !== oldest.id);
    }

    newArchives.push(newArchive);
    broadcastState({ ...state, archives: newArchives });
  };

  const restoreArchive = (archiveId: string) => {
    const archive = state.archives.find((a) => a.id === archiveId);
    if (!archive) return;

    const departmentId = archive.departmentId;
    const deptMajors = state.majors.filter(
      (m) => m.departmentId === departmentId,
    );
    const deptMajorIds = new Set(deptMajors.map((m) => m.id));
    const deptClassIds = new Set(
      state.classes.filter((c) => deptMajorIds.has(c.majorId)).map((c) => c.id),
    );

    // Remove current schedules for this department's classes
    const otherSchedules = state.schedules.filter(
      (s) => !deptClassIds.has(s.classId),
    );

    // Add archived schedules (generate new IDs to avoid conflicts)
    // Only restore schedules that actually belong to this department's classes
    // (in case an old archive accidentally contained other departments' schedules)
    const validArchivedSchedules = archive.schedules.filter((s) =>
      deptClassIds.has(s.classId),
    );
    const restoredSchedules = validArchivedSchedules.map((s) => ({
      ...s,
      id: uuidv4(),
    }));

    broadcastState({
      ...state,
      schedules: [...otherSchedules, ...restoredSchedules],
    });
  };

  const deleteArchive = (archiveId: string) => {
    broadcastState({
      ...state,
      archives: state.archives.filter((a) => a.id !== archiveId),
    });
  };

  // Planning functions
  const updateMajorEnrollmentTarget = (majorId: string, target: number) => {
    broadcastState({
      ...state,
      majors: state.majors.map((m) =>
        m.id === majorId ? { ...m, enrollmentTarget: target } : m,
      ),
    });
  };

  const presetClassesForMajor = (
    majorId: string,
    gradeId: string,
    classesToPreset: { name: string; studentCount: number; type: string }[],
  ) => {
    const otherClasses = state.classes.filter(
      (c) => !(c.majorId === majorId && c.gradeId === gradeId && c.isPreset),
    );

    const newPresetClasses = classesToPreset.map((cls) => ({
      id: uuidv4(),
      majorId,
      gradeId,
      name: cls.name,
      type: cls.type,
      classroom: "",
      studentCount: cls.studentCount,
      headTeacherId: "",
      status: "正常在校" as const,
      stage: "高一" as const,
      isPreset: true,
    }));

    broadcastState({
      ...state,
      classes: [...otherClasses, ...newPresetClasses],
    });
  };

  const updateClassStatus = (
    classId: string,
    status: "正常在校" | "外出实习" | "已毕业" | "合并解散",
  ) => {
    let updatedSchedules = state.schedules;
    if (status === "外出实习" || status === "已毕业" || status === "合并解散") {
      updatedSchedules = state.schedules.filter((s) => s.classId !== classId);
    }

    broadcastState({
      ...state,
      classes: state.classes.map((c) =>
        c.id === classId ? { ...c, status } : c,
      ),
      schedules: updatedSchedules,
    });
  };

  // Talent Programs management
  const addTalentProgram = (program: Omit<TalentProgram, "id">) => {
    const currentPrograms = state.talentPrograms || [];
    const newProg = { ...program, id: uuidv4() };
    broadcastState({
      ...state,
      talentPrograms: [...currentPrograms, newProg],
    });
    return newProg;
  };

  const updateTalentProgram = (program: TalentProgram) => {
    const currentPrograms = state.talentPrograms || [];
    broadcastState({
      ...state,
      talentPrograms: currentPrograms.map((p) =>
        p.id === program.id ? program : p,
      ),
    });
  };

  const deleteTalentProgram = (id: string) => {
    const currentPrograms = state.talentPrograms || [];
    broadcastState({
      ...state,
      talentPrograms: currentPrograms.filter((p) => p.id !== id),
    });
  };

  const importTalentProgramToSchedules = (
    programId: string,
    classIds: string[],
    term: number,
  ) => {
    const program = (state.talentPrograms || []).find((p) => p.id === programId);
    if (!program) return;

    // Filter courses for this term
    const termCourses = program.courses.filter((c) => c.term === term);
    if (termCourses.length === 0) return;

    let newSchedules = [...state.schedules];

    classIds.forEach((classId) => {
      termCourses.forEach((tc) => {
        const existingIndex = newSchedules.findIndex(
          (s) => s.classId === classId && s.subjectId === tc.subjectId,
        );

        if (existingIndex >= 0) {
          // Update hours, preserve current teacher if any
          newSchedules[existingIndex] = {
            ...newSchedules[existingIndex],
            hours: tc.weeklyHours,
          };
        } else {
          // Create new schedule entry (teacher is empty initially)
          newSchedules.push({
            id: uuidv4(),
            classId,
            subjectId: tc.subjectId,
            teacherId: "",
            hours: tc.weeklyHours,
          });
        }
      });
    });

    broadcastState({ ...state, schedules: newSchedules });
  };

  const transitionAcademicYear = (newGradeName: string) => {
    // 1. Create automatic safety archives for all departments before the transition
    const timestampStr = new Date().toLocaleString("zh-CN", { hour12: false });
    state.departments.forEach((dept) => {
      createArchive(
        dept.id,
        `学年升级前自动归档 (${dept.name}) - ${timestampStr}`,
      );
    });

    // 2. Find or create the new Grade cohort
    let updatedGrades = [...state.grades];
    let newGrade = updatedGrades.find((g) => g.name === newGradeName);
    if (!newGrade) {
      newGrade = { id: uuidv4(), name: newGradeName };
      updatedGrades.push(newGrade);
    }

    // Determine graduation year based on the new cohort year
    const newCohortYearMatch = newGradeName.match(/(\d{4})/);
    const newCohortYear = newCohortYearMatch
      ? parseInt(newCohortYearMatch[1])
      : new Date().getFullYear();
    const graduationYear = newCohortYear - 3;

    // 3. Process existing classes
    const updatedClasses = state.classes.map((cls) => {
      // If it's a preset class prepared for the new semester, activate it!
      if (cls.isPreset) {
        return {
          ...cls,
          status: "正常在校" as const,
          isPreset: false,
        };
      }

      // Graduate classes that are 3 years older than the new incoming cohort
      const grade = state.grades.find((g) => g.id === cls.gradeId);
      const clsYearMatch = grade?.name.match(/(\d{4})/);
      const clsYear = clsYearMatch ? parseInt(clsYearMatch[1]) : 0;

      let nextStatus = cls.status;
      if (clsYear > 0 && clsYear <= graduationYear) {
        nextStatus = "已毕业";
      }

      return {
        ...cls,
        status: nextStatus,
      };
    });

    // 4. Update state and clear active schedules for new academic year
    broadcastState({
      ...state,
      grades: updatedGrades,
      classes: updatedClasses,
      schedules: [],
    });
  };

  return (
    <AppContext.Provider
      value={{
        state,
        user,
        updateSchedule,
        batchUpdateSchedules,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        addMajor,
        updateMajor,
        deleteMajor,
        addGrade,
        deleteGrade,
        addClass,
        updateClass,
        deleteClass,
        deleteClasses,
        clearClasses,
        importClasses,
        importMajors,
        addTeacher,
        addTeachers,
        updateTeacher,
        updateTeachers,
        deleteTeacher,
        deleteTeachers,
        addSubject,
        addSubjects,
        updateSubject,
        updateSubjects,
        deleteSubject,
        deleteSubjects,
        reorderSubject,
        updateSubjectsOrder,
        addClassCategory,
        deleteClassCategory,
        updateClassCategoryHours,
        updateClassCategoryGradeHours,
        addBuilding,
        updateBuilding,
        deleteBuilding,
        addFloor,
        deleteFloor,
        addClassroom,
        updateClassroom,
        deleteClassroom,
        assignClassToRoom,
        clearAllClassroomAssignments,
        clearDepartmentClassroomAssignments,
        clearSchedules,
        clearDepartmentSchedules,
        createArchive,
        restoreArchive,
        deleteArchive,
        updateMajorEnrollmentTarget,
        presetClassesForMajor,
        updateClassStatus,
        transitionAcademicYear,
        addTalentProgram,
        updateTalentProgram,
        deleteTalentProgram,
        importTalentProgramToSchedules,
        connected,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
