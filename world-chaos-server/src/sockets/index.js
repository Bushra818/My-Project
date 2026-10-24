// التحديث الفوري: يُستخدم فقط لبث الأحداث التي يحتاجها العملاء المتصلون الآن
// (رسائل جديدة، رسومات جديدة، عدد المستخدمين النشطين) — وليس كمصدر وحيد للبيانات.
function attachSockets(io) {
  let activeCount = 0;

  io.on('connection', (socket) => {
    activeCount += 1;
    io.emit('presence:count', activeCount);

    // LIVE TRACE: بث نقاط الرسم لحظة بلحظة بين عدة مستخدمين على نفس اللوحة
    socket.on('livetrace:point', (payload) => {
      // payload: { regionId, x, y, color, size }
      socket.broadcast.emit('livetrace:point', payload);
    });

    socket.on('livetrace:end', (payload) => {
      socket.broadcast.emit('livetrace:end', payload);
    });

    socket.on('disconnect', () => {
      activeCount = Math.max(0, activeCount - 1);
      io.emit('presence:count', activeCount);
    });
  });
}

module.exports = { attachSockets };
