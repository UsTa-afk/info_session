import { query, withTransaction } from '../db.js';
import { buildVector, placeLatecomer, rebalance as matchingRebalance, TABLE_CAPACITY, fakePeople, allMembers } from '../shared/matching.js';
import { v4 as uuidv4 } from 'uuid';

export class SeatingError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'SeatingError';
    this.code = code;
    this.details = details;
  }
}

/** q: (text, params) => Promise<{rows}>; verilmezse tek seferlik sorgu kullanılır. */
export async function getActiveState(q = query) {
  const { rows: participants } = await q('SELECT * FROM participants ORDER BY seq ASC');

  const tablesMap = new Map();
  const waitlist = [];
  const waiting = [];

  for (const row of participants) {
    const member = {
      id: row.id,
      name: row.name,
      vec: row.feature_vector,
      answers: row.answers,
      created_at: row.created_at
    };

    if (row.status === 'seated' && row.table_number !== null) {
      if (!tablesMap.has(row.table_number)) {
        tablesMap.set(row.table_number, { id: row.table_number, members: [] });
      }
      tablesMap.get(row.table_number).members.push(member);
    } else if (row.status === 'waitlist') {
      waitlist.push(member);
    } else if (row.status === 'waiting') {
      waiting.push(member);
    }
  }

  return {
    tables: Array.from(tablesMap.values()).sort((a, b) => a.id - b.id),
    waitlist: waitlist,
    waiting: waiting
  };
}

export function addParticipant(name, answers, deviceId) {
  return withTransaction(async (q) => {
    if (deviceId) {
      const { rows } = await q('SELECT id FROM participants WHERE device_id = $1', [deviceId]);
      if (rows[0]) {
        throw new SeatingError('already_registered', 'Bu cihaz zaten kayıtlı', { participantId: rows[0].id });
      }
    }

    const vec = buildVector(answers);
    const id = uuidv4();
    const person = { id, name, answers, vec };

    const currentState = await getActiveState(q);

    // Eğer henüz hiç masa oluşturulmamışsa (admin dağıtımı yapmadıysa), katılımcı havuzda bekler
    if (currentState.tables.length === 0) {
      await q(
        `INSERT INTO participants (id, name, answers, feature_vector, table_number, device_id, status, waitlist_position)
         VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8)`,
        [id, name, JSON.stringify(answers), JSON.stringify(vec), null, deviceId || null, 'waiting', null]
      );
      return id;
    }

    // Masalar dağıtılmışsa, geç gelen kişi olarak en uygun masaya yerleştir
    const { result } = placeLatecomer(currentState, person);

    const status = result.status;
    const tableNumber = status === 'seated' ? result.tableId : null;
    const waitlistPosition = status === 'waitlist' ? result.position : null;

    await q(
      `INSERT INTO participants (id, name, answers, feature_vector, table_number, device_id, status, waitlist_position)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8)`,
      [id, name, JSON.stringify(answers), JSON.stringify(vec), tableNumber, deviceId || null, status, waitlistPosition]
    );

    return id;
  });
}

export function rebalanceAll() {
  return withTransaction(async (q) => {
    const state = await getActiveState(q);
    const options = { order: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() };

    const newState = matchingRebalance(state, options);

    await q("UPDATE participants SET table_number = NULL, status = 'waitlist', waitlist_position = NULL");

    const seatedIds = [];
    const seatedTables = [];
    for (const t of newState.tables) {
      for (const m of t.members) {
        seatedIds.push(m.id);
        seatedTables.push(t.id);
      }
    }
    if (seatedIds.length) {
      await q(
        `UPDATE participants p SET table_number = v.t, status = 'seated'
         FROM unnest($1::text[], $2::int[]) AS v(id, t) WHERE p.id = v.id`,
        [seatedIds, seatedTables]
      );
    }

    if (newState.waitlist.length) {
      await q(
        `UPDATE participants p SET status = 'waitlist', waitlist_position = v.pos
         FROM unnest($1::text[], $2::int[]) AS v(id, pos) WHERE p.id = v.id`,
        [newState.waitlist.map((m) => m.id), newState.waitlist.map((_, idx) => idx + 1)]
      );
    }

    return newState;
  });
}

