import React, { useEffect, useState, useCallback } from 'react';
import { Chart } from 'primereact/chart';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Calendar } from 'primereact/calendar';
import { Dropdown } from 'primereact/dropdown';
import { Tag } from 'primereact/tag';
import { Button } from 'primereact/button';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Swal from 'sweetalert2';
import { getDashboardSummary, getDashboardLogs, getAllUsers } from '../api/api';

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedUser, setSelectedUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [filterType, setFilterType] = useState('MONTHLY');
    const [totalRecords, setTotalRecords] = useState(0);
    const [lazyParams, setLazyParams] = useState({ first: 0, rows: 10, page: 0 });

    const today = new Date();

    const [stats, setStats] = useState({
        totalActivities: 0, pendingTasks: 0, inProgressTasks: 0, completedTasks: 0,
        recentLogs: [], allLogsForExcel: [],
        chartData: { labels: [], datasets: [] },
        statusData: { labels: [], datasets: [] },
        topFiveTools: { labels: [], datasets: [] }
    });


    const formatArrayCell = (val) => Array.isArray(val) ? val.join(', ') : (val || '');
    const getWeekRange = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(d.setDate(diff));
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return [start, end];
    };

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            let dateParam;
            if (filterType === 'WEEKLY' && Array.isArray(selectedDate)) {
                dateParam = selectedDate[0].toISOString().split('T')[0];
            } else if (selectedDate instanceof Date) {
                dateParam = selectedDate.toISOString().split('T')[0];
            } else {
                dateParam = new Date().toISOString().split('T')[0];
            }

            const params = { filterType, date: dateParam, userId: selectedUser };
            const [summary, userData, logsPage] = await Promise.all([
                getDashboardSummary(params),
                getAllUsers(),
                getDashboardLogs(params, 0, 10)
            ]);

            const logsToProcess = summary.allLogsForExcel || logsPage.content || [];
            const toolCounts = {};

            logsToProcess.forEach(log => {
                let tools = (typeof log.toolsUsed === 'string' && log.toolsUsed.trim() !== "")
                    ? log.toolsUsed.split(',').map(t => t.trim())
                    : (Array.isArray(log.toolsUsed) ? log.toolsUsed : ['Generic']);
                tools.forEach(t => { if (t) toolCounts[t] = (toolCounts[t] || 0) + 1; });
            });

            const sortedTools = Object.entries(toolCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);

            const topFiveTools = {
                labels: sortedTools.map(item => item[0]),
                datasets: [{
                    label: 'Usage Count',
                    backgroundColor: '#14b8a6',
                    data: sortedTools.map(item => item[1]),
                    borderRadius: 8,
                    barThickness: 30
                }]
            };


            setStats({ ...summary, recentLogs: logsPage.content, topFiveTools: topFiveTools });
            setTotalRecords(logsPage.totalElements);
            setUsers(userData);
        } catch (err) {
            console.error("Dashboard Load Error:", err);
        } finally {
            setLoading(false);
        }
    }, [selectedDate, selectedUser, filterType]);

    useEffect(() => { loadData(); }, [loadData]);

    const exportToPDF = () => {
        if (!stats.allLogsForExcel || stats.allLogsForExcel.length === 0) {
            Swal.fire({ title: 'No Data', icon: 'warning', confirmButtonColor: '#0d9488' });
            return;
        }

        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const generatedBy = userInfo.name || 'System Admin';

        const doc = new jsPDF('l', 'mm', 'a4');
        const timestamp = new Date().toLocaleString();
        const dateLabel = filterType === 'TILL_DATE' ? 'Full_History' : formatFileNameDate(selectedDate, filterType);
        const fileName = `Cencops_Report_${filterType}_(${dateLabel}).pdf`;

        const sortedData = [...stats.allLogsForExcel].sort((a, b) =>
            new Date(b.activityDate) - new Date(a.activityDate)
        );

        doc.setFontSize(16);
        doc.setTextColor(13, 148, 136);
        doc.text("CENCOPS SYSTEM ANALYTICS REPORT", 14, 15);

        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Period: ${dateLabel.replace(/_/g, ' ')} | Generated By: ${generatedBy} | Exported: ${timestamp}`, 14, 22);

        const tableColumns = [
            { header: 'Date', dataKey: 'date' },
            { header: 'Staff', dataKey: 'staff' },
            { header: 'Particulars', dataKey: 'particulars' },
            { header: 'Info Type', dataKey: 'infoType' },
            { header: 'IO', dataKey: 'io' },
            { header: 'Status', dataKey: 'status' },
            { header: 'Tools Used', dataKey: 'tools' },
            { header: 'Last Updated At', dataKey: 'updatedAt' },
            { header: 'Last Updated By', dataKey: 'updatedBy' }
        ];

        const tableRows = sortedData.map(log => ({
            date: log.activityDate,
            staff: log.user || 'N/A',
            particulars: log.detailOfCase || '',
            infoType: log.typeOfInformation || '',
            io: log.nameOfIO || '',
            status: log.status,
            tools: Array.isArray(log.toolsUsed) ? log.toolsUsed.join(', ') : (log.toolsUsed || ''),
            updatedAt: log.updatedAt ? new Date(log.updatedAt).toLocaleString() : 'N/A',
            updatedBy: log.updatedBy || 'N/A'
        }));

        autoTable(doc, {
            startY: 28,
            columns: tableColumns,
            body: tableRows,
            theme: 'grid',
            headStyles: { fillColor: [13, 148, 136], textColor: 255 },
            styles: { fontSize: 6, cellPadding: 1.5, overflow: 'linebreak' },
            columnStyles: {
                2: { cellWidth: 35 },
                6: { cellWidth: 45 }
            }
        });

        doc.save(fileName);

        Swal.fire({
            title: 'PDF Exported',
            text: `Report saved as ${fileName}`,
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    };

    const exportToExcel = () => {
        if (!stats.allLogsForExcel || stats.allLogsForExcel.length === 0) {
            Swal.fire({
                title: 'No Data to Export',
                text: 'Please select a different date range or personnel.',
                icon: 'warning',
                confirmButtonColor: '#0d9488'
            });
            return;
        }

        // Retrieve name from userInfo object in localStorage
        const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
        const generatedBy = userInfo.name || 'System Admin';

        const workbook = XLSX.utils.book_new();
        const timestamp = new Date().toLocaleString();
        const dateLabel = filterType === 'TILL_DATE' ? 'Full_History' : formatFileNameDate(selectedDate, filterType);

        // Identical naming for PDF/Excel
        const fileName = `Cencops_Report_${filterType}_(${dateLabel}).xlsx`;

        const prepareRow = (log) => ({
            'Activity Date': log.activityDate,
            'Staff Name': log.user || 'N/A',
            'Particulars': log.detailOfCase || '',
            'Type of Information': log.typeOfInformation || '',
            'Name of IO': log.nameOfIO || '',
            'Status': log.status,
            'Tools Used': Array.isArray(log.toolsUsed) ? log.toolsUsed.join(', ') : (log.toolsUsed || ''),
            'Misc Work': Array.isArray(log.miscellaneousWork) ? log.miscellaneousWork.join(', ') : (log.miscellaneousWork || ''),
            'Remarks': log.remarks || '',
            'Last Updated At': log.updatedAt ? new Date(log.updatedAt).toLocaleString() : 'N/A',
            'Last Updated By': log.updatedBy || 'N/A'
        });

        const createSheetWithHeader = (data) => {
            const headerInfo = [
                ["CENCOPS SYSTEM ANALYTICS REPORT"],
                [`Report Period: ${dateLabel.replace(/_/g, ' ')}`, `Generated By: ${generatedBy}`, `Exported: ${timestamp}`],
                []
            ];
            const worksheet = XLSX.utils.aoa_to_sheet(headerInfo);
            XLSX.utils.sheet_add_json(worksheet, data, { origin: "A4" });
            return worksheet;
        };

        // 1. OVERALL SUMMARY
        const summaryMap = stats.allLogsForExcel.reduce((acc, log) => {
            const name = log.user || 'Unknown';
            if (!acc[name]) acc[name] = { Total: 0, Completed: 0, InProgress: 0, Pending: 0 };
            acc[name].Total++;
            if (log.status === 'COMPLETED') acc[name].Completed++;
            else if (log.status === 'IN_PROGRESS') acc[name].InProgress++;
            else acc[name].Pending++;
            return acc;
        }, {});

        const summaryData = Object.entries(summaryMap).map(([name, s]) => ({
            'Staff Name': name, 'Total Tasks': s.Total, 'Completed': s.Completed, 'In Progress': s.InProgress, 'Pending': s.Pending
        }));
        XLSX.utils.book_append_sheet(workbook, createSheetWithHeader(summaryData), "Overall Summary");

        // 2. ALL ACTIVITIES MERGED
        const allDataRaw = stats.allLogsForExcel.map(prepareRow);
        XLSX.utils.book_append_sheet(workbook, createSheetWithHeader(allDataRaw), "All Activities Merged");

        // 3. INDIVIDUAL PERSONNEL SHEETS
        const grouped = stats.allLogsForExcel.reduce((acc, log) => {
            const name = log.user || 'Unknown';
            if (!acc[name]) acc[name] = [];
            acc[name].push(prepareRow(log));
            return acc;
        }, {});

        Object.keys(grouped).forEach(staffName => {
            const safeName = staffName.replace(/[\\*?:/[\]]/g, '').substring(0, 31);
            XLSX.utils.book_append_sheet(workbook, createSheetWithHeader(grouped[staffName]), safeName);
        });

        XLSX.writeFile(workbook, fileName);

        Swal.fire({
            title: 'Success!',
            text: `Excel Report generated: ${fileName}`,
            icon: 'success',
            timer: 2500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    };

    const formatFileNameDate = (date, type) => {
        if (!date) return 'All_Time';

        if (type === 'WEEKLY' && Array.isArray(date)) {
            const start = date[0]?.toLocaleDateString('en-GB').replace(/\//g, '-');
            const end = date[1]?.toLocaleDateString('en-GB').replace(/\//g, '-');
            return `${start}_to_${end}`;
        }

        if (type === 'MONTHLY' && date instanceof Date) {
            return date.toLocaleDateString('en-GB', {
                month: '2-digit',
                year: 'numeric'
            }).replace(/\//g, '-');
        }

        if (type === 'YEARLY' && date instanceof Date) {
            return date.getFullYear().toString();
        }

        return date instanceof Date ? date.toLocaleDateString('en-GB').replace(/\//g, '-') : 'Report';
    };

    // --- Calendar Templates ---
    const dateTemplate = (date) => {
        if (filterType !== 'WEEKLY' || !Array.isArray(selectedDate)) return date.day;

        const current = new Date(date.year, date.month, date.day).getTime();
        const start = selectedDate[0]?.getTime();
        const end = selectedDate[1]?.getTime();

        const isSelected = current >= start && current <= end;
        const isStart = current === start;
        const isEnd = current === end;

        let cls = isSelected ? 'selected-week' : '';
        if (isStart) cls += ' week-start';
        if (isEnd) cls += ' week-end';

        return <div className={cls}>{date.day}</div>;
    };

    const statusBodyTemplate = (row) => {
        const severityMap = { PENDING: 'warning', IN_PROGRESS: 'info', COMPLETED: 'success' };
        return <Tag value={row.status} severity={severityMap[row.status]} />;
    };

    return (
        <div className="w-full min-h-screen bg-gray-50 p-4">
            {/* Header / Toolbar */}
            <div className="surface-card p-4 border-round-xl shadow-1 mb-4 flex flex-wrap justify-content-between align-items-center gap-3 border-top-3 border-teal-500">
                <div className="flex align-items-center gap-3">
                    <i className="pi pi-chart-bar text-teal-600 text-4xl"></i>
                    <h1 className="text-2xl font-bold m-0 text-900">System Analytics</h1>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Dropdown
                        value={filterType}
                        options={['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'TILL_DATE'].map(v => ({ label: v, value: v }))}
                        onChange={(e) => {
                            setFilterType(e.value);
                            setSelectedDate(e.value === 'WEEKLY' ? getWeekRange(new Date()) : new Date());
                        }}
                        className="w-10rem teal-dropdown"
                    />

                    {filterType !== 'TILL_DATE' && (
                        <Calendar
                            value={selectedDate}
                            onChange={(e) => {
                                if (filterType === 'WEEKLY') {
                                    const val = Array.isArray(e.value) ? e.value[0] : e.value;
                                    if (val) setSelectedDate(getWeekRange(val));
                                } else {
                                    setSelectedDate(e.value);
                                }
                            }}
                            selectionMode={filterType === 'WEEKLY' ? 'range' : 'single'}
                            dateTemplate={dateTemplate}

                            // Dynamic View
                            view={filterType === 'MONTHLY' ? 'month' : filterType === 'YEARLY' ? 'year' : 'date'}
                            dateFormat={filterType === 'MONTHLY' ? 'mm/yy' : filterType === 'YEARLY' ? 'yy' : 'dd/mm/yy'}

                            // Force restriction for ALL views
                            maxDate={today}

                            // Prevents the picker from showing future navigation arrows
                            yearRange={`2000:${today.getFullYear()}`}

                            className="w-14rem"
                            showIcon
                            readOnlyInput
                        />
                    )}

                    <Dropdown value={selectedUser} options={users.map(u => ({ label: u.name, value: u.id }))}
                        onChange={(e) => setSelectedUser(e.value)} placeholder="All Personnel" showClear className="min-w-12rem teal-dropdown" />

                    <Button
                        label="Excel"
                        icon="pi pi-file-excel"
                        className="p-button-success"
                        onClick={exportToExcel}
                    />

                    <Button
                        label="PDF"
                        icon="pi pi-file-pdf"
                        className="p-button-danger"
                        onClick={exportToPDF}
                    />

                    <Button
                        icon="pi pi-refresh"
                        className="p-button-teal"
                        onClick={loadData}
                        loading={loading}
                    />
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid mb-4 flex justify-content-center">
                {[
                    { label: 'ACTIVITIES', val: stats.totalActivities, cls: 'border-teal-500', icon: 'pi-briefcase' },
                    { label: 'PENDING', val: stats.pendingTasks, cls: 'border-orange-500', icon: 'pi-clock' },
                    { label: 'IN PROGRESS', val: stats.inProgressTasks, cls: 'border-blue-500', icon: 'pi-sync' },
                    { label: 'COMPLETED', val: stats.completedTasks, cls: 'border-green-500', icon: 'pi-check-circle' },
                    { label: 'STAFF', val: users.length, cls: 'border-teal-500', icon: 'pi pi-user' }
                ].map((s, i) => (
                    /* Changed from col-10 sm:col-6 lg:col-2 to just "col" */
                    <div key={i} className="col">
                        <div className={`surface-card p-3 shadow-1 border-round-xl border-left-4 ${s.cls} h-full`}>
                            <div className="flex justify-content-between mb-2">
                                <span className="text-500 font-bold text-xs lg:text-sm">{s.label}</span>
                                <i className={`pi ${s.icon} text-teal-600`}></i>
                            </div>
                            <div className="text-900 font-bold text-2xl lg:text-3xl">{s.val || 0}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid mb-4">
                {[
                    {
                        title: 'Activity Trends',
                        icon: 'pi-chart-line',
                        data: stats.chartData,
                        type: 'line',
                        isTeal: false
                    },
                    {
                        title: 'Top 5 Most Used Tools',
                        icon: 'pi-search-plus',
                        data: stats.topFiveTools,
                        type: 'bar',
                        isTeal: true
                    },
                    {
                        title: 'Task Status',
                        icon: 'pi-percentage',
                        data: stats.statusData,
                        type: 'doughnut',
                        isTeal: false
                    }
                ].map((chart, idx) => (
                    <div key={idx} className="col-12 lg:col-4">
                        <div className={`surface-card p-4 border-round-xl shadow-1 h-25rem flex flex-column ${chart.isTeal ? 'bg-teal-50 border-1 border-teal-100' : ''}`}>
                            <span className={`font-bold mb-4 block text-sm uppercase ${chart.isTeal ? 'text-teal-900' : 'text-700'}`}>
                                {chart.title}
                            </span>

                            {loading ? (
                                /* Skeleton State */
                                <div className="flex-1 flex flex-column gap-3">
                                    <div className="w-full flex-1 bg-gray-200 border-round animate-pulse"></div>
                                    <div className="h-1rem w-8rem bg-gray-200 border-round animate-pulse align-self-center"></div>
                                </div>
                            ) : chart.data?.labels?.length > 0 || (chart.type === 'doughnut' && stats.totalActivities > 0) ? (
                                /* Data State */
                                <Chart
                                    type={chart.type}
                                    data={chart.data}
                                    options={chart.type === 'bar' ? {
                                        indexAxis: 'y',
                                        maintainAspectRatio: false,
                                        plugins: { legend: { display: false } },
                                        scales: {
                                            x: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } },
                                            y: { ticks: { font: { weight: 'bold' } } }
                                        }
                                    } : {
                                        maintainAspectRatio: false,
                                        cutout: chart.type === 'doughnut' ? '65%' : undefined,
                                        plugins: { legend: { position: 'bottom', display: chart.type === 'doughnut' } },
                                        scales: chart.type === 'line' ? { y: { beginAtZero: true, ticks: { stepSize: 1 } } } : {}
                                    }}
                                    style={{ height: '18rem' }}
                                />
                            ) : (
                                /* No Data State */
                                <div className={`flex-1 flex flex-column align-items-center justify-content-center ${chart.isTeal ? 'text-teal-400' : 'text-400'}`}>
                                    <i className={`pi ${chart.icon} mb-3`} style={{ fontSize: '2.5rem' }}></i>
                                    <p className="text-sm font-medium">No data available</p>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>


            {/* Table */}
            <div className="surface-card border-round-xl shadow-1 overflow-hidden">
                <DataTable value={stats.recentLogs} lazy rows={lazyParams.rows}
                    first={lazyParams.first} totalRecords={totalRecords}
                    onPage={(e) => setLazyParams(e)} loading={loading}
                    className="p-datatable-sm p-datatable-teal" responsiveLayout="stack">
                    <Column field="activityDate" header="DATE" body={r => new Date(r.activityDate).toLocaleDateString()} />
                    <Column field="user" header="STAFF" />
                    <Column field="detailOfCase" header="PARTICULARS" />
                    <Column field="status" header="STATUS" body={statusBodyTemplate} />
                </DataTable>
            </div>
        </div>
    );
};

export default Dashboard;