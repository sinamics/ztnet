const badWordsArray = [
  'dogg',
  'badword',
  'innbytte',
  'fitte',
  'pussy',
  'faen',
  'innbytte.no',
  'bytte',
  'satan',
  'jævel',
  'mongo',
  'helsikke',
  'helvete',
  'dæven',
  'drittsekk',
  'dust',
  'kødd',
  'finn.no',
];
const validName = new RegExp(/^[a-åA-Å]{2,}(?: [a-åA-Å]+){0,2}$/);

module.exports = {
  badNames,
  nameLength,
};

function badNames(string) {
  if (string) {
    if (!validName.test(string) || badWordsArray.filter(w => string.toLowerCase().includes(w)).length > 0) return true;
  }
  return false;
}

function nameLength(string, length) {
  if (string) {
    if (string.length > length) return true;
  }
  return false;
}
