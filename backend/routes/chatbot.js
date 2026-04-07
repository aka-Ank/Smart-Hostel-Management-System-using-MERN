const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Room = require('../models/Room');
const Allocation = require('../models/Allocation');
const { protect } = require('../middleware/auth');

const getStats = async () => {
  const totalRooms     = await Room.countDocuments();
  const availableRooms = await Room.countDocuments({ status: 'Available' });
  const fullRooms      = await Room.countDocuments({ status: 'Full' });
  const maintenance    = await Room.countDocuments({ status: 'Maintenance' });
  const totalStudents  = await Student.countDocuments();
  const activeStudents = await Student.countDocuments({ status: 'Active' });
  const feesPending    = await Student.countDocuments({ feesPaid: false, status: 'Active' });
  const feesPaid       = await Student.countDocuments({ feesPaid: true,  status: 'Active' });
  const allocated      = await Student.countDocuments({ room: { $ne: null }, status: 'Active' });
  const unallocated    = activeStudents - allocated;
  return { totalRooms, availableRooms, fullRooms, maintenance, totalStudents, activeStudents, feesPending, feesPaid, allocated, unallocated };
};

router.post('/message', protect, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });
    const msg = message.toLowerCase().trim();
    let reply = '';
    let data  = null;

    if (msg.match(/^(hi|hello|hey|good morning|good evening|good afternoon|namaste)/)) {
      reply = `Hello! 👋 I am the Hostel Assistant. I can help you with:\n\n• Room availability & status\n• Student information\n• Allocation history\n• Fee status\n• Hostel statistics\n\nWhat would you like to know?`;
    }
    else if (msg.includes('total room') || msg.includes('how many room')) {
      const stats = await getStats();
      reply = `🏠 **Room Summary**\n\n• Total Rooms: ${stats.totalRooms}\n• Available: ${stats.availableRooms}\n• Full: ${stats.fullRooms}\n• Maintenance: ${stats.maintenance}`;
    }
    else if (msg.includes('available room') || msg.includes('empty room') || msg.includes('free room')) {
      const stats = await getStats();
      const rooms = await Room.find({ status: 'Available' }).limit(5).select('roomNumber block floor occupants capacity');
      reply = `✅ **Available Rooms**\n\n${stats.availableRooms} rooms are currently available.\n\nSome available rooms:\n`;
      rooms.forEach(r => { reply += `• ${r.roomNumber} (Block ${r.block}, Floor ${r.floor}) — ${r.occupants.length}/${r.capacity} occupied\n`; });
      if (stats.availableRooms > 5) reply += `\n...and ${stats.availableRooms - 5} more rooms available.`;
      data = rooms;
    }
    else if (msg.includes('full room') || msg.includes('occupied room')) {
      const stats = await getStats();
      reply = `🔴 **Full Rooms**\n\n${stats.fullRooms} rooms are currently full out of ${stats.totalRooms} total rooms.`;
    }
    else if (msg.includes('total student') || msg.includes('how many student')) {
      const stats = await getStats();
      reply = `👥 **Student Summary**\n\n• Total Students: ${stats.totalStudents}\n• Active: ${stats.activeStudents}\n• Allocated Rooms: ${stats.allocated}\n• Unallocated: ${stats.unallocated}`;
    }
    else if (msg.includes('fee') || msg.includes('payment') || msg.includes('pending')) {
      const stats = await getStats();
      const pendingStudents = await Student.find({ feesPaid: false, status: 'Active' }).limit(5).select('name studentId course');
      reply = `💰 **Fee Status**\n\n• Fees Paid: ${stats.feesPaid} students\n• Fees Pending: ${stats.feesPending} students\n`;
      if (pendingStudents.length > 0) {
        reply += `\nStudents with pending fees:\n`;
        pendingStudents.forEach(s => { reply += `• ${s.name} (${s.studentId}) — ${s.course}\n`; });
      }
      data = pendingStudents;
    }
    else if (msg.includes('find student') || msg.includes('search student') || msg.includes('student named') || msg.includes('student info')) {
      const words     = message.split(' ');
      const nameIdx   = words.findIndex(w => ['named','called','info','student'].includes(w.toLowerCase()));
      const nameQuery = nameIdx >= 0 ? words.slice(nameIdx + 1).join(' ') : words.slice(-2).join(' ');
      if (nameQuery.length > 1) {
        const students = await Student.find({
          $or: [{ name: { $regex: nameQuery, $options: 'i' } }, { studentId: { $regex: nameQuery, $options: 'i' } }]
        }).populate('room', 'roomNumber block floor').limit(5);
        if (students.length > 0) {
          reply = `🔍 **Search Results for "${nameQuery}"**\n\n`;
          students.forEach(s => { reply += `• **${s.name}** (${s.studentId})\n  Course: ${s.course}, Year ${s.year}\n  Room: ${s.room ? s.room.roomNumber + ' Block ' + s.room.block : 'Not Allocated'}\n  Fees: ${s.feesPaid ? '✅ Paid' : '❌ Pending'}\n\n`; });
          data = students;
        } else {
          reply = `❌ No student found matching "${nameQuery}".`;
        }
      } else {
        reply = `Please tell me the student name or ID. Example: "find student Arjun"`;
      }
    }
    else if (msg.includes('room') && (msg.includes('info') || msg.includes('detail') || msg.includes('status'))) {
      const roomMatch = message.match(/[A-Ea-e]\d{2,4}/i);
      if (roomMatch) {
        const room = await Room.findOne({ roomNumber: roomMatch[0].toUpperCase() }).populate('occupants', 'name studentId course');
        if (room) {
          reply = `🚪 **Room ${room.roomNumber}**\n\n• Block: ${room.block}\n• Floor: ${room.floor}\n• Type: ${room.type}\n• Capacity: ${room.capacity}\n• Occupied: ${room.occupants.length}/${room.capacity}\n• Status: ${room.status}\n• Rent: ₹${room.monthlyRent}/month\n`;
          if (room.occupants.length > 0) {
            reply += `\nOccupants:\n`;
            room.occupants.forEach(s => { reply += `• ${s.name} (${s.studentId})\n`; });
          }
          data = room;
        } else {
          reply = `❌ Room "${roomMatch[0].toUpperCase()}" not found.`;
        }
      } else {
        reply = `Please provide a room number. Example: "room A001 info"`;
      }
    }
    else if (msg.includes('allocation') || msg.includes('history') || msg.includes('recent allocation')) {
      const history = await Allocation.find().populate('student', 'name studentId').populate('room', 'roomNumber block').sort('-createdAt').limit(5);
      if (history.length > 0) {
        reply = `📋 **Recent Allocation History**\n\n`;
        history.forEach(h => {
          const date = new Date(h.createdAt).toLocaleDateString('en-IN');
          const icon = h.action === 'allocated' ? '✅' : '🔄';
          reply += `${icon} ${h.studentName || h.student?.name} (${h.studentId || h.student?.studentId})\n  ${h.action === 'allocated' ? 'Allocated to' : 'Vacated from'} Room ${h.roomNumber || h.room?.roomNumber}\n  Date: ${date}\n\n`;
        });
        data = history;
      } else {
        reply = `No allocation history found yet.`;
      }
    }
    else if (msg.includes('block a') || msg.includes('block b') || msg.includes('block c') || msg.includes('block d') || msg.includes('block e')) {
      const blockMatch = message.match(/block\s*([a-eA-E])/i);
      if (blockMatch) {
        const block = blockMatch[1].toUpperCase();
        const totalInBlock     = await Room.countDocuments({ block });
        const availableInBlock = await Room.countDocuments({ block, status: 'Available' });
        const fullInBlock      = await Room.countDocuments({ block, status: 'Full' });
        reply = `🏢 **Building ${block} Summary**\n\n• Total Rooms: ${totalInBlock}\n• Available: ${availableInBlock}\n• Full: ${fullInBlock}\n• Maintenance: ${totalInBlock - availableInBlock - fullInBlock}`;
      }
    }
    else if (msg.includes('stat') || msg.includes('overview') || msg.includes('summary') || msg.includes('dashboard')) {
      const stats = await getStats();
      const occupancyRate = Math.round((stats.allocated / (stats.totalRooms * 3)) * 100);
      reply = `📊 **Hostel Overview**\n\n🏠 **Rooms**\n• Total: ${stats.totalRooms}\n• Available: ${stats.availableRooms}\n• Full: ${stats.fullRooms}\n• Maintenance: ${stats.maintenance}\n\n👥 **Students**\n• Total: ${stats.totalStudents}\n• Active: ${stats.activeStudents}\n• Allocated: ${stats.allocated}\n• Unallocated: ${stats.unallocated}\n\n💰 **Fees**\n• Paid: ${stats.feesPaid}\n• Pending: ${stats.feesPending}\n\n📈 **Occupancy Rate: ${occupancyRate}%**`;
    }
    else if (msg.includes('maintenance')) {
      const rooms = await Room.find({ status: 'Maintenance' }).select('roomNumber block floor');
      if (rooms.length > 0) {
        reply = `🔧 **Rooms Under Maintenance**\n\n${rooms.length} room(s):\n\n`;
        rooms.forEach(r => { reply += `• Room ${r.roomNumber} — Block ${r.block}, Floor ${r.floor}\n`; });
      } else {
        reply = `✅ No rooms are currently under maintenance.`;
      }
    }
    else if (msg.includes('unallocated') || msg.includes('no room') || msg.includes('without room')) {
      const students = await Student.find({ room: null, status: 'Active' }).select('name studentId course year').limit(10);
      if (students.length > 0) {
        reply = `⚠️ **Unallocated Students** (${students.length} total)\n\n`;
        students.forEach(s => { reply += `• ${s.name} (${s.studentId}) — ${s.course}, Year ${s.year}\n`; });
        if (students.length === 10) reply += `\n...and more. Go to Allocations page to see all.`;
      } else {
        reply = `✅ All active students have been allocated rooms!`;
      }
      data = students;
    }
    else if (msg.includes('help') || msg.includes('what can you') || msg.includes('commands')) {
      reply = `🤖 **Hostel Assistant Help**\n\n📊 **Statistics**\n• "Show hostel overview"\n• "Total rooms"\n• "Total students"\n\n🏠 **Rooms**\n• "Available rooms"\n• "Room A001 info"\n• "Block A summary"\n• "Maintenance rooms"\n\n👥 **Students**\n• "Find student Arjun"\n• "Unallocated students"\n• "Fee pending students"\n\n📋 **History**\n• "Show allocation history"`;
    }
    else {
      reply = `🤔 I didn't understand that. Try:\n\n• "Show hostel overview"\n• "Available rooms"\n• "Find student [name]"\n• "Fee pending students"\n\nType **"help"** to see all commands.`;
    }

    res.json({ success: true, reply, data });
  } catch (error) {
    console.error('Chatbot error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
