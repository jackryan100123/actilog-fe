import React, { useState, useEffect } from 'react';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { Divider } from 'primereact/divider';
import Swal from 'sweetalert2';
import { getProfile, changePassword } from '../api/api';
import '../styles/profile.css';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
    const [user, setUser] = useState({ name: '', username: '', designation: '', role: '' });
    const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '', confirm: '' });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    useEffect(() => { fetchProfile(); }, []);
    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await getProfile();
            setUser(data);
        } catch (err) {
            const msg = err.message || "";

            // Only show alert if it's NOT a 401/403 (handled globally in api.js)
            if (!msg.includes('401') && !msg.toLowerCase().includes('unauthorized') && !msg.toLowerCase().includes('inactive')) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: msg || 'Failed to load profile',
                    confirmButtonColor: '#0d9488'
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordUpdate = async () => {
        if (passForm.newPassword !== passForm.confirm) {
            return Swal.fire('Error', 'New passwords do not match', 'error');
        }

        try {
            await changePassword(passForm.oldPassword, passForm.newPassword);

            Swal.fire({
                icon: 'success',
                title: 'Password Updated',
                confirmButtonColor: '#0d9488'
            });
            setPassForm({ oldPassword: '', newPassword: '', confirm: '' });
        } catch (err) {
            const msg = err.message || "";

            // Check if global handler already took over
            if (!msg.includes('401') && !msg.toLowerCase().includes('inactive')) {
                Swal.fire({
                    icon: 'error',
                    title: 'Update Failed',
                    text: msg || 'Current password may be incorrect',
                    confirmButtonColor: '#0d9488'
                });
            }
        }
    };

    if (loading) return <div className="p-4 text-center">Loading...</div>;

    return (
        <div className="profile-page-container">
            <div className="grid">

                {/* Information Card */}
                <div className="col-12 lg:col-6 p-3">
                    <Card title="User Information" className="profile-card shadow-1">
                        <div className="p-fluid grid">
                            <div className="field col-12 md:col-6 read-only-field">
                                <label className="font-bold block mb-2">Name</label>
                                <InputText value={user.name} disabled />
                            </div>
                            <div className="field col-12 md:col-6 read-only-field">
                                <label className="font-bold block mb-2">Username</label>
                                <InputText value={user.username} disabled />
                            </div>
                            <div className="field col-12 read-only-field">
                                <label className="font-bold block mb-2">Designation</label>
                                <InputText value={user.designation} disabled />
                            </div>
                            <div className="field col-12">
                                <label className="font-bold block mb-2">System Role</label>
                                <div className="role-badge">
                                    <i className="pi pi-shield mr-2"></i>{user.role}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Security Card */}
                <div className="col-12 lg:col-6 p-3">
                    <Card title="Security Settings" className="profile-card shadow-1">
                        <div className="p-fluid security-section">
                            <div className="field mb-3">
                                <label>Current Password</label>
                                <Password value={passForm.oldPassword} onChange={(e) => setPassForm({ ...passForm, oldPassword: e.target.value })} feedback={false} toggleMask />
                            </div>
                            <Divider />
                            <div className="field mb-3">
                                <label>New Password</label>
                                <Password value={passForm.newPassword} onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })} toggleMask />
                            </div>
                            <div className="field mb-4">
                                <label>Confirm New Password</label>
                                <Password value={passForm.confirm} onChange={(e) => setPassForm({ ...passForm, confirm: e.target.value })} feedback={false} toggleMask />
                            </div>
                            <Button label="Update Password" icon="pi pi-lock" className="profile-save-btn" onClick={handlePasswordUpdate} />
                        </div>
                    </Card>
                </div>

            </div>
        </div>
    );
}

export default Profile;