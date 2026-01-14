import React, { useEffect, useState, useCallback } from 'react';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { MultiSelect } from 'primereact/multiselect';
import { Calendar } from 'primereact/calendar';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tag } from 'primereact/tag';
import { FilterMatchMode } from 'primereact/api';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';

import {
  getMyActivities,
  createActivity,
  updateActivity,
  deleteActivity,
  getTools
} from '../api/api';

import '../styles/daily-activity.css';

const STATUS_OPTIONS = [
  { label: 'PENDING', value: 'PENDING' },
  { label: 'IN PROGRESS', value: 'IN_PROGRESS' },
  { label: 'COMPLETED', value: 'COMPLETED' }
];

const emptyForm = {
  activityDate: null,
  detailOfCase: '',
  typeOfInformation: '',
  nameOfIO: '',
  status: 'PENDING',
  toolsUsed: [],
  miscellaneousWork: '',
  remarks: ''
};

export default function DailyActivity() {
  const navigate = useNavigate();
  
  // --- States ---
  const [activities, setActivities] = useState([]);
  const [tools, setTools] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [visible, setVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newToolName, setNewToolName] = useState('');
  const [expandedRows, setExpandedRows] = useState(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [globalFilterValue, setGlobalFilterValue] = useState('');

  // Combined Lazy State (Pagination + Sort + Filter)
  const [lazyParams, setLazyParams] = useState({
    first: 0,
    rows: 10,
    page: 0,
    sortField: 'createdAt',
    sortOrder: -1,
    filters: {
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      detailOfCase: { value: null, matchMode: FilterMatchMode.CONTAINS },
      typeOfInformation: { value: null, matchMode: FilterMatchMode.CONTAINS },
      status: { value: null, matchMode: FilterMatchMode.EQUALS },
      'user.name': { value: null, matchMode: FilterMatchMode.CONTAINS }
    }
  });

  const [user] = useState(() => {
    const saved = localStorage.getItem('userInfo');
    return saved ? JSON.parse(saved) : { name: '', role: '' };
  });

  // --- Data Loading ---
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pageData, toolsData] = await Promise.all([
        getMyActivities(lazyParams), // Pass lazyParams for server-side logic
        getTools()
      ]);
      setActivities(pageData.content || []);
      setTotalRecords(pageData.totalElements || 0);
      setTools(toolsData.map(t => t.name));
    } catch (e) {
      if (e.message?.toLowerCase().includes('unauthorized')) navigate('/login');
      else Swal.fire('Error', 'Failed to load data', 'error');
    } finally {
      setLoading(false);
    }
  }, [lazyParams, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Table Event Handlers ---
  const onPage = (event) => setLazyParams(prev => ({ ...prev, ...event }));
  const onSort = (event) => setLazyParams(prev => ({ ...prev, ...event }));
  const onFilter = (event) => {
    event['first'] = 0;
    event['page'] = 0;
    setLazyParams(prev => ({ ...prev, ...event }));
  };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    let _filters = { ...lazyParams.filters };
    _filters['global'].value = value;
    setGlobalFilterValue(value);
    setLazyParams(prev => ({ ...prev, filters: _filters, first: 0, page: 0 }));
  };

  // --- Templates ---
  const statusBodyTemplate = (row) => {
    const severityMap = { PENDING: 'warning', IN_PROGRESS: 'info', COMPLETED: 'success' };
    return <Tag value={row.status} severity={severityMap[row.status]} className="status-tag" />;
  };

  const statusFilterTemplate = (options) => (
    <Dropdown
      value={options.value}
      options={STATUS_OPTIONS}
      onChange={(e) => options.filterApplyCallback(e.value)}
      placeholder="Select Status"
      className="p-column-filter"
      showClear
    />
  );

  const actionTemplate = (row) => {
    const isPrivileged = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    return (
      <div className="flex gap-4 align-items-center justify-content-center">
        <i 
          className="pi pi-pencil modern-action-icon edit-icon" 
          onClick={() => openEdit(row)} 
          title="Edit"
        />
        {isPrivileged && (
          <i 
            className="pi pi-trash modern-action-icon delete-icon" 
            onClick={() => removeActivity(row.id)} 
            title="Delete"
          />
        )}
      </div>
    );
  };

  // --- CRUD Logic ---
  const openCreate = () => { setForm(emptyForm); setEditingId(null); setVisible(true); };

  const openEdit = (row) => {
    setForm({
      ...row,
      activityDate: new Date(row.activityDate),
      toolsUsed: row.toolsUsed || [],
      miscellaneousWork: Array.isArray(row.miscellaneousWork) ? row.miscellaneousWork.join(', ') : row.miscellaneousWork
    });
    setEditingId(row.id);
    setVisible(true);
  };

  const saveActivity = async () => {
    const payload = {
      ...form,
      activityDate: form.activityDate.toISOString().split('T')[0],
      miscellaneousWork: typeof form.miscellaneousWork === 'string' 
        ? form.miscellaneousWork.split(',').map(v => v.trim()).filter(Boolean)
        : form.miscellaneousWork,
      toolsUsed: [...new Set(form.toolsUsed)]
    };

    try {
      if (editingId) await updateActivity(editingId, payload);
      else await createActivity(payload);
      
      Swal.fire({ icon: 'success', title: 'Saved', timer: 1500, showConfirmButton: false });
      setVisible(false);
      loadData();
    } catch (e) {
      Swal.fire('Error', 'Save Failed', 'error');
    }
  };

  const removeActivity = async (id) => {
    const res = await Swal.fire({ title: 'Delete Activity?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#0d9488' });
    if (res.isConfirmed) { 
      await deleteActivity(id); 
      loadData(); 
    }
  };

  const rowExpansionTemplate = (row) => (
    <div className="expansion-panel p-3">
      <div className="grid">
        <div className="col-12 md:col-4">
          <p><strong>Name of IO:</strong> {row.nameOfIO || '-'}</p>
          <p><strong>Remarks:</strong> {row.remarks || '-'}</p>
        </div>
        <div className="col-12 md:col-8 border-left-1 border-200 pl-4">
          <div className="grid">
            <div className="col-6">
              <h4 className="text-xs uppercase teal-text mb-2">Creation</h4>
              <p className="text-sm"><strong>By:</strong> {row.createdBy}</p>
              <p className="text-sm"><strong>At:</strong> {new Date(row.createdAt).toLocaleString()}</p>
            </div>
            <div className="col-6">
              <h4 className="text-xs uppercase orange-text mb-2">Update</h4>
              <p className="text-sm"><strong>By:</strong> {row.updatedBy}</p>
              <p className="text-sm"><strong>At:</strong> {new Date(row.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="daily-page">
      <div className="daily-container">
        <div className="page-header">
          <div className="title-area">
            <h1>Daily Activities</h1>
            <p className="text-muted">Manage investigative cases and tool logs</p>
          </div>
          <div className="flex align-items-center gap-3">
            <span className="p-input-icon-left">
              <i className="pi pi-search" />
              <InputText value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Global Search" className="p-inputtext-sm" />
            </span>
            <Button label="Add Activity" icon="pi pi-plus" className="teal-btn" onClick={openCreate} />
          </div>
        </div>

        <div className="table-card shadow-1">
          <DataTable
            value={activities}
            lazy paginator loading={loading}
            first={lazyParams.first} rows={lazyParams.rows} totalRecords={totalRecords}
            onPage={onPage} onSort={onSort} onFilter={onFilter}
            sortField={lazyParams.sortField} sortOrder={lazyParams.sortOrder}
            filters={lazyParams.filters}
            rowsPerPageOptions={[10, 25, 50]}
            filterDisplay="menu"
            className="p-datatable-sm custom-teal-table"
            dataKey="id"
            expandedRows={expandedRows}
            onRowToggle={(e) => setExpandedRows(e.data)}
            rowExpansionTemplate={rowExpansionTemplate}
          >
            <Column expander style={{ width: '3rem' }} />
            <Column field="activityDate" header="Date" body={r => new Date(r.activityDate).toLocaleDateString()} sortable />

            {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
              <Column field="user" header="Logged By" filter sortable />
            )}

            <Column field="detailOfCase" header="Detail of Case" filter sortable />
            <Column field="typeOfInformation" header="Type of Info" filter sortable />
            <Column field="status" header="Status" body={statusBodyTemplate} filter filterElement={statusFilterTemplate} sortable />

<Column 
    header="Tools Used" 
    style={{ minWidth: '180px' }}
    body={(row) => (
        <div className="flex flex-wrap gap-1">
            {row.toolsUsed?.map((tool, index) => (
                <span key={index} className="tool-chip-simple">
                    {tool}
                </span>
            ))}
        </div>
    )} 
/>

            <Column body={actionTemplate} header="Actions" />
          </DataTable>
        </div>
      </div>

<Dialog 
    header={editingId ? 'Edit Activity Details' : 'Register New Activity'} 
    visible={visible} 
    onHide={() => setVisible(false)} 
    className="modern-dialog" 
    modal 
    draggable={false}
    style={{ width: '50vw' }}
    breakpoints={{ '960px': '75vw', '641px': '90vw' }}
>
    <div className="grid form-grid pt-2">
        {/* Row 1: Date and Status */}
        <div className="field col-12 md:col-6">
            <label className="font-bold block mb-2">Activity Date</label>
            <Calendar 
                value={form.activityDate} 
                onChange={e => setForm({ ...form, activityDate: e.value })} 
                showIcon 
                className="w-full shadow-none" 
                placeholder="Select date"
            />
        </div>
        <div className="field col-12 md:col-6">
            <label className="font-bold block mb-2">Current Status</label>
            <Dropdown 
                value={form.status} 
                options={STATUS_OPTIONS} 
                onChange={e => setForm({ ...form, status: e.value })} 
                className="w-full" 
                placeholder="Select status"
            />
        </div>

        {/* Row 2: Case Details and Info Type */}
        <div className="field col-12 md:col-6">
            <label className="font-bold block mb-2">Detail of Case</label>
            <InputText 
                value={form.detailOfCase} 
                onChange={e => setForm({ ...form, detailOfCase: e.target.value })} 
                className="w-full" 
                placeholder="Enter case reference"
            />
        </div>
        <div className="field col-12 md:col-6">
            <label className="font-bold block mb-2">Type of Information</label>
            <InputText 
                value={form.typeOfInformation} 
                onChange={e => setForm({ ...form, typeOfInformation: e.target.value })} 
                className="w-full" 
                placeholder="e.g. Technical / Field"
            />
        </div>

        {/* Row 3: IO Name and Misc Work */}
        <div className="field col-12 md:col-6">
            <label className="font-bold block mb-2">Name of IO</label>
            <InputText 
                value={form.nameOfIO} 
                onChange={e => setForm({ ...form, nameOfIO: e.target.value })} 
                className="w-full" 
                placeholder="Investigating Officer"
            />
        </div>
        <div className="field col-12 md:col-6">
            <label className="font-bold block mb-2">Misc Work</label>
            <InputText 
                value={form.miscellaneousWork} 
                onChange={e => setForm({ ...form, miscellaneousWork: e.target.value })} 
                className="w-full" 
                placeholder="Comma separated tasks"
            />
        </div>

        {/* Full Width: MultiSelect Tools */}
        <div className="field col-12">
            <label className="font-bold block mb-2">Forensic Tools Used</label>
            <MultiSelect
                value={form.toolsUsed} 
                options={tools} 
                display="chip" 
                filter
                onChange={e => setForm({ ...form, toolsUsed: e.value })}
                className="w-full custom-multiselect" 
                placeholder="Select forensic tools"
                panelFooterTemplate={() => (
                    <div className="flex p-2 gap-2 bg-gray-50 border-top-1 border-200">
                        <InputText 
                            value={newToolName} 
                            onChange={e => setNewToolName(e.target.value)} 
                            placeholder="Add missing tool..." 
                            className="p-inputtext-sm flex-1" 
                        />
                        <Button 
                            icon="pi pi-plus" 
                            onClick={() => { if(newToolName) { setTools([...tools, newToolName]); setNewToolName(''); }}} 
                            className="p-button-sm teal-btn" 
                        />
                    </div>
                )}
            />
        </div>

        {/* Full Width: Remarks */}
        <div className="field col-12">
            <label className="font-bold block mb-2">Additional Remarks</label>
            <InputText 
                value={form.remarks} 
                onChange={e => setForm({ ...form, remarks: e.target.value })} 
                className="w-full" 
                placeholder="Observations or notes"
            />
        </div>

        {/* Action Button */}
        <div className="col-12 mt-3">
            <Button 
                label={editingId ? 'Update Activity Record' : 'Create Activity Record'} 
                icon={editingId ? "pi pi-refresh" : "pi pi-check"}
                className="teal-btn w-full py-3 text-lg font-bold shadow-2" 
                onClick={saveActivity} 
            />
        </div>
    </div>
</Dialog>
    </div>
  );
}