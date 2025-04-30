require('dotenv').config();
const readlineSync = require('readline-sync');
const HawkeyeClient = require('./utils/client');
const { listProjects } = require('./utils/projects');
const { createSession, sendPrompt, inspectSession } = require('./utils/sessions');

// Check if environment variables are set
if (!process.env.HAWKEYE_API_URL || !process.env.HAWKEYE_EMAIL || !process.env.HAWKEYE_PASSWORD) {
  console.error('Please set HAWKEYE_API_URL, HAWKEYE_EMAIL, and HAWKEYE_PASSWORD environment variables');
  process.exit(1);
}

// Configuration options

const organizationUuid = process.env.ORGANIZATION_UUID || 'ORGANIZATION_NAME_ROOT';
const STREAM_RESPONSE = process.env.STREAM_RESPONSE === 'true';

// Default security analysis prompt
const DEFAULT_PROMPT = 'Analyze my EKS cluster for security best practices';

async function main() {
  try {
    console.log('Initializing Hawkeye API client...');
    const client = new HawkeyeClient(process.env.HAWKEYE_API_URL);
    
    console.log('Authenticating...');
    await client.authenticate(process.env.HAWKEYE_EMAIL, process.env.HAWKEYE_PASSWORD);
    
    let projectUuid, projectName;
    
    // If in debug mode and project UUID is provided, skip project selection
    
    // Step 1: List all projects
    console.log('Getting projects list...');
    const projects = await listProjects(client);
    
    console.log('\nProjects:');
    console.log('=========');
    if (projects.length === 0) {
      console.log('No projects found.');
      process.exit(0);
    }
    
    projects.forEach((project, index) => {
      console.log(`${index + 1}. ${project.name} (${project.uuid})`);
      console.log(`   Description: ${project.description || 'N/A'}`);
      console.log('---');
    });
    
    // Step 2: Let user select a project
    const projectIndex = readlineSync.question('\nSelect a project (enter number): ');
    const selectedProject = projects[parseInt(projectIndex) - 1];
    
    if (!selectedProject) {
      console.error('Invalid project selection');
      process.exit(1);
    }
    
    projectUuid = selectedProject.uuid;
    projectName = selectedProject.name;
    console.log(`\nSelected project: ${projectName} (${projectUuid})`);
    

    // Step 3: Create a new session
    console.log(`\nCreating new session in project ${projectName}...`);
    const newSession = await createSession(client, projectUuid, organizationUuid);
    
    if (!newSession || !newSession.session_uuid) {
      throw new Error('Failed to create session: No session UUID returned');
    }
    
    console.log(`Session created successfully: ${newSession.session_uuid}`);
    
    // Step 4: Send a prompt
    const promptText = readlineSync.question(`\nEnter your prompt (or press Enter for default: "${DEFAULT_PROMPT}"): `) || DEFAULT_PROMPT;
    
    console.log(`\nSending prompt: "${promptText}"`);
    const promptResponse = await sendPrompt(
      client, 
      newSession.session_uuid, 
      projectUuid, 
      promptText,
      STREAM_RESPONSE
    );
    
    console.log('Prompt sent successfully.');
    
    // Display message ID if available
    if (promptResponse && promptResponse.message_id) {
      console.log(`Message ID: ${promptResponse.message_id}`);
    }
    
    // If streaming was enabled, the response is already displayed
    if (!STREAM_RESPONSE) {
      console.log('\nGetting session details...');
      
      // Allow some time for processing
      console.log('Waiting for processing to complete...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Get session details
      const sessionDetails = await inspectSession(
        client, 
        newSession.session_uuid, 
        projectUuid, 
        organizationUuid
      );
      
      console.log('\nSession Details:');
      console.log('===============');
      
      if (!sessionDetails.prompt_cycles || sessionDetails.prompt_cycles.length === 0) {
        console.log('No prompt cycles found in this session yet. Try again in a few moments.');
      } else {
        sessionDetails.prompt_cycles.forEach((cycle, index) => {
          console.log(`\nPrompt Cycle #${index + 1}:`);
          console.log('----------------');
          
          // Display user's question
          if (cycle.request && cycle.request.messages && cycle.request.messages.length > 0) {
            const message = cycle.request.messages[0];
            if (message.content && message.content.parts && message.content.parts.length > 0) {
              console.log(`Question: ${message.content.parts[0]}`);
            } else {
              console.log(`Question: ${promptText}`);
            }
          } else {
            console.log(`Question: ${promptText}`);
          }
          
          // Display final answer if available
          if (cycle.final_answer) {
            // Clean up HTML tags
            const cleanAnswer = cycle.final_answer.replace(/<br\s*\/?>/gi, '\n').replace(/<\/?[^>]+(>|$)/g, '');
            console.log(`\nAnswer: ${cleanAnswer}`);
          } else {
            console.log('\nAnswer: Processing...');
          }
          
          // Display chain of thoughts (analysis steps) if available
          if (cycle.chain_of_thoughts && cycle.chain_of_thoughts.length > 0) {
            console.log('\nAnalysis Steps:');
            cycle.chain_of_thoughts.forEach((step, stepIndex) => {
              console.log(`  ${stepIndex + 1}. ${step.description || 'N/A'}`);
              if (step.investigation) {
                console.log(`     Investigation: ${step.investigation.substring(0, 150)}...`);
              }
            });
          }
          
          // Display status
          console.log(`\nStatus: ${cycle.status || 'Unknown'}`);
          
          console.log('---');
        });
      }
    }
    
    // Print next steps
    console.log('\nNext Steps:');
    console.log('  - To view this session again, run: node examples/list-sessions.js');
    console.log(`  - Set SESSION_UUID=${newSession.session_uuid} in your .env file for quicker access.`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();