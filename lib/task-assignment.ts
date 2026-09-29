export function getStudentAssignment(profile: any) {
  const roll = (profile.roll_number || '').toUpperCase();
  const isFirstYear = Number(profile.year) === 1 || roll.startsWith('26FE');
  const year = isFirstYear ? 1 : (Number(profile.year) || 3);
  const section = isFirstYear
    ? (roll.includes('43') ? 'CAI' : roll.includes('44') ? 'CSD' : (profile.section || 'All'))
    : (profile.section || 'All');

  return { year, section };
}

export function getTaskAssignment(task: any) {
  return {
    year: Number(task.metadata?.year ?? task.year),
    section: task.metadata?.section || task.section || null
  };
}

export function isTaskAssignedToStudent(task: any, profile: any) {
  const student = getStudentAssignment(profile);
  const assignment = getTaskAssignment(task);

  if (assignment.year !== student.year) return false;
  if (student.year === 1 || student.year === 2) {
    return !assignment.section || assignment.section === 'All' || assignment.section === student.section;
  }
  return true;
}