
let editingId = null;

// Load students from Python backend
async function loadStudents() {

    const response = await fetch("/api/students");
    const students = await response.json();

    const search = document
        .getElementById("searchInput")
        .value.toLowerCase();

    const filtered = students.filter(student =>
        student.name.toLowerCase().includes(search) ||
        student.id.toLowerCase().includes(search) ||
        student.department.toLowerCase().includes(search)
    );

    const table = document.getElementById("studentTable");

    table.innerHTML = filtered.map(student => `
        <tr>
            <td>${student.id}</td>
            <td>${student.name}</td>
            <td>${student.department}</td>
            <td>${student.year}</td>
            <td>
                <button class="action-btn"
                    onclick="editStudent('${student.id}')">
                    Edit
                </button>

                <button class="action-btn delete-btn"
                    onclick="deleteStudent('${student.id}')">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");

}

// Open form
function openForm() {

    editingId = null;

    document.getElementById("formTitle").textContent =
        "Add Student";

    document.getElementById("studentId").disabled = false;

    document.getElementById("studentId").value = "";
    document.getElementById("studentName").value = "";
    document.getElementById("department").value = "";
    document.getElementById("year").value = "";

    document.getElementById("studentModal").style.display =
        "flex";

}

// Close form
function closeForm() {

    document.getElementById("studentModal").style.display =
        "none";

}

// Save student
async function saveStudent() {

    const student = {

        id: document.getElementById("studentId").value.trim(),
        name: document.getElementById("studentName").value.trim(),
        department: document.getElementById("department").value,
        year: document.getElementById("year").value

    };

    if (!student.id || !student.name ||
        !student.department || !student.year) {

        alert("Please fill all fields");
        return;

    }

    const url = editingId
        ? `/api/students/${editingId}`
        : "/api/students";

    const method = editingId ? "PUT" : "POST";

    const response = await fetch(url, {

        method: method,

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify(student)

    });

    const result = await response.json();

    if (!response.ok) {
        alert(result.error || "Unable to save student");
        return;
    }

    closeForm();
    loadStudents();

}

// Edit student
async function editStudent(id) {

    const response = await fetch("/api/students");
    const students = await response.json();

    const student = students.find(item => item.id === id);

    if (!student) return;

    editingId = id;

    document.getElementById("formTitle").textContent =
        "Edit Student";

    document.getElementById("studentId").value = student.id;
    document.getElementById("studentId").disabled = true;

    document.getElementById("studentName").value =
        student.name;

    document.getElementById("department").value =
        student.department;

    document.getElementById("year").value =
        student.year;

    document.getElementById("studentModal").style.display =
        "flex";

}

// Delete student
async function deleteStudent(id) {

    if (!confirm("Are you sure you want to delete this student?")) {
        return;
    }

    const response = await fetch(`/api/students/${id}`, {
        method: "DELETE"
    });

    const result = await response.json();

    if (!response.ok) {
        alert(result.error || "Unable to delete student");
        return;
    }

    loadStudents();

}

// Initial loading
loadStudents();
