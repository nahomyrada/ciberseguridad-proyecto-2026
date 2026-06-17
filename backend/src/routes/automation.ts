import { Router } from 'express';
import { scrapeFreelancer, scrapeSingleUrl } from '../controllers/automationController';
import { verifyToken } from '../middleware/auth';

const router = Router();

// Protegemos las rutas de automatización (solo usuarios logueados pueden disparar scrapers)
router.use(verifyToken);

router.post('/scrape/freelancer', scrapeFreelancer);
router.post('/scrape/single', scrapeSingleUrl);

export default router;
