const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Temporary storage for preview/testing only. Data can disappear when the host restarts.
const filePath = process.env.TEMP_DATA_FILE || path.join(os.tmpdir(), 'world-chaos-data.json');
const empty = () => ({ users: [], messages: [], drawings: [], reactions: [], reports: [], blocks: [] });
let state = empty();
try {
  if (fs.existsSync(filePath)) state = { ...empty(), ...JSON.parse(fs.readFileSync(filePath, 'utf8')) };
} catch (err) {
  console.error('تعذر قراءة ملف البيانات المؤقت؛ سيتم بدء مخزن فارغ:', err.message);
}
let writeQueue = Promise.resolve();
function persist() {
  const snapshot = JSON.stringify(state);
  writeQueue = writeQueue.then(async () => {
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.${process.pid}.tmp`;
    await fs.promises.writeFile(tmp, snapshot, 'utf8');
    await fs.promises.rename(tmp, filePath);
  }).catch(err => console.error('تعذر حفظ البيانات المؤقتة:', err.message));
  return writeQueue;
}
function list(name) { if (!Array.isArray(state[name])) state[name] = []; return state[name]; }
function all(name) { return list(name).slice(); }
function get(name, id) { return list(name).find(item => String(item.id) === String(id)) || null; }
function find(name, predicate) { return list(name).find(predicate) || null; }
async function insert(name, item) { list(name).push(item); await persist(); return item; }
async function update(name, id, patch) {
  const item = get(name, id); if (!item) return null;
  Object.assign(item, typeof patch === 'function' ? patch(item) : patch); await persist(); return item;
}
async function remove(name, id) {
  const items = list(name); const index = items.findIndex(item => String(item.id) === String(id));
  if (index < 0) return false; items.splice(index, 1); await persist(); return true;
}
function stats() { return { storage: 'temporary-file', filePath, counts: Object.fromEntries(Object.keys(state).map(k => [k, list(k).length])) }; }
module.exports = { filePath, all, get, find, insert, update, remove, stats, persist };
