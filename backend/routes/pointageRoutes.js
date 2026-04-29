const express = require('express');
const router = express.Router();
const { createPointage, getPointages } = require('../controllers/pointageController');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, createPointage);
router.get('/', auth, getPointages);

module.exports = router;