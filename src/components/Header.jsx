import React, { useRef } from 'react';
import { Menubar } from 'primereact/menubar';
import { Avatar } from 'primereact/avatar';
import { TieredMenu } from 'primereact/tieredmenu';
import { useNavigate, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { clearTokens } from '../api/api';
import '../styles/header.css';
import logo from '/logo.png';

const Header = ({ user, showProfile = true }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const menu = useRef(null);

    if (location.pathname === '/login') return null;

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

    const handleLogout = () => {
        clearTokens();
        localStorage.clear();
        Swal.fire({
            icon: 'success',
            title: 'Logged Out',
            timer: 1500,
            showConfirmButton: false,
            background: '#ffffff',
            iconColor: '#0d9488'
        });
        navigate('/login', { replace: true });
    };

    const navItems = [
        ...(isAdmin ? [{
            label: 'Dashboard',
            icon: 'pi pi-chart-bar',
            command: () => navigate('/dashboard')
        }] : []),
        {
            label: 'Daily Activity',
            icon: 'pi pi-calendar-plus',
            command: () => navigate('/daily-activities')
        },
        {
            label: 'Resources',
            icon: 'pi pi-folder-open',
            command: () => navigate('/resources')
        },
        ...(isAdmin ? [{
            label: 'User Management',
            icon: 'pi pi-users',
            command: () => navigate('/users')
        }] : [])
    ];

    const profileItems = [
        { label: 'My Profile', icon: 'pi pi-user', command: () => navigate('/profile') },
        { separator: true },
        { label: 'Logout', icon: 'pi pi-sign-out', className: 'logout-item', command: handleLogout }
    ];

    const start = (
        <img
            src={logo}
            alt="Logo"
            className="logo-img mr-4"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(isAdmin ? '/dashboard' : '/daily-activities')}
        />
    );

    const end = showProfile ? (
        <div className="flex align-items-center gap-3">
            <div className="text-right hidden sm:block mr-2">
                <p className="text-900 font-bold m-0 line-height-1">{user?.name}</p>
            </div>
            <Avatar
                label={user?.name?.[0].toUpperCase() || 'U'}
                shape="circle"
                className="avatar"
                style={{ cursor: 'pointer' }}
                onClick={(e) => menu.current.toggle(e)}
            />
            <TieredMenu model={profileItems} popup ref={menu} />
        </div>
    ) : null;

    return (
        <div className="header-wrapper shadow-1">
            <Menubar model={navItems} start={start} end={end} className="header-menubar" />
        </div>
    );
};

export default Header;