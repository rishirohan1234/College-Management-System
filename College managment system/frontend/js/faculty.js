
let editingFacultyId = null;

// Load faculty records
async function loadFaculty() {

    try {

        const response = await fetch("/api/faculty");

        const faculty = await response.json();

        const search = document
            .getElementById("searchInput")
            .value.toLowerCase();

        // Search faculty
        const filtered = faculty.filter(member =>

            member.name.toLowerCase().includes(search) ||

            member.id.toLowerCase().includes(search) ||

            member.department.toLowerCase().includes(search)

        );

        const table = document.getElementById("facultyTable");

        if (filtered.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="5">No faculty found</td>
                </tr>
            `;

            return;
        }

        table.innerHTML = filtered.map(member => `

            <tr>
                <td>${member.id}</td>

                <td>${member.name}</td>

                <td>${member.department}</td>

                <td>${member.designation}</td>

                <td>
                    <button
                        class="action-btn"
                        onclick="editFaculty('${member.id}')">
                        Edit
                    </button>

                    <button
                        class="action-btn delete-btn"
                        onclick="deleteFaculty('${member.id}')">
                        Delete
                    </button>
                </td>
            </tr>

        `).join("");

    } catch (error) {

        console.error("Faculty loading error:", error);

        document.getElementById("facultyTable").innerHTML = `
            <tr>
                <td colspan="5">Unable to load faculty records</td>
            </tr>
        `;
    }
}


// Open faculty form
function openFacultyForm() {

    editingFacultyId = null;

    document.getElementById("formTitle").textContent =
        "Add Faculty";

    document.getElementById("facultyId").disabled = false;

    document.getElementById("facultyId").value = "";

    document.getElementById("facultyName").value = "";

    document.getElementById("department").value = "";

    document.getElementById("designation").value = "";

    document.getElementById("facultyModal").style.display =
        "flex";
}


// Close faculty form
function closeFacultyForm() {

    document.getElementById("facultyModal").style.display =
        "none";
}


// Save faculty
async function saveFaculty() {

    const member = {

        id: document.getElementById("facultyId").value.trim(),

        name: document.getElementById("facultyName").value.trim(),

        department: document.getElementById("department").value,

        designation: document.getElementById("designation").value

    };

    if (
        !member.id ||
        !member.name ||
        !member.department ||
        !member.designation
    ) {

        alert("Please fill all fields");

        return;
    }

    try {

        const url = editingFacultyId
            ? `/api/faculty/${encodeURIComponent(editingFacultyId)}`
            : "/api/faculty";

        const method = editingFacultyId ? "PUT" : "POST";

        const response = await fetch(url, {

            method: method,

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(member)

        });

        const result = await response.json();

        if (!response.ok) {

            alert(result.error || "Unable to save faculty");

            return;
        }

        alert(result.message);

        closeFacultyForm();

        loadFaculty();

    } catch (error) {

        alert("Server connection failed");

        console.error(error);
    }
}


// Edit faculty
async function editFaculty(id) {

    try {

        const response = await fetch("/api/faculty");

        const faculty = await response.json();

        const member = faculty.find(item => item.id === id);

        if (!member) return;

        editingFacultyId = id;

        document.getElementById("formTitle").textContent =
            "Edit Faculty";

        document.getElementById("facultyId").value = member.id;

        document.getElementById("facultyId").disabled = true;

        document.getElementById("facultyName").value =
            member.name;

        document.getElementById("department").value =
            member.department;

        document.getElementById("designation").value =
            member.designation;

        document.getElementById("facultyModal").style.display =
            "flex";

    } catch (error) {

        alert("Unable to load faculty details");

    }
}


// Delete faculty
async function deleteFaculty(id) {

    const confirmDelete = confirm(
        "Are you sure you want to delete this faculty member?"
    );

    if (!confirmDelete) return;

    try {

        const response = await fetch(
            `/api/faculty/${encodeURIComponent(id)}`,
            {
                method: "DELETE"
            }
        );

        const result = await response.json();

        if (!response.ok) {

            alert(result.error || "Unable to delete faculty");

            return;
        }

        alert(result.message);

        loadFaculty();

    } catch (error) {

        alert("Server connection failed");

    }
}


// Load records when page opens
loadFaculty();
