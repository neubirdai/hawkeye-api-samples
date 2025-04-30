/**
 * List sessions for a specific project
 * @param {Object} client - HawkeyeClient instance
 * @param {string} projectUuid - UUID of the project
 * @param {string} organizationUuid - UUID of the organization
 * @returns {Promise<Array>} List of sessions
 */
async function listSessions(client, projectUuid, organizationUuid) {
  try {
    const response = await client.request('POST', '/api/v1/inference/session/list', {
      request: {
        id: client.generateRequestId()
      },
      project_uuid: projectUuid,
      organization_uuid: organizationUuid
    });
    
    return response.sessions || [];
  } catch (error) {
    console.error('Error in listSessions:', error);
    throw new Error(`Error listing sessions: ${error.message}`);
  }
}

/**
 * Get details of a specific session
 * @param {Object} client - HawkeyeClient instance
 * @param {string} sessionUuid - UUID of the session
 * @param {string} projectUuid - UUID of the project
 * @returns {Promise<Object>} Session details
 */
async function getSession(client, sessionUuid, projectUuid) {
  try {
    const response = await client.request('GET', `/api/v1/inference/session/${sessionUuid}`, {
      project_uuid: projectUuid
    });
    
    return response.session;
  } catch (error) {
    throw new Error(`Error getting session: ${error.message}`);
  }
}

/**
 * Create a new session
 * @param {Object} client - HawkeyeClient instance
 * @param {string} projectUuid - UUID of the project
 * @param {string} organizationUuid - UUID of the organization
 * @returns {Promise<Object>} Created session with session_uuid
 */
async function createSession(client, projectUuid, organizationUuid) {
  try {
    const requestId = client.generateRequestId();
    const gendbSpecUuid = client.generateRequestId();
    
    const response = await client.request('POST', '/api/v1/inference/new_session', {
      filter_chain: null,
      gendb_spec: {
        uuid: gendbSpecUuid
      },
      organization_uuid: organizationUuid,
      project_uuid: projectUuid,
      request: {
        request_id: requestId
      }
    });
    
    return {
      session_uuid: response.session_uuid,
      // Include other properties if they are available in the response
      project_uuid: projectUuid
    };
  } catch (error) {
    throw new Error(`Error creating session: ${error.message}`);
  }
}

/**
 * Inspect a session to get detailed information including prompt cycles
 * @param {Object} client - HawkeyeClient instance
 * @param {string} sessionUuid - UUID of the session
 * @param {string} projectUuid - UUID of the project
 * @param {string} organizationUuid - UUID of the organization
 * @returns {Promise<Object>} Detailed session information
 */
async function inspectSession(client, sessionUuid, projectUuid, organizationUuid) {
  try {
    // This endpoint should be '/api/v1/inference/session/inspect' based on the working curl command
    const response = await client.request('POST', '/api/v1/inference/session/inspect', {
      request: {
        id: client.generateRequestId()
      },
      session_uuid: sessionUuid,
      project_uuid: projectUuid,
      organization_uuid: organizationUuid
    });
    
    // Format the response to a more usable structure
    const result = {
      session_info: response.session_info || {},
      prompt_cycles: response.prompt_cycle || []
    };
    
    // Debug the response structure
    console.log('DEBUG - Response Structure:', JSON.stringify(Object.keys(response), null, 2));
    
    return result;
  } catch (error) {
    throw new Error(`Error inspecting session: ${error.message}`);
  }
}

/**
 * Send a prompt to a session
 * @param {Object} client - HawkeyeClient instance
 * @param {string} sessionUuid - UUID of the session
 * @param {string} projectUuid - UUID of the project
 * @param {string} prompt - The prompt text to send
 * @param {boolean} streamResponse - Whether to stream the response (optional)
 * @returns {Promise<Object>} Prompt cycle information
 */
