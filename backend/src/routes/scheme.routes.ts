import { Router } from 'express';
import { getSchemes, getSchemeById, getSchemeCategories } from '../controllers/scheme.controller';

const router = Router();

// Public routes for schemes
router.get('/', getSchemes);
router.get('/categories', getSchemeCategories);
router.get('/:id', getSchemeById);

export default router;
