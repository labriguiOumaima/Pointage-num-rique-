const express = require('express');
const router = express.Router();
const { createConge, getConges, updateConge } = require('../controllers/congeController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, createConge);
router.get('/', auth, getConges);
router.put('/:id', auth, updateConge);

module.exports = router;