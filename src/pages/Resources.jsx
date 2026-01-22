import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Toast } from 'primereact/toast';
import { FileUpload } from 'primereact/fileupload';
import Swal from 'sweetalert2';

import {
    getNotices, uploadNotice, downloadNotice,
    listManuals, uploadManual, removeManual,
    deleteNotice
} from '../api/api';

import '../styles/daily-activity.css';
import '../styles/resources.css';

const NOTICE_TYPES = [
    { label: 'Monthly', value: 'MONTHLY' },
    { label: 'Cyber Police Station', value: 'CYBER_POLICE_STATION' },
    { label: 'Other', value: 'OTHER' }
];

const Resources = ({ user }) => {
    const [notices, setNotices] = useState([]);
    const [manuals, setManuals] = useState([]);
    const [expandedNoticeRows, setExpandedNoticeRows] = useState(Boolean);
    const [expandedManualRows, setExpandedManualRows] = useState(Boolean);
    const [loading, setLoading] = useState(false);

    // Dialog & Preview States
    const [visible, setVisible] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Form States
    const [uploadTarget, setUploadTarget] = useState('NOTICE');
    const [title, setTitle] = useState('');
    const [selectedEnumType, setSelectedEnumType] = useState('MONTHLY');
    const [selectedFile, setSelectedFile] = useState(null);

    const toast = useRef(null);
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const isAdmin = user?.role === 'ADMIN' || isSuperAdmin;

    const availableNoticeTypes = NOTICE_TYPES.filter(option => {
        if (option.value === 'OTHER') return true;
        return !notices.some(n => n.type === option.value);
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [nData, mData] = await Promise.all([getNotices(), listManuals()]);
            // uniqueKey ensures expansion in one table doesn't affect the other
            setNotices(Array.isArray(nData) ? nData.map(d => ({ ...d, uniqueKey: `n-${d.id}` })) : []);
            setManuals(Array.isArray(mData) ? mData.map(d => ({ ...d, uniqueKey: `m-${d.id}` })) : []);
        } catch (e) {
            toast.current?.show({ severity: 'error', detail: 'Failed to load resources' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const resetForm = () => {
        setTitle('');
        setSelectedFile(null);
        setVisible(false);
    };

    // --- HANDLERS ---
    const handleNoticePreview = async (id) => {
        try {
            const blob = await downloadNotice(id);
            const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            setPreviewUrl(url);
            setPreviewVisible(true);
        } catch (e) {
            toast.current.show({ severity: 'error', detail: 'Notice preview failed' });
        }
    };

    const handleManualPreview = async (id) => {
        try {
            const blob = await downloadManual(id); // Using the specific manual download API
            const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            setPreviewUrl(url);
            setPreviewVisible(true);
        } catch (e) {
            toast.current.show({ severity: 'error', detail: 'Manual preview failed' });
        }
    };

    const handleNoticeDownload = async (rowData) => {
        try {
            const blob = await downloadNotice(rowData.id);
            triggerFileDownload(blob, `${rowData.title}.pdf`);
        } catch (e) {
            toast.current.show({ severity: 'error', detail: 'Notice download failed' });
        }
    };

    const handleManualDownload = async (rowData) => {
        try {
            const blob = await downloadManual(rowData.id); // Using /manuals/{id}/download
            triggerFileDownload(blob, `Manual_${rowData.title}.pdf`);
        } catch (e) {
            toast.current.show({ severity: 'error', detail: 'Manual download failed' });
        }
    };

    const triggerFileDownload = (blob, filename) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    };

    const handleEditClick = (rowData, target) => {
        setUploadTarget(target);
        setTitle(rowData.title);
        setSelectedEnumType(rowData.type || 'MONTHLY');
        setSelectedFile(null); // Force re-selection of file for upload logic
        setVisible(true);
    };

    const confirmDelete = async (id, target) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `This ${target.toLowerCase()} will be deleted.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#0d9488',
        });

        if (result.isConfirmed) {
            try {
                if (target === 'NOTICE') {
                    await deleteNotice(id);
                } else {
                    await removeManual(id); // Separate API
                }
                loadData();
                toast.current.show({ severity: 'success', summary: 'Deleted' });
            } catch (e) {
                Swal.fire('Error', 'Delete failed', 'error');
            }
        }
    };

    const handleSubmit = async () => {
        if (!title.trim() || !selectedFile) return;
        try {
            if (uploadTarget === 'NOTICE') {
                if (editingId) {
                    await updateNotice(editingId, title, selectedEnumType, selectedFile);
                } else {
                    await uploadNotice(title, selectedEnumType, selectedFile);
                }
            } else {
                // MANUAL: No update logic, only upload
                await uploadManual(title, selectedFile);
            }
            loadData();
            resetForm();
            Swal.fire({ icon: 'success', title: 'Saved Successfully', showConfirmButton: false, timer: 1500 });
        } catch (err) {
            toast.current.show({ severity: 'error', detail: 'Upload failed' });
        }
    };

    // --- TEMPLATES ---
    const getFileInfo = (type) => {
        const styles = {
            'PDF': { icon: 'pi pi-file-pdf', color: '#e11d48' },
            'WORD': { icon: 'pi pi-file-word', color: '#2563eb' },
            'EXCEL': { icon: 'pi pi-file-excel', color: '#16a34a' }
        };
        return styles[type] || { icon: 'pi pi-file', color: '#64748b' };
    };

    const titleBodyTemplate = (rowData) => {
        const file = getFileInfo(rowData.attachmentType);
        return (
            <div className="flex align-items-center gap-2">

                <i className={file.icon} style={{ color: file.color, fontSize: '1.2rem' }}></i>
                <div className="flex flex-column">
                    <span className="font-semibold">{rowData.title}</span>
                    {/* <small className="text-muted" style={{fontSize: '0.75rem'}}>{rowData.attachmentName}</small> */}
                </div>
            </div>
        );
    };

    const typeChipTemplate = (rowData) => {
        const config = {
            'MONTHLY': { label: 'Monthly', color: '#0d9488', bg: '#f0fdfa', border: '#ccfbf1' },
            'CYBER_POLICE_STATION': { label: 'Cyber PS', color: '#2563eb', bg: '#eff6ff', border: '#dbeafe' },
            'OTHER': { label: 'Other', color: '#64748b', bg: '#f8fafc', border: '#f1f5f9' }
        };

        const style = config[rowData.type] || config['OTHER'];

        return (
            <span style={{
                backgroundColor: style.bg,
                color: style.color,
                border: `1px solid ${style.border}`,
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                display: 'inline-block'
            }}>
                {style.label}
            </span>
        );
    };

    const manualChipTemplate = () => {
        return (
            <span style={{
                backgroundColor: '#fff7ed',
                color: '#c2410c',
                border: '1px solid #ffedd5',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: '700',
                textTransform: 'uppercase',
                display: 'inline-block'
            }}>
                Manual
            </span>
        );
    };

    const actionTemplate = (rowData, type) => {
        const isPdf = rowData.attachmentType === 'PDF';

        // Determine which specific handler to use
        const onPreview = () => type === 'NOTICE' ? handleNoticePreview(rowData.id) : handleManualPreview(rowData.id);
        const onDownload = () => type === 'NOTICE' ? handleNoticeDownload(rowData) : handleManualDownload(rowData);

        return (
            <div className="flex gap-3 justify-content-center">
                {/* View/Preview */}
                <i className={`pi pi-eye modern-action-icon ${isPdf ? 'edit-icon' : 'disabled-icon'}`}
                    onClick={isPdf ? onPreview : null}
                    style={{ cursor: isPdf ? 'pointer' : 'not-allowed', opacity: isPdf ? 1 : 0.3 }}
                />

                {/* Download */}
                <i className="pi pi-download modern-action-icon edit-icon" onClick={onDownload} />

                {/* Edit - ONLY FOR NOTICE */}
                {type === 'NOTICE' && isAdmin && (
                    <i className="pi pi-pencil modern-action-icon edit-icon"
                        onClick={() => handleEditClick(rowData, 'NOTICE')} />
                )}

                {/* Delete */}
                {((type === 'NOTICE' && isAdmin) || (type === 'MANUAL' && isSuperAdmin)) && (
                    <i className="pi pi-trash modern-action-icon delete-icon"
                        onClick={() => confirmDelete(rowData.id, type)} />
                )}
            </div>
        );
    };

    const rowExpansionTemplate = (row) => (
        <div className="p-3 bg-faded border-top-1 border-200">
            <span className="text-xs font-bold orange-text mr-2">LAST UPDATED BY:</span>
            <span className="text-sm font-medium mr-4">{row.updatedBy || 'System'}</span>
            <span className="text-xs font-bold orange-text mr-2">DATE:</span>
            <span className="text-sm font-medium">{row.updatedAt ? new Date(row.updatedAt).toLocaleString() : 'N/A'}</span>
        </div>
    );

    return (
        <div className="daily-page">
            <div className="daily-container">
                <Toast ref={toast} />
                <div className="page-header mb-4">
                    <div className="title-area">
                        <h1>Resource Center</h1>
                        <p className="text-muted">Documentation and Official Notices</p>
                    </div>
                </div>

                <div className="flex flex-wrap lg:flex-nowrap gap-3 align-items-start">

                    {/* NOTICE TABLE BOX */}
                    <div className="flex-1 min-w-0">
                        <div className="table-card shadow-1">
                            <div className="resource-header-bar flex justify-content-between align-items-center p-3">
                                <span className="font-bold text-lg">
                                    <i className="pi pi-bell mr-2 teal-text"></i>Notices
                                </span>
                                {isAdmin && (
                                    <Button
                                        icon="pi pi-plus"
                                        className="teal-btn p-button-sm p-button-rounded"
                                        onClick={() => { setUploadTarget('NOTICE'); setVisible(true); }}
                                    />
                                )}
                            </div>
                            <DataTable
                                value={notices}
                                expandedRows={expandedNoticeRows}
                                onRowToggle={(e) => setExpandedNoticeRows(e.data)}
                                rowExpansionTemplate={rowExpansionTemplate}
                                dataKey="uniqueKey"
                                className="p-datatable-sm custom-teal-table"
                                responsiveLayout="scroll"
                            >
                                <Column expander style={{ width: '3rem' }} />
                                <Column field="type" header="Category" body={typeChipTemplate} sortable style={{ width: '9rem' }} />
                                <Column field="title" header="Title" body={titleBodyTemplate} sortable />
                                <Column body={(rd) => actionTemplate(rd, 'NOTICE')} header="Actions" style={{ width: '12rem' }} />
                            </DataTable>
                        </div>
                    </div>

                    {/* MANUALS TABLE BOX */}
                    <div className="flex-1 min-w-0">
                        <div className="table-card shadow-1">
                            <div className="resource-header-bar flex justify-content-between align-items-center p-3">
                                <span className="font-bold text-lg">
                                    <i className="pi pi-file-pdf mr-2 teal-text"></i>Manuals
                                </span>
                                {isSuperAdmin && (
                                    <Button
                                        icon="pi pi-plus"
                                        className="teal-btn p-button-sm p-button-rounded"
                                        onClick={() => { setUploadTarget('MANUAL'); setVisible(true); }}
                                    />
                                )}
                            </div>
                            <DataTable
                                value={manuals}
                                expandedRows={expandedManualRows}
                                onRowToggle={(e) => setExpandedManualRows(e.data)}
                                rowExpansionTemplate={rowExpansionTemplate}
                                dataKey="uniqueKey"
                                className="p-datatable-sm custom-teal-table"
                                responsiveLayout="scroll"
                            >
                                <Column expander style={{ width: '3rem' }} />
                                <Column header="Category" body={manualChipTemplate} style={{ width: '9rem' }} />
                                <Column field="title" header="Name" body={titleBodyTemplate} sortable />
                                <Column body={(rd) => actionTemplate(rd, 'MANUAL')} header="Actions" style={{ width: '12rem' }} />
                            </DataTable>
                        </div>
                    </div>
                </div>

            </div>

            {/* PREVIEW DIALOG */}
            <Dialog header="Preview" visible={previewVisible} style={{ width: '75vw' }} onHide={() => { setPreviewVisible(false); setPreviewUrl(null); }} maximizable>
                {previewUrl ? <iframe src={previewUrl} width="100%" height="600px" style={{ border: 'none' }} title="pdf-preview" /> : <p className="p-4 text-center">Loading preview...</p>}
            </Dialog>

            {/* UPLOAD/EDIT DIALOG */}
            <Dialog
                header={`Upload ${uploadTarget === 'NOTICE' ? 'Notice' : 'Manual'}`}
                visible={visible}
                onHide={resetForm}
                style={{ width: '400px' }}
                modal
                footer={<Button label="Submit" icon="pi pi-check" className="teal-btn w-full" onClick={handleSubmit} disabled={!selectedFile || !title.trim()} />}
            >
                <div className="flex flex-column gap-3 pt-2">
                    <div className="flex flex-column gap-2">
                        <label className="font-bold">Title</label>
                        <InputText value={title} onChange={(e) => setTitle(e.target.value)} className="w-full" placeholder="Enter title" />
                    </div>
                    {uploadTarget === 'NOTICE' && (
                        <div className="flex flex-column gap-2">
                            <label className="font-bold">Type</label>
                            <Dropdown
                                value={selectedEnumType}
                                options={availableNoticeTypes}
                                onChange={(e) => setSelectedEnumType(e.value)}
                                className="w-full"
                                placeholder="Select Type"
                                emptyMessage="All unique types are already assigned. Use 'Other'."
                            /> </div>
                    )}
                    <div className="flex flex-column gap-2">
                        <label className="font-bold">File</label>
                        <FileUpload
                            mode="basic"
                            auto={false}
                            onSelect={(e) => setSelectedFile(e.files[0])}
                            accept=".pdf,.doc,.docx,.xls,.xlsx"
                            chooseLabel={selectedFile ? selectedFile.name : "Browse File"}
                            className="w-full"
                        />
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default Resources;