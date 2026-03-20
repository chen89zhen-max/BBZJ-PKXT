import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { AppState, Schedule, Department, Teacher, Major, Grade, Class, Subject, ClassCategory, SubjectType } from './types';
import { v4 as uuidv4 } from 'uuid';

interface AppContextType {
  state: AppState;
  updateSchedule: (classId: string, subjectId: string, teacherId: string, hours: number) => void;
  
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
  addClass: (cls: Omit<Class, 'id'>) => void;
  updateClass: (cls: Class) => void;
  deleteClass: (id: string) => void;
  deleteClasses: (ids: string[]) => void;
  clearClasses: () => void;
  importClasses: (classes: Omit<Class, 'id'>[]) => { added: number, updated: number, failed: number };
  
  // Teachers
  addTeacher: (teacher: Omit<Teacher, 'id'>) => void;
  addTeachers: (teachers: Omit<Teacher, 'id'>[]) => void;
  deleteTeacher: (id: string) => void;
  deleteTeachers: (ids: string[]) => void;
  
  // Subjects
  addSubject: (name: string, type: SubjectType, departmentId?: string, majorId?: string) => void;
  addSubjects: (subjects: Omit<Subject, 'id'>[]) => void;
  deleteSubject: (id: string) => void;
  deleteSubjects: (ids: string[]) => void;
  
  // Class Categories
  addClassCategory: (name: string) => void;
  deleteClassCategory: (id: string) => void;
  
  // Schedules
  clearSchedules: () => void;
  clearDepartmentSchedules: (departmentId: string) => void;
  
