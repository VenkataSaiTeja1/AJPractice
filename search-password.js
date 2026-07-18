const fs = require('fs');
const readline = require('readline');

const logFile = 'C:\\Users\\vadal\\.gemini\\antigravity\\brain\\9583e805-c542-4efe-9dac-bea0a0f79321\\.system_generated\\logs\\transcript.jsonl';

async function search() {
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    try {
      const data = JSON.parse(line);
      const content = line.toLowerCase();
      if (content.includes('password') && (content.includes('supabase') || content.includes('postgres') || content.includes('db-') || content.includes('host'))) {
        console.log(`Match index ${data.step_index}:`, line.substring(0, 500));
      }
    } catch (e) {}
  }
}

search().catch(err => console.error(err));
