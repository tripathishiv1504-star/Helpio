import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Input,
  Select,
  Textarea,
  Badge,
  StatusBadge,
  Modal,
  Spinner,
  PageHeader,
  EmptyState,
} from '../../components/ui/index.js';
import { useToast } from '../../components/ui/Toast.jsx';
import api from '../../lib/api.js';
import {
  REQUEST_STATUS,
  VERIFICATION_STATUS,
  REPORT_STATUS,
  CATEGORY_TYPE,
} from '@shared/constants.js';

export function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview'); // overview | helpers | users | categories | requests | payments | disputes | settings

  // Global loading
  const [loading, setLoading] = useState(true);

  // Data states
  const [stats, setStats] = useState(null);
  const [helpers, setHelpers] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [requests, setRequests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reports, setReports] = useState([]);
  const [commissionPercent, setCommissionPercent] = useState(10);
  const [savingSettings, setSavingSettings] = useState(false);

  // Filters
  const [helperFilter, setHelperFilter] = useState('pending'); // pending | approved | rejected | all
  const [userSearch, setUserSearch] = useState('');
  const [requestStatusFilter, setRequestStatusFilter] = useState('');

  // Modals
  const [verifyModalHelper, setVerifyModalHelper] = useState(null);
  const [verifyAction, setVerifyAction] = useState('approved');
  const [verifyNote, setVerifyNote] = useState('');
  const [submittingVerify, setSubmittingVerify] = useState(false);

  const [resolveModalReport, setResolveModalReport] = useState(null);
  const [resolveTargetStatus, setResolveTargetStatus] = useState('paid');
  const [resolveResolution, setResolveResolution] = useState('');
  const [submittingResolve, setSubmittingResolve] = useState(false);

  const [categoryModal, setCategoryModal] = useState(null); // null | 'new' | category obj
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState('professional');
  const [catSubs, setCatSubs] = useState('');
  const [catActive, setCatActive] = useState(true);
  const [submittingCat, setSubmittingCat] = useState(false);

  // Fetch Overview Stats & Settings
  const fetchOverview = useCallback(async () => {
    try {
      const [statsData, settingsData] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/settings'),
      ]);
      setStats(statsData);
      setCommissionPercent(settingsData.commissionPercent);
    } catch (err) {
      toast.error('Failed to load stats: ' + err.message);
    }
  }, []);

  // Fetch Helpers
  const fetchHelpers = useCallback(async () => {
    try {
      const query = helperFilter === 'all' ? '' : `?verificationStatus=${helperFilter}`;
      const data = await api.get(`/admin/helpers${query}`);
      setHelpers(data.helpers || []);
    } catch (err) {
      toast.error('Failed to load helpers: ' + err.message);
    }
  }, [helperFilter]);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      const query = userSearch ? `?search=${encodeURIComponent(userSearch)}` : '';
      const data = await api.get(`/admin/users${query}`);
      setUsers(data.users || []);
    } catch (err) {
      toast.error('Failed to load users: ' + err.message);
    }
  }, [userSearch]);

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.get('/admin/categories');
      setCategories(data.categories || []);
    } catch (err) {
      toast.error('Failed to load categories: ' + err.message);
    }
  }, []);

  // Fetch Requests
  const fetchRequests = useCallback(async () => {
    try {
      const query = requestStatusFilter ? `?status=${requestStatusFilter}` : '';
      const data = await api.get(`/admin/requests${query}`);
      setRequests(data.requests || []);
    } catch (err) {
      toast.error('Failed to load requests: ' + err.message);
    }
  }, [requestStatusFilter]);

  // Fetch Payments
  const fetchPayments = useCallback(async () => {
    try {
      const data = await api.get('/admin/payments');
      setPayments(data.payments || []);
    } catch (err) {
      toast.error('Failed to load payments: ' + err.message);
    }
  }, []);

  // Fetch Reports/Disputes
  const fetchReports = useCallback(async () => {
    try {
      const data = await api.get('/admin/reports');
      setReports(data.reports || []);
    } catch (err) {
      toast.error('Failed to load reports: ' + err.message);
    }
  }, []);

  // Tab switch loader
  useEffect(() => {
    const loadTab = async () => {
      setLoading(true);
      if (activeTab === 'overview') await fetchOverview();
      if (activeTab === 'helpers') await fetchHelpers();
      if (activeTab === 'users') await fetchUsers();
      if (activeTab === 'categories') await fetchCategories();
      if (activeTab === 'requests') await fetchRequests();
      if (activeTab === 'payments') await fetchPayments();
      if (activeTab === 'disputes') await fetchReports();
      if (activeTab === 'settings') await fetchOverview();
      setLoading(false);
    };
    loadTab();
  }, [activeTab, fetchOverview, fetchHelpers, fetchUsers, fetchCategories, fetchRequests, fetchPayments, fetchReports]);

  // Helper Verification handler
  const handleVerifyHelper = async (e) => {
    if (e) e.preventDefault();
    if (!verifyModalHelper) return;

    setSubmittingVerify(true);
    try {
      await api.patch(`/admin/helpers/${verifyModalHelper._id}/verify`, {
        verificationStatus: verifyAction,
        note: verifyNote.trim(),
      });
      toast.success(`Helper ${verifyAction === 'approved' ? 'approved' : 'rejected'} successfully.`);
      setVerifyModalHelper(null);
      fetchHelpers();
      fetchOverview();
    } catch (err) {
      toast.error(err.message || 'Verification update failed');
    } finally {
      setSubmittingVerify(false);
    }
  };

  // User status toggle
  const handleToggleUserStatus = async (user) => {
    const newStatus = user.status === 'suspended' ? 'active' : 'suspended';
    try {
      await api.patch(`/admin/users/${user._id}/status`, { status: newStatus });
      toast.success(`User ${newStatus === 'active' ? 'reactivated' : 'suspended'}.`);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || 'Failed to update user status');
    }
  };

  // Commission save handler
  const handleSaveSettings = async (e) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    try {
      const data = await api.patch('/admin/settings', {
        commissionPercent: Number(commissionPercent),
      });
      setCommissionPercent(data.commissionPercent);
      toast.success(`Commission updated to ${data.commissionPercent}%`);
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Report resolution handler
  const handleResolveReport = async (e) => {
    if (e) e.preventDefault();
    if (!resolveModalReport) return;

    setSubmittingResolve(true);
    try {
      await api.post(`/admin/reports/${resolveModalReport._id}/resolve`, {
        targetStatus: resolveTargetStatus,
        resolution: resolveResolution.trim(),
      });
      toast.success(`Report resolved into ${resolveTargetStatus.toUpperCase()}!`);
      setResolveModalReport(null);
      fetchReports();
      fetchOverview();
    } catch (err) {
      toast.error(err.message || 'Failed to resolve report');
    } finally {
      setSubmittingResolve(false);
    }
  };

  // Category save handler
  const handleSaveCategory = async (e) => {
    if (e) e.preventDefault();
    const subArray = catSubs.split(',').map((s) => s.trim()).filter(Boolean);
    if (!catName.trim() || subArray.length === 0) {
      toast.error('Please specify category name and at least one subcategory.');
      return;
    }

    setSubmittingCat(true);
    try {
      if (categoryModal === 'new') {
        await api.post('/admin/categories', {
          name: catName.trim(),
          type: catType,
          subcategories: subArray,
          active: catActive,
        });
        toast.success('Category created successfully!');
      } else {
        await api.patch(`/admin/categories/${categoryModal._id}`, {
          name: catName.trim(),
          type: catType,
          subcategories: subArray,
          active: catActive,
        });
        toast.success('Category updated successfully!');
      }
      setCategoryModal(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.message || 'Failed to save category');
    } finally {
      setSubmittingCat(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <PageHeader
        title="Helpio Administration Portal"
        subtitle="Full platform control over users, helpers, requests, payments, disputes, and commission."
      />

      {/* Admin Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar gap-2 sm:gap-4">
        {[
          { id: 'overview', label: '📊 Overview' },
          { id: 'helpers', label: '🛡️ Helper Verification' },
          { id: 'users', label: '👥 Users' },
          { id: 'categories', label: '🏷️ Categories' },
          { id: 'requests', label: '📋 Requests' },
          { id: 'payments', label: '💳 Payments' },
          { id: 'disputes', label: '⚠️ Disputes' },
          { id: 'settings', label: '⚙️ Settings' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-2 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card className="p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Total Users</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.counts?.users || 0}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Total Helpers</p>
                  <p className="text-2xl font-bold text-teal-700 mt-1">{stats.counts?.helpers || 0}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Pending Helpers</p>
                  <p className="text-2xl font-bold text-amber-600 mt-1">{stats.counts?.pendingHelpers || 0}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">All Requests</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stats.counts?.requests || 0}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Paid Volume</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">₹{stats.paidVolume || 0}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase font-semibold">Commission</p>
                  <p className="text-2xl font-bold text-teal-800 mt-1">₹{stats.commissionEarned || 0}</p>
                </Card>
              </div>

              {/* Requests breakdown */}
              <Card>
                <h3 className="font-bold text-sm text-slate-900 uppercase tracking-wider mb-4">
                  Requests by Status
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  {Object.entries(stats.requestsByStatus || {}).map(([st, cnt]) => (
                    <div key={st} className="bg-slate-50 p-3 rounded-lg border border-slate-200/80 text-center">
                      <StatusBadge status={st} />
                      <p className="text-xl font-bold text-slate-800 mt-2">{cnt}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* TAB 2: HELPERS */}
          {activeTab === 'helpers' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  {['pending', 'approved', 'rejected', 'all'].map((f) => (
                    <Button
                      key={f}
                      size="sm"
                      variant={helperFilter === f ? 'primary' : 'outline'}
                      onClick={() => setHelperFilter(f)}
                      className="capitalize"
                    >
                      {f}
                    </Button>
                  ))}
                </div>
                <span className="text-xs text-slate-500">
                  {helpers.length} helper profile{helpers.length === 1 ? '' : 's'}
                </span>
              </div>

              {helpers.length === 0 ? (
                <EmptyState icon="🛡️" title="No helpers in this category" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {helpers.map((h) => (
                    <Card key={h._id} className="flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-900">{h.user?.name || 'Helper'}</h4>
                          <Badge
                            variant={
                              h.verificationStatus === 'approved'
                                ? 'success'
                                : h.verificationStatus === 'rejected'
                                ? 'danger'
                                : 'warning'
                            }
                            size="sm"
                          >
                            {h.verificationStatus}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">{h.user?.email} · {h.user?.phone}</p>
                        {h.bio && <p className="text-xs text-slate-600 line-clamp-2 italic">"{h.bio}"</p>}

                        <div className="bg-slate-50 p-2.5 rounded text-xs space-y-1">
                          <p><strong>Radius:</strong> {h.radiusKm || 10} km</p>
                          <p><strong>Skills:</strong> {h.skills?.map((s) => s.subcategory).join(', ') || 'None'}</p>
                          {h.verificationNote && (
                            <p className="text-amber-800"><strong>Admin Note:</strong> {h.verificationNote}</p>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                          onClick={() => {
                            setVerifyModalHelper(h);
                            setVerifyAction('approved');
                            setVerifyNote(h.verificationNote || '');
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-red-700 border-red-300 hover:bg-red-50"
                          onClick={() => {
                            setVerifyModalHelper(h);
                            setVerifyAction('rejected');
                            setVerifyNote(h.verificationNote || '');
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: USERS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex gap-3 max-w-md">
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <Button size="sm" variant="secondary" onClick={fetchUsers}>
                  Search
                </Button>
              </div>

              <Card className="p-0 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Name</th>
                      <th className="px-5 py-3">Email & Phone</th>
                      <th className="px-5 py-3">Roles</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3.5 font-bold text-slate-900">{u.name}</td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">{u.email}<br />{u.phone}</td>
                        <td className="px-5 py-3.5">
                          {u.roles?.map((r) => (
                            <span key={r} className="text-xs bg-slate-100 px-2 py-0.5 rounded mr-1 capitalize">
                              {r}
                            </span>
                          ))}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={u.status === 'suspended' ? 'danger' : 'success'} size="sm">
                            {u.status || 'active'}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Button
                            variant={u.status === 'suspended' ? 'primary' : 'outline'}
                            size="sm"
                            onClick={() => handleToggleUserStatus(u)}
                          >
                            {u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* TAB 4: CATEGORIES */}
          {activeTab === 'categories' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">{categories.length} categories configured</span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setCategoryModal('new');
                    setCatName('');
                    setCatType('professional');
                    setCatSubs('');
                    setCatActive(true);
                  }}
                >
                  + Add Category
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map((c) => (
                  <Card key={c._id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900">{c.name}</h4>
                      <Badge variant={c.active ? 'success' : 'default'} size="sm">
                        {c.active ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold text-teal-800 uppercase tracking-wider">{c.type}</p>
                    <div className="flex flex-wrap gap-1">
                      {c.subcategories?.map((s) => (
                        <span key={s} className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-slate-100">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setCategoryModal(c);
                          setCatName(c.name);
                          setCatType(c.type);
                          setCatSubs(c.subcategories?.join(', ') || '');
                          setCatActive(c.active);
                        }}
                      >
                        Edit Category
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: REQUESTS */}
          {activeTab === 'requests' && (
            <div className="space-y-4">
              <div className="flex gap-2 items-center">
                <span className="text-xs text-slate-500">Filter status:</span>
                <Select
                  value={requestStatusFilter}
                  onChange={(e) => setRequestStatusFilter(e.target.value)}
                  options={[
                    { value: '', label: 'All Statuses' },
                    ...Object.values(REQUEST_STATUS).map((st) => ({ value: st, label: st.toUpperCase() })),
                  ]}
                />
              </div>

              <Card className="p-0 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">ID / Date</th>
                      <th className="px-4 py-3">Service</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Helper</th>
                      <th className="px-4 py-3">Pricing</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {requests.map((r) => (
                      <tr key={r._id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-mono text-slate-500">
                          {r._id.slice(-6)}<br />
                          {new Date(r.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900 capitalize">{r.subcategory}</td>
                        <td className="px-4 py-3">{r.user?.name || 'N/A'}</td>
                        <td className="px-4 py-3">{r.helper?.name || 'None'}</td>
                        <td className="px-4 py-3 font-medium">
                          {r.finalAmount ? `₹${r.finalAmount}` : r.budget ? `₹${r.budget}` : 'Free'}
                        </td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* TAB 6: PAYMENTS */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <Card className="p-0 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Request</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                      <th className="px-5 py-3 text-right">Platform Fee (10%)</th>
                      <th className="px-5 py-3 text-right">Helper Payout</th>
                      <th className="px-5 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {payments.map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3.5 text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td className="px-5 py-3.5 font-bold text-slate-900 capitalize">{p.request?.subcategory || 'Service'}</td>
                        <td className="px-5 py-3.5 text-right font-bold text-slate-900">₹{p.amount}</td>
                        <td className="px-5 py-3.5 text-right text-teal-800 font-semibold">₹{p.platformFee}</td>
                        <td className="px-5 py-3.5 text-right text-slate-700">₹{p.helperPayout}</td>
                        <td className="px-5 py-3.5 text-center"><Badge variant="success" size="sm">{p.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}

          {/* TAB 7: DISPUTES / REPORTS */}
          {activeTab === 'disputes' && (
            <div className="space-y-4">
              {reports.length === 0 ? (
                <EmptyState icon="🕊️" title="No disputes filed" description="Everything is running smoothly." />
              ) : (
                <div className="space-y-3">
                  {reports.map((rep) => (
                    <Card key={rep._id} className="space-y-3 border-amber-200">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">⚠️</span>
                          <div>
                            <h4 className="font-bold text-sm text-slate-900">
                              Dispute on Request #{rep.request?._id?.slice(-6) || rep.request} ({rep.request?.subcategory})
                            </h4>
                            <p className="text-xs text-slate-500">
                              Filed by: <strong>{rep.filedBy?.name}</strong> against <strong>{rep.against?.name}</strong>
                            </p>
                          </div>
                        </div>
                        <Badge variant={rep.status === 'resolved' ? 'success' : 'danger'} size="sm">
                          {rep.status}
                        </Badge>
                      </div>

                      <div className="bg-slate-50 p-3 rounded text-xs space-y-1">
                        <p className="font-semibold text-slate-700">Reason / Complaint:</p>
                        <p className="text-slate-800 italic">"{rep.reason}"</p>
                        {rep.resolution && (
                          <div className="pt-2 mt-1 border-t border-slate-200 text-teal-900">
                            <strong>Admin Resolution:</strong> {rep.resolution}
                          </div>
                        )}
                      </div>

                      {rep.status === 'open' && (
                        <div className="pt-2 flex justify-end">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setResolveModalReport(rep);
                              setResolveTargetStatus('paid');
                              setResolveResolution('');
                            }}
                          >
                            Resolve Dispute →
                          </Button>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 8: SETTINGS */}
          {activeTab === 'settings' && (
            <Card className="max-w-md space-y-4">
              <h3 className="font-bold text-slate-900 text-base">Platform Settings</h3>
              <p className="text-xs text-slate-500">
                Configure global platform revenue share applied to all paid service completions.
              </p>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Platform Commission Percentage: {commissionPercent}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="1"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(Number(e.target.value))}
                    className="w-full accent-teal-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                    <span>0% (Free platform)</span>
                    <span>10% (Default)</span>
                    <span>50%</span>
                  </div>
                </div>

                <Button type="submit" variant="primary" loading={savingSettings} className="w-full">
                  Save Commission Settings
                </Button>
              </form>
            </Card>
          )}
        </>
      )}

      {/* Verify Helper Modal */}
      {verifyModalHelper && (
        <Modal
          isOpen={true}
          onClose={() => setVerifyModalHelper(null)}
          title={`Review Helper: ${verifyModalHelper.user?.name}`}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setVerifyModalHelper(null)} disabled={submittingVerify}>
                Cancel
              </Button>
              <Button
                variant={verifyAction === 'approved' ? 'primary' : 'danger'}
                size="sm"
                loading={submittingVerify}
                onClick={handleVerifyHelper}
              >
                Confirm {verifyAction === 'approved' ? 'Approval' : 'Rejection'}
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Decision</label>
              <Select
                value={verifyAction}
                onChange={(e) => setVerifyAction(e.target.value)}
                options={[
                  { value: 'approved', label: 'Approve (Helper can go online)' },
                  { value: 'rejected', label: 'Reject (Helper remains locked offline)' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Admin Note (Shown to helper)
              </label>
              <Textarea
                rows={3}
                placeholder="Optional verification note or reason..."
                value={verifyNote}
                onChange={(e) => setVerifyNote(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Resolve Dispute Modal */}
      {resolveModalReport && (
        <Modal
          isOpen={true}
          onClose={() => setResolveModalReport(null)}
          title="Resolve Service Dispute"
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setResolveModalReport(null)} disabled={submittingResolve}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={submittingResolve} onClick={handleResolveReport}>
                Submit Resolution
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Target Status for Request
              </label>
              <Select
                value={resolveTargetStatus}
                onChange={(e) => setResolveTargetStatus(e.target.value)}
                options={[
                  { value: 'paid', label: 'PAID (Disburse payment to helper)' },
                  { value: 'rated', label: 'RATED (Mark completed and rateable)' },
                  { value: 'cancelled', label: 'CANCELLED (Cancel request / refund)' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Resolution Note <span className="text-red-500">*</span>
              </label>
              <Textarea
                rows={3}
                required
                placeholder="Explain the admin decision and resolution terms..."
                value={resolveResolution}
                onChange={(e) => setResolveResolution(e.target.value)}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Category Modal */}
      {categoryModal && (
        <Modal
          isOpen={true}
          onClose={() => setCategoryModal(null)}
          title={categoryModal === 'new' ? 'Create New Category' : `Edit Category: ${catName}`}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setCategoryModal(null)} disabled={submittingCat}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" loading={submittingCat} onClick={handleSaveCategory}>
                Save Category
              </Button>
            </>
          }
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Name</label>
              <Input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g. Electrician" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Area / Type</label>
              <Select
                value={catType}
                onChange={(e) => setCatType(e.target.value)}
                options={[
                  { value: 'community', label: 'Community Help (Free)' },
                  { value: 'professional', label: 'Professional Help (Fixed)' },
                  { value: 'instant', label: 'Instant Local Workforce (Hourly/Fixed)' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Subcategories (comma separated)
              </label>
              <Input
                value={catSubs}
                onChange={(e) => setCatSubs(e.target.value)}
                placeholder="e.g. wiring, fan repair, appliance"
              />
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="catActiveCheck"
                checked={catActive}
                onChange={(e) => setCatActive(e.target.checked)}
                className="rounded accent-teal-600"
              />
              <label htmlFor="catActiveCheck" className="text-xs text-slate-700 font-medium">
                Active and visible to customers
              </label>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default AdminDashboard;
