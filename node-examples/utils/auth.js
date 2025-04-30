const axios = require('axios');

/**
 * Get an access token by authenticating with credentials
 * @param {string} baseUrl - API base URL
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<string>} Access token
 */
async function getAccessToken(baseUrl, email, password) {
  try {
    const response = await axios.post(
      `${baseUrl}/v1/user/login`,
      {
        email,
        password
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*'
        }
      }
    );

    return response.data.access_token;
  } catch (error) {
    if (error.response) {
      throw new Error(`Authentication failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error('No response received during authentication');
    } else {
      throw new Error(`Authentication error: ${error.message}`);
    }
  }
}

module.exports = {
  getAccessToken
};
