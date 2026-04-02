function setMessage(id, text, isError) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = isError ? "#b3003c" : "#1f7a1f";
}

function getEmailFromQuery() {
  const params = new URLSearchParams(window.location.search);
  return params.get("email");
}

// Signup page logic
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(signupForm);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch("/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    setMessage("signupMessage", data.message, !response.ok);

    if (response.ok) {
      signupForm.reset();
    }
  });
}

// Login page logic
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    setMessage("loginMessage", data.message, !response.ok);

    if (response.ok && data.redirectTo) {
      window.location.href = data.redirectTo;
    }
  });
}

// Warden create hostel logic
const createHostelForm = document.getElementById("createHostelForm");
if (createHostelForm) {
  createHostelForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(createHostelForm);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch("/warden/create-hostel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    setMessage("createHostelMessage", data.message, !response.ok);

    if (response.ok) {
      createHostelForm.reset();
    }
  });
}

// Warden view rooms logic
const viewRoomsBtn = document.getElementById("viewRoomsBtn");
if (viewRoomsBtn) {
  viewRoomsBtn.addEventListener("click", async () => {
    const response = await fetch("/warden/rooms");
    const data = await response.json();
    const roomList = document.getElementById("roomList");

    roomList.innerHTML = "";

    if (!data.rooms || data.rooms.length === 0) {
      setMessage("wardenMessage", "No rooms found. Please create hostel first.", true);
      return;
    }

    setMessage("wardenMessage", `Allocation mode: ${data.allocationMode.toUpperCase()}`, false);

    data.rooms.forEach((room) => {
      const card = document.createElement("div");
      card.className = "room-card";
      card.innerHTML = `
        <p><strong>${room.roomNumber}</strong></p>
        <p>Status: ${room.occupied ? "Occupied" : "Available"}</p>
        <p>Student: ${room.studentEmail || "-"}</p>
      `;
      roomList.appendChild(card);
    });
  });
}

// Student dashboard logic
async function loadStudentDashboard() {
  const studentInfo = document.getElementById("studentInfo");
  const studentRoomStatus = document.getElementById("studentRoomStatus");

  if (!studentInfo || !studentRoomStatus) return;

  const email = getEmailFromQuery();
  if (!email) {
    setMessage("studentMessage", "Missing email in URL. Please login again.", true);
    return;
  }

  const response = await fetch(`/student/status?email=${encodeURIComponent(email)}`);
  const data = await response.json();

  if (!response.ok) {
    setMessage("studentMessage", data.message, true);
    return;
  }

  studentInfo.textContent = `Welcome, ${data.student.name} (${data.student.email})`;

  if (!data.hostelCreated) {
    studentRoomStatus.innerHTML = "<p>Hostel not created yet by warden.</p>";
    return;
  }

  if (data.assignedRoom) {
    studentRoomStatus.innerHTML = `<p><strong>Your room:</strong> ${data.assignedRoom.roomNumber}</p>`;
    return;
  }

  if (data.allocationMode === "force") {
    const assignRes = await fetch("/student/auto-assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const assignData = await assignRes.json();

    if (!assignRes.ok) {
      setMessage("studentMessage", assignData.message, true);
      return;
    }

    studentRoomStatus.innerHTML = `<p><strong>Your room:</strong> ${assignData.room.roomNumber}</p>`;
    setMessage("studentMessage", "Room auto-assigned using Force Fill mode.", false);
    return;
  }

  // Custom mode: student must choose room manually
  studentRoomStatus.innerHTML = `
    <p>No room assigned yet.</p>
    <a class="btn" href="/student/choose?email=${encodeURIComponent(email)}">Choose Room</a>
  `;
}

loadStudentDashboard();

// Choose room page logic
async function loadChooseRoomPage() {
  const list = document.getElementById("availableRoomList");
  const backToStudent = document.getElementById("backToStudent");

  if (!list) return;

  const email = getEmailFromQuery();
  if (backToStudent && email) {
    backToStudent.href = `/student?email=${encodeURIComponent(email)}`;
  }

  if (!email) {
    setMessage("chooseRoomMessage", "Missing email in URL. Please login again.", true);
    return;
  }

  const response = await fetch("/student/available-rooms");
  const data = await response.json();

  list.innerHTML = "";

  if (!data.rooms || data.rooms.length === 0) {
    setMessage("chooseRoomMessage", "No rooms available.", true);
    return;
  }

  setMessage("chooseRoomMessage", "Click a room to book it.", false);

  data.rooms.forEach((room) => {
    const card = document.createElement("div");
    card.className = "room-card";

    const roomTitle = document.createElement("p");
    roomTitle.innerHTML = `<strong>${room.roomNumber}</strong>`;

    const selectBtn = document.createElement("button");
    selectBtn.className = "btn";
    selectBtn.textContent = "Select Room";

    selectBtn.addEventListener("click", async () => {
      const selectRes = await fetch("/student/select-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, roomNumber: room.roomNumber })
      });

      const selectData = await selectRes.json();
      setMessage("chooseRoomMessage", selectData.message, !selectRes.ok);

      if (selectRes.ok) {
        window.location.href = `/student?email=${encodeURIComponent(email)}`;
      }
    });

    card.appendChild(roomTitle);
    card.appendChild(selectBtn);
    list.appendChild(card);
  });
}

loadChooseRoomPage();
