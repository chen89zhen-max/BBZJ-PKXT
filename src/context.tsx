import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { AppState, Schedule, Department, Teacher, Major, Grade, Class, Subject, ClassCategory } from './types';
import { v4 as uuidv4 } from 'uuid';

interface AppContextType {
  state: AppState;
  updateSchedule: (classId: string, subjectId: string, teacherId: string, hours: number) => void;
  
  // Departments
  addDepartment: (name: string) => void;
  deleteDepartment: (id: string) => void;
  
  // Majors
  addMajor: (departmentId: string, name: string) => void;
  deleteMajor: (id: string) => void;
  
  // Classes
  addClass: (cls: Omit<Class, 'id'>) => void;
  updateClass: (cls: Class) => void;
  deleteClass: (id: string) => void;
  
  // Teachers
  addTeacher: (name: string) => void;
  deleteTeacher: (id: string) => void;
  
  // Subjects
  addSubject: (name: string, type: '公共课' | '专业课') => void;
  deleteSubject: (id: string) => void;
  
  // Class Categories
  addClassCategory: (name: string) => void;
  deleteClassCategory: (id: string) => void;
  
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
    // Connect to the same host/port, forcing polling first to avoid WebSocket connection issues in some proxy environments
    const newSocket = io({
      path: '/socket.io/',
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
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

  // Departments
  const addDepartment = (name: string) => {
    broadcastState({ ...state, departments: [...state.departments, { id: uuidv4(), name }] });
  };
  const deleteDepartment = (id: string) => {
    broadcastState({ ...state, departments: state.departments.filter(d => d.id !== id) });
  };

  // Majors
  const addMajor = (departmentId: string, name: string) => {
    broadcastState({ ...state, majors: [...state.majors, { id: uuidv4(), departmentId, name }] });
  };
  const deleteMajor = (id: string) => {
    broadcastState({ ...state, majors: state.majors.filter(m => m.id !== id) });
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

  // Teachers
  const addTeacher = (name: string) => {
    broadcastState({ ...state, teachers: [...state.teachers, { id: uuidv4(), name }] });
  };
  const deleteTeacher = (id: string) => {
    broadcastState({ ...state, teachers: state.teachers.filter(t => t.id !== id) });
  };

  // Subjects
  const addSubject = (name: string, type: '公共课' | '专业课') => {
    broadcastState({ ...state, subjects: [...state.subjects, { id: uuidv4(), name, type }] });
  };
  const deleteSubject = (id: string) => {
    broadcastState({ ...state, subjects: state.subjects.filter(s => s.id !== id) });
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
        deleteDepartment,
        addMajor,
        deleteMajor,
        addClass,
        updateClass,
        deleteClass,
        addTeacher,
        deleteTeacher,
        addSubject,
        deleteSubject,
        addClassCategory,
        deleteClassCategory,
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
