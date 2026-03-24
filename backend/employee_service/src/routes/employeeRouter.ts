import { Router } from 'express';
import {
  addEmployee,
  deleteEmployee,
  getAllEmployees,
  getEmployeeById,
  getEmployeeIdProof,
  updateEmployee,
  getHRStats,
  getPublicEmployeeProfile,
  getAllBranches,
} from '../controllers/employeeController';
import { authMiddleware } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { uploadEmployeeFiles } from '../middleware/uploadEmployeeFiles';

/**
 * This file handles all administrative tasks related to staff members:
 * hiring new people, updating profiles, and viewing company statistics.
 */
const employeeRouter = Router();

// Everyone must be logged in to access these office records.
employeeRouter.use(authMiddleware);

// --- 1. Hiring and Management ---

/**
 * Hiring: Add a brand new staff member to our systems.
 * This also handles saving their profile picture and a scan of their ID card.
 */
employeeRouter.post(
  '/create',
  requireRole('ADMIN', 'HR'),
  uploadEmployeeFiles.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'id_proof', maxCount: 1 },
  ]),
  addEmployee,
);

/**
 * See a scan of a staff member's ID card (like a Passport or ID).
 * Restricted to HR and Management for privacy.
 */
employeeRouter.get('/:id/id-proof', authMiddleware, requireRole('ADMIN', 'HR'), getEmployeeIdProof);

/**
 * Remove a staff member from our active records.
 */
employeeRouter.delete('/:id', requireRole('ADMIN', 'HR'), deleteEmployee);

// --- 2. Looking up Staff and Offices ---

/**
 * Get a high-level summary of our staff numbers (e.g., how many people
 * work in each department).
 */
employeeRouter.get('/stats', requireRole('ADMIN', 'HR', 'MANAGER'), getHRStats);

/**
 * List all the different office branches we have.
 */
employeeRouter.get('/branches', requireRole('ADMIN', 'HR', 'MANAGER'), getAllBranches);

/**
 * List every single staff member in the company.
 */
employeeRouter.get('/', requireRole('ADMIN', 'HR', 'MANAGER'), getAllEmployees);

/**
 * Get the specific details of one staff member.
 */
employeeRouter.get('/:id', requireRole('ADMIN', 'HR', 'MANAGER'), getEmployeeById);

/**
 * Update the profile information for a staff member.
 */
employeeRouter.put(
  '/:id',
  requireRole('ADMIN', 'HR', 'MANAGER'),
  uploadEmployeeFiles.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'id_proof', maxCount: 1 },
  ]),
  updateEmployee,
);

// --- 3. Public Information ---

/**
 * Get a limited view of a staff member's profile that can be seen by
 * other people in the company.
 */
employeeRouter.get('/public/:id', getPublicEmployeeProfile);

export default employeeRouter;
