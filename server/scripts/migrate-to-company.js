/**
 * Migration Script: Migrate existing single-user data to multi-tenant (Company) structure.
 * 
 * What this does:
 * 1. Finds all users WITHOUT a company_id.
 * 2. Creates a Company for each user using their existing business_name.
 * 3. Creates default Roles (Owner & Staff) for each Company.
 * 4. Assigns the Owner role and Company to the user.
 * 5. Tags all existing Documents, Contacts, Products, Receipts, etc. with the company_id.
 * 
 * Run: node scripts/migrate-to-company.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { initDB } = require('../config/database');

async function migrate() {
  await initDB();
  console.log('🔄 Starting multi-tenant migration...\n');

  const { User } = require('../models/User');
  const CompanyModel = require('../models/Company');
  const RoleModel = require('../models/Role');

  // Find users that haven't been migrated yet
  const users = await User.find({ company_id: null });
  console.log(`Found ${users.length} user(s) to migrate.\n`);

  for (const user of users) {
    console.log(`--- Migrating user: ${user.name} (${user.email}) ---`);

    // 1. Create a Company from the user's existing business info
    const company = await CompanyModel.create({
      name: user.business_name || `Bisnis ${user.name}`,
      owner_id: user._id,
      address: user.business_address || '',
      logo: user.business_logo || null,
      npwp: user.npwp || '',
      invoice_prefix: user.invoice_prefix || 'INV',
      invoice_counter: user.invoice_counter || 0,
      default_tax_percent: user.default_tax_percent || 11
    });
    console.log(`  ✅ Company created: ${company.name} (${company._id})`);

    // 2. Create default roles
    const { ownerRole } = await RoleModel.createDefaultRoles(company._id);
    console.log(`  ✅ Default roles created (Owner & Staff)`);

    // 3. Assign company and role to user
    await User.findByIdAndUpdate(user._id, {
      company_id: company._id,
      role_id: ownerRole._id
    });
    console.log(`  ✅ User assigned as Owner`);

    // 4. Tag all existing data with company_id
    const models = [
      { name: 'Document', model: mongoose.model('Document') },
      { name: 'Contact', model: require('../models/Contact').Contact },
      { name: 'Product', model: require('../models/Product').Product },
      { name: 'Receipt', model: require('../models/Receipt').Receipt },
      { name: 'ActivityLog', model: require('../models/ActivityLog').ActivityLog },
      { name: 'PaymentReminder', model: mongoose.model('PaymentReminder') }
    ];

    for (const { name, model } of models) {
      const result = await model.updateMany(
        { user_id: user._id, company_id: null },
        { company_id: company._id }
      );
      if (result.modifiedCount > 0) {
        console.log(`  ✅ ${name}: ${result.modifiedCount} record(s) tagged`);
      }
    }

    console.log('');
  }

  console.log('🎉 Migration complete!');
  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
