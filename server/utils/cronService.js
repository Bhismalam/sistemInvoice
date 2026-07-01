const cron = require('node-cron');
const mongoose = require('mongoose');
const Document = require('../models/Document');

/**
 * Service to handle recurring invoices
 */
const initCronJobs = () => {
  // Run every day at 00:01
  cron.schedule('1 0 * * *', async () => {
    console.log('Running cron job: Recurring Invoices check...');
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find all recurring invoices where next_recurrence_date is today or earlier
      const Model = mongoose.model('Document');
      const docs = await Model.find({
        is_recurring: true,
        status: { $ne: 'cancelled' },
        next_recurrence_date: { $gte: today, $lt: tomorrow }
      });

      console.log(`Found ${docs.length} recurring invoices to process today.`);

      for (const doc of docs) {
        // Clone the document
        const newDocData = doc.toObject();
        delete newDocData._id;
        delete newDocData.created_at;
        delete newDocData.updated_at;
        
        // Generate new document number
        const prefix = newDocData.document_type === 'order' 
          ? (newDocData.transaction_type === 'sales' ? 'SO-' : 'PO-')
          : (newDocData.transaction_type === 'sales' ? 'INV-' : 'PINV-');
        const timestamp = new Date().getFullYear() + String(new Date().getMonth() + 1).padStart(2, '0');
        newDocData.document_number = `${prefix}${timestamp}-REC${Math.floor(1000 + Math.random() * 9000)}`;
        
        // Update dates
        newDocData.issue_date = new Date();
        // Keep the same duration for due date
        const duration = new Date(doc.due_date).getTime() - new Date(doc.issue_date).getTime();
        newDocData.due_date = new Date(new Date().getTime() + duration);
        
        newDocData.status = 'draft'; // Draft status by default
        newDocData.paid_at = null;
        newDocData.cancelled_at = null;
        newDocData.is_recurring = false; // The new invoice itself is not the recurring master

        // Items need to have their _id stripped
        if (newDocData.items) {
          newDocData.items.forEach(item => {
            delete item._id;
          });
        }

        // Save new invoice
        await Document.create(newDocData);

        // Update the master document's next_recurrence_date
        let nextDate = new Date(doc.next_recurrence_date);
        if (doc.recurrence_interval === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (doc.recurrence_interval === 'yearly') {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        } else if (doc.recurrence_interval === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7);
        }
        
        await Model.findByIdAndUpdate(doc._id, { next_recurrence_date: nextDate });
        console.log(`Processed recurring invoice for ${doc.document_number}`);
      }
    } catch (error) {
      console.error('Error processing recurring invoices:', error);
    }
  });
};

module.exports = { initCronJobs };
