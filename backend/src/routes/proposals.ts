import { Router } from 'express';
import {
    getAllProposals,
    getProposalById,
    createProposal,
    updateProposalStatus,
    deleteProposal,
    generateAIProposal,
    updateProposal,
} from '../controllers/proposalController';
import { verifyToken } from '../middleware/auth';

const router = Router();

router.use(verifyToken);

router.get('/', getAllProposals);
router.get('/:id', getProposalById);
router.post('/', createProposal);
router.post('/generate', generateAIProposal);
router.patch('/:id/status', updateProposalStatus);
router.patch('/:id', updateProposal);
router.delete('/:id', deleteProposal);

export default router;
