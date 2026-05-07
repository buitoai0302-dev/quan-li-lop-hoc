import React, { useState, useEffect } from 'react';
import NoResults from '../components/NoResults';
import api from '../api';
import Modal from '../components/Modal';
import { DoorOpen, Users, Plus, Upload, Search, X } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { handleApiError } from '../utils/errorHelper';
import { useNavigate } from 'react-router-dom';

interface Room {
  id: string;
  name: string;
  capacity: number;
  room_type: string;
  branch_id: string;
  branch_name?: string;
  is_active: boolean;
}

interface Branch {
  id: string;
  name: string;
}

const Rooms: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(window.innerWidth < 768 ? 5 : 10);
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    capacity: 30,
    room_type: 'classroom',
    branch_id: '',
    is_active: true,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [roomsRes, branchesRes] = await Promise.all([
        api.get('/rooms'),
        api.get('/branches')
      ]);
      setRooms(roomsRes.data);
      setBranches(branchesRes.data);

      if (branchesRes.data.length > 0 && !formData.branch_id) {
        setFormData(prev => ({ ...prev, branch_id: branchesRes.data[0].id }));
      }
    } catch (error) {
      handleApiError(error, t);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredRooms = rooms.filter(room => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = room.name.toLowerCase().includes(query) ||
      t(`rooms.${room.room_type || 'classroom'}`).toLowerCase().includes(query);
    
    const matchesBranch = branchFilter === '' || room.branch_id === branchFilter;
    
    return matchesSearch && matchesBranch;
  });

  const handleOpenModal = (room?: Room) => {
    if (room) {
      setEditingId(room.id);
      setFormData({
        name: room.name,
        capacity: room.capacity || 30,
        room_type: room.room_type || 'classroom',
        branch_id: room.branch_id || (branches.length > 0 ? branches[0].id : ''),
        is_active: room.is_active,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '',
        capacity: 30,
        room_type: 'classroom',
        branch_id: branches.length > 0 ? branches[0].id : '',
        is_active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingId) {
        await api.put(`/rooms/${editingId}`, formData);
        toast.success(t('common.success'));
      } else {
        await api.post('/rooms', formData);
        toast.success(t('common.success'));
      }
      handleCloseModal();
      fetchData();
    } catch (error: any) {
      handleApiError(error, t);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/rooms/${deletingId}`);
      toast.success(t('common.success'));
      fetchData();
    } catch (error: any) {
      handleApiError(error, t);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col transition-colors">
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 sm:max-w-xl order-2 sm:order-1">
            <div className="relative flex-1 sm:max-w-xs">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-10 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <select
              className="w-full sm:w-auto border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary dark:bg-gray-800 transition-all shadow-sm appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-10"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="">{t('import.selectBranch')}</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 order-1 sm:order-2">
            <button
              onClick={() => navigate('/import?type=rooms')}
              className="flex-1 sm:flex-none h-9 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-gray-200 dark:border-gray-600 whitespace-nowrap flex items-center justify-center gap-2 active:scale-95 shadow-sm"
              title={t('common.import')}
            >
              <Upload size={16} />
              <span className="sm:inline">{t('common.import')}</span>
            </button>
            <button
              onClick={() => handleOpenModal()}
              className="flex-1 sm:flex-none h-9 px-4 bg-primary hover:bg-primary-dark text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-primary/25 whitespace-nowrap flex items-center justify-center gap-2 group active:scale-95"
              title={t('rooms.addRoom')}
            >
              <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
              <span className="sm:inline">{t('rooms.addRoom')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto -mx-3 sm:-mx-6 px-3 sm:px-6 relative">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <React.Fragment>
            <table className="w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700 border-separate border-spacing-0">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 dark:bg-gray-900/90 backdrop-blur-md">
                  <th className="w-auto px-2 sm:px-6 py-3 text-left text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700">{t('rooms.name')}</th>
                  <th className="hidden md:table-cell w-[25%] px-6 py-3 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700">{t('classes.branch')}</th>
                  <th className="hidden sm:table-cell w-24 px-6 py-3 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700">{t('rooms.capacity')}</th>
                  <th className="hidden sm:table-cell w-32 px-6 py-3 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700">{t('rooms.type')}</th>
                  <th className="hidden sm:table-cell w-28 px-2 sm:px-6 py-3 text-left text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700">{t('common.status')}</th>
                  <th className="w-20 sm:w-28 px-2 sm:px-6 py-3 text-right text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-gray-200 dark:border-gray-700">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRooms.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group">
                    <td className="px-2 sm:px-6 py-3">
                      <div className="flex items-center min-w-0">
                        <div className="relative flex-shrink-0">
                          <div className="h-9 w-9 bg-primary/10 dark:bg-primary/20 rounded-xl flex items-center justify-center text-primary font-bold text-xs">
                            R
                          </div>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800 ${room.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                        </div>
                        <div className="ml-3 min-w-0 flex-1">
                          <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-primary transition-colors">{room.name}</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 sm:hidden truncate">
                            {t(`rooms.${room.room_type || 'classroom'}`)} • {room.capacity} HS
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 text-sm text-gray-900 dark:text-gray-300 truncate">
                      {room.branch_name || t('rooms.unknown')}
                    </td>
                    <td className="hidden sm:table-cell px-6 py-3 text-sm text-gray-900 dark:text-gray-300">
                      {room.capacity}
                    </td>
                    <td className="hidden sm:table-cell px-6 py-3 text-sm text-gray-900 dark:text-gray-300 truncate">
                      {t(`rooms.${room.room_type || 'classroom'}`)}
                    </td>
                    <td className="hidden sm:table-cell px-2 sm:px-6 py-3 whitespace-nowrap">
                      {room.is_active ? (
                        <span className="px-1.5 py-0.5 inline-flex text-[9px] leading-3 font-bold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                          {t('common.active')}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 inline-flex text-[9px] leading-3 font-bold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                          {t('common.inactive')}
                        </span>
                      )}
                    </td>
                    <td className="px-2 sm:px-6 py-3 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenModal(room)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => setDeletingId(room.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRooms.length === 0 && (
                  <NoResults 
                    title={searchQuery ? t('common.noResults') : t('rooms.noData')}
                    colSpan={6} 
                  />
                )}
              </tbody>
            </table>
            <Pagination
              currentPage={currentPage}
              totalItems={filteredRooms.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
              }}
            />
          </React.Fragment>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingId ? t('rooms.editRoom') : t('rooms.addRoom')}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Main Info Section */}
          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-500/10 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <DoorOpen size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-black text-emerald-600/50 dark:text-emerald-400/50 uppercase tracking-widest">{t('common.info')}</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('rooms.name')} *</label>
              <input
                required
                type="text"
                placeholder={t('rooms.namePlaceholder')}
                className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('classes.branch')} *</label>
                <select
                  required
                  className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none transition-all text-sm font-medium dark:text-white cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                >
                  <option value="" disabled>---</option>
                  {branches.map(branch => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('rooms.type')}</label>
                <select
                  className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none transition-all text-sm font-medium dark:text-white cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
                  value={formData.room_type}
                  onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                >
                  <option value="classroom">{t('rooms.classroom')}</option>
                  <option value="lab">{t('rooms.lab')}</option>
                  <option value="meeting">{t('rooms.meeting')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Settings Section */}
          <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100/50 dark:border-blue-500/10 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Users size={16} className="text-blue-600 dark:text-blue-400" />
              <span className="text-[10px] font-black text-blue-600/50 dark:text-blue-400/50 uppercase tracking-widest">{t('common.settings')}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('rooms.capacity')}</label>
                <input
                  type="number"
                  min="1"
                  className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-medium dark:text-white"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex flex-col">
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 ml-1">{t('common.status')}</label>
                <select
                  className="block w-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-xl py-2.5 px-4 pr-10 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none transition-all text-sm font-medium dark:text-white cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236B7280%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%222%22%20d%3D%22M19%209l-7%207-7-7%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat"
                  value={formData.is_active ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.value === 'true' })}
                >
                  <option value="true">{t('common.active')}</option>
                  <option value="false">{t('common.inactive')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={handleCloseModal}
              className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-[2] py-3 px-4 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-primary-dark transition-all shadow-lg shadow-primary/25 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete')}
        message={t('common.deleteWarning')}
      />
    </div>
  );
};

export default Rooms;
