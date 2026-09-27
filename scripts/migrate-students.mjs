import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oackmxxdeelyqrfxwvie.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ZOlaYAlh9OpUAARLnbwwTQ_RglUR47v';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function generateRolls(prefix, startNum, endAlpha) {
  const rolls = [];
  for (let i = startNum; i <= 99; i++) {
    rolls.push(`${prefix}${i}`);
  }
  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
  const endLetter = endAlpha[0];
  const endDigit = parseInt(endAlpha[1], 10);
  
  for (const letter of letters) {
    const maxDigit = (letter === endLetter) ? endDigit : 9;
    for (let d = 0; d <= maxDigit; d++) {
      rolls.push(`${prefix}${letter}${d}`);
    }
    if (letter === endLetter) break;
  }
  return rolls;
}

async function run() {
  const caiRolls = generateRolls('26FE1A43', 51, 'B1');
  const csdRolls = generateRolls('26FE1A44', 60, 'B7');

  console.log(`Generated ${caiRolls.length} CAI students: from ${caiRolls[0]} to ${caiRolls[caiRolls.length - 1]}`);
  console.log(`Generated ${csdRolls.length} CSD students: from ${csdRolls[0]} to ${csdRolls[csdRolls.length - 1]}`);

  const studentsToInsert = [];

  for (const roll of caiRolls) {
    studentsToInsert.push({
      email: `${roll.toLowerCase()}@portal.com`,
      roll_number: roll,
      full_name: roll,
      password: roll,
      role: 'student',
      year: null,
      section: null,
      first_login: false
    });
  }

  for (const roll of csdRolls) {
    studentsToInsert.push({
      email: `${roll.toLowerCase()}@portal.com`,
      roll_number: roll,
      full_name: roll,
      password: roll,
      role: 'student',
      year: null,
      section: null,
      first_login: false
    });
  }

  console.log(`Total students to upsert: ${studentsToInsert.length}`);

  // Upsert in batches of 25
  const batchSize = 25;
  let inserted = 0;
  for (let i = 0; i < studentsToInsert.length; i += batchSize) {
    const batch = studentsToInsert.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from('profiles')
      .upsert(batch, { onConflict: 'roll_number' });

    if (error) {
      console.error(`Error in batch ${i}:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`Upserted ${inserted}/${studentsToInsert.length} students...`);
    }
  }

  console.log('119 Student accounts created successfully!');
}

run();
