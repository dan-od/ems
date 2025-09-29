const express = require('express');
const router = express.Router();

// Import subroutes - order doesn't matter now since all paths are unique
router.use(require('./create'));        // /create, /create/v2, /create/bulk
router.use(require('./approvals'));     // /approve/:id, /reject/:id, /transfer/:id
router.use(require('./fetch'));         // /list, /:id, /dashboard/pending
router.use(require('./myRequests'));    // /my/list
router.use(require('./deptRequests'));  // /department/requests

module.exports = router;