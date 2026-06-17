import { Router } from 'express';
import {
    getAllPlatforms,
    getPlatformById,
    createPlatform,
    updatePlatform,
    deletePlatform,
} from '../controllers/platformController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

router.get('/', getAllPlatforms);
router.get('/:id', getPlatformById);
router.post('/', createPlatform);
router.patch('/:id', updatePlatform);
router.delete('/:id', deletePlatform);

export default router;
