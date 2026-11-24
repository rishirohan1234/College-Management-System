
// Check whether the admin is logged in
async function checkLogin() {

    try {

        const response = await fetch("/api/session");

        const result = await response.json();

        if (!result.authenticated) {

            window.location.href = "/login.html";
            return;

        }

        // Display logged-in username if the element exists
        const usernameElement = document.getElementById("adminUsername");

        if (usernameElement) {
            usernameElement.textContent = result.username;
        }

    } catch (error) {

        console.error("Session check failed:", error);

        window.location.href = "/login.html";

    }

}


// Logout function
async function logout() {

    try {

        const response = await fetch("/api/logout", {
            method: "POST"
        });

        if (response.ok) {

            window.location.href = "/login.html";

        } else {

            alert("Unable to logout. Please try again.");

        }

    } catch (error) {

        alert("Something went wrong while logging out.");

        console.error(error);

    }

}


// Check login when the page loads
checkLogin();
