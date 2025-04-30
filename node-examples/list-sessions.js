require('dotenv').config();
const readlineSync = require('readline-sync');
const HawkeyeClient = require('./utils/client');
const { listProjects } = require('./utils/projects');
const { listSessions, inspectSession } = require('./utils/sessions');

// Check if environment variables are set
if (!process.env.HAWKEYE_API_URL || !process.env.HAWKEYE_EMAIL || !process.env.HAWKEYE_PASSWORD) {
  console.error('Please set HAWKEYE_API_URL, HAWKEYE_EMAIL, and HAWKEYE_PASSWORD environment variables');
  process.exit(1);
}

// Configuration options
const organizationUuid = process.env.ORGANIZATION_UUID || 'ORGANIZATION_NAME_ROOT';

async function main() {
  try {
    console.log('Initializing Hawkeye API client...');
    const client = new HawkeyeClient(process.env.HAWKEYE_API_URL);
    
    console.log('Authenticating...');
    await client.authenticate(process.env.HAWKEYE_EMAIL, process.env.HAWKEYE_PASSWORD);
    
    let projectUuid, projectName, selectedSession;
    
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
    
    // Step 3: List sessions for selected project
    console.log(`\nGetting sessions for project ${projectName || projectUuid}...`);
    const sessions = await listSessions(client, projectUuid, organizationUuid);
    
    console.log('\nSessions:');
    console.log('=========');
    if (sessions.length === 0) {
      console.log('No sessions found for this project.');
      process.exit(0);
    }
    
    sessions.forEach((session, index) => {
      console.log(`${index + 1}. ${session.name} (${session.session_uuid})`);
      console.log(`   Created: ${session.create_time}`);
      console.log(`   Last Updated: ${session.last_update}`);
      console.log(`   Prompt Cycles: ${session.prompt_cycle_ids.length}`);
      console.log('---');
    });
    
    // If in debug mode and session UUID is provided, skip session selection
    // Step 4: Let user select a session
    const sessionIndex = readlineSync.question('\nSelect a session to inspect (enter number): ');
    selectedSession = sessions[parseInt(sessionIndex) - 1];
    
    if (!selectedSession) {
      console.error('Invalid session selection');
      process.exit(1);
    }
    
    console.log(`\nSelected session: ${selectedSession.name} (${selectedSession.session_uuid})`);
    
    // Step 5: Inspect the selected session
    console.log('\nInspecting session...');
    const sessionDetails = await inspectSession(
      client, 
      selectedSession.session_uuid, 
      projectUuid, 
      organizationUuid
    );
    
    console.log('\nSession Details:');
    console.log('===============');
    
    if (!sessionDetails.prompt_cycles || sessionDetails.prompt_cycles.length === 0) {
      console.log('No prompt cycles found in this session.');
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
            console.log(`Question: N/A`);
          }
        } else {
          console.log(`Question: N/A`);
        }
        
        // Display final answer
        const answer = cycle.final_answer || 'N/A';
        const analysisIndex = answer.indexOf('**Analysis:**');
        const finalOutput = analysisIndex !== -1 ? answer.substring(analysisIndex) : answer;
        console.log(`\nAnswer: ${finalOutput}`);
        
        // Display chain of thoughts (analysis steps)
        if (cycle.chain_of_thoughts && cycle.chain_of_thoughts.length > 0) {
          console.log('\nAnalysis Chain of Thought Steps:');
          cycle.chain_of_thoughts.forEach((step, stepIndex) => {
            console.log(`  ${stepIndex + 1}. ${step.description || 'N/A'}`);
            if (step.investigation) {
              console.log(`     Investigation: ${step.investigation}`);
            }
          });
        }
        
        // Display sources used
        if (cycle.sources && cycle.sources.length > 0) {
          console.log('\nSources Used:');
          cycle.sources.forEach((source, sourceIndex) => {
            console.log(`  ${sourceIndex + 1}. ${source.title || source.id || 'Unnamed Source'}`);
          });
        }
        
        // Display follow-up suggestions
        if (cycle.follow_up_suggestions && cycle.follow_up_suggestions.length > 0) {
          console.log('\nFollow-up Suggestions:');
          cycle.follow_up_suggestions.forEach((suggestion, suggestionIndex) => {
            console.log(`  ${suggestionIndex + 1}. ${suggestion}`);
          });
        }
        
        console.log('---');
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();