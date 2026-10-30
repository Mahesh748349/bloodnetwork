import React, { useState, useEffect } from 'react';
import { inventoryService } from '../services/inventoryService';
import { useAuth } from '../context/AuthContext';
import {
  Package,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Droplet,
  Building2,
  Calendar,
  X,
} from 'lucide-react';
import { BloodGroupBadge } from '../components/BloodGroupBadge';

const COMPONENT_TYPES = [
  { value: 'whole_blood', label: 'Whole Blood' },
  { value: 'red_blood_cells', label: 'Packed Red Cells (PRBC)' },
  { value: 'platelets', label: 'Platelets (Apheresis/RDP)' },
  { value: 'plasma', label: 'Fresh Frozen Plasma (FFP)' },
  { value: 'cryoprecipitate', label: 'Cryoprecipitate' },
];

export const InventoryPage = () => {
  const { user } = useAuth();
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState({});
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterGroup, setFilterGroup] = useState('');
  const [filterComponent, setFilterComponent] = useState('');

  const [formData, setFormData] = useState({
    bloodGroup: 'O+',
    componentType: 'whole_blood',
    unitsAvailable: 5,
    storageLocation: 'Blood Bank Refrigerator A1',
    batchId: '',
    notes: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterGroup) params.bloodGroup = filterGroup;
      if (filterComponent) params.componentType = filterComponent;

      const [invRes, alertRes] = await Promise.all([
        inventoryService.getInventory(params),
        inventoryService.getLowStock(),
      ]);

      if (invRes.success) {
        setInventory(invRes.inventory || []);
        setSummary(invRes.summary || {});
      }
      if (alertRes.success) {
        setLowStockAlerts(alertRes.alerts || []);
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterGroup, filterComponent]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await inventoryService.addInventory(formData);
      if (res.success) {
        setShowAddModal(false);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message);
    }
  };

  const totalBankedUnits = Object.values(summary).reduce(
    (sum, item) => sum + (item.totalUnits || 0),
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Package className="w-3.5 h-3.5" /> Blood Bank Storage
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Hospital Blood Inventory Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Live component-level inventory tracking with expiry monitoring and critical low-stock alerts.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 flex items-center gap-2 transition shrink-0"
        >
          <Plus className="w-4 h-4" /> Add Inventory Unit
        </button>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/90 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900">
              Low Stock Alert ({lowStockAlerts.length} blood groups critically low)
            </h4>
            <div className="flex flex-wrap gap-2 mt-2">
              {lowStockAlerts.map((a) => (
                <span
                  key={a.bloodGroup}
                  className="px-2.5 py-1 bg-white border border-amber-200 rounded-lg text-xs font-bold text-amber-900"
                >
                  {a.bloodGroup}: {a.unitsAvailable} units remaining
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Total Banked Units
          </span>
          <div className="text-3xl font-black text-slate-900 mt-1">{totalBankedUnits}</div>
          <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> Active & Verified Units
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Total Batches Stored
          </span>
          <div className="text-3xl font-black text-slate-900 mt-1">{inventory.length}</div>
          <div className="text-xs text-slate-500 mt-1">Across all refrigeration units</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Critically Low Groups
          </span>
          <div className="text-3xl font-black text-amber-600 mt-1">{lowStockAlerts.length}</div>
          <div className="text-xs text-slate-500 mt-1">&lt; 5 units threshold</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Universal O- Reserve
          </span>
          <div className="text-3xl font-black text-rose-600 mt-1">
            {summary['O-']?.totalUnits || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Units available for emergency trauma</div>
        </div>
      </div>

      {/* Stock Per Blood Group Grid */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Droplet className="w-4 h-4 text-rose-600" />
          Component Stock Level per Blood Group
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => {
            const count = summary[bg]?.totalUnits || 0;
            const isLow = count < 5;
            return (
              <div
                key={bg}
                className={`p-3.5 rounded-xl border text-center transition ${
                  isLow
                    ? 'border-red-200 bg-red-50/50'
                    : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100/60'
                }`}
              >
                <BloodGroupBadge bloodGroup={bg} size="sm" />
                <div className="mt-2 text-xl font-black text-slate-900">{count}</div>
                <div className="text-[10px] text-slate-500 font-medium">Available Units</div>
                {isLow && (
                  <span className="mt-1 inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-100 text-red-700">
                    Low Stock
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Inventory Item Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h3 className="text-sm font-bold text-slate-900">Registered Blood Unit Batches</h3>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
            >
              <option value="">All Blood Groups</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>

            <select
              value={filterComponent}
              onChange={(e) => setFilterComponent(e.target.value)}
              className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-white"
            >
              <option value="">All Components</option>
              {COMPONENT_TYPES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading blood inventory...</div>
        ) : inventory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No blood inventory units recorded for the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Batch ID</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Component</th>
                  <th className="py-3 px-4">Units</th>
                  <th className="py-3 px-4">Storage Location</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                      {item.batchId || 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      <BloodGroupBadge bloodGroup={item.bloodGroup} size="xs" />
                    </td>
                    <td className="py-3.5 px-4 capitalize">
                      {item.componentType.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{item.unitsAvailable}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.storageLocation}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(item.expiryDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Inventory Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">Add Blood Inventory Unit</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Blood Group*</label>
                <select
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Component Type*</label>
                <select
                  value={formData.componentType}
                  onChange={(e) => setFormData({ ...formData, componentType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                >
                  {COMPONENT_TYPES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Units Available*</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.unitsAvailable}
                  onChange={(e) =>
                    setFormData({ ...formData, unitsAvailable: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Storage Location</label>
                <input
                  type="text"
                  value={formData.storageLocation}
                  onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  placeholder="e.g. Fridge Unit 2, Rack B"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 text-white font-bold rounded-xl shadow-md hover:bg-rose-700"
                >
                  Save Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