  connected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
    classCategories: [],
  });

  useEffect(() => {
    // Connect to the same host/port
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('state:sync', (newState: AppState) => {
      setState(newState);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const broadcastState = (newState: AppState) => {
    setState(newState);
    if (socket) {
      socket.emit('state:update', newState);
    }
  };

  const updateSchedule = (classId: string, subjectId: string, teacherId: string, hours: number) => {
    const existingIndex = state.schedules.findIndex(s => s.classId === classId && s.subjectId === subjectId);
    let newSchedules = [...state.schedules];
    
    if (existingIndex >= 0) {
      if (!teacherId || hours <= 0) {
        newSchedules.splice(existingIndex, 1);
      } else {
        newSchedules[existingIndex] = { ...newSchedules[existingIndex], teacherId, hours };
      }
    } else if (teacherId && hours > 0) {
      newSchedules.push({ id: uuidv4(), classId, subjectId, teacherId, hours });
    }

    broadcastState({ ...state, schedules: newSchedules });
  };

  const clearSchedules = () => {
    broadcastState({ ...state, schedules: [] });
  };

  const clearDepartmentSchedules = (departmentId: string) => {
    const deptMajors = state.majors.filter(m => m.departmentId === departmentId);
    const deptMajorIds = new Set(deptMajors.map(m => m.id));
    const deptClassIds = new Set(state.classes.filter(c => deptMajorIds.has(c.majorId)).map(c => c.id));
    
    broadcastState({
      ...state,
      schedules: state.schedules.filter(s => !deptClassIds.has(s.classId))
    });
  };

  // Departments
  const addDepartment = (name: string) => {
    broadcastState({ ...state, departments: [...state.departments, { id: uuidv4(), name }] });
  };
  const updateDepartment = (id: string, name: string) => {
    broadcastState({ ...state, departments: state.departments.map(d => d.id === id ? { ...d, name } : d) });
  };
  const deleteDepartment = (id: string) => {
    broadcastState({ ...state, departments: state.departments.filter(d => d.id !== id) });
  };

  // Majors
  const addMajor = (departmentId: string, name: string) => {
    broadcastState({ ...state, majors: [...state.majors, { id: uuidv4(), departmentId, name }] });
  };
  const updateMajor = (id: string, name: string) => {
    broadcastState({ ...state, majors: state.majors.map(m => m.id === id ? { ...m, name } : m) });
  };
  const deleteMajor = (id: string) => {
    broadcastState({ ...state, majors: state.majors.filter(m => m.id !== id) });
  };

  // Grades
  const addGrade = (name: string) => {
    broadcastState({ ...state, grades: [...state.grades, { id: uuidv4(), name }] });
  };
  const deleteGrade = (id: string) => {
    broadcastState({ ...state, grades: state.grades.filter(g => g.id !== id) });
  };

  // Classes
  const addClass = (cls: Omit<Class, 'id'>) => {
    broadcastState({ ...state, classes: [...state.classes, { ...cls, id: uuidv4() }] });
  };
  const updateClass = (cls: Class) => {
    broadcastState({ ...state, classes: state.classes.map(c => c.id === cls.id ? cls : c) });
  };
  const deleteClass = (id: string) => {
    broadcastState({ ...state, classes: state.classes.filter(c => c.id !== id) });
  };
  const deleteClasses = (ids: string[]) => {
    const idSet = new Set(ids);
    broadcastState({ ...state, classes: state.classes.filter(c => !idSet.has(c.id)) });
  };
  const clearClasses = () => {
    broadcastState({ ...state, classes: [], schedules: [] });
  };
  const importClasses = (classesToAdd: Omit<Class, 'id'>[]) => {
    let added = 0;
    let updated = 0;
    let failed = 0;
    
    const newClasses = [...state.classes];
    
    classesToAdd.forEach(cls => {
      if (!cls.name || !cls.majorId || !cls.gradeId) {
        failed++;
        return;
      }
      
      const existingIndex = newClasses.findIndex(c => c.name === cls.name && c.majorId === cls.majorId && c.gradeId === cls.gradeId);
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

  // Teachers
  const addTeacher = (teacher: Omit<Teacher, 'id'>) => {
    const existingIndex = state.teachers.findIndex(t => {
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
        id: updatedTeachers[existingIndex].id
      };
      broadcastState({ ...state, teachers: updatedTeachers });
    } else {
      broadcastState({ ...state, teachers: [...state.teachers, { ...teacher, id: uuidv4() }] });
    }
  };
  const addTeachers = (newTeachers: Omit<Teacher, 'id'>[]) => {
    let updatedTeachers = [...state.teachers];
    
    newTeachers.forEach(newT => {
      // Find existing teacher by idCard (if provided) or by name
      const existingIndex = updatedTeachers.findIndex(t => {
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
          // Preserve the original ID
          id: updatedTeachers[existingIndex].id
        };
      } else {
        // Add new
        updatedTeachers.push({ ...newT, id: uuidv4() });
      }
    });

    broadcastState({ ...state, teachers: updatedTeachers });
  };
  const deleteTeacher = (id: string) => {
    broadcastState({ ...state, teachers: state.teachers.filter(t => t.id !== id) });
  };
  const deleteTeachers = (ids: string[]) => {
    const idSet = new Set(ids);
    broadcastState({ ...state, teachers: state.teachers.filter(t => !idSet.has(t.id)) });
  };

  // Subjects
  const addSubject = (name: string, type: SubjectType, departmentId?: string, majorId?: string) => {
    broadcastState({ ...state, subjects: [...state.subjects, { id: uuidv4(), name, type, departmentId, majorId }] });
  };
  const addSubjects = (newSubjects: Omit<Subject, 'id'>[]) => {
    const subjectsToAdd = newSubjects.map(s => ({ ...s, id: uuidv4() }));
    broadcastState({ ...state, subjects: [...state.subjects, ...subjectsToAdd] });
  };
  const deleteSubject = (id: string) => {
    broadcastState({ ...state, subjects: state.subjects.filter(s => s.id !== id) });
  };
  const deleteSubjects = (ids: string[]) => {
    const idSet = new Set(ids);
    broadcastState({ ...state, subjects: state.subjects.filter(s => !idSet.has(s.id)) });
  };

  // Class Categories
  const addClassCategory = (name: string) => {
    broadcastState({ ...state, classCategories: [...state.classCategories, { id: uuidv4(), name }] });
  };
  const deleteClassCategory = (id: string) => {
    broadcastState({ ...state, classCategories: state.classCategories.filter(c => c.id !== id) });
  };

  return (
    <AppContext.Provider
      value={{
        state,
        updateSchedule,
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
        addTeacher,
        addTeachers,
        deleteTeacher,
        deleteTeachers,
        addSubject,
        addSubjects,
        deleteSubject,
        deleteSubjects,
        addClassCategory,
        deleteClassCategory,
        clearSchedules,
        clearDepartmentSchedules,
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
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
