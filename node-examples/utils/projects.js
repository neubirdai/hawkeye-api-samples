/**
 * List all projects available to the authenticated user
 * @param {Object} client - HawkeyeClient instance
 * @returns {Promise<Array>} List of projects
 */
async function listProjects(client) {
  try {
    
    const response = await client.request('GET', '/api/v1/project');
    // The API returns an object with 'specs' array containing project data
    return response.specs || [];
  } catch (error) {
    console.error('Error in listProjects:', error);
    throw new Error(`Error listing projects: ${error.message}`);
  }
}

/**
 * Get details of a specific project
 * @param {Object} client - HawkeyeClient instance
 * @param {string} projectUuid - UUID of the project
 * @returns {Promise<Object>} Project details
 */
async function getProject(client, projectUuid) {
  try {
    const response = await client.request('GET', `/v1/project/${projectUuid}`);
    return response.project;
  } catch (error) {
    throw new Error(`Error getting project: ${error.message}`);
  }
}

/**
 * Create a new project
 * @param {Object} client - HawkeyeClient instance
 * @param {Object} projectData - Project data
 * @returns {Promise<Object>} Created project
 */
async function createProject(client, projectData) {
  try {
    const response = await client.request('POST', '/v1/project', {
      project: projectData,
      request: {
        request_id: client.generateRequestId()
      }
    });
    return response.project;
  } catch (error) {
    throw new Error(`Error creating project: ${error.message}`);
  }
}

module.exports = {
  listProjects,
  getProject,
  createProject
};
