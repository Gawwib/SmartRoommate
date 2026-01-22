const pool = require('../db');

module.exports = async function seedDefaultBirthdates() {
  const defaultDate = '2003-01-01';
  await pool.query('UPDATE users SET birthdate = ? WHERE birthdate IS NULL', [defaultDate]);

  const calculateAge = (birthdate) => {
    const dob = new Date(birthdate);
    if (Number.isNaN(dob.getTime())) return null;
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const age = calculateAge(defaultDate);
  if (age !== null) {
    await pool.query('UPDATE users SET age = ? WHERE birthdate = ? AND (age IS NULL OR age = 0)', [age, defaultDate]);
  }
};
