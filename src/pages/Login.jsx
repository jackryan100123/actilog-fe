import React, { useState, useEffect } from 'react';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { login, setTokens, getProfile } from '../api/api';
import '../styles/login.css';

const Login = ({ setUser }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const navigate = useNavigate();

    // Check for session expiry message on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('session') === 'expired') {
            Swal.fire({
                icon: 'info',
                title: 'Session Expired',
                text: 'You have been logged out due to inactivity.',
                confirmButtonColor: '#0d9488'
            });
            // Clean the URL so the message doesn't pop up again on refresh
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Perform Login to get Access Token
            const tokenData = await login(username, password);
            if (!tokenData) return; // Safety exit if login failed
            setTokens(tokenData);

            // 2. Fetch User Profile
            const profileData = await getProfile();

            // SAFETY CHECK: If account was disabled/inactive, api.js 
            // already showed Swal and returned undefined. 
            if (!profileData || !profileData.name) {
                return; // Stop execution here; global handler is redirecting
            }

            const userInfo = {
                name: profileData.name,
                role: profileData.role
            };

            // 3. Persist and Update State
            localStorage.setItem('userInfo', JSON.stringify(userInfo));
            setUser(userInfo);

            // 4. Success Feedback
            Swal.fire({
                icon: 'success',
                title: 'Welcome Back!',
                text: `Authenticated as ${userInfo.role}`,
                timer: 1500,
                showConfirmButton: false,
                background: '#ffffff',
                iconColor: '#0d9488'
            });

            // 5. Role-Based Navigation
            setTimeout(() => {
                if (userInfo.role === 'SUPER_ADMIN' || userInfo.role === 'ADMIN') {
                    navigate('/dashboard', { replace: true });
                } else {
                    navigate('/daily-activities', { replace: true });
                }
            }, 1500);

        } catch (err) {
            const msg = err.message || "";
            // Ignore errors already handled by global fetchWithAuth (401/403)
            if (!msg.toLowerCase().includes('inactive') && !msg.includes('401')) {
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: msg.includes('Failed to fetch')
                        ? 'Server is unreachable. Please check your connection.'
                        : msg || 'Invalid credentials. Please try again.',
                    confirmButtonColor: '#0d9488',
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-wrapper">
            <div className="login-card-container">

                {/* LEFT SIDE: THE FORM */}
                <div className="login-form-section">
                    <div className="login-header">
                        <h1><span className="teal-text">Welcome to ActiLog</span></h1>
                        <p>Enter your credentials to access your secure dashboard.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        <div className="input-field">
                            <label>Username</label>
                            <span className="p-input-icon-left">
                                <i className="pi pi-user" />
                                <InputText
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter your username"
                                    disabled={loading}
                                    required
                                />
                            </span>
                        </div>

                        <div className="input-field">
                            <label>Password</label>
                            <span className="p-input-icon-left">
                                <i className="pi pi-lock" style={{ zIndex: 10 }} />
                                <Password
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    toggleMask
                                    feedback={false}
                                    disabled={loading}
                                    inputClassName="w-full"
                                    required
                                />
                            </span>
                        </div>

                        <div className="form-options">
                            <div className="remember-me">
                                <Checkbox
                                    inputId="remember"
                                    onChange={e => setRememberMe(e.checked)}
                                    checked={rememberMe}
                                />
                                <label htmlFor="remember">Remember me</label>
                            </div>
                            <span className="forgot-password">Forgot Password?</span>
                        </div>

                        <Button
                            label={loading ? "Verifying..." : "Sign In"}
                            icon={!loading && "pi pi-sign-in"}
                            loading={loading}
                            type="submit"
                            className="submit-btn"
                        />
                    </form>
                </div>
                
                {/* RIGHT SIDE: THE VISUAL */}
                <div className="login-visual-section">
                    <div className="visual-overlay"></div>
                    <div className="visual-content">
                        <h2 className="app-title">ActiLog</h2>
                        <p>Access your activities and tools within a high-security environment designed for clarity and speed.</p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Login;