require('dotenv').config();
const mongoose = require('mongoose');
const Admin   = require('./models/Admin');
const Building = require('./models/Building');
const Room    = require('./models/Room');
const Student = require('./models/Student');
const { buildRoomNumber } = require('./utils/roomUtils');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostel_management');
  console.log('✅ Connected to MongoDB');
};

const seedData = async () => {
  await connectDB();

  await Admin.deleteMany({});
  await Building.deleteMany({});
  await Room.deleteMany({});
  await Student.deleteMany({});
  console.log('🗑  Cleared existing data');

  await Admin.create({
    name: 'Super Admin',
    email: 'admin@hostel.com',
    password: 'admin123',
    role: 'superadmin',
    isActive: true,
  });
  console.log('👤 Admin created: admin@hostel.com');

  // ─────────────────────────────────────────────────────────────
  //  HOSTEL STRUCTURE
  //  5 Buildings  : A, B, C, D, E
  //  11 Floors    : Floor 1 → Floor 11
  //  14 Rooms/floor
  //  Capacity     : 3 students per room
  //
  //  Room number format:
  //    Floor 1  → A101, A102 ... A114
  //    Floor 2  → A201, A202 ... A214
  //    Floor 10 → A1001, A1002 ... A1014
  //    Floor 11 → A1101, A1102 ... A1114
  //
  //  Total rooms  : 5 × 11 × 14 = 770
  //  Total beds   : 770 × 3     = 2,310
  // ─────────────────────────────────────────────────────────────

  const BUILDINGS       = ['A', 'B', 'C', 'D', 'E'];
  const FLOORS          = 11;   // Floor 1 to Floor 11
  const ROOMS_PER_FLOOR = 14;
  const CAPACITY        = 3;
  const ROOM_TYPE       = 'Triple';
  const MONTHLY_RENT    = 3000;

  const buildingDocs = await Building.insertMany(
    BUILDINGS.map((name) => ({
      name,
      displayName: name,
      type: 'Unisex',
      floors: FLOORS,
      roomsPerFloor: ROOMS_PER_FLOOR,
      defaultRoomType: ROOM_TYPE,
      defaultCapacity: CAPACITY,
      defaultMonthlyRent: MONTHLY_RENT,
    }))
  );

  const buildingByName = new Map(buildingDocs.map((building) => [building.name, building]));
  const roomsData = [];

  for (const block of BUILDINGS) {
    for (let floor = 1; floor <= FLOORS; floor++) {
      for (let roomNum = 1; roomNum <= ROOMS_PER_FLOOR; roomNum++) {

        // Format: A101, A102...A114, A201...A1114
        const roomNumber = buildRoomNumber(block, floor, roomNum);

        // Amenities vary by floor
        const amenities = {
          hasWifi:             true,
          hasAC:               floor >= 5,
          hasAttachedBathroom: roomNum <= 7,
          hasBalcony:          floor >= 8 && roomNum >= 8,
          hasTV:               floor === 1 || floor >= 9,
        };

        roomsData.push({
          roomNumber,
          floor,
          block,
          buildingName: block,
          building: buildingByName.get(block)._id,
          roomNumberOnFloor: roomNum,
          type:        ROOM_TYPE,
          capacity:    CAPACITY,
          monthlyRent: MONTHLY_RENT,
          amenities,
          status: 'Available',
        });
      }
    }
  }

  // Insert in batches of 100
  const BATCH_SIZE = 100;
  let insertedRooms = [];
  for (let i = 0; i < roomsData.length; i += BATCH_SIZE) {
    const batch = await Room.insertMany(roomsData.slice(i, i + BATCH_SIZE));
    insertedRooms = insertedRooms.concat(batch);
  }

  const totalBeds = insertedRooms.length * CAPACITY;
  console.log(`🚪 ${insertedRooms.length} rooms created`);
  console.log(`   → ${BUILDINGS.length} buildings × ${FLOORS} floors × ${ROOMS_PER_FLOOR} rooms = ${insertedRooms.length} rooms`);
  console.log(`   → Room format: A-1-01...A-11-14`);
  console.log(`   → Each room: ${CAPACITY} students → Total bed capacity: ${totalBeds}`);

  // Sample students
  const studentsData = [
    { studentId: 'STU001', name: 'Arjun Sharma',  email: 'arjun@student.com',  phone: '9876543210', password: 'student123', dateOfBirth: '2002-05-15', gender: 'Male',   course: 'B.Tech Computer Science', year: 3, guardianName: 'Rajesh Sharma',  guardianPhone: '9876543200', status: 'Active', feesPaid: true  },
    { studentId: 'STU002', name: 'Priya Patel',   email: 'priya@student.com',   phone: '9876543211', password: 'student123', dateOfBirth: '2003-08-22', gender: 'Female', course: 'B.Tech Electronics',      year: 2, guardianName: 'Suresh Patel',   guardianPhone: '9876543201', status: 'Active', feesPaid: true  },
    { studentId: 'STU003', name: 'Rahul Verma',   email: 'rahul@student.com',   phone: '9876543212', password: 'student123', dateOfBirth: '2001-11-10', gender: 'Male',   course: 'MBA Finance',             year: 1, guardianName: 'Anil Verma',     guardianPhone: '9876543202', status: 'Active', feesPaid: false },
    { studentId: 'STU004', name: 'Sneha Gupta',   email: 'sneha@student.com',   phone: '9876543213', password: 'student123', dateOfBirth: '2002-03-18', gender: 'Female', course: 'B.Sc Mathematics',        year: 3, guardianName: 'Vijay Gupta',    guardianPhone: '9876543203', status: 'Active', feesPaid: true  },
    { studentId: 'STU005', name: 'Kiran Reddy',   email: 'kiran@student.com',   phone: '9876543214', password: 'student123', dateOfBirth: '2003-07-05', gender: 'Male',   course: 'B.Tech Mechanical',       year: 2, guardianName: 'Ravi Reddy',     guardianPhone: '9876543204', status: 'Active', feesPaid: false },
    { studentId: 'STU006', name: 'Meera Nair',    email: 'meera@student.com',   phone: '9876543215', password: 'student123', dateOfBirth: '2001-12-25', gender: 'Female', course: 'BCA',                     year: 4, guardianName: 'Suresh Nair',    guardianPhone: '9876543205', status: 'Active', feesPaid: true  },
  ];
  const students = await Student.insertMany(studentsData);
  console.log(`👥 ${students.length} sample students created`);

  // Allocate 3 students to Room A101 (full)
  const firstRoom = insertedRooms[0]; // A101
  for (let i = 0; i < 3; i++) {
    firstRoom.occupants.push(students[i]._id);
    students[i].room = firstRoom._id;
    await students[i].save();
  }
  await firstRoom.save();
  console.log(`🔗 3 students allocated to room ${firstRoom.roomNumber} (full)`);

  // Allocate 1 student to Room A102 (2 slots remaining)
  const secondRoom = insertedRooms[1]; // A102
  secondRoom.occupants.push(students[3]._id);
  students[3].room = secondRoom._id;
  await students[3].save();
  await secondRoom.save();
  console.log(`🔗 1 student allocated to room ${secondRoom.roomNumber} (2 slots remaining)`);

  console.log('\n✅ Seed complete!');
  console.log('📧 Admin login : admin@hostel.com');
  console.log('🔑 Password    : admin123');
  console.log('🎓 Student demo: STU001 / student123');
  process.exit(0);
};

seedData().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
