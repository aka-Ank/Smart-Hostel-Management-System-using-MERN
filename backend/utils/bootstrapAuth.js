const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Student = require('../models/Student');

const DEFAULT_ADMIN = {
  name: 'Super Admin',
  email: 'admin@hostel.com',
  password: 'admin123',
  role: 'superadmin',
  isActive: true,
};

const DEFAULT_STUDENT = {
  studentId: 'STU001',
  name: 'Demo Student',
  email: 'student@hostel.com',
  phone: '9876543210',
  password: 'student123',
  dateOfBirth: new Date('2003-01-15'),
  gender: 'Male',
  course: 'B.Tech Computer Science',
  year: 2,
  guardianName: 'Demo Guardian',
  guardianPhone: '9876543200',
  status: 'Active',
  feesPaid: true,
};

async function bootstrapAuth() {
  const adminCount = await Admin.countDocuments();
  if (adminCount === 0) {
    await Admin.create(DEFAULT_ADMIN);
    console.log('Created default admin account: admin@hostel.com / admin123');
  }

  const studentsWithoutPassword = await Student.find({
    $or: [
      { password: { $exists: false } },
      { password: null },
      { password: '' },
    ],
  }).select('_id');

  if (studentsWithoutPassword.length > 0) {
    const hashedPassword = await bcrypt.hash(DEFAULT_STUDENT.password, 12);
    await Student.updateMany(
      { _id: { $in: studentsWithoutPassword.map((student) => student._id) } },
      { $set: { password: hashedPassword } }
    );
    console.log(`Backfilled password for ${studentsWithoutPassword.length} student account(s) using default password: ${DEFAULT_STUDENT.password}`);
  }

  const demoStudent = await Student.findOne({
    $or: [
      { studentId: DEFAULT_STUDENT.studentId },
      { email: DEFAULT_STUDENT.email },
    ],
  });

  if (!demoStudent) {
    let candidate = { ...DEFAULT_STUDENT };
    let suffix = 1;

    while (await Student.findOne({ $or: [{ email: candidate.email }, { phone: candidate.phone }, { studentId: candidate.studentId }] })) {
      suffix += 1;
      candidate = {
        ...DEFAULT_STUDENT,
        studentId: `STU${String(suffix).padStart(3, '0')}`,
        email: `student${suffix}@hostel.com`,
        phone: `90000000${String(suffix).padStart(2, '0')}`,
      };
    }

    await Student.create(candidate);
    console.log(`Created default student account: ${candidate.studentId} / student123`);
  }
}

module.exports = bootstrapAuth;
