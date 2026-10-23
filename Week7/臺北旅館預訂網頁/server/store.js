'use strict';

const POOL_SLOT_CAPACITY = 20; // 每個時段最多容納人數
const HOTEL_IDS = ['A1'];

/** 記憶體資料庫。每次 createStore() 都是獨立的，方便測試隔離。 */
function createStore() {
  let bookingSeq = 0;
  let facilitySeq = 0;
  const bookings = new Map();
  const facilityBookings = new Map();
  const wishlist = new Set();

  return {
    // ---- 訂房 ----
    addBooking(data, quote, now) {
      bookingSeq += 1;
      const id = `BK-${String(bookingSeq).padStart(4, '0')}`;
      const record = { id, status: 'confirmed', ...data, quote, createdAt: now.toISOString() };
      bookings.set(id, record);
      return record;
    },
    getBooking: (id) => bookings.get(id) || null,
    listBookings: () => [...bookings.values()],
    cancelBooking(id) {
      const b = bookings.get(id);
      if (!b) return null;
      if (b.status === 'cancelled') return b;
      b.status = 'cancelled';
      return b;
    },

    // ---- 願望清單 ----
    isHotelKnown: (hotelId) => HOTEL_IDS.includes(hotelId),
    addWishlist: (hotelId) => { const had = wishlist.has(hotelId); wishlist.add(hotelId); return !had; },
    removeWishlist: (hotelId) => wishlist.delete(hotelId),
    listWishlist: () => [...wishlist],

    // ---- 設施預約 ----
    poolOccupancy(date, slot) {
      let sum = 0;
      for (const f of facilityBookings.values()) {
        if (f.type === 'pool' && f.date === date && f.slot === slot) sum += f.persons;
      }
      return sum;
    },
    addFacilityBooking(data, now) {
      if (data.type === 'pool' && this.poolOccupancy(data.date, data.slot) + data.persons > POOL_SLOT_CAPACITY) {
        return { conflict: true };
      }
      facilitySeq += 1;
      const id = `FB-${String(facilitySeq).padStart(4, '0')}`;
      const record = { id, ...data, createdAt: now.toISOString() };
      facilityBookings.set(id, record);
      return { conflict: false, record };
    },
    listFacilityBookings: () => [...facilityBookings.values()],

    reset() {
      bookingSeq = 0; facilitySeq = 0;
      bookings.clear(); facilityBookings.clear(); wishlist.clear();
    },
  };
}

module.exports = { createStore, POOL_SLOT_CAPACITY, HOTEL_IDS };
