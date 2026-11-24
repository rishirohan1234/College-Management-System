
let courses = [];

const courseTable = document.getElementById("courseTable");
const courseModal = document.getElementById("courseModal");
const courseForm = document.getElementById("courseForm");

// Load courses from Python backend
async function loadCourses() {
    try {
        const response = await fetch("/api/courses");

        if (!response.ok) {
            throw new Error("Unable to load courses");
        }

        courses = await response.json();
        displayCourses(courses);

    } catch (error) {
        courseTable.innerHTML =
            `<tr><td colspan="7">${error.message}</td></tr>`;
    }
}

// Display courses in table
function displayCourses(data) {
    courseTable.innerHTML = "";

    if (data.length === 0) {
        courseTable.innerHTML =
            `<tr><td colspan="7">No courses found</td></tr>`;
        return;
    }

    data.forEach(course => {
        const row = document.createElement("tr");

        [
            course.id,
            course.name,
            course.code,
            course.department,
            course.credits,
            course.duration
        ].forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value ?? "";
            row.appendChild(cell);
        });

        const actions = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.onclick = () => editCourse(course.id);

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.onclick = () => deleteCourse(course.id);

        actions.append(editButton, deleteButton);
        row.appendChild(actions);

        courseTable.appendChild(row);
    });
}

// Open empty form
function openCourseForm() {
    courseForm.reset();
    document.getElementById("courseId").value = "";
    document.getElementById("modalTitle").textContent = "Add Course";
    courseModal.style.display = "block";
}

// Close form
function closeCourseForm() {
    courseModal.style.display = "none";
}

// Add or update course
courseForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const id = document.getElementById("courseId").value;

    const courseData = {
        name: document.getElementById("courseName").value.trim(),
        code: document.getElementById("courseCode").value.trim(),
        department: document.getElementById("courseDepartment").value,
        credits: Number(document.getElementById("courseCredits").value),
        duration: document.getElementById("courseDuration").value.trim()
    };

    try {
        let response;

        if (id) {
            response = await fetch(`/api/courses/${encodeURIComponent(id)}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(courseData)
            });
        } else {
            response = await fetch("/api/courses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(courseData)
            });
        }

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to save course");
        }

        closeCourseForm();
        loadCourses();

    } catch (error) {
        alert(error.message);
    }
});

// Edit course
function editCourse(id) {
    const course = courses.find(item => item.id === id);

    if (!course) return;

    document.getElementById("courseId").value = course.id;
    document.getElementById("courseName").value = course.name;
    document.getElementById("courseCode").value = course.code;
    document.getElementById("courseDepartment").value = course.department;
    document.getElementById("courseCredits").value = course.credits;
    document.getElementById("courseDuration").value = course.duration;

    document.getElementById("modalTitle").textContent = "Edit Course";

    courseModal.style.display = "block";
}

// Delete course
async function deleteCourse(id) {
    if (!confirm("Are you sure you want to delete this course?")) {
        return;
    }

    try {
        const response = await fetch(
            `/api/courses/${encodeURIComponent(id)}`,
            { method: "DELETE" }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to delete course");
        }

        loadCourses();

    } catch (error) {
        alert(error.message);
    }
}

// Search courses
function searchCourses() {
    const searchValue = document
        .getElementById("searchCourse")
        .value.toLowerCase();

    const filteredCourses = courses.filter(course =>
        course.name.toLowerCase().includes(searchValue) ||
        course.code.toLowerCase().includes(searchValue) ||
        course.department.toLowerCase().includes(searchValue)
    );

    displayCourses(filteredCourses);
}

// Initial load
loadCourses();