export function resetDatabase() {
  return withTransaction(async (q) => {
    await q('DELETE FROM participants');
  });
}

export function moveParticipant(personId, toTableId) {
  return withTransaction(async (q) => {
    const { rows } = await q('SELECT * FROM participants WHERE id = $1', [personId]);
    const person = rows[0];
    if (!person) {
      throw new SeatingError('not_found', 'Katılımcı bulunamadı');
    }

    if (person.status === 'seated' && person.table_number === toTableId) {
      return;
    }

    const { rows: countRows } = await q(
      "SELECT count(*)::int AS cnt FROM participants WHERE status = 'seated' AND table_number = $1",
      [toTableId]
    );
    if (countRows[0].cnt >= TABLE_CAPACITY) {
      throw new SeatingError('table_full', `Hedef masa dolu`, { tableNumber: toTableId });
    }

    await q(
      "UPDATE participants SET table_number = $1, status = 'seated', waitlist_position = NULL WHERE id = $2",
      [toTableId, personId]
    );

    if (person.status === 'waitlist') {
      const { rows: waitlist } = await q(
        "SELECT id FROM participants WHERE status = 'waitlist' ORDER BY waitlist_position ASC, seq ASC"
      );
      if (waitlist.length) {
        await q(
          `UPDATE participants p SET waitlist_position = v.pos
           FROM unnest($1::text[], $2::int[]) AS v(id, pos) WHERE p.id = v.id`,
          [waitlist.map((r) => r.id), waitlist.map((_, idx) => idx + 1)]
        );
      }
    }
  });
}

export function deleteParticipant(personId) {
  return withTransaction(async (q) => {
    const { rows } = await q('SELECT * FROM participants WHERE id = $1', [personId]);
    const person = rows[0];
    if (!person) {
      throw new SeatingError('not_found', 'Katılımcı bulunamadı');
    }

    await q('DELETE FROM participants WHERE id = $1', [personId]);

    if (person.status === 'waitlist') {
      const { rows: waitlist } = await q(
        "SELECT id FROM participants WHERE status = 'waitlist' ORDER BY waitlist_position ASC, seq ASC"
      );
      if (waitlist.length) {
        await q(
          `UPDATE participants p SET waitlist_position = v.pos
           FROM unnest($1::text[], $2::int[]) AS v(id, pos) WHERE p.id = v.id`,
          [waitlist.map((r) => r.id), waitlist.map((_, idx) => idx + 1)]
        );
      }
    }

    return { id: person.id, name: person.name };
  });
}

export function seedParticipants(count = 30) {
  return withTransaction(async (q) => {
    const currentState = await getActiveState(q);
    const all = allMembers(currentState);
    const offset = all.filter((m) => m.id.startsWith('fake')).length;
    const fakes = fakePeople(count, offset);

    for (const f of fakes) {
      const id = f.id;
      const name = f.name;
      const answers = f.answers;
      const vec = buildVector(answers);
      const deviceId = `sim-${id}-${Date.now().toString(36)}`;

      if (currentState.tables.length === 0) {
        await q(
          `INSERT INTO participants (id, name, answers, feature_vector, table_number, device_id, status, waitlist_position)
           VALUES ($1, $2, $3::jsonb, $4::jsonb, NULL, $5, 'waiting', NULL)`,
          [id, name, JSON.stringify(answers), JSON.stringify(vec), deviceId]
        );
      } else {
        const { state, result } = placeLatecomer(currentState, { id, name, answers, vec });
        currentState.tables = state.tables;
        currentState.waitlist = state.waitlist;
        const tableNumber = result.status === 'seated' ? result.tableId : null;
        const waitlistPosition = result.status === 'waitlist' ? result.position : null;
        await q(
          `INSERT INTO participants (id, name, answers, feature_vector, table_number, device_id, status, waitlist_position)
           VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8)`,
          [id, name, JSON.stringify(answers), JSON.stringify(vec), tableNumber, deviceId, result.status, waitlistPosition]
        );
      }
    }

    return count;
  });
}

