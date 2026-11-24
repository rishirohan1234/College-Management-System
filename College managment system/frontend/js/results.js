
let students = [];
let results = [];

const resultForm = document.getElementById("resultForm");
const resultTable = document.getElementById("resultTable");


// Load students into dropdown
async function loadStudents() {

    try {
        const response = await fetch("/api/students");

        if (!response.ok) {
            throw new Error("Unable to load students");
        }

        students = await response.json();

        const dropdown = document.getElementById("studentSelect");

        dropdown.innerHTML =
            '<option value="">Select Student</option>';

        students.forEach(student => {

            const option = document.createElement("option");

            option.value = student.id;
            option.textContent =
                `${student.name} (${student.id})`;

            dropdown.appendChild(option);
        });

    } catch (error) {
        alert(error.message);
    }
}


// Load examination results
async function loadResults() {

    try {
        const response = await fetch("/api/results");

        if (!response.ok) {
            throw new Error("Unable to load results");
        }

        results = await response.json();

        displayResults(results);
        updateSummary();

    } catch (error) {
        resultTable.innerHTML =
            `<tr><td colspan="8">${error.message}</td></tr>`;
    }
}


// Calculate grade
function calculateGrade(percentage) {

    if (percentage >= 90) return "A+";
    if (percentage >= 80) return "A";
    if (percentage >= 70) return "B";
    if (percentage >= 60) return "C";
    if (percentage >= 50) return "D";
    return "F";
}


// Display results
function displayResults(data) {

    resultTable.innerHTML = "";

    if (data.length === 0) {
        resultTable.innerHTML =
            '<tr><td colspan="8">No results found</td></tr>';
        return;
    }

    data.slice().reverse().forEach(result => {

        const row = document.createElement("tr");

        const values = [
            result.id,
            result.student_name,
            result.exam,
            result.subject,
            result.marks,
            result.max_marks,
            result.percentage + "%",
            result.grade
        ];

        values.forEach(value => {

            const cell = document.createElement("td");
            cell.textContent = value ?? "";
            row.appendChild(cell);

        });

        resultTable.appendChild(row);
    });
}


// Add examination result
resultForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const studentId =
        document.getElementById("studentSelect").value;

    const student = students.find(
        item => item.id === studentId
    );

    const exam =
        document.getElementById("examName").value.trim();

    const subject =
        document.getElementById("subject").value.trim();

    const marks =
        Number(document.getElementById("marks").value);

    const maxMarks =
        Number(document.getElementById("maxMarks").value);

    if (!student) {
        alert("Please select a student.");
        return;
    }

    if (
        !exam ||
        !subject ||
        !Number.isFinite(marks) ||
        !Number.isFinite(maxMarks) ||
        maxMarks <= 0 ||
        marks < 0 ||
        marks > maxMarks
    ) {
        alert("Please enter valid examination details and marks.");
        return;
    }

    const percentage = Number(
        ((marks / maxMarks) * 100).toFixed(2)
    );

    const grade = calculateGrade(percentage);

    const resultData = {
        student_id: student.id,
        student_name: student.name,
        exam: exam,
        subject: subject,
        marks: marks,
        max_marks: maxMarks,
        percentage: percentage,
        grade: grade
    };

    try {

        const response = await fetch("/api/results", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(resultData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.error || "Unable to save result"
            );
        }

        alert("Examination result saved successfully!");

        resultForm.reset();

        document.getElementById("maxMarks").value = 100;

        await loadResults();

    } catch (error) {
        alert(error.message);
    }
});


// Update summary cards
function updateSummary() {

    const total = results.length;

    const average = total > 0
        ? (
            results.reduce(
                (sum, result) => sum + Number(result.percentage || 0),
                0
            ) / total
        ).toFixed(2)
        : "0.00";

    const passed = results.filter(
        result => Number(result.percentage) >= 40
    ).length;

    document.getElementById("totalResults").textContent = total;

    document.getElementById("averagePercentage").textContent =
        average + "%";

    document.getElementById("passCount").textContent = passed;
}


// Search results
document.getElementById("searchResult")
    .addEventListener("input", function() {

        const value = this.value.toLowerCase();

        const filtered = results.filter(result =>

            result.student_name.toLowerCase().includes(value) ||
            result.student_id.toLowerCase().includes(value) ||
            result.subject.toLowerCase().includes(value) ||
            result.exam.toLowerCase().includes(value)

        );

        displayResults(filtered);
    });


// Initial loading
async function initializeResults() {

    await loadStudents();
    await loadResults();

}

initializeResults();
