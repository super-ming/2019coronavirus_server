const express = require('express');
const router = express.Router();
const dataController = require('../controllers/DataController');

router.get('/api/data', dataController.getDataReport);
module.exports = router;