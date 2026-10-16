import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { addParticipant, moveParticipant, deleteParticipant, SeatingError } from '../services/placement.js';
import { tableTheme, iceBreaker } from '../shared/matching.js';
import adminAuth from '../middleware/adminAuth.js';

const router = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env['NODE_ENV'] === 'test' ? 1000 : 60,
  message: { error: { code: 'rate_limit', message: 'Çok fazla istek' } }
});

const participantSchema = z.object({
  name: z.string().trim().min(1).max(60),
  deviceId: z.string().optional(),
  answers: z.object({
    crowd: z.number().int().min(1).max(5),
    starter: z.number().int().min(1).max(5),
    interests: z.array(z.string()).max(2),
    style: z.enum(['listener', 'talker', 'funny']),
    goal: z.enum(['network', 'friend', 'learn']),
    dept: z.enum(['engineering', 'business', 'design', 'science', 'social', 'other']).optional(),
    friday: z.enum(['home', 'game', 'out', 'study']),
    drink: z.enum(['coffee', 'tea', 'cold', 'energy']),
  })
});

// Yardımcı: Belirli bir id için response datasını hesapla
async function getParticipantData(id) {
  const row = (await query('SELECT * FROM participants WHERE id = $1', [id])).rows[0];
  if (!row) return null;
  
  const res = {
    id: row.id,
    name: row.name,
    status: row.status,
    tableNumber: row.table_number,
    tablemates: [],
    theme: null,
    iceBreaker: null,
    waitlistPosition: row.waitlist_position
  };
  
  if (row.status === 'seated' && row.table_number !== null) {
    const mates = (await query("SELECT id, name, feature_vector FROM participants WHERE table_number = $1 AND status = 'seated' ORDER BY seq ASC", [row.table_number])).rows;
    res.tablemates = mates.filter(m => m.id !== id).map(m => ({ id: m.id, name: m.name }));
    
    const tableMembers = mates.map(m => ({ id: m.id, name: m.name, vec: m.feature_vector }));
    res.theme = tableTheme({ members: tableMembers });
    res.iceBreaker = iceBreaker({ members: tableMembers });
    delete res.waitlistPosition;
  }
  
  return res;
}

router.post('/', limiter, async (req, res, next) => {
  try {
    const parseResult = participantSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: {
          code: 'invalid_data',
          message: 'Geçersiz veri',
          details: { fields: parseResult.error.errors.map(e => e.path.join('.')) }
        }
      });
    }
    
    const { name, answers, deviceId } = parseResult.data;
    
    try {
      const id = await addParticipant(name, answers, deviceId);
      const data = await getParticipantData(id);
      res.status(data.status === 'seated' ? 201 : 200).json(data);
    } catch (err) {
      if (err instanceof SeatingError && err.code === 'already_registered') {
        return res.status(409).json({ error: { code: err.code, message: err.message, details: err.details } });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const data = await getParticipantData(req.params.id);
    if (!data) {
      return res.status(404).json({ error: { code: 'not_found', message: 'Katılımcı bulunamadı' } });
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/table', adminAuth, async (req, res, next) => {
  try {
    const { tableNumber } = req.body;
    if (typeof tableNumber !== 'number') {
      return res.status(400).json({ error: { code: 'invalid_data', message: 'tableNumber eksik veya geçersiz' } });
    }
    try {
      await moveParticipant(req.params.id, tableNumber);
      const data = await getParticipantData(req.params.id);
      res.json(data);
    } catch (err) {
      if (err instanceof SeatingError) {
        let status = 400;
        if (err.code === 'not_found') status = 404;
        if (err.code === 'table_full') status = 409;
        return res.status(status).json({ error: { code: err.code, message: err.message, details: err.details } });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', adminAuth, async (req, res, next) => {
  try {
    try {
      const deleted = await deleteParticipant(req.params.id);
      res.json({ status: 'ok', deleted });
    } catch (err) {
      if (err instanceof SeatingError && err.code === 'not_found') {
        return res.status(404).json({ error: { code: 'not_found', message: err.message } });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

export default router;

