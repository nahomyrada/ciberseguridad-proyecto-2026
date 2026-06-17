import { Router } from 'express';
import {
    getAllSkills,
    getMySkills,
    updateMySkill,
    removeMySkill,
} from '../controllers/skillController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

router.get('/', getAllSkills);
router.get('/me', getMySkills);
router.post('/me', updateMySkill);
router.delete('/me/:skillId', removeMySkill);

export default router;
