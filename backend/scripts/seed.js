import { addParticipant } from '../src/services/placement.js';
import { v4 as uuidv4 } from 'uuid';

const firstNames = ['Ali', 'Ayşe', 'Mehmet', 'Elif', 'Can', 'Zeynep', 'Burak', 'Cemre', 'Deniz', 'Ege', 'Fatma', 'Gizem', 'Hakan', 'Irmak', 'Kaan'];
const lastNames = ['Yılmaz', 'Kaya', 'Demir', 'Çelik', 'Şahin', 'Yıldız', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç'];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const interestsArr = ['tech', 'art', 'sport', 'startup', 'musicGame'];
const styles = ['listener', 'talker', 'funny'];
const goals = ['network', 'friend', 'learn'];
const depts = ['engineering', 'business', 'design', 'science', 'social', 'other'];
const fridays = ['home', 'game', 'out', 'study'];
const drinks = ['coffee', 'tea', 'cold', 'energy'];

function generateRandomParticipant() {
  const name = `${randomChoice(firstNames)} ${randomChoice(lastNames)}`;
  const answers = {
    crowd: Math.floor(Math.random() * 5) + 1,
    starter: Math.floor(Math.random() * 5) + 1,
    interests: [randomChoice(interestsArr), randomChoice(interestsArr)].filter((v, i, a) => a.indexOf(v) === i),
    style: randomChoice(styles),
    goal: randomChoice(goals),
    dept: randomChoice(depts),
    friday: randomChoice(fridays),
    drink: randomChoice(drinks)
  };
  return { name, answers, deviceId: uuidv4() };
}

for (let i = 0; i < 30; i++) {
  const p = generateRandomParticipant();
  try {
    addParticipant(p.name, p.answers, p.deviceId);
    console.log(`Added: ${p.name}`);
  } catch (err) {
    console.error(`Error adding ${p.name}:`, err.message);
  }
}
console.log('Seeding complete.');
