import { Router } from 'express';
import {
    getAllApplications,
    getApplicationById,
    createApplication,
    updateApplicationStatus,
    deleteApplication,
} from '../controllers/applicationController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// Todas las rutas de aplicaciones requieren autenticación
router.use(verifyToken);

router.get('/', getAllApplications);
router.get('/:id', getApplicationById);
router.post('/', createApplication);
router.patch('/:id/status', updateApplicationStatus);
router.delete('/:id', deleteApplication);

export default router;
