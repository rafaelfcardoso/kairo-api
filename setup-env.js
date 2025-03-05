const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.test file
const result = dotenv.config({ path: path.resolve(__dirname, '.env.test') });

if (result.error) {
  console.error('Error loading .env.test file:', result.error);
  throw result.error;
}

// Log environment for debugging
console.log('Test environment setup with NODE_ENV:', process.env.NODE_ENV);
console.log('Database connection details:');
console.log('- Host:', process.env.PGHOST);
console.log('- Port:', process.env.PGPORT);
console.log('- Database:', process.env.PGDATABASE);
console.log('- User:', process.env.PGUSER);
console.log('- SSL:', process.env.DB_SSL);

// Ensure required environment variables are set
if (!process.env.PGHOST || !process.env.PGDATABASE) {
  console.error('Missing required database environment variables!');
  console.error('Make sure .env.test file is properly configured.');
} 