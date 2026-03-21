import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Teacher } from '../types';
import { Search, ChevronDown } from 'lucide-react';

interface Props {
  value: string;
  onChange: (teacherId: string) => void;
  teachers: Teacher[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  hideChevron?: boolean;
  disabled?: boolean;
}

export function SearchableTeacherSelect({ 
  value, 
  onChange, 
  teachers, 
  placeholder = "选择教师...", 
  className = "",
  buttonClassName = "w-full min-h-[32px] px-2 py-1 bg-white border border-slate-300 rounded-md text-sm flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500",
  hideChevron = false,
  disabled = false
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });

  const selectedTeacher = teachers.find(t => t.id === value);

  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 280; // Approximate max height
      
      let top = rect.bottom + window.scrollY;
      let placement: 'bottom' | 'top' = 'bottom';

      if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
        // Show above if not enough space below and enough space above
        top = rect.top + window.scrollY - dropdownHeight;
        placement = 'top';
      }

      setDropdownStyle({
        position: 'absolute',
        top: `${top}px`,
        left: `${rect.left + window.scrollX}px`,
        width: `${Math.max(rect.width, 256)}px`,
        zIndex: 9999,
        visibility: 'visible',
        transformOrigin: placement === 'top' ? 'bottom' : 'top',
      });
    } else {
      setDropdownStyle({ visibility: 'hidden' });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    // Use a small timeout before enabling scroll-close to avoid closing on initial focus-scroll
    let scrollEnabled = false;
    const timer = setTimeout(() => { scrollEnabled = true; }, 300);

    const handleScroll = (event: Event) => {
      if (!scrollEnabled) return;
      // Don't close if scrolling inside the dropdown itself
      if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.idCard && t.idCard.includes(searchTerm))
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div 
        className={`${buttonClassName} ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : ''}`}
        onClick={(e) => {
          if (disabled) return;
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <span className={`truncate ${selectedTeacher ? "text-slate-800" : "text-slate-400"}`}>
          {selectedTeacher ? `${selectedTeacher.name} ${selectedTeacher.idCard ? `(${selectedTeacher.idCard.slice(-4)})` : ''}` : placeholder}
        </span>
        {!hideChevron && <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />}
      </div>

      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="bg-white border border-slate-200 rounded-md shadow-xl flex flex-col animate-in fade-in zoom-in duration-100" 
          style={dropdownStyle}
        >
          <div className="p-2 border-b border-slate-100 bg-slate-50 rounded-t-md">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                placeholder="搜索姓名或身份证尾号..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-60 p-1">
            <div 
              className={`px-3 py-2 text-sm cursor-pointer rounded-md ${!value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}
              onClick={() => {
                onChange('');
                setIsOpen(false);
                setSearchTerm('');
              }}
            >
              [空]
            </div>
            {filteredTeachers.length === 0 ? (
              <div className="px-3 py-4 text-sm text-slate-500 text-center">未找到匹配的教师</div>
            ) : (
              filteredTeachers.map(t => (
                <div
                  key={t.id}
                  className={`px-3 py-2 text-sm cursor-pointer rounded-md flex items-center justify-between ${value === t.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`}
                  onClick={() => {
                    onChange(t.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <span>{t.name}</span>
                  {t.idCard && <span className="text-slate-400 text-xs">{t.idCard.slice(-4)}</span>}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
