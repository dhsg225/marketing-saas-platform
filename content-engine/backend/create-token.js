const jwt = require('jsonwebtoken');
require('dotenv').config();

// Create a JWT token for the user
const payload = {
  userId: '4e1596eb-95fa-4ad9-97e7-2eb0da11e8c9', // From the logs
  email: 'shannon.green.asia@gmail.com'
};

const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
console.log('Generated JWT token:', token);
