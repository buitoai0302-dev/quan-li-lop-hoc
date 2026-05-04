import React, { useState, useEffect } from 'react';
import api from '../api';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Pagination from '../components/Pagination';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
      toast.error(t('common.error'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      toast.error(error.response?.data?.error || t('common.error'));
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
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col transition-colors">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('rooms.title')}</h2>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {t('rooms.addRoom')}
        </button>
      </div>
      
      <div className="flex-1 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <React.Fragment>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('rooms.name')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('classes.branch')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('rooms.capacity')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('rooms.type')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.status')}</th>
                <th className="relative px-6 py-3"><span className="sr-only">{t('common.actions')}</span></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {rooms.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((room) => (
                <tr key={room.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold">
                        R
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{room.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-300">{room.branch_name || t('rooms.unknown')}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-300">{room.capacity}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-300">{t(`rooms.${room.room_type || 'classroom'}`)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {room.is_active ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                        {t('common.active')}
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                        {t('common.inactive')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleOpenModal(room)} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 mr-4">{t('common.edit')}</button>
                    <button onClick={() => setDeletingId(room.id)} className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">{t('common.delete')}</button>
                  </td>
                </tr>
              ))}
              {rooms.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {t('rooms.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination 
            currentPage={currentPage}
            totalItems={rooms.length}
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
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('rooms.name')} *</label>
            <input 
              required
              type="text" 
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-700 dark:text-white"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('rooms.capacity')}</label>
            <input 
              type="number" 
              min="1"
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-700 dark:text-white"
              value={formData.capacity}
              onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 0})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('classes.branch')} *</label>
            <select
              required
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-700 dark:text-white"
              value={formData.branch_id}
              onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
            >
              <option value="" disabled>---</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('rooms.type')}</label>
            <select 
              className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-700 dark:text-white"
              value={formData.room_type}
              onChange={(e) => setFormData({...formData, room_type: e.target.value})}
            >
              <option value="classroom">{t('rooms.classroom')}</option>
              <option value="lab">{t('rooms.lab')}</option>
              <option value="meeting">{t('rooms.meeting')}</option>
            </select>
          </div>
          {editingId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('common.status')}</label>
              <select
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm dark:bg-gray-700 dark:text-white"
                value={formData.is_active ? 'true' : 'false'}
                onChange={(e) => setFormData({...formData, is_active: e.target.value === 'true'})}
              >
                <option value="true">{t('common.active')}</option>
                <option value="false">{t('common.inactive')}</option>
              </select>
            </div>
          )}
          
          <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:col-start-2 sm:text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('common.saving', 'Đang lưu...') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={handleCloseModal}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:col-start-1 sm:text-sm"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title={t('common.confirmDelete')}
        message={t('common.deleteWarning', 'Hành động này sẽ đưa dữ liệu vào thùng rác. Bạn có chắc chắn muốn xóa?')}
      />
    </div>
  );
};

export default Rooms;
