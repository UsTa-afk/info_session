import { Router } from 'express';
import { getActiveState } from '../services/placement.js';
import { tableTheme, TABLE_CAPACITY, MAX_SEATS } from '../shared/matching.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const state = await getActiveState();
    
    const tables = state.tables
      .map(t => ({
        number: t.id,
        capacity: TABLE_CAPACITY,
        count: t.members.length,
        theme: tableTheme(t),
        members: t.members.map(m => ({ id: m.id, name: m.name }))
      }))
      .sort((a, b) => a.number - b.number);
    
    const waitlist = state.waitlist.map((m, i) => ({
      id: m.id,
      name: m.name,
      position: i + 1
    }));
    
    const waiting = (state.waiting || []).map(m => ({
      id: m.id,
      name: m.name
    }));

    const seatedCount = tables.reduce((acc, t) => acc + t.count, 0);
    const totals = {
      participants: seatedCount + waitlist.length + waiting.length,
      seated: seatedCount,
      waitlisted: waitlist.length,
      waiting: waiting.length,
      tableCount: tables.length,
      capacity: MAX_SEATS,
      occupancy: MAX_SEATS > 0 ? seatedCount / MAX_SEATS : 0
    };
    
    res.json({ tables, waitlist, waiting, totals });
  } catch (err) {
    next(err);
  }
});

export default router;
