const express = require('express');
const { checkPermission } = require('../middleware/rbac');
const { dashboardController, reportController, settingsController } = require('../controllers/dashboardController');

const dashboardRouter = express.Router();
dashboardRouter.get('/stats', checkPermission('read:dashboard'), dashboardController.getStats);
dashboardRouter.get('/chart', checkPermission('read:dashboard'), dashboardController.getChart);
dashboardRouter.get('/recent', checkPermission('read:dashboard'), dashboardController.getRecent);

const reportRouter = express.Router();
reportRouter.get('/aging', checkPermission('read:report'), reportController.aging);
reportRouter.get('/profit-loss', checkPermission('read:report'), reportController.profitLoss);
reportRouter.get('/cashflow', checkPermission('read:report'), reportController.cashflow);

const settingsRouter = express.Router();
settingsRouter.get('/', checkPermission('read:company_settings'), settingsController.get);
settingsRouter.put('/', checkPermission('update:company_settings'), settingsController.update);

module.exports = { dashboardRouter, reportRouter, settingsRouter };
