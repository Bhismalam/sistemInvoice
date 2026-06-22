const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../server/routes/documents.js');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `router.get('/:id', checkPermission('read:document'), documentController.getById);`;

const replacementStr = `router.get('/:id', checkPermission('read:document'), documentController.getById);
router.get('/:id/pdf', checkPermission('read:document'), documentController.downloadPDF);
router.post('/:id/send-email', checkPermission('update:document'), documentController.sendInvoiceEmail);`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched routes/documents.js');
} else {
  console.error('Target string not found in routes/documents.js!');
}
