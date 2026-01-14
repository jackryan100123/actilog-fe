import React, { useEffect, useState, useRef, useCallback } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { FilterMatchMode } from 'primereact/api';
import Swal from 'sweetalert2';
import { Tag } from 'primereact/tag';

import {
    getAllUsers,
    updateUser,
    registerUser,
    adminChangeUserPassword,
    deleteUser
} from '../api/api';

const AdminUsers = ({ user }) => {
    // --- Existing State ---
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    });

    const [displayRegisterModal, setDisplayRegisterModal] = useState(false);
    const [registerLoading, setRegisterLoading] = useState(false);
    const [newUserData, setNewUserData] = useState({
        name: '',
        designation: '',
        username: '',
        password: '',
        confirmPassword: '',
        role: 'ANALYST'
    });

    const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    const toast = useRef(null);
    const roles = ['SUPER_ADMIN', 'ADMIN', 'ANALYST'];
    const assignableRoles = ['ADMIN', 'ANALYST'];

    // --- Existing Logic (Unchanged) ---
    const canModifyUser = useCallback((rowUser) => {
        if (rowUser.id === user.id) return false;
        if (rowUser.role === 'SUPER_ADMIN') return false;
        if (user.role === 'ADMIN') return rowUser.role === 'ANALYST';
        if (user.role === 'SUPER_ADMIN') return true;
        return false;
    }, [user]);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAllUsers();
            setUsers(data);
        } catch (err) {
            toast.current?.show({ severity: 'error', summary: 'Fetch Error', detail: err.message });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleRoleChange = async (userId, newRole) => {
        const targetUser = users.find(u => u.id === userId);
        try {
            await updateUser(userId, { ...targetUser, role: newRole });
            toast.current.show({ severity: 'success', summary: 'Updated', detail: `Role changed to ${newRole}` });
            fetchUsers();
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        }
    };

    const handleStatusToggle = async (rowData) => {
        const currentStatus = (rowData.status || 'ACTIVE').toUpperCase();
        const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        const result = await Swal.fire({
            title: `Set to ${newStatus}?`,
            text: `Are you sure you want to ${newStatus.toLowerCase()} ${rowData.name}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0d9488',
            confirmButtonText: 'Yes, change status'
        });
        if (!result.isConfirmed) return;
        try {
            await updateUser(rowData.id, { ...rowData, status: newStatus });
            toast.current.show({ severity: 'success', summary: 'Updated', detail: `${rowData.name} is now ${newStatus}` });
            fetchUsers();
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        }
    };

    const handleDeleteUser = async (rowData) => {
        const result = await Swal.fire({
            title: 'Delete User Account?',
            text: `This will permanently delete ${rowData.name} and all their associated daily activity logs. This action cannot be undone!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete everything'
        });
        if (!result.isConfirmed) return;
        try {
            await deleteUser(rowData.id);
            await Swal.fire({ icon: 'success', title: 'User Deleted', text: `The account for ${rowData.name} has been wiped.`, timer: 2000, showConfirmButton: false, iconColor: '#0d9488' });
            fetchUsers();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Deletion Failed', text: err.message || 'Server error occurred during deletion.' });
        }
    };

    const handlePasswordReset = async () => {
        if (!newPassword || newPassword.length < 6) {
            toast.current.show({ severity: 'error', summary: 'Weak Password', detail: 'Password must be at least 6 characters' });
            return;
        }
        setResetLoading(true);
        try {
            await adminChangeUserPassword(selectedUser.id, newPassword);
            setResetPasswordDialog(false);
            setNewPassword('');
            Swal.fire({ icon: 'success', title: 'Password Updated!', text: `Security credentials updated for ${selectedUser.name}.`, timer: 2000, showConfirmButton: false, iconColor: '#0d9488' });
        } catch (err) {
            Swal.fire('Error', err.message, 'error');
        } finally {
            setResetLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!newUserData.username || !newUserData.password || !newUserData.name) {
            toast.current.show({ severity: 'error', summary: 'Required Fields', detail: 'Please fill name, username, and password.' });
            return;
        }
        if (newUserData.password !== newUserData.confirmPassword) {
            toast.current.show({ severity: 'error', summary: 'Mismatch', detail: 'Passwords do not match.' });
            return;
        }
        setRegisterLoading(true);
        try {
            await registerUser(newUserData);
            setDisplayRegisterModal(false);
            Swal.fire({ icon: 'success', title: 'Success!', text: `Account created for ${newUserData.name}.`, timer: 2000, showConfirmButton: false, iconColor: '#0d9488' });
            setNewUserData({ name: '', designation: '', username: '', password: '', confirmPassword: '', role: 'ANALYST' });
            fetchUsers();
        } catch (err) {
            Swal.fire('Registration Failed', err.message, 'error');
        } finally {
            setRegisterLoading(false);
        }
    };

    // --- UI Layout (Updated to Daily Activity Style) ---
    return (
        <div className="daily-page">
            <div className="daily-container">
                <Toast ref={toast} />
                
                <div className="page-header">
                    <div className="title-area">
                        <h1>User Management</h1>
                        <p className="text-muted">Maintain system access and user permissions</p>
                    </div>
                    <div className="flex align-items-center gap-3">
                        <span className="p-input-icon-left">
                            <i className="pi pi-search" />
                            <InputText 
                                value={globalFilterValue} 
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setGlobalFilterValue(value);
                                    setFilters({ global: { value, matchMode: FilterMatchMode.CONTAINS } });
                                }} 
                                placeholder="Search users..." 
                                className="p-inputtext-sm" 
                            />
                        </span>
                        {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                            <Button label="Add User" icon="pi pi-user-plus" className="teal-btn" onClick={() => setDisplayRegisterModal(true)} />
                        )}
                    </div>
                </div>

                <div className="table-card shadow-1">
                    <DataTable
                        value={users}
                        loading={loading}
                        paginator
                        rows={10}
                        filters={filters}
                        globalFilterFields={['name', 'username', 'designation']}
                        responsiveLayout="stack"
                        breakpoint="960px"
                        className="p-datatable-sm custom-teal-table"
                        emptyMessage="No users found."
                        dataKey="id"
                    >
                        <Column field="name" header="Name" sortable style={{ minWidth: '12rem' }} />
                        <Column field="username" header="Username" sortable />
                        <Column field="designation" header="Designation" sortable />
                        <Column
                            header="Role"
                            body={(rowData) => {
                                const options = rowData.role === 'SUPER_ADMIN' ? roles : assignableRoles;
                                return (
                                    <Dropdown
                                        value={rowData.role}
                                        options={options}
                                        disabled={!canModifyUser(rowData)}
                                        onChange={(e) => handleRoleChange(rowData.id, e.value)}
                                        className="w-full p-inputtext-sm"
                                    />
                                );
                            }}
                        />
                        <Column
                            header="Status"
                            headerClassName="justify-content-center"
                            body={(rowData) => {
                                const isActive = (rowData.status || 'ACTIVE').toUpperCase() === 'ACTIVE';
                                return (
                                    <div className="flex justify-content-center w-full">
                                        <Tag 
                                            value={isActive ? 'Active' : 'Inactive'} 
                                            severity={isActive ? 'success' : 'danger'} 
                                            className="status-tag cursor-pointer"
                                            onClick={() => canModifyUser(rowData) && handleStatusToggle(rowData)}
                                        />
                                    </div>
                                );
                            }}
                        />
                        <Column
                            header="Actions"
                            body={(rowData) => (
                                <div className="flex gap-3 align-items-center justify-content-center">
                                    <i
                                        className={`pi pi-key modern-action-icon edit-icon ${!canModifyUser(rowData) ? 'opacity-50' : ''}`}
                                        onClick={() => canModifyUser(rowData) && (setSelectedUser(rowData) || setResetPasswordDialog(true))}
                                        title="Reset Password"
                                    />
                                    <i
                                        className={`pi pi-trash modern-action-icon delete-icon ${!canModifyUser(rowData) ? 'opacity-50' : ''}`}
                                        onClick={() => canModifyUser(rowData) && handleDeleteUser(rowData)}
                                        title="Delete User"
                                    />
                                </div>
                            )}
                        />
                    </DataTable>
                </div>
            </div>

            {/* REGISTER DIALOG */}
            <Dialog
                header="Register New User"
                visible={displayRegisterModal}
                onHide={() => setDisplayRegisterModal(false)}
                className="modern-dialog"
                modal
                draggable={false}
                style={{ width: '400px' }}
            >
                <div className="grid form-grid pt-2">
                    <div className="field col-12">
                        <label className="font-bold block mb-2">Full Name</label>
                        <InputText value={newUserData.name} onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })} placeholder="Enter name" />
                    </div>
                    <div className="field col-12">
                        <label className="font-bold block mb-2">Username</label>
                        <InputText value={newUserData.username} onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })} placeholder="Enter username" />
                    </div>
                    <div className="field col-12">
                        <label className="font-bold block mb-2">Designation</label>
                        <InputText value={newUserData.designation} onChange={(e) => setNewUserData({ ...newUserData, designation: e.target.value })} placeholder="Enter designation" />
                    </div>
                    <div className="field col-12">
                        <label className="font-bold block mb-2">System Role</label>
                        <Dropdown value={newUserData.role} options={assignableRoles} onChange={(e) => setNewUserData({ ...newUserData, role: e.value })} className="w-full" />
                    </div>
                    <div className="field col-12">
                        <label className="font-bold block mb-2">Password</label>
                        <Password value={newUserData.password} onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })} feedback={false} toggleMask className="w-full" inputClassName="w-full" />
                    </div>
                    <div className="field col-12">
                        <label className="font-bold block mb-2">Confirm Password</label>
                        <Password value={newUserData.confirmPassword} onChange={(e) => setNewUserData({ ...newUserData, confirmPassword: e.target.value })} feedback={false} toggleMask className="w-full" inputClassName="w-full" />
                    </div>
                    <div className="col-12 mt-3">
                        <Button label="Create Account" icon="pi pi-check" className="teal-btn w-full py-3" loading={registerLoading} onClick={handleRegister} />
                    </div>
                </div>
            </Dialog>

            {/* RESET PASSWORD DIALOG */}
            <Dialog
                header={`Reset Password: ${selectedUser?.name}`}
                visible={resetPasswordDialog}
                onHide={() => { setResetPasswordDialog(false); setNewPassword(''); }}
                className="modern-dialog"
                modal
                draggable={false}
                style={{ width: '350px' }}
            >
                <div className="grid form-grid pt-2">
                    <div className="field col-12">
                        <label className="font-bold block mb-2">New Secure Password</label>
                        <Password value={newPassword} onChange={(e) => setNewPassword(e.target.value)} feedback={true} toggleMask className="w-full" inputClassName="w-full" placeholder="Min 6 characters" />
                    </div>
                    <div className="col-12 mt-3">
                        <Button label="Update Password" icon="pi pi-lock" className="teal-btn w-full py-3" loading={resetLoading} onClick={handlePasswordReset} />
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default AdminUsers;