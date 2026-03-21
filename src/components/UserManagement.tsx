import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context';
import { User, UserRole } from '../types';
import { UserPlus, Edit2, Trash2, Shield, User as UserIcon } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

export const UserManagement = () => {
  const { state } = useAppContext();
  const [users, setUsers] = useState<Partial<User>[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User & { password?: string }>>({});
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSave = async () => {
    setError('');
    if (!currentUser.username || (!currentUser.id && !currentUser.password) || !currentUser.role) {
      setError('请填写完整信息');
      return;
    }

    const method = currentUser.id ? 'PUT' : 'POST';
    const url = currentUser.id ? `/api/users/${currentUser.id}` : '/api/users';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentUser),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存失败');
      }

      setIsEditing(false);
      setCurrentUser({});
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '删除失败');
      }
      fetchUsers();
      setDeleteConfirmId(null);
    } catch (err: any) {
      setError(err.message);
      setDeleteConfirmId(null);
    }
  };

  const roles: { value: UserRole; label: string }[] = [
    { value: 'SUPER_ADMIN', label: '超级管理员' },
    { value: 'ADMIN', label: '教务管理员' },
    { value: 'USER', label: '专业部管理' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">用户管理</h2>
          <p className="text-slate-500 text-sm">管理系统访问账号及其权限</p>
        </div>
        <button
          onClick={() => {
            setCurrentUser({ role: 'USER' });
            setIsEditing(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          新增用户
        </button>
      </div>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">{currentUser.id ? '编辑用户' : '新增用户'}</h3>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
                <input
                  type="text"
                  value={currentUser.username || ''}
                  onChange={(e) => setCurrentUser({ ...currentUser, username: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  密码 {currentUser.id && <span className="text-slate-400 font-normal">(留空表示不修改)</span>}
                </label>
                <input
                  type="password"
                  value={currentUser.password || ''}
                  onChange={(e) => setCurrentUser({ ...currentUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">角色</label>
                <select
                  value={currentUser.role || ''}
                  onChange={(e) => setCurrentUser({ ...currentUser, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {roles.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              {currentUser.role === 'USER' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">所属专业部</label>
                  <div className="grid grid-cols-1 gap-2 border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {state.departments.map((d) => (
                      <label key={d.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors">
                        <input
                          type="checkbox"
                          checked={currentUser.departmentIds?.includes(d.id) || false}
                          onChange={(e) => {
                            const currentIds = currentUser.departmentIds || [];
                            if (e.target.checked) {
                              setCurrentUser({ ...currentUser, departmentIds: [...currentIds, d.id] });
                            } else {
                              setCurrentUser({ ...currentUser, departmentIds: currentIds.filter(id => id !== d.id) });
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-slate-700">{d.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">专业部管理员可以管理所选专业部的数据</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">用户名</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">角色</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">所属部门</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-slate-800">{u.username}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    u.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700' :
                    u.role === 'ADMIN' ? 'bg-blue-50 text-blue-700' :
                    'bg-slate-50 text-slate-700'
                  }`}>
                    <Shield className="w-3 h-3" />
                    {roles.find(r => r.value === u.role)?.label}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {u.departmentIds && u.departmentIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {u.departmentIds.map(id => (
                        <span key={id} className="bg-slate-100 px-2 py-0.5 rounded text-xs">
                          {state.departments.find(d => d.id === id)?.name || id}
                        </span>
                      ))}
                    </div>
                  ) : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setCurrentUser({ ...u });
                        setIsEditing(true);
                      }}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => u.id && setDeleteConfirmId(u.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        title="确认删除"
        message="确定要删除该用户吗？此操作无法撤销。"
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        onCancel={() => setDeleteConfirmId(null)}
        type="danger"
      />
    </div>
  );
};
