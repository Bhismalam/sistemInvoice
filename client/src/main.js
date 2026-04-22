import './styles/index.css';
import './styles/auth.css';
import './styles/layout.css';
import { Router } from './router.js';

// Initialize Theme
const isLightMode = localStorage.getItem('theme') === 'light';
if (isLightMode) {
  document.body.classList.add('light-mode');
}

// Import pages
import { renderLogin } from './pages/Login.js';
import { renderRegister } from './pages/Register.js';
import { renderDashboard } from './pages/Dashboard.js';
import { renderDocumentList } from './pages/DocumentList.js';
import { renderDocumentCreate } from './pages/DocumentCreate.js';
import { renderDocumentDetail } from './pages/DocumentDetail.js';
import { renderReceiptList } from './pages/ReceiptList.js';
import { renderContacts } from './pages/Contacts.js';
import { renderProducts } from './pages/Products.js';
import { renderReports } from './pages/Reports.js';
import { renderSettings } from './pages/Settings.js';

// Initialize Router
const router = new Router();

router
  .add('/login', renderLogin)
  .add('/register', renderRegister)
  .add('/dashboard', renderDashboard)
  // Sales routes
  .add('/sales/orders', (c) => renderDocumentList(c, { transactionType: 'sales', documentType: 'order' }))
  .add('/sales/orders/new', (c) => renderDocumentCreate(c, { transactionType: 'sales', documentType: 'order' }))
  .add('/sales/orders/:id', renderDocumentDetail)
  .add('/sales/invoices', (c) => renderDocumentList(c, { transactionType: 'sales', documentType: 'invoice' }))
  .add('/sales/invoices/new', (c) => renderDocumentCreate(c, { transactionType: 'sales', documentType: 'invoice' }))
  .add('/sales/invoices/:id', renderDocumentDetail)
  .add('/sales/receipts', (c) => renderReceiptList(c, { transactionType: 'sales' }))
  // Purchases routes
  .add('/purchases/orders', (c) => renderDocumentList(c, { transactionType: 'purchase', documentType: 'order' }))
  .add('/purchases/orders/new', (c) => renderDocumentCreate(c, { transactionType: 'purchase', documentType: 'order' }))
  .add('/purchases/orders/:id', renderDocumentDetail)
  .add('/purchases/invoices', (c) => renderDocumentList(c, { transactionType: 'purchase', documentType: 'invoice' }))
  .add('/purchases/invoices/new', (c) => renderDocumentCreate(c, { transactionType: 'purchase', documentType: 'invoice' }))
  .add('/purchases/invoices/:id', renderDocumentDetail)
  .add('/purchases/receipts', (c) => renderReceiptList(c, { transactionType: 'purchase' }))
  // Other routes
  .add('/contacts', renderContacts)
  .add('/products', renderProducts)
  .add('/reports', renderReports)
  .add('/settings', renderSettings);

router.start();
