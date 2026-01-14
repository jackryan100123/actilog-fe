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

import {
    getAllUsers,
    updateUser,
    registerUser,
    adminChangeUserPassword,
    deleteUser
} from '../api/api';

const AdminUsers = ({ user }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [filters, setFilters] = useState({
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    });

    // Registration State
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

    // Reset Password State
    const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    const toast = useRef(null);
    const roles = ['SUPER_ADMIN', 'ADMIN', 'ANALYST'];
    const assignableRoles = ['ADMIN', 'ANALYST'];

    // --- Helpers ---
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
            // Error handling is managed globally by fetchWithAuth, 
            // but we catch specific component errors here.
            toast.current?.show({
                severity: 'error',
                summary: 'Fetch Error',
                detail: err.message,
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // --- Actions ---
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
            toast.current.show({
                severity: 'success',
                summary: 'Updated',
                detail: `${rowData.name} is now ${newStatus}`,
            });
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
            await Swal.fire({
                icon: 'success',
                title: 'User Deleted',
                text: `The account for ${rowData.name} has been wiped.`,
                timer: 2000,
                showConfirmButton: false,
                iconColor: '#0d9488'
            });
            fetchUsers();
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Deletion Failed',
                text: err.message || 'Server error occurred during deletion.'
            });
        }
    };

    const handlePasswordReset = async () => {
        if (!newPassword || newPassword.length < 6) {
            toast.current.show({
                severity: 'error',
                summary: 'Weak Password',
                detail: 'Password must be at least 6 characters',
            });
            return;
        }

        setResetLoading(true);
        try {
            await adminChangeUserPassword(selectedUser.id, newPassword);
            setResetPasswordDialog(false);
            setNewPassword('');

            Swal.fire({
                icon: 'success',
                title: 'Password Updated!',
                text: `Security credentials updated for ${selectedUser.name}.`,
                timer: 2000,
                showConfirmButton: false,
                iconColor: '#0d9488'
            });
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

            Swal.fire({
                icon: 'success',
                title: 'Success!',
                text: `Account created for ${newUserData.name}.`,
                timer: 2000,
                showConfirmButton: false,
                iconColor: '#0d9488'
            });

            setNewUserData({ name: '', designation: '', username: '', password: '', confirmPassword: '', role: 'ANALYST' });
            fetchUsers();
        } catch (err) {
            Swal.fire('Registration Failed', err.message, 'error');
        } finally {
            setRegisterLoading(false);
        }
    };

    // --- Table UI ---
    const renderHeader = () => (
        <div className="flex justify-content-between align-items-center flex-wrap gap-3 p-2">
            <h2 className="m-0 text-xl font-semibold">User Management</h2>
            <div className="flex align-items-center gap-3">
                <span className="p-input-icon-left">
                    <i className="pi pi-search" />
                    <InputText
                        value={globalFilterValue}
                        onChange={(e) => {
                            const value = e.target.value;
                            setGlobalFilterValue(value);
                            setFilters({
                                global: { value, matchMode: FilterMatchMode.CONTAINS },
                            });
                        }}
                        placeholder="Search users..."
                        className="p-inputtext-sm"
                    />
                </span>
                {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                    <Button
                        label="Add User"
                        icon="pi pi-user-plus"
                        className="p-button-teal p-button-sm"
                        onClick={() => setDisplayRegisterModal(true)}
                    />
                )}
            </div>
        </div>
    );

    return (
        <div className="card m-4 shadow-2 border-round">
            <Toast ref={toast} />

            <DataTable
                value={users}
                loading={loading}
                paginator
                rows={10}
                filters={filters}
                globalFilterFields={['name', 'username', 'designation']}
                header={renderHeader()}
                responsiveLayout="stack"
                breakpoint="960px"
                className="p-datatable-sm"
                emptyMessage="No users found."
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
                                className="p-inputtext-sm"
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
                                <Button
                                    label={isActive ? 'Active' : 'Inactive'}
                                    disabled={!canModifyUser(rowData)}
                                    className={`p-button-sm status-btn ${isActive ? 'p-button-success' : 'p-button-danger'}`}
                                    onClick={() => handleStatusToggle(rowData)}
                                    style={{ width: '90px' }}
                                />
                            </div>
                        );
                    }}
                />

                <Column
                    header="Actions"
                    body={(rowData) => (
                        <div className="flex gap-1">
                            <Button
                                icon="pi pi-key"
                                tooltip="Reset Password"
                                tooltipOptions={{ position: 'bottom' }}
                                className="p-button-text p-button-warning p-button-sm"
                                disabled={!canModifyUser(rowData)}
                                onClick={() => {
                                    setSelectedUser(rowData);
                                    setResetPasswordDialog(true);
                                }}
                            />
                            <Button
                                icon="pi pi-trash"
                                tooltip="Delete User"
                                tooltipOptions={{ position: 'bottom' }}
                                className="p-button-text p-button-danger p-button-sm"
                                disabled={!canModifyUser(rowData)}
                                onClick={() => handleDeleteUser(rowData)}
                            />
                        </div>
                    )}
                />
            </DataTable>

            {/* REGISTER MODAL */}
            <Dialog
                header="Create New User Account"
                visible={displayRegisterModal}
                style={{ width: '90vw', maxWidth: '450px' }}
                modal
                className="p-fluid"
                onHide={() => setDisplayRegisterModal(false)}
            >
                <div className="field mb-3">
                    <label htmlFor="name" className="font-bold">Full Name</label>
                    <InputText id="name" value={newUserData.name} onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })} placeholder="John Doe" />
                </div>
                <div className="field mb-3">
                    <label htmlFor="username" className="font-bold">Username</label>
                    <InputText id="username" value={newUserData.username} onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })} placeholder="jdoe123" />
                </div>
                <div className="field mb-3">
                    <label htmlFor="designation" className="font-bold">Designation</label>
                    <InputText id="designation" value={newUserData.designation} onChange={(e) => setNewUserData({ ...newUserData, designation: e.target.value })} placeholder="Analyst" />
                </div>
                <div className="field mb-3">
                    <label htmlFor="reg-role" className="font-bold">Role</label>
                    <Dropdown id="reg-role" value={newUserData.role} options={assignableRoles} onChange={(e) => setNewUserData({ ...newUserData, role: e.value })} />
                </div>
                <div className="field mb-3">
                    <label htmlFor="pass" className="font-bold">Initial Password</label>
                    <Password id="pass" value={newUserData.password} onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })} feedback={false} toggleMask />
                </div>
                <div className="field mb-3">
                    <label htmlFor="conf-pass" className="font-bold">Confirm Password</label>
                    <Password id="conf-pass" value={newUserData.confirmPassword} onChange={(e) => setNewUserData({ ...newUserData, confirmPassword: e.target.value })} feedback={false} toggleMask />
                </div>
                <div className="flex justify-content-end gap-2 mt-4">
                    <Button label="Cancel" className="p-button-text p-button-secondary" onClick={() => setDisplayRegisterModal(false)} />
                    <Button label="Create Account" icon="pi pi-check" className="p-button-teal" loading={registerLoading} onClick={handleRegister} />
                </div>
            </Dialog>

            {/* RESET PASSWORD DIALOG */}
            <Dialog
                header={selectedUser ? `Reset Password: ${selectedUser.name}` : 'Reset Password'}
                visible={resetPasswordDialog}
                style={{ width: '90vw', maxWidth: '400px' }}
                modal
                className="p-fluid"
                onHide={() => {
                    setResetPasswordDialog(false);
                    setNewPassword('');
                }}
            >
                <div className="field mb-4">
                    <label className="font-bold mb-2 block">New Secure Password</label>
                    <Password
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        feedback={true}
                        toggleMask
                        placeholder="Min 6 characters"
                    />
                </div>
                <div className="flex justify-content-end gap-2">
                    <Button label="Cancel" className="p-button-text p-button-secondary" onClick={() => setResetPasswordDialog(false)} />
                    <Button label="Update Password" icon="pi pi-lock" className="p-button-teal" loading={resetLoading} onClick={handlePasswordReset} />
                </div>
            </Dialog>
        </div>
    );
};

export default AdminUsers;