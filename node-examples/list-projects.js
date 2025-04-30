require('dotenv').config();
const HawkeyeClient = require('./utils/client');
const { listProjects } = require('./utils/projects');

// Check if environment variables are set
if (!process.env.HAWKEYE_API_URL || !process.env.HAWKEYE_EMAIL || !process.env.HAWKEYE_PASSWORD) {
  console.error('Please set HAWKEYE_API_URL, HAWKEYE_EMAIL, and HAWKEYE_PASSWORD environment variables');
  process.exit(1);
}

async function main() {
  try {
    console.log('Initializing Hawkeye API client...');
    const client = new HawkeyeClient(process.env.HAWKEYE_API_URL);
    
    console.log('Authenticating...');
    await client.authenticate(process.env.HAWKEYE_EMAIL, process.env.HAWKEYE_PASSWORD);
    
    console.log('Getting projects list...');
    const projects = await listProjects(client);
    
    console.log('\nProjects:');
    console.log('=========');
    if (projects.length === 0) {
      console.log('No projects found.');
    } else {
      projects.forEach((project, index) => {
        console.log(`${index + 1}. ${project.name} (${project.uuid})`);
        console.log(`   Description: ${project.description || 'N/A'}`);
        console.log(`   Created: ${formatDate(project.create_time)}`);
        console.log(`   Updated: ${formatDate(project.update_time)}`);
        console.log(`   State: ${project.project_state}`);
        console.log(`   Sync State: ${project.sync_state}`);
        console.log(`   Training State: ${project.training_state}`);
        console.log('---');
      });
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Helper function to format dates from the API format
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  // Handle the format like "04/04/25 02:22:51.047412"
  const parts = dateString.split(' ');
  if (parts.length !== 2) return dateString;
  
  const dateParts = parts[0].split('/');
  if (dateParts.length !== 3) return dateString;
  
  // Convert DD/MM/YY to a full date format
  const day = dateParts[0];
  const month = dateParts[1];
  const year = `20${dateParts[2]}`; // Assuming 20xx for all years
  
  return `${year}-${month}-${day} ${parts[1]}`;
}

main();
