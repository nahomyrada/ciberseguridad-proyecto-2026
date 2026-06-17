import { Router } from 'express';
import {
    getAllJobs,
    getPendingJobs,
    getJobById,
    createJob,
    setRelevance,
    deleteJob,
} from '../controllers/jobController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// Todas las rutas protegidas por JWT
router.use(verifyToken);

router.get('/', getAllJobs);
router.get('/pending', getPendingJobs);
router.get('/:id', getJobById);
router.post('/', createJob);
router.patch('/:id/relevance', setRelevance);
router.delete('/:id', deleteJob);

export default router;
