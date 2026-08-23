import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { handleApiError } from '@/utils/errorHelper';
import {
  Users,
  Search,
  Building,
  CheckCircle,
  KeyRound,
  Plus,
  Copy,
  Lock,
  Unlock,
  Zap,
  Upload,
} from 'lucide-react';
import { Modal, Card, Button, Input, Select } from '@/components/common/UI';
import { USER_ROLES } from '@/utils/constants';
import PageHeader from '@/components/common/PageHeader';
import PageLoading from '@/components/common/PageLoading';
import Pagination from '@/components/common/Pagination';
import FilterBar from '@/components/common/FilterBar';
import FilterSelect from '@/components/common/FilterSelect';
import ImportUsersModal from './ImportUsersModal';

import {
  useAdminUsers,
  useAdminTenants,
  useAdminPlans,
  useCreateAdminUser,
  useResetAdminUserPassword,
  useToggleAdminUserStatus,
} from '../hooks/useAdmin';

const AdminUsers: React.FC = () => {
  const { t } = useTranslation();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [tenantFilter, setTenantFilter] = useState('ALL');
  const [isFilterVisible, setIsFilterVisible] = useState(false);

  const { data: users = [], isLoading: loadingUsers } = useAdminUsers();
  const { data: tenants = [], isLoading: loadingTenants } = useAdminTenants();
  const { data: plans = [], isLoading: loadingPlans } = useAdminPlans();

  const createMutation = useCreateAdminUser();
  const resetPasswordMutation = useResetAdminUserPassword();
  const toggleStatusMutation = useToggleAdminUserStatus();

  const loading = loadingUsers || loadingTenants || loadingPlans;

  const filteredUsers = useMemo(() => {
    let result = users;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (u) => u.email.toLowerCase().includes(term) || u.full_name.toLowerCase().includes(term)
      );
    }
    if (roleFilter !== 'ALL') {
      result = result.filter((u) => u.role === roleFilter);
    }
    if (tenantFilter !== 'ALL') {
      result = result.filter((u) => u.tenant_id === tenantFilter);
    }
    return result;
  }, [users, searchTerm, roleFilter, tenantFilter]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, tenantFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(start, start + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: USER_ROLES.ADMIN,
    tenant_id: '',
    new_tenant_name: '',
    plan_id: '',
    password: '',
  });

  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [newlyCreatedPassword, setNewlyCreatedPassword] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      role: USER_ROLES.ADMIN,
      tenant_id: tenants.length > 0 ? tenants[0].id : '',
      new_tenant_name: '',
      plan_id: plans.length > 0 ? plans[0].id : '',
      password: '',
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setNewlyCreatedPassword(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData, {
      onSuccess: (data) => {
        toast.success(t('admin.users.messages.create_success'));
        setNewlyCreatedPassword({ email: data.user.email, password: data.rawPassword });
      },
      onError: (error: any) => handleApiError(error, t),
    });
  };

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (resetPasswordInput && resetPasswordInput.length > 0 && resetPasswordInput.length < 8) {
      toast.error(
        t('admin.users.messages.password_min_length', 'Mật khẩu phải có ít nhất 8 ký tự.')
      );
      return;
    }

    resetPasswordMutation.mutate(
      { id: selectedUser.id, data: { password: resetPasswordInput || undefined } },
      {
        onSuccess: (data) => {
          toast.success(t('admin.users.messages.reset_success'));
          setNewlyCreatedPassword({ email: selectedUser.email, password: data.rawPassword });
        },
        onError: (error: any) => handleApiError(error, t),
      }
    );
  };

  const handleToggleStatus = (user: any) => {
    if (
      window.confirm(
        user.is_active
          ? t('admin.users.messages.confirm_lock', { email: user.email })
          : t('admin.users.messages.confirm_unlock', { email: user.email })
      )
    ) {
      toggleStatusMutation.mutate(user.id, {
        onSuccess: () => {
          toast.success(t('admin.users.messages.status_success'));
        },
        onError: (error: any) => handleApiError(error, t),
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('admin.users.messages.copy_success'));
  };

  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  if (loading) return <PageLoading />;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <PageHeader
        icon={Users}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterVisible(!isFilterVisible)}
              className={`h-9 w-9 px-0 rounded-lg transition-all ${isFilterVisible ? 'bg-primary/10 border-primary/30 text-primary' : ''}`}
              title={t('common.filter')}
            >
              <Search size={16} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="h-9 w-9 sm:w-auto px-0 sm:px-4 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2 group"
            >
              <Upload size={16} className="shrink-0" />
              <span className="hidden sm:inline">
                {t('admin.users.buttons.import', 'Nhập danh sách')}
              </span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleOpenCreate}
              className="h-9 w-9 sm:w-auto px-0 sm:px-4 rounded-lg text-[10px] font-black uppercase tracking-widest gap-2 group"
            >
              <Plus
                size={16}
                className="shrink-0 transition-transform duration-300 group-hover:rotate-90"
              />
              <span className="hidden sm:inline">{t('admin.users.buttons.create')}</span>
            </Button>
          </div>
        }
      >
        <FilterBar
          isVisible={isFilterVisible}
          searchQuery={searchTerm}
          onSearchChange={(val) => {
            setSearchTerm(val);
            setCurrentPage(1);
          }}
          searchPlaceholder={t('admin.users.search_placeholder')}
        >
          <FilterSelect
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            placeholder={t('admin.users.all_roles')}
            options={[
              { value: USER_ROLES.SUPER_ADMIN, label: t('admin.users.roles.super_admin') },
              { value: USER_ROLES.ADMIN, label: t('admin.users.roles.admin') },
              { value: USER_ROLES.STAFF, label: t('admin.users.roles.staff') },
              { value: USER_ROLES.TEACHER, label: t('admin.users.roles.teacher') },
              { value: USER_ROLES.STUDENT, label: t('admin.users.roles.student') },
            ]}
          />
          <FilterSelect
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            placeholder={t('admin.users.all_tenants')}
            options={tenants.map((t) => ({ value: t.id, label: t.name }))}
          />
        </FilterBar>
      </PageHeader>

      <div className="flex-1 overflow-hidden flex flex-col px-1">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col space-y-3 min-h-0 py-2">
          <Card
            className="flex-1 min-h-0 overflow-hidden"
            scrollable={true}
            footer={
              <Pagination
                currentPage={currentPage}
                totalItems={filteredUsers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={(limit) => {
                  setItemsPerPage(limit);
                  setCurrentPage(1);
                }}
              />
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800">
                  <tr>
                    <th className="px-3 py-3 sm:px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {t('admin.users.table.user')}
                    </th>
                    <th className="hidden sm:table-cell px-3 py-3 sm:px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {t('admin.users.table.role')}
                    </th>
                    <th className="hidden sm:table-cell px-3 py-3 sm:px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {t('admin.users.table.tenant')}
                    </th>
                    <th className="px-3 py-3 sm:px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">
                      {t('admin.users.table.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        {t('admin.users.table.empty')}
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                        <td className="px-3 py-3 sm:px-4 sm:py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 flex items-center justify-center text-primary font-bold shadow-inner relative shrink-0">
                              {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                              <span
                                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-white dark:border-slate-900 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                title={user.is_active ? 'Đang hoạt động' : 'Đã khóa'}
                              />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                                {user.full_name}
                              </span>
                              <span className="text-[10px] sm:text-xs text-gray-500 truncate mt-0.5">
                                {user.email}
                              </span>
                              <div className="sm:hidden flex items-center gap-2 mt-1.5">
                                <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[8px] font-bold uppercase rounded tracking-wider shrink-0">
                                  {user.role}
                                </span>
                                <span className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                                  <Building size={10} /> {user.tenant_name || 'SYSTEM'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-3 py-3 sm:px-4 sm:py-4">
                          <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase rounded-md tracking-wider">
                            {user.role}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell px-3 py-3 sm:px-4 sm:py-4">
                          <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                            <Building size={14} className="text-gray-400" />
                            {user.tenant_name || (
                              <span className="text-gray-400 italic">
                                {t('admin.users.table.system')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 sm:px-4 sm:py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setResetPasswordInput('');
                                setNewlyCreatedPassword(null);
                                setIsResetModalOpen(true);
                              }}
                              className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title={t('admin.users.tooltip.reset')}
                            >
                              <KeyRound size={16} />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(user)}
                              className={`p-2 rounded-lg transition-colors ${
                                user.is_active
                                  ? 'text-rose-500 hover:bg-rose-50'
                                  : 'text-emerald-500 hover:bg-emerald-50'
                              }`}
                              title={
                                user.is_active
                                  ? t('admin.users.tooltip.lock')
                                  : t('admin.users.tooltip.unlock')
                              }
                            >
                              {user.is_active ? <Lock size={16} /> : <Unlock size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <ImportUsersModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />

      {/* CREATE USER MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={t('admin.users.modal.create_title')}
      >
        <div className="p-4 sm:p-6">
          {newlyCreatedPassword ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('admin.users.modal.success')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('admin.users.modal.user_created', { email: newlyCreatedPassword.email })}
              </p>

              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between mt-4">
                <div className="text-left">
                  <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">
                    {t('admin.users.modal.password_label')}
                  </p>
                  <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                    {newlyCreatedPassword.password}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(newlyCreatedPassword.password)}
                >
                  <Copy size={16} className="mr-2" /> Copy
                </Button>
              </div>

              <Button className="w-full mt-6" onClick={() => setIsCreateModalOpen(false)}>
                {t('admin.users.buttons.close')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  {t('admin.users.modal.tenant')}
                </label>
                <Select
                  value={formData.tenant_id}
                  onChange={(e) => setFormData({ ...formData, tenant_id: e.target.value })}
                  required
                >
                  <option value="" disabled>
                    {t('admin.users.modal.select_tenant')}
                  </option>
                  <option value="NEW" className="font-bold text-primary">
                    {t('admin.users.modal.new_tenant')}
                  </option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>

              {formData.tenant_id === 'NEW' && (
                <div className="space-y-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-primary dark:text-blue-400">
                      {t('admin.users.modal.new_tenant_name')}
                    </label>
                    <Input
                      required
                      placeholder={t('admin.users.modal.new_tenant_placeholder')}
                      value={formData.new_tenant_name}
                      onChange={(e) =>
                        setFormData({ ...formData, new_tenant_name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-primary dark:text-blue-400">
                      {t('admin.users.modal.plan')}
                    </label>
                    <Select
                      value={formData.plan_id}
                      onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                      required
                    >
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  {t('admin.users.table.role')}
                </label>
                <Select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  <option value={USER_ROLES.ADMIN}>{t('admin.users.roles.admin')}</option>
                  <option value={USER_ROLES.SUPER_ADMIN}>
                    {t('admin.users.roles.super_admin')}
                  </option>
                  <option value={USER_ROLES.STAFF}>{t('admin.users.roles.staff')}</option>
                  <option value={USER_ROLES.TEACHER}>{t('admin.users.roles.teacher')}</option>
                  <option value={USER_ROLES.STUDENT}>{t('admin.users.roles.student')}</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  {t('admin.users.modal.fullname')}
                </label>
                <Input
                  required
                  placeholder={t('admin.users.modal.fullname_placeholder')}
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  {t('admin.users.modal.email')}
                </label>
                <Input
                  required
                  type="email"
                  placeholder={t('admin.users.modal.email_placeholder')}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  {t('admin.users.modal.password_label')}
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('admin.users.modal.password_placeholder')}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormData({ ...formData, password: generateRandomPassword() })}
                  >
                    <Zap size={16} className="mr-1" /> Ngẫu nhiên
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  {t('admin.users.buttons.cancel')}
                </Button>
                <Button type="submit" className="flex-1" loading={createMutation.isPending}>
                  {t('admin.users.buttons.create')}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>

      {/* RESET PASSWORD MODAL */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title={t('admin.users.modal.reset_title')}
      >
        <div className="p-4 sm:p-6">
          {newlyCreatedPassword ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('admin.users.modal.success')}
              </h3>
              <p className="text-sm text-gray-500">
                {t('admin.users.modal.password_created', { email: newlyCreatedPassword.email })}
              </p>

              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between mt-4">
                <div className="text-left">
                  <p className="text-[10px] uppercase text-gray-400 font-bold mb-1">
                    {t('admin.users.modal.new_password_label')}
                  </p>
                  <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                    {newlyCreatedPassword.password}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(newlyCreatedPassword.password)}
                >
                  <Copy size={16} className="mr-2" /> Copy
                </Button>
              </div>

              <Button className="w-full mt-6" onClick={() => setIsResetModalOpen(false)}>
                {t('admin.users.buttons.close')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-6">
              <p className="text-sm text-gray-500 mb-4">
                {t('admin.users.modal.reset_notice_1')}
                <span className="font-bold text-gray-900 dark:text-white">
                  {selectedUser?.email}
                </span>
              </p>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-300">
                  {t('admin.users.modal.new_password_label')}
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder={t('admin.users.modal.password_placeholder')}
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setResetPasswordInput(generateRandomPassword())}
                  >
                    <Zap size={16} />
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsResetModalOpen(false)}
                >
                  {t('admin.users.buttons.cancel')}
                </Button>
                <Button type="submit" className="flex-1" loading={resetPasswordMutation.isPending}>
                  {t('admin.users.buttons.reset')}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AdminUsers;
