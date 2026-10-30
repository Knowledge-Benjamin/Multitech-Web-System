import express from 'express'
import {
  syncIdCards,
  getIdCards,
  getIdCardById,
  getMyCard,
  verifyCardByToken,
  admitCardholder,
  batchPrintCards,
  updateCardStatus,
  getDelegations,
  createDelegation,
  revokeDelegation,
  checkMyDelegationStatus
} from '../controllers/idCardController.js'
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js'
import jwt from 'jsonwebtoken'

const router = express.Router()

// Multi-portal authentication helper for personal card
const anyPortalUser = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required' })
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
    if (decoded.role === 'student') req.student = decoded
    else if (decoded.role === 'lecturer') req.lecturer = decoded
    else if (decoded.role === 'admin' || decoded.role === 'superadmin') req.admin = decoded
    else return res.status(403).json({ success: false, message: 'Unauthorized role' })
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}

// ── Public & Scanner Endpoints ────────────────────────────────────────────────
// Public verification gate (or privileged if bearer token is provided)
router.get('/verify/:token', verifyCardByToken)

// 1-Click exam hall / campus entry check-in
router.post('/verify/:token/admit', admitCardholder)

// Check current user's verifier delegation status
router.get('/verifier/status', checkMyDelegationStatus)

// ── Student / Lecturer Personal ID Card ───────────────────────────────────────
router.get('/my-card', anyPortalUser, getMyCard)

// ── Administrative ID Card Management (Admin Only) ───────────────────────────
router.get('/', authMiddleware, adminOnly, getIdCards)
router.post('/sync', authMiddleware, adminOnly, syncIdCards)
router.post('/batch-print', authMiddleware, adminOnly, batchPrintCards)
router.post('/reissue-tokens', authMiddleware, adminOnly, reissueAllTokens)
router.get('/delegations', authMiddleware, adminOnly, getDelegations)
router.post('/delegations', authMiddleware, adminOnly, createDelegation)
router.patch('/delegations/:id/revoke', authMiddleware, adminOnly, revokeDelegation)
router.get('/:id', authMiddleware, adminOnly, getIdCardById)
router.patch('/:id/status', authMiddleware, adminOnly, updateCardStatus)

export default router
