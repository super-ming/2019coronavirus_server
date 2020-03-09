const express = require('express');
const router = express.Router();
const caseController = require('../controllers/CaseController');

router.get('/api/cases', caseController.getDataReport);
module.exports = router;