const BloodInventory = require('../models/BloodInventory');
const { logAction } = require('../services/auditService');

/**
 * @route   POST /api/inventory
 * @desc    Add or register new blood unit inventory
 * @access  Private (Hospital Staff, Hospital Admin, Platform Admin)
 */
const addInventory = async (req, res, next) => {
  try {
    const {
      bloodGroup,
      componentType = 'whole_blood',
      unitsAvailable = 1,
      collectedDate,
      expiryDate,
      batchId,
      storageLocation,
      notes,
      organizationId,
    } = req.body;

    const targetOrgId =
      req.user.role === 'admin' || req.user.role === 'platform_admin'
        ? organizationId || req.user.organizationId
        : req.user.organizationId;

    if (!targetOrgId) {
      return res.status(400).json({
        success: false,
        message: 'Organization ID is required for inventory management.',
      });
    }

    if (!bloodGroup || !unitsAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Blood group and units available are required.',
      });
    }

    // Default expiry dates if not provided:
    // RBC: 42 days, Platelets: 5 days, Plasma: 365 days, Whole blood: 35 days
    let computedExpiry = expiryDate;
    if (!computedExpiry) {
      const now = collectedDate ? new Date(collectedDate) : new Date();
      let days = 35;
      if (componentType === 'platelets') days = 5;
      else if (componentType === 'red_blood_cells') days = 42;
      else if (componentType === 'plasma') days = 365;
      else if (componentType === 'cryoprecipitate') days = 365;

      computedExpiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    }

    const inventoryEntry = await BloodInventory.create({
      organizationId: targetOrgId,
      bloodGroup,
      componentType,
      unitsAvailable: Number(unitsAvailable),
      collectedDate: collectedDate || new Date(),
      expiryDate: computedExpiry,
      batchId: batchId || `BAT-${Date.now().toString(36).toUpperCase()}`,
      storageLocation: storageLocation || 'Main Blood Bank Fridge',
      notes: notes || '',
      addedBy: req.user.id,
      status: 'available',
    });

    await logAction({
      actorId: req.user.id,
      action: 'ADD_INVENTORY',
      recordModel: 'Organization',
      recordId: targetOrgId,
      details: {
        bloodGroup,
        componentType,
        units: unitsAvailable,
        inventoryId: inventoryEntry._id,
      },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Blood inventory entry added successfully',
      inventory: inventoryEntry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/inventory
 * @desc    Get organization inventory grouped by blood group
 * @access  Private (Staff, Admin)
 */
const getOrganizationInventory = async (req, res, next) => {
  try {
    const orgId =
      req.query.organizationId &&
      (req.user.role === 'admin' || req.user.role === 'platform_admin')
        ? req.query.organizationId
        : req.user.organizationId;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: 'User is not linked to any organization and no organizationId was specified.',
      });
    }

    // Auto-update expired items
    const now = new Date();
    await BloodInventory.updateMany(
      {
        organizationId: orgId,
        status: 'available',
        expiryDate: { $lt: now },
      },
      { status: 'expired' }
    );

    const filter = { organizationId: orgId };
    if (req.query.bloodGroup) filter.bloodGroup = req.query.bloodGroup;
    if (req.query.componentType) filter.componentType = req.query.componentType;
    if (req.query.status) filter.status = req.query.status;
    else filter.status = 'available';

    const items = await BloodInventory.find(filter)
      .populate('addedBy', 'name role')
      .sort({ expiryDate: 1 });

    // Aggregate summary per blood group
    const summary = {};
    const ALL_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    ALL_GROUPS.forEach((bg) => {
      summary[bg] = { totalUnits: 0, components: {} };
    });

    items.forEach((item) => {
      if (item.status === 'available') {
        if (!summary[item.bloodGroup]) {
          summary[item.bloodGroup] = { totalUnits: 0, components: {} };
        }
        summary[item.bloodGroup].totalUnits += item.unitsAvailable;
        summary[item.bloodGroup].components[item.componentType] =
          (summary[item.bloodGroup].components[item.componentType] || 0) + item.unitsAvailable;
      }
    });

    return res.status(200).json({
      success: true,
      count: items.length,
      summary,
      inventory: items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/inventory/:id
 * @desc    Update units or status of an inventory entry
 * @access  Private (Hospital Admin, Admin)
 */
const updateInventoryEntry = async (req, res, next) => {
  try {
    const { unitsAvailable, status, notes } = req.body;
    const entry = await BloodInventory.findById(req.params.id);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Inventory entry not found',
      });
    }

    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'platform_admin' &&
      entry.organizationId.toString() !== req.user.organizationId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot modify inventory of another hospital.',
      });
    }

    if (unitsAvailable !== undefined) entry.unitsAvailable = Math.max(0, Number(unitsAvailable));
    if (status) entry.status = status;
    if (notes !== undefined) entry.notes = notes;

    await entry.save();

    return res.status(200).json({
      success: true,
      message: 'Inventory updated successfully',
      inventory: entry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/inventory/low-stock
 * @desc    Get low stock warnings for current hospital
 * @access  Private (Staff, Admin)
 */
const getLowStockAlerts = async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const threshold = Number(req.query.threshold) || 5;

    if (!orgId) {
      return res.status(400).json({
        success: false,
        message: 'User is not linked to an organization.',
      });
    }

    const inventory = await BloodInventory.find({
      organizationId: orgId,
      status: 'available',
    });

    const stockPerGroup = {};
    const ALL_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    ALL_GROUPS.forEach((bg) => {
      stockPerGroup[bg] = 0;
    });

    inventory.forEach((item) => {
      stockPerGroup[item.bloodGroup] = (stockPerGroup[item.bloodGroup] || 0) + item.unitsAvailable;
    });

    const alerts = [];
    Object.entries(stockPerGroup).forEach(([bg, count]) => {
      if (count < threshold) {
        alerts.push({
          bloodGroup: bg,
          unitsAvailable: count,
          threshold,
          severity: count === 0 ? 'critical' : 'warning',
        });
      }
    });

    return res.status(200).json({
      success: true,
      alerts,
      stockPerGroup,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/inventory/check-request
 * @desc    Check if local hospital inventory can fulfill a request before broadcast
 * @access  Private (Staff, Admin)
 */
const checkInventoryForRequest = async (req, res, next) => {
  try {
    const { bloodGroup, unitsRequested, componentType = 'whole_blood' } = req.body;
    const orgId = req.user.organizationId;

    if (!orgId) {
      return res.status(200).json({
        success: true,
        canServeFromStock: false,
        availableUnits: 0,
        message: 'No organization linked',
      });
    }

    const availableEntries = await BloodInventory.find({
      organizationId: orgId,
      bloodGroup,
      componentType,
      status: 'available',
      expiryDate: { $gt: new Date() },
    });

    const totalAvailable = availableEntries.reduce((sum, item) => sum + item.unitsAvailable, 0);
    const canServe = totalAvailable >= Number(unitsRequested);

    return res.status(200).json({
      success: true,
      canServeFromStock: canServe,
      availableUnits: totalAvailable,
      unitsRequested: Number(unitsRequested),
      shortfall: Math.max(0, Number(unitsRequested) - totalAvailable),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/inventory/network-summary
 * @desc    Platform-wide aggregate inventory across all hospitals
 * @access  Private (Platform Admin)
 */
const getNetworkInventorySummary = async (req, res, next) => {
  try {
    const activeUnits = await BloodInventory.aggregate([
      {
        $match: {
          status: 'available',
          expiryDate: { $gt: new Date() },
        },
      },
      {
        $group: {
          _id: { bloodGroup: '$bloodGroup', componentType: '$componentType' },
          totalUnits: { $sum: '$unitsAvailable' },
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      networkInventory: activeUnits,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addInventory,
  getOrganizationInventory,
  updateInventoryEntry,
  getLowStockAlerts,
  checkInventoryForRequest,
  getNetworkInventorySummary,
};

