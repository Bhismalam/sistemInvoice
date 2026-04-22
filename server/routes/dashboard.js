const express = require('express');
const { dashboardController, reportController, settingsController } = require('../controllers/dashboardController');

const dashboardRouter = express.Router();
dashboardRouter.get('/stats', dashboardController.getStats);
dashboardRouter.get('/chart', dashboardController.getChart);
dashboardRouter.get('/recent', dashboardController.getRecent);

const reportRouter = express.Router();
reportRouter.get('/aging', reportController.aging);
reportRouter.get('/profit-loss', reportController.profitLoss);
reportRouter.get('/cashflow', reportController.cashflow);

const settingsRouter = express.Router();
settingsRouter.get('/', settingsController.get);
settingsRouter.put('/', settingsController.update);

module.exports = { dashboardRouter, reportRouter, settingsRouter };
