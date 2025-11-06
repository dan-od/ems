// ems-backend/utils/activityLogger.js
// Centralized activity logging utility for the EMS system

const pool = require('../config/db');

// ===================================================================
// ACTION TYPES - What happened in the system
// ===================================================================
const ACTION_TYPES = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  
  // Equipment
  EQUIPMENT_CREATED: 'equipment_created',
  EQUIPMENT_MODIFIED: 'equipment_modified',
  EQUIPMENT_ASSIGNED: 'equipment_assigned',
  EQUIPMENT_RETURNED: 'equipment_returned',
  
  // Field Reports
  REPORT_SUBMITTED: 'report_submitted',
  REPORT_APPROVED: 'report_approved',
  REPORT_REJECTED: 'report_rejected',
  
  // Requests
  REQUEST_CREATED: 'request_created',
  REQUEST_APPROVED: 'request_approved',
  REQUEST_REJECTED: 'request_rejected',
  REQUEST_TRANSFERRED: 'request_transferred',
  REQUEST_COMPLETED: 'request_completed',
  
  // Maintenance
  MAINTENANCE_LOGGED: 'maintenance_logged',
  
  // User Management
  USER_CREATED: 'user_created',
  USER_MODIFIED: 'user_modified',
  USER_DELETED: 'user_deleted',
  
  // Department Management
  DEPARTMENT_CREATED: 'department_created',
  DEPARTMENT_MODIFIED: 'department_modified'
};

// ===================================================================
// ENTITY TYPES - What kind of thing was affected
// ===================================================================
const ENTITY_TYPES = {
  EQUIPMENT: 'equipment',
  FIELD_REPORT: 'field_report',
  REQUEST: 'request',
  MAINTENANCE_LOG: 'maintenance_log',
  USER: 'user',
  DEPARTMENT: 'department'
};

// ===================================================================
// MAIN LOGGING FUNCTION
// ===================================================================
/**
 * Log an activity to the database
 * 
 * @param {Object} params - Activity parameters
 * @param {number} params.userId - ID of user performing action
 * @param {string} params.userName - Name of user performing action
 * @param {string} params.userRole - Role of user performing action
 * @param {number} params.departmentId - User's department ID
 * @param {string} params.departmentName - User's department name
 * @param {string} params.actionType - Type of action (from ACTION_TYPES)
 * @param {string} params.entityType - Type of entity affected (from ENTITY_TYPES)
 * @param {number} [params.entityId] - ID of affected entity
 * @param {string} [params.entityName] - Name/description of affected entity
 * @param {string} params.description - Human-readable description
 * @param {Object} [params.metadata] - Additional structured data
 * @param {string} [params.ipAddress] - User's IP address
 */
async function logActivity({
  userId,
  userName,
  userRole,
  departmentId,
  departmentName,
  actionType,
  entityType,
  entityId = null,
  entityName = null,
  description,
  metadata = {},
  ipAddress = null
}) {
  try {
    // Validate required fields
    if (!userId || !userName || !userRole || !actionType || !description) {
      console.error('❌ [ACTIVITY LOG] Missing required fields:', {
        userId, userName, userRole, actionType, description
      });
      return null;
    }

    // ✅ FIX: Check which columns exist in activity_logs table
    const columnCheckQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'activity_logs'
      AND column_name IN ('action_type', 'activity_type')
    `;
    
    const columnCheck = await pool.query(columnCheckQuery);
    const hasActionType = columnCheck.rows.some(r => r.column_name === 'action_type');
    const hasActivityType = columnCheck.rows.some(r => r.column_name === 'activity_type');
    
    // Determine which column name to use
    const actionColumnName = hasActivityType ? 'activity_type' : 'action_type';
    
    console.log(`📝 [ACTIVITY LOG] Using column: ${actionColumnName}`);

    // Insert the log
    const query = `
      INSERT INTO activity_logs (
        user_id,
        user_name,
        user_role,
        department_id,
        department_name,
        ${actionColumnName},
        entity_type,
        entity_id,
        entity_name,
        description,
        metadata,
        ip_address,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING id
    `;

    const values = [
      userId,
      userName,
      userRole,
      departmentId,
      departmentName,
      actionType,
      entityType,
      entityId,
      entityName,
      description,
      JSON.stringify(metadata),
      ipAddress
    ];

    const { rows } = await pool.query(query, values);
    
    console.log(`✅ [ACTIVITY LOG] #${rows[0].id} | ${userName} (${userRole}) | ${actionType} | ${description}`);
    
    return rows[0].id;

  } catch (err) {
    // Don't let logging failures break the main operation
    console.error('❌ [ACTIVITY LOG] Failed to log activity:', {
      error: err.message,
      code: err.code,
      detail: err.detail,
      userId,
      actionType,
      description
    });
    return null;
  }
}

// ===================================================================
// HELPER FUNCTIONS FOR COMMON SCENARIOS
// ===================================================================

/**
 * Extract user info from req.user (from JWT)
 */
function extractUserInfo(req) {
  return {
    userId: req.user.id,
    userName: req.user.name,
    userRole: req.user.role,
    departmentId: req.user.department_id,
    departmentName: req.user.department_name,
    ipAddress: req.ip || req.connection.remoteAddress
  };
}

/**
 * Log both sides of an approval/rejection (manager + requester)
 */
async function logBothSides({ managerInfo, requesterInfo, request, actionType, status, notes }) {
  // Log for manager
  await logActivity({
    ...managerInfo,
    actionType: actionType,
    entityType: ENTITY_TYPES.REQUEST,
    entityId: request.id,
    entityName: `${request.request_type} Request #${request.id}`,
    description: `${status === 'Approved' ? 'Approved' : 'Rejected'} ${request.request_type} request from ${requesterInfo.userName}`,
    metadata: {
      requester_id: requesterInfo.userId,
      requester_name: requesterInfo.userName,
      request_type: request.request_type,
      notes: notes || null
    }
  });

  // Log for requester
  await logActivity({
    ...requesterInfo,
    actionType: actionType,
    entityType: ENTITY_TYPES.REQUEST,
    entityId: request.id,
    entityName: `${request.request_type} Request #${request.id}`,
    description: `Your ${request.request_type} request was ${status.toLowerCase()} by ${managerInfo.userName}`,
    metadata: {
      approved_by: managerInfo.userId,
      approved_by_name: managerInfo.userName,
      approved_by_role: managerInfo.userRole,
      notes: notes || null
    }
  });
}

// ===================================================================
// DATABASE SCHEMA (for reference)
// ===================================================================
/*
OPTION 1: If your table has 'activity_type':
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  department_id INTEGER,
  department_name VARCHAR(255),
  activity_type VARCHAR(100) NOT NULL,  -- ✅ YOUR COLUMN NAME
  entity_type VARCHAR(100),
  entity_id INTEGER,
  entity_name VARCHAR(500),
  description TEXT NOT NULL,
  metadata JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

OPTION 2: If your table has 'action_type':
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_role VARCHAR(50) NOT NULL,
  department_id INTEGER,
  department_name VARCHAR(255),
  action_type VARCHAR(100) NOT NULL,   -- ✅ ALTERNATIVE NAME
  entity_type VARCHAR(100),
  entity_id INTEGER,
  entity_name VARCHAR(500),
  description TEXT NOT NULL,
  metadata JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_department_id ON activity_logs(department_id);
CREATE INDEX idx_activity_logs_action_type ON activity_logs(activity_type);  -- OR action_type
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
*/

module.exports = {
  logActivity,
  extractUserInfo,
  logBothSides,
  ACTION_TYPES,
  ENTITY_TYPES
};