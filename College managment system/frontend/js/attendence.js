
let attendanceRecords = [];
let students = [];

const attendanceForm = document.getElementById("attendanceForm");
const attendanceTable = document.getElementById("attendanceTable");
const percentageTable = document.getElementById("percentageTable");

// Set today's date
document.getElementById("attendanceDate").value =
    new Date().toISOString().split("T")[0];


// Load students into dropdown
async function loadStudents() {

    try {
        const response = await fetch("/api/students");

        if (!response.ok) {
            throw new Error("Unable to load students");
        }

        students = await response.json();

        const dropdown = document.getElementById("studentSelect");

        dropdown.innerHTML = '<option value="">Select Student</option>';

        students.forEach(student => {

            const option = document.createElement("option");

            option.value = student.id;
            option.textContent = `${student.name} (${student.id})`;

            dropdown.appendChild(option);
        });

    } catch (error) {
        alert(error.message);
    }
}


// Load attendance records
async function loadAttendance() {

    try {
        const response = await fetch("/api/attendance");

        if (!response.ok) {
            throw new Error("Unable to load attendance");
        }

        attendanceRecords = await response.json();

        displayAttendance(attendanceRecords);
        updateSummary();
        calculatePercentages();

    } catch (error) {
        attendanceTable.innerHTML =
            `<tr><td colspan="5">${error.message}</td></tr>`;
    }
}


// Display attendance records
function displayAttendance(records) {

    attendanceTable.innerHTML = "";

    if (records.length === 0) {
        attendanceTable.innerHTML =
            '<tr><td colspan="5">No attendance records found</td></tr>';
        return;
    }

    records.slice().reverse().forEach(record => {

        const row = document.createElement("tr");

        [
            record.id,
            record.student_name,
            record.student_id,
            record.date,
            record.status
        ].forEach(value => {

            const cell = document.createElement("td");
            cell.textContent = value ?? "";
            row.appendChild(cell);

        });

        attendanceTable.appendChild(row);
    });
}


// Save attendance
attendanceForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const studentId = document.getElementById("studentSelect").value;

    const student = students.find(item => item.id === studentId);

    if (!student) {
        alert("Please select a valid student.");
        return;
    }

    const attendanceData = {
        student_id: student.id,
        student_name: student.name,
        date: document.getElementById("attendanceDate").value,
        status: document.getElementById("attendanceStatus").value
    };

    try {

        const response = await fetch("/api/attendance", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(attendanceData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to save attendance");
        }

        alert("Attendance saved successfully!");

        attendanceForm.reset();

        document.getElementById("attendanceDate").value =
            new Date().toISOString().split("T")[0];

        await loadAttendance();

    } catch (error) {
        alert(error.message);
    }
});


// Update summary cards
function updateSummary() {

    const present = attendanceRecords.filter(
        record => record.status === "Present"
    ).length;

    const absent = attendanceRecords.filter(
        record => record.status === "Absent"
    ).length;

    document.getElementById("totalRecords").textContent =
        attendanceRecords.length;

    document.getElementById("presentCount").textContent = present;

    document.getElementById("absentCount").textContent = absent;
}


// Calculate student attendance percentage
function calculatePercentages() {

    percentageTable.innerHTML = "";

    if (students.length === 0) {
        percentageTable.innerHTML =
            '<tr><td colspan="4">No students available</td></tr>';
        return;
    }

    students.forEach(student => {

        const records = attendanceRecords.filter(
            record => record.student_id === student.id
        );

        const total = records.length;

        const present = records.filter(
            record => record.status === "Present"
        ).length;

        const percentage = total > 0
            ? ((present / total) * 100).toFixed(2)
            : "0.00";

        const row = document.createElement("tr");

        const values = [
            student.name,
            total,
            present,
            percentage + "%"
        ];

        values.forEach(value => {

            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);

        });

        percentageTable.appendChild(row);
    });
}


// Search attendance
document.getElementById("searchAttendance")
    .addEventListener("input", function() {

        const value = this.value.toLowerCase();

        const filtered = attendanceRecords.filter(record =>
            record.student_name.toLowerCase().includes(value) ||
            record.student_id.toLowerCase().includes(value)
        );

        displayAttendance(filtered);
    });


// Initial loading
async function initializeAttendance() {
    await loadStudents();
    await loadAttendance();
}

initializeAttendance();
