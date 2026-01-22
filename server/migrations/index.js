const ensurePropertiesMediaColumns = require('./ensurePropertiesMediaColumns');
const ensureUsersBirthdateColumn = require('./ensureUsersBirthdateColumn');
const ensureUsersProfileImageColumn = require('./ensureUsersProfileImageColumn');
const ensureUsersBioColumn = require('./ensureUsersBioColumn');
const ensureUsersMatchFields = require('./ensureUsersMatchFields');
const ensureUsersAuthColumns = require('./ensureUsersAuthColumns');
const ensurePropertiesMapColumns = require('./ensurePropertiesMapColumns');
const ensureMessagingTables = require('./ensureMessagingTables');
const ensureConversationReadColumn = require('./ensureConversationReadColumn');
const seedDefaultBirthdates = require('./seedDefaultBirthdates');

module.exports = async function runMigrations() {
  await ensurePropertiesMediaColumns();
  await ensureUsersBirthdateColumn();
  await ensureUsersProfileImageColumn();
  await ensureUsersBioColumn();
  await ensureUsersMatchFields();
  await ensureUsersAuthColumns();
  await ensurePropertiesMapColumns();
  await ensureMessagingTables();
  await ensureConversationReadColumn();
  await seedDefaultBirthdates();
};
