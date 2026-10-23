// gateway/tests/problemNavigationAndSerial.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Tests for Permanent Question Numbers and Left-Side Navigation Boundaries
// ─────────────────────────────────────────────────────────────────────────────

const db = require('../src/config/database');
const request = require('supertest');
const app = require('../src/server');

describe('Permanent Question Numbers & Navigation API', () => {
  beforeAll(async () => {
    await db.query(`DELETE FROM problems WHERE slug LIKE 'sequence-test-%'`);
  });

  afterEach(async () => {
    await db.query(`DELETE FROM problems WHERE slug LIKE 'sequence-test-%'`);
  });

  describe('1. Permanent Question Numbering Integrity', () => {
    it('all published problems have a non-null, unique serial_number', async () => {
      const res = await db.query(`
        SELECT serial_number, COUNT(*) as count
        FROM problems
        WHERE status = 'Published'
        GROUP BY serial_number
        HAVING COUNT(*) > 1 OR serial_number IS NULL
      `);
      expect(res.rows).toHaveLength(0);
    });

    it('returns permanent serial_number in /api/problems list', async () => {
      const response = await request(app)
        .get('/api/problems?limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      
      const first = response.body.data[0];
      expect(first).toHaveProperty('serial_number');
      expect(first.serial_number).toBe(1);
      expect(first.slug).toBe('two-sum');
    });

    it('retains permanent serial_number when filtered by difficulty (never re-indexes to 1)', async () => {
      const allRes = await request(app).get('/api/problems?limit=200').expect(200);
      const hardProblems = allRes.body.data.filter(p => p.difficulty === 'Hard');
      expect(hardProblems.length).toBeGreaterThan(0);
      const expectedFirstHardSerial = hardProblems[0].serial_number;

      // Filter via API
      const filterRes = await request(app)
        .get('/api/problems?difficulty=Hard&limit=10')
        .expect(200);

      expect(filterRes.body.success).toBe(true);
      expect(filterRes.body.data.length).toBeGreaterThan(0);
      
      // The first Hard challenge in the filtered view MUST NOT be re-indexed to 1
      expect(filterRes.body.data[0].serial_number).toBe(expectedFirstHardSerial);
      expect(filterRes.body.data[0].difficulty).toBe('Hard');
    });

    it('retains permanent serial_number across pagination pages', async () => {
      const page1Res = await request(app).get('/api/problems?page=1&limit=5').expect(200);
      const page2Res = await request(app).get('/api/problems?page=2&limit=5').expect(200);

      expect(page1Res.body.data.map(p => p.serial_number)).toEqual([1, 2, 3, 4, 5]);
      expect(page2Res.body.data.map(p => p.serial_number)).toEqual([6, 7, 8, 9, 10]);
    });

    it('retains permanent serial_number when filtered by topic or search', async () => {
      const searchRes = await request(app).get('/api/problems?search=climbing-stairs').expect(200);
      expect(searchRes.body.success).toBe(true);
      expect(searchRes.body.data.length).toBeGreaterThan(0);
      const climbing = searchRes.body.data.find(p => p.slug === 'climbing-stairs');
      expect(climbing).toBeDefined();
      expect(climbing.serial_number).toBe(4);
    });

    it('supports direct query by serial_number string in search param', async () => {
      const searchRes = await request(app).get('/api/problems?search=4').expect(200);
      expect(searchRes.body.success).toBe(true);
      const hasClimbing = searchRes.body.data.some(p => p.serial_number === 4 && p.slug === 'climbing-stairs');
      expect(hasClimbing).toBe(true);
    });
  });

  describe('2. Uniqueness & Duplicate Prevention', () => {
    it('enforces database UNIQUE constraint against duplicate serial_number', async () => {
      let threwError = false;
      try {
        await db.query(`
          INSERT INTO problems (title, slug, description, difficulty, status, serial_number)
          VALUES ('Duplicate Test', 'duplicate-test-slug', 'Description', 'Easy', 'Draft', 1)
        `);
      } catch (err) {
        threwError = true;
        expect(err.code).toBe('23505'); // unique_violation
      }
      expect(threwError).toBe(true);
    });

    it('auto-increments serial_number from sequence on new problem insertion', async () => {
      const maxRes = await db.query(`SELECT MAX(serial_number) as max_num FROM problems`);
      const prevMax = maxRes.rows[0].max_num;

      const insertRes = await db.query(`
        INSERT INTO problems (title, slug, description, difficulty, status)
        VALUES ('Sequence Test', 'sequence-test-unique-slug', 'Description', 'Easy', 'Draft')
        RETURNING serial_number
      `);

      const newSerial = insertRes.rows[0].serial_number;
      expect(newSerial).toBeGreaterThan(prevMax);

      // Clean up test row
      await db.query(`DELETE FROM problems WHERE slug = 'sequence-test-unique-slug'`);
    });
  });

  describe('3. Previous / Next Problem Navigation & Boundaries', () => {
    it('handles first problem boundary: problem #1 has prevProblem null and nextProblem #2', async () => {
      const res = await request(app).get('/api/problems/two-sum').expect(200);
      expect(res.body.success).toBe(true);
      const { data } = res.body;

      expect(data.serial_number).toBe(1);
      expect(data.prevProblem).toBeNull();
      expect(data.nextProblem).not.toBeNull();
      expect(data.nextProblem.serial_number).toBe(2);
      expect(data.nextProblem.slug).toBe('valid-parentheses');
    });

    it('handles intermediate question: problem #4 has prevProblem #3 and nextProblem #5', async () => {
      const res = await request(app).get('/api/problems/climbing-stairs').expect(200);
      expect(res.body.success).toBe(true);
      const { data } = res.body;

      expect(data.serial_number).toBe(4);
      expect(data.prevProblem).not.toBeNull();
      expect(data.prevProblem.serial_number).toBe(3);
      expect(data.prevProblem.slug).toBe('reverse-linked-list');

      expect(data.nextProblem).not.toBeNull();
      expect(data.nextProblem.serial_number).toBe(5);
      expect(data.nextProblem.slug).toBe('maximum-subarray');
    });

    it('handles last published problem boundary: nextProblem is null', async () => {
      // Find the problem with the highest serial_number among Published
      const lastPubRes = await db.query(`
        SELECT slug, serial_number FROM problems
        WHERE status = 'Published'
        ORDER BY serial_number DESC LIMIT 1
      `);
      const lastPub = lastPubRes.rows[0];

      const res = await request(app).get(`/api/problems/${lastPub.slug}`).expect(200);
      expect(res.body.success).toBe(true);
      const { data } = res.body;

      expect(data.serial_number).toBe(lastPub.serial_number);
      expect(data.nextProblem).toBeNull();
      expect(data.prevProblem).not.toBeNull();
    });

    it('fetches problem directly by numeric serial_number in URL parameter', async () => {
      const res = await request(app).get('/api/problems/1').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.slug).toBe('two-sum');
      expect(res.body.data.serial_number).toBe(1);
    });
  });

  describe('4. Question Publication Isolation', () => {
    it('does not expose unpublished problems in public /api/problems list', async () => {
      const res = await request(app).get('/api/problems?limit=250').expect(200);
      expect(res.body.success).toBe(true);
      const hasUnpublished = res.body.data.some(p => p.status && p.status !== 'Published');
      expect(hasUnpublished).toBe(false);
    });

    it('returns 404 when non-admin requests an unpublished problem', async () => {
      const unpubRes = await db.query(`
        SELECT slug FROM problems WHERE status != 'Published' LIMIT 1
      `);
      if (unpubRes.rows.length > 0) {
        const unpubSlug = unpubRes.rows[0].slug;
        await request(app).get(`/api/problems/${unpubSlug}`).expect(404);
      }
    });

    it('does not link to unpublished problems in prevProblem or nextProblem', async () => {
      const lastPubRes = await db.query(`
        SELECT slug FROM problems WHERE status = 'Published' ORDER BY serial_number DESC LIMIT 1
      `);
      const lastPub = lastPubRes.rows[0];
      const res = await request(app).get(`/api/problems/${lastPub.slug}`).expect(200);
      expect(res.body.data.nextProblem).toBeNull();
    });
  });

  describe('5. Solved Status Output', () => {
    it('returns is_solved boolean field on each problem', async () => {
      const res = await request(app).get('/api/problems?limit=3').expect(200);
      expect(res.body.success).toBe(true);
      res.body.data.forEach(p => {
        expect(p).toHaveProperty('is_solved');
        expect(typeof p.is_solved).toBe('boolean');
      });
    });

    it('returns is_solved on single problem view', async () => {
      const res = await request(app).get('/api/problems/two-sum').expect(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('is_solved');
      expect(typeof res.body.data.is_solved).toBe('boolean');
    });
  });
});
