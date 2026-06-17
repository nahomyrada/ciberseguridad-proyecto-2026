import { Router } from 'express';
import { getAllEarnings, getMonthlySummary, createEarning } from '../controllers/earningController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

router.get('/', getAllEarnings);
router.get('/summary', getMonthlySummary);
router.post('/', createEarning);

export default router;
