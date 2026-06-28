import React, { useState } from 'react';
import { useAppContext } from '../context';
import { Plus, Trash2, Edit2, Building2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

export function ClassroomManager() {
  const { 
    state, 
    addBuilding, updateBuilding, deleteBuilding, 
    addFloor, deleteFloor, 
    addClassroom, deleteClassroom, assignClassToRoom 
  } = useAppContext();

  const [activeBuildingId, setActiveBuildingId] = useState<string | null>(state.buildings?.[0]?.id || null);
  
  // Modals state
  const [showBuildingModal, setShowBuildingModal] = useState(false);
  const [editingBuildingId, setEditingBuildingId] = useState<string | null>(null);
  const [buildingName, setBuildingName] = useState('');
  
  const [showFloorModal, setShowFloorModal] = useState<string | null>(null); // buildingId
  const [floorLevel, setFloorLevel] = useState('');

  const [showClassroomModal, setShowClassroomModal] = useState<{buildingId: string, floorId: string} | null>(null);
  const [classroomName, setClassroomName] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'building' | 'floor' | 'classroom';
    id: string;
    parentId?: string;
    grandParentId?: string;
    title: string;
  } | null>(null);

  const activeBuilding = (state.buildings || []).find(b => b.id === (activeBuildingId || state.buildings?.[0]?.id));

  const handleSaveBuilding = () => {
    if (!buildingName.trim()) return;
    if (editingBuildingId) {
      updateBuilding(editingBuildingId, buildingName.trim());
    } else {
      addBuilding(buildingName.trim());
      if (!activeBuildingId && !state.buildings?.length) {
        // Automatically select the first one if it's the first
        setTimeout(() => {
          const newBuildings = state.buildings || [];
          if (newBuildings.length > 0) setActiveBuildingId(newBuildings[newBuildings.length-1].id);
        }, 100);
      }
    }
    setShowBuildingModal(false);
    setBuildingName('');
    setEditingBuildingId(null);
  };

  const handleSaveFloor = () => {
    if (!floorLevel.trim() || !showFloorModal) return;
    addFloor(showFloorModal, floorLevel.trim());
    setShowFloorModal(null);
    setFloorLevel('');
  };

  const handleSaveClassroom = () => {
    if (!classroomName.trim() || !showClassroomModal) return;
    addClassroom(showClassroomModal.buildingId, showClassroomModal.floorId, classroomName.trim());
    setShowClassroomModal(null);
    setClassroomName('');
  };

  const executeDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'building') {
      deleteBuilding(deleteConfirm.id);
      if (activeBuildingId === deleteConfirm.id) setActiveBuildingId(state.buildings?.[0]?.id || null);
    } else if (deleteConfirm.type === 'floor' && deleteConfirm.parentId) {
      deleteFloor(deleteConfirm.parentId, deleteConfirm.id);
    } else if (deleteConfirm.type === 'classroom' && deleteConfirm.parentId && deleteConfirm.grandParentId) {
      deleteClassroom(deleteConfirm.grandParentId, deleteConfirm.parentId, deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-600" />
            教室与班级入驻安排
          </h2>
          <p className="text-sm text-slate-500 mt-1">设置学校楼栋结构，并将班级分配到具体教室，形成可视化校园地图。</p>
        </div>
        <button
          onClick={() => { setEditingBuildingId(null); setBuildingName(''); setShowBuildingModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" /> 添加楼栋
        </button>
      </div>

      {(state.buildings || []).length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-slate-100">
          <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600">暂无楼栋数据</h3>
          <p className="text-slate-400 mt-2">请先点击右上角添加您的第一栋教学楼</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Building Tabs */}
          <div className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-2">
            {(state.buildings || []).map(building => (
              <div 
                key={building.id}
                className={`group flex items-center justify-between p-4 rounded-lg cursor-pointer border transition-all ${
                  (activeBuildingId || state.buildings?.[0]?.id) === building.id 
                    ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                    : 'bg-white border-slate-200 hover:border-indigo-300'
                }`}
                onClick={() => setActiveBuildingId(building.id)}
              >
                <span className={`font-bold ${
                  (activeBuildingId || state.buildings?.[0]?.id) === building.id ? 'text-indigo-800' : 'text-slate-700'
                }`}>
                  {building.name}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingBuildingId(building.id); setBuildingName(building.name); setShowBuildingModal(true); }}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'building', id: building.id, title: `删除楼栋：${building.name}` }); }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Floor Map */}
          {activeBuilding && (
            <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[500px]">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-800">{activeBuilding.name} - 可视化分布</h3>
                <button
                  onClick={() => { setFloorLevel(''); setShowFloorModal(activeBuilding.id); }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> 添加楼层
                </button>
              </div>

              {activeBuilding.floors.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  该楼栋暂无楼层，请先添加楼层。
                </div>
              ) : (
                <div className="flex flex-col-reverse gap-4">
                  {/* Sorting floors by level if it's numeric, or just use as-is. flex-col-reverse makes ground floor at bottom */}
                  {[...activeBuilding.floors].sort((a, b) => {
                    const numA = parseInt(a.level) || 0;
                    const numB = parseInt(b.level) || 0;
                    return numA - numB;
                  }).map(floor => (
                    <div key={floor.id} className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg group/floor">
                      {/* Floor Header */}
                      <div className="w-full sm:w-24 flex-shrink-0 flex sm:flex-col justify-between items-center sm:items-start sm:border-r border-slate-200 pr-4">
                        <div className="font-bold text-slate-700 text-lg">{floor.level}</div>
                        <div className="flex gap-2 opacity-0 group-hover/floor:opacity-100 transition-opacity mt-auto">
                           <button 
                            onClick={() => { setClassroomName(''); setShowClassroomModal({ buildingId: activeBuilding.id, floorId: floor.id }); }}
                            className="p-1.5 bg-white border border-slate-200 text-indigo-600 rounded hover:bg-indigo-50"
                            title="添加教室"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirm({ type: 'floor', id: floor.id, parentId: activeBuilding.id, title: `删除楼层：${floor.level}` })}
                            className="p-1.5 bg-white border border-slate-200 text-rose-600 rounded hover:bg-rose-50"
                            title="删除楼层"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Classrooms */}
                      <div className="flex-1 flex flex-wrap gap-4">
                        {floor.classrooms.length === 0 && (
                          <div className="text-sm text-slate-400 py-2 italic">无教室</div>
                        )}
                        {floor.classrooms.map(room => {
                          const assignedClass = state.classes.find(c => c.id === room.classId);
                          
                          return (
                            <div key={room.id} className={`group/room relative w-40 min-h-[80px] p-3 rounded-lg border-2 transition-all ${
                              assignedClass ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 border-dashed'
                            }`}>
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-slate-700 text-sm">{room.name}</span>
                                <button
                                  onClick={() => setDeleteConfirm({ type: 'classroom', id: room.id, parentId: floor.id, grandParentId: activeBuilding.id, title: `删除教室：${room.name}` })}
                                  className="opacity-0 group-hover/room:opacity-100 p-1 text-rose-400 hover:text-rose-600 transition-opacity"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                              
                              <select
                                value={room.classId || ''}
                                onChange={(e) => assignClassToRoom(activeBuilding.id, floor.id, room.id, e.target.value || undefined)}
                                className={`w-full text-xs p-1 rounded border outline-none ${
                                  assignedClass ? 'bg-white border-indigo-200 text-indigo-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-400'
                                }`}
                              >
                                <option value="">+ 入驻班级</option>
                                {state.classes.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Building Modal */}
      {showBuildingModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">{editingBuildingId ? '编辑楼栋' : '添加新楼栋'}</h3>
              <button onClick={() => setShowBuildingModal(false)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">楼栋名称</label>
                <input 
                  type="text" 
                  value={buildingName}
                  onChange={(e) => setBuildingName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="例如：勤学楼"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowBuildingModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">取消</button>
              <button onClick={handleSaveBuilding} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Floor Modal */}
      {showFloorModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">添加楼层</h3>
              <button onClick={() => setShowFloorModal(null)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">楼层层数标识</label>
                <input 
                  type="text" 
                  value={floorLevel}
                  onChange={(e) => setFloorLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="例如：1层 或 1F"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowFloorModal(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">取消</button>
              <button onClick={handleSaveFloor} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Classroom Modal */}
      {showClassroomModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">添加教室</h3>
              <button onClick={() => setShowClassroomModal(null)} className="text-slate-400 hover:text-slate-600">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">教室名称/编号</label>
                <input 
                  type="text" 
                  value={classroomName}
                  onChange={(e) => setClassroomName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="例如：301 或 计算机机房"
                  autoFocus
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowClassroomModal(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">取消</button>
              <button onClick={handleSaveClassroom} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title="确认删除"
        message={`您确定要${deleteConfirm?.title}吗？此操作不可撤销。`}
        type="danger"
        confirmText="确认删除"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
}
