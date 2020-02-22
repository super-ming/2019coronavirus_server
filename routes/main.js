const express = require('express');
const router = express.Router();

router.get('/api/data', googleController.getDataReport);

module.exports = router;