async function sendPrompt(client, sessionUuid, projectUuid, prompt, streamResponse = false) {
  try {
    const requestId = client.generateRequestId();
    
    // Prepare the request payload based on the curl example
    const payload = {
      action: "ACTION_NEXT",
      session_uuid: sessionUuid,
      project_uuid: projectUuid,
      messages: [
        {
          content: {
            content_type: "CONTENT_TYPE_CHAT_PROMPT",
            parts: [prompt]
          }
        }
      ],
      request: {
        request_id: requestId
      },
      prompt_options: {
        disable_replay: false,
        source_focus_categories: []
      }
    };

    if (streamResponse) {
      console.log('Streaming mode enabled. Sending prompt...');
      
      // This implementation uses the http client directly for streaming
      // We'll use the axios-based request method but will need to enhance it for streaming
      const url = `${client.baseUrl}/api/v1/inference/session`;
      
      try {
        const axios = require('axios');
        
        console.log('Making streaming request...');
        const response = await axios({
          method: 'post',
          url: url,
          data: payload,
          headers: client.getHeaders(),
          responseType: 'stream'
        });
        
        // Process the streaming response
        return new Promise((resolve, reject) => {
          let responseData = '';
          let finalResponse = null;
          
          response.data.on('data', (chunk) => {
            const chunkStr = chunk.toString();
            responseData += chunkStr;
            
            // Print progress to console
            if (chunkStr.includes('data:')) {
              const dataChunks = chunkStr.split('data:').filter(d => d.trim());
              dataChunks.forEach(data => {
                try {
                  const jsonData = JSON.parse(data.trim());
                  
                  // Display progress information
                  if (jsonData.message && 
                      jsonData.message.content && 
                      jsonData.message.content.content_type === 'CONTENT_TYPE_PROGRESS_STATUS') {
                    process.stdout.write(`Progress: ${jsonData.message.content.parts[0]}\r`);
                  }
                  
                  // If we get a chat response, display it
                  if (jsonData.message && 
                      jsonData.message.content && 
                      jsonData.message.content.content_type === 'CONTENT_TYPE_CHAT_RESPONSE') {
                    console.log('\nReceived partial answer:');
                    console.log('------------------------');
                    console.log(jsonData.message.content.parts[0].substring(0, 100) + '...');
                  }
                  
                  // Check if this is the final response
                  if (jsonData.message && jsonData.message.status === 'STATUS_DONE') {
                    finalResponse = {
                      session_uuid: jsonData.session_uuid,
                      message_id: jsonData.message ? jsonData.message.id : null,
                      response: responseData
                    };
                  }
                } catch (e) {
                  // Not valid JSON, might be incomplete chunk
                }
              });
            }
          });
          
          response.data.on('end', () => {
            console.log('\nStream finished');
            resolve(finalResponse || { 
              session_uuid: sessionUuid, 
              response: responseData 
            });
          });
          
          response.data.on('error', (err) => {
            console.error('Stream error:', err);
            reject(err);
          });
        });
      } catch (error) {
        console.error('Streaming error:', error);
        throw error;
      }
    } else {
      // Standard non-streaming request
      const response = await client.request('POST', '/api/v1/inference/session', payload);
      return {
        session_uuid: sessionUuid,
        message_id: response.message ? response.message.id : null,
        response: response
      };
    }
  } catch (error) {
    throw new Error(`Error sending prompt: ${error.message}`);
  }
}

/**
 * Poll for prompt cycle completion
 * @param {Object} client - HawkeyeClient instance
 * @param {string} sessionUuid - UUID of the session
 * @param {string} promptCycleId - UUID of the prompt cycle
 * @param {string} projectUuid - UUID of the project
 * @param {string} organizationUuid - UUID of the organization
 * @param {number} maxAttempts - Maximum polling attempts (default: 30)
 * @param {number} interval - Polling interval in milliseconds (default: 2000)
 */
async function pollForCompletion(client, sessionUuid, promptCycleId, projectUuid, organizationUuid, maxAttempts = 30, interval = 2000) {
  console.log('Polling for prompt cycle completion...');
  
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      // Get the session details
      const sessionDetails = await inspectSession(client, sessionUuid, projectUuid, organizationUuid);
      
      // Find the prompt cycle
      const cycle = sessionDetails.prompt_cycles.find(cycle => cycle.id === promptCycleId);
      
      if (cycle) {
        if (cycle.status === 'PROMPT_STATUS_COMPLETED') {
          console.log(`Prompt cycle completed after ${attempts} polling attempts.`);
          return cycle;
        } else if (cycle.status === 'PROMPT_STATUS_ERROR') {
          throw new Error(`Prompt cycle failed with status: ${cycle.status}`);
        }
      }
      
      // Wait before the next poll
      console.log(`Waiting for completion... (attempt ${attempts}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      console.error(`Error polling for completion (attempt ${attempts}/${maxAttempts}):`, error.message);
      
      // Wait before the next poll even if there was an error
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  throw new Error(`Prompt cycle did not complete after ${maxAttempts} polling attempts.`);
}

module.exports = {
  listSessions,
  getSession,
  createSession,
  inspectSession,
  sendPrompt,
  pollForCompletion
};