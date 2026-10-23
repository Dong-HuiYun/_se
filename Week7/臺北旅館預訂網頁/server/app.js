'use strict';

const path = require('path');
const express = require('express');
const { createStore } = require('./store');
const { ROOMS, getRoom, calculateQuote } = require('./services/pricing');
const { classify } = require('./services/classifier');
const { getReply } = require('./services/chat');
const { validateBooking, validateFacilityBooking } = require('./services/validators');

/**
 * 建立 Express app。
 * @param {object}   opts
 * @param {Function} opts.clock     取得「現在時間」的函式（測試時可注入固定時間）
 * @param {object}   opts.store     資料儲存（預設為新的記憶體資料庫）
 * @param {string}   opts.staticDir 前端靜態檔案資料夾
 */
function createApp({ clock = () => new Date(), store = createStore(), staticDir = path.join(__dirname, '..', 'public') } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();

  api.get('/health', (req, res) => res.json({ status: 'ok', time: clock().toISOString() }));

  // 語音文字 → 使用者類型
  api.post('/classify', (req, res) => {
    const text = req.body && req.body.text;
    if (typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'text 為必填的非空字串' });
    }
    return res.json(classify(text));
  });

  // 房型
  api.get('/rooms', (req, res) => res.json({ rooms: Object.values(ROOMS) }));
  api.get('/rooms/:id', (req, res) => {
    const room = getRoom(req.params.id);
    if (!room) return res.status(404).json({ error: '找不到此房型' });
    return res.json(room);
  });

  // 價格試算
  api.post('/quote', (req, res) => {
    const { roomType, checkin, checkout, rooms } = req.body || {};
    try {
      return res.json(calculateQuote(roomType, checkin, checkout, rooms === undefined ? 1 : rooms));
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }
  });

  // 訂房
  api.post('/bookings', (req, res) => {
    const now = clock();
    const { errors, value } = validateBooking(req.body, now);
    if (errors.length) return res.status(400).json({ error: '輸入資料有誤', details: errors });
    const quote = calculateQuote(value.roomType, value.checkin, value.checkout, value.rooms);
    const booking = store.addBooking(value, quote, now);
    return res.status(201).location(`/api/bookings/${booking.id}`).json(booking);
  });

  api.get('/bookings/:id', (req, res) => {
    const booking = store.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: '找不到此訂單' });
    return res.json(booking);
  });

  api.delete('/bookings/:id', (req, res) => {
    const booking = store.cancelBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: '找不到此訂單' });
    return res.json(booking);
  });

  // 願望清單（PUT / DELETE 皆為冪等）
  api.get('/wishlist', (req, res) => res.json({ items: store.listWishlist() }));
  api.put('/wishlist/:hotelId', (req, res) => {
    if (!store.isHotelKnown(req.params.hotelId)) return res.status(404).json({ error: '找不到此旅館' });
    store.addWishlist(req.params.hotelId);
    return res.json({ hotelId: req.params.hotelId, inWishlist: true, items: store.listWishlist() });
  });
  api.delete('/wishlist/:hotelId', (req, res) => {
    if (!store.isHotelKnown(req.params.hotelId)) return res.status(404).json({ error: '找不到此旅館' });
    store.removeWishlist(req.params.hotelId);
    return res.json({ hotelId: req.params.hotelId, inWishlist: false, items: store.listWishlist() });
  });

  // AI 客服
  api.post('/chat', (req, res) => {
    const message = req.body && req.body.message;
    if (typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'message 為必填的非空字串' });
    }
    if (message.length > 500) return res.status(400).json({ error: 'message 不可超過 500 字' });
    return res.json({ reply: getReply(message.trim()) });
  });

  // 設施預約（游泳池 / 健身教練 / 會議室）
  api.post('/facility-bookings', (req, res) => {
    const now = clock();
    const { errors, value } = validateFacilityBooking(req.body, now);
    if (errors.length) return res.status(400).json({ error: '輸入資料有誤', details: errors });
    const result = store.addFacilityBooking(value, now);
    if (result.conflict) return res.status(409).json({ error: '此時段名額不足，請選擇其他時段' });
    return res.status(201).json(result.record);
  });

  api.use((req, res) => res.status(404).json({ error: 'API 路徑不存在' }));
  app.use('/api', api);

  app.use(express.static(staticDir));

  // 統一錯誤處理
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON 格式錯誤' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: '請求內容過大' });
    return res.status(500).json({ error: '伺服器內部錯誤' });
  });

  return app;
}

module.exports = { createApp };
