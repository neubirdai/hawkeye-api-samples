const axios = require('axios');
const crypto = require('crypto');
const http = require('http');
const https = require('https');

class HawkeyeClient {
  constructor(baseUrl, accessToken = null) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
    this.clientIdentifier = 'web-app';
  }

  /**
   * Set the access token for authentication
   * @param {string} token - The access token
   */
  setAccessToken(token) {
    this.accessToken = token;
  }

  /**
   * Get the default headers for API requests
   * @returns {Object} Headers object
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'X-Client-Identifier': this.clientIdentifier
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    return headers;
  }

  /**
   * Generate a request ID
   * @returns {string} UUID v4 formatted request ID
   */
  generateRequestId() {
    return crypto.randomUUID();
  }

  /**
   * Make an API request
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request payload
   * @returns {Promise<Object>} Response data
   */
  async request(method, endpoint, data = null) {
    try {
      
      // For GET requests, don't include Content-Type header
      const headers = { ...this.getHeaders() };
      if (method.toLowerCase() === 'get') {
        delete headers['Content-Type'];
      }
      
      // Create config object
      const config = {
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: headers,
        httpAgent: new http.Agent({ keepAlive: false }),
        httpsAgent: new https.Agent({ keepAlive: false })
      };
      
      // Only add data for non-GET requests
      if (method.toLowerCase() !== 'get' && data !== null) {
        config.data = data;
      }
      
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('Request failed:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        throw new Error(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        console.error('No response received');
        throw new Error('No response received from the server');
      } else {
        console.error('Error message:', error.message);
        throw error; // Preserve the original error
      }
    }
  }

  /**
   * Get authentication token
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<string>} Access token
   */
  async authenticate(email, password) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/v1/user/login`,
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

      const token = response.data.access_token;
      if (!token) {
        console.error('No access_token found in response');
        throw new Error('Authentication failed: No access token in response');
      }
      this.setAccessToken(token);
      return token;
    } catch (error) {
      console.error('Authentication failed:', error);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }
}

module.exports = HawkeyeClient;
