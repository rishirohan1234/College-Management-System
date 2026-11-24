
async function loadDashboard() {

    try {

        // Request data from Python backend
        const response = await fetch("/api/dashboard");

        const data = await response.json();

        // Update dashboard statistics
        document.getElementById("studentCount").textContent =
            data.students;

        document.getElementById("facultyCount").textContent =
            data.faculty;

        document.getElementById("courseCount").textContent =
            data.courses;

        document.getElementById("attendanceCount").textContent =
            data.attendance + "%";

        // Display recent students
        const studentTable =
            document.getElementById("studentTable");

        if (data.recent_students.length === 0) {

            studentTable.innerHTML = `
                <tr>
                    <td colspan="4">No students found</td>
                </tr>
            `;

            return;
        }

        studentTable.innerHTML =
            data.recent_students.map(student => `
                <tr>
                    <td>${student.id}</td>
                    <td>${student.name}</td>
                    <td>${student.department}</td>
                    <td>${student.year}</td>
                </tr>
            `).join("");

    }

    catch (error) {

        console.error("Dashboard Error:", error);

    }

}

// Load dashboard when page opens
loadDashboard();
