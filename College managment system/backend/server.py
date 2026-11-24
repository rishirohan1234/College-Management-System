
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
import json
import uuid
import hashlib
import hmac
import secrets
import time
from http.cookies import SimpleCookie


# --------------------------------------------------
# PROJECT PATHS
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
DATA_DIR = BASE_DIR / "data"

STUDENTS_FILE = DATA_DIR / "students.json"
FACULTY_FILE = DATA_DIR / "faculty.json"
COURSES_FILE = DATA_DIR / "courses.json"
ATTENDANCE_FILE = DATA_DIR / "attendance.json"
RESULTS_FILE = DATA_DIR / "results.json"
ADMIN_FILE = DATA_DIR / "admin.json"


# --------------------------------------------------
# SESSION SETTINGS
# --------------------------------------------------

SESSION_STORE = {}
SESSION_DURATION = 8 * 60 * 60  # 8 hours

PASSWORD_ITERATIONS = 200000


# --------------------------------------------------
# INITIALIZE JSON FILES AND ADMIN ACCOUNT
# --------------------------------------------------

def initialize_files():

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    files = [
        STUDENTS_FILE,
        FACULTY_FILE,
        COURSES_FILE,
        ATTENDANCE_FILE,
        RESULTS_FILE
    ]

    for file in files:

        if not file.exists():
            file.write_text("[]", encoding="utf-8")

    # Create the default admin account only once.
    # Password: Admin@123

    if not ADMIN_FILE.exists():

        username = "admin"
        password = "Admin@123"

        salt = secrets.token_bytes(16)

        password_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            PASSWORD_ITERATIONS
        ).hex()

        admin_data = {
            "username": username,
            "salt": salt.hex(),
            "password_hash": password_hash
        }

        ADMIN_FILE.write_text(
            json.dumps(admin_data, indent=4),
            encoding="utf-8"
        )


# --------------------------------------------------
# JSON FILE FUNCTIONS
# --------------------------------------------------

def read_data(file):

    try:

        with open(file, "r", encoding="utf-8") as f:
            return json.load(f)

    except (FileNotFoundError, json.JSONDecodeError):
        return []


def write_data(file, data):

    with open(file, "w", encoding="utf-8") as f:

        json.dump(data, f, indent=4)


# --------------------------------------------------
# HTTP REQUEST HANDLER
# --------------------------------------------------

class CollegeHandler(SimpleHTTPRequestHandler):

    def __init__(self, *args, **kwargs):

        super().__init__(
            *args,
            directory=str(FRONTEND_DIR),
            **kwargs
        )

    # --------------------------------------------------
    # COMMON RESPONSE FUNCTIONS
    # --------------------------------------------------

    def send_json(self, data, status=200, headers=None):

        response = json.dumps(data).encode("utf-8")

        self.send_response(status)

        self.send_header(
            "Content-Type",
            "application/json"
        )

        self.send_header(
            "Content-Length",
            str(len(response))
        )

        if headers:

            for key, value in headers.items():
                self.send_header(key, value)

        self.end_headers()
        self.wfile.write(response)

    def read_json_body(self):

        try:

            content_length = int(
                self.headers.get("Content-Length", 0)
            )

            body = self.rfile.read(content_length)

            if not body:
                return {}

            return json.loads(body.decode("utf-8"))

        except (ValueError, json.JSONDecodeError):
            return None

    def redirect_to(self, location):

        self.send_response(302)
        self.send_header("Location", location)
        self.send_header("Content-Length", "0")
        self.end_headers()

    # --------------------------------------------------
    # SESSION FUNCTIONS
    # --------------------------------------------------

    def get_session_token(self):

        cookie_header = self.headers.get("Cookie")

        if not cookie_header:
            return None

        cookie = SimpleCookie()

        try:
            cookie.load(cookie_header)
        except Exception:
            return None

        if "campusconnect_session" not in cookie:
            return None

        return cookie["campusconnect_session"].value

    def get_logged_in_user(self):

        token = self.get_session_token()

        if not token:
            return None

        session = SESSION_STORE.get(token)

        if not session:
            return None

        if time.time() > session["expires"]:

            SESSION_STORE.pop(token, None)
            return None

        return session["username"]

    def is_authenticated(self):

        return self.get_logged_in_user() is not None

    def require_authentication(self):

        if not self.is_authenticated():

            self.send_json({
                "error": "Authentication required. Please log in."
            }, 401)

            return False

        return True

    # --------------------------------------------------
    # LOGIN
    # --------------------------------------------------

    def handle_login(self):

        data = self.read_json_body()

        if data is None:

            self.send_json({
                "error": "Invalid JSON data"
            }, 400)

            return

        username = str(data.get("username", "")).strip()
        password = str(data.get("password", ""))

        if not username or not password:

            self.send_json({
                "error": "Please enter username and password"
            }, 400)

            return

        admin = read_data(ADMIN_FILE)

        # Read the saved admin account

        if not admin:

            self.send_json({
                "error": "Admin account not found"
            }, 500)

            return

        # Check username

        if not hmac.compare_digest(
            username,
            admin["username"]
        ):

            self.send_json({
                "error": "Invalid username or password"
            }, 401)

            return

        # Verify password using PBKDF2

        salt = bytes.fromhex(admin["salt"])

        entered_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            PASSWORD_ITERATIONS
        ).hex()

        if not hmac.compare_digest(
            entered_hash,
            admin["password_hash"]
        ):

            self.send_json({
                "error": "Invalid username or password"
            }, 401)

            return

        # Create a new session

        token = secrets.token_urlsafe(32)

        SESSION_STORE[token] = {
            "username": username,
            "expires": time.time() + SESSION_DURATION
        }

        cookie_value = (
            "campusconnect_session="
            + token
            + "; HttpOnly; SameSite=Lax; Path=/; Max-Age="
            + str(SESSION_DURATION)
        )

        self.send_json(
            {
                "message": "Login successful",
                "username": username
            },
            200,
            {
                "Set-Cookie": cookie_value
            }
        )

    # --------------------------------------------------
    # LOGOUT
    # --------------------------------------------------

    def handle_logout(self):

        token = self.get_session_token()

        if token:
            SESSION_STORE.pop(token, None)

        self.send_json(
            {
                "message": "Logged out successfully"
            },
            200,
            {
                "Set-Cookie": (
                    "campusconnect_session=; "
                    "HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
                )
            }
        )

    # --------------------------------------------------
    # GET REQUESTS
    # --------------------------------------------------

    def do_GET(self):

        path = urlparse(self.path).path

        # Login page is public

        if path == "/login.html":

            if self.is_authenticated():
                self.redirect_to("/index.html")
                return

            super().do_GET()
            return

        # Check login before opening dashboard and modules

        if (
            path == "/"
            or path == "/index.html"
            or path.startswith("/pages/")
        ):

            if not self.is_authenticated():
                self.redirect_to("/login.html")
                return

        # Check authentication for API requests

        if path.startswith("/api/"):

            if path == "/api/session":

                username = self.get_logged_in_user()

                self.send_json({
                    "authenticated": username is not None,
                    "username": username
                })

                return

            if not self.require_authentication():
                return

        # Dashboard API

        if path == "/api/dashboard":

            students = read_data(STUDENTS_FILE)
            faculty = read_data(FACULTY_FILE)
            courses = read_data(COURSES_FILE)
            attendance = read_data(ATTENDANCE_FILE)

            self.send_json({
                "total_students": len(students),
                "total_faculty": len(faculty),
                "total_courses": len(courses),
                "total_attendance": len(attendance),
                "recent_students": students[-5:][::-1]
            })

        # Students

        elif path == "/api/students":

            self.send_json(read_data(STUDENTS_FILE))

        # Faculty

        elif path == "/api/faculty":

            self.send_json(read_data(FACULTY_FILE))

        # Courses

        elif path == "/api/courses":

            self.send_json(read_data(COURSES_FILE))

        # Attendance

        elif path == "/api/attendance":

            self.send_json(read_data(ATTENDANCE_FILE))

        # Results

        elif path == "/api/results":

            self.send_json(read_data(RESULTS_FILE))

        else:

            super().do_GET()

    # --------------------------------------------------
    # POST REQUESTS
    # --------------------------------------------------

    def do_POST(self):

        path = urlparse(self.path).path

        # Login does not require an existing session

        if path == "/api/login":

            self.handle_login()
            return

        # Logout

        if path == "/api/logout":

            self.handle_logout()
            return

        # All other POST requests require login

        if not self.require_authentication():
            return

        data = self.read_json_body()

        if data is None:

            self.send_json({
                "error": "Invalid JSON data"
            }, 400)

            return

        # Select the correct JSON file and ID prefix

        if path == "/api/students":

            file = STUDENTS_FILE
            prefix = "STU"

            required_fields = [
                "name",
                "department",
                "year"
            ]

        elif path == "/api/faculty":

            file = FACULTY_FILE
            prefix = "FAC"

            required_fields = [
                "name",
                "department",
                "designation"
            ]

        elif path == "/api/courses":

            file = COURSES_FILE
            prefix = "CRS"

            required_fields = [
                "name",
                "code",
                "department",
                "credits",
                "duration"
            ]

        elif path == "/api/attendance":

            file = ATTENDANCE_FILE
            prefix = "ATT"

            required_fields = [
                "student_id",
                "student_name",
                "date",
                "status"
            ]

        elif path == "/api/results":

            file = RESULTS_FILE
            prefix = "RES"

            required_fields = [
                "student_id",
                "student_name",
                "exam",
                "subject",
                "marks",
                "max_marks",
                "percentage",
                "grade"
            ]

        else:

            self.send_json({
                "error": "API endpoint not found"
            }, 404)

            return

        # Validate required fields

        for field in required_fields:

            if field not in data or data[field] in ("", None):

                self.send_json({
                    "error": f"{field} is required"
                }, 400)

                return

        records = read_data(file)

        # Prevent duplicate attendance for a student and date

        if prefix == "ATT":

            duplicate = any(
                item.get("student_id") == data["student_id"]
                and item.get("date") == data["date"]
                for item in records
            )

            if duplicate:

                self.send_json({
                    "error": (
                        "Attendance already marked for "
                        "this student on this date"
                    )
                }, 409)

                return

        # Generate a unique ID

        data["id"] = (
            prefix + uuid.uuid4().hex[:8].upper()
        )

        records.append(data)

        write_data(file, records)

        self.send_json({
            "message": "Record added successfully",
            "record": data
        }, 201)

    # --------------------------------------------------
    # PUT REQUESTS - UPDATE RECORDS
    # --------------------------------------------------

    def do_PUT(self):

        if not self.require_authentication():
            return

        path = urlparse(self.path).path

        if path.startswith("/api/students/"):

            file = STUDENTS_FILE

        elif path.startswith("/api/faculty/"):

            file = FACULTY_FILE

        elif path.startswith("/api/courses/"):

            file = COURSES_FILE

        else:

            self.send_json({
                "error": "Update endpoint not found"
            }, 404)

            return

        record_id = path.split("/")[-1]

        data = self.read_json_body()

        if data is None:

            self.send_json({
                "error": "Invalid JSON data"
            }, 400)

            return

        records = read_data(file)

        for record in records:

            if record.get("id") == record_id:

                record.update(data)

                # Keep the original ID

                record["id"] = record_id

                write_data(file, records)

                self.send_json({
                    "message": "Record updated successfully",
                    "record": record
                })

                return

        self.send_json({
            "error": "Record not found"
        }, 404)

    # --------------------------------------------------
    # DELETE REQUESTS
    # --------------------------------------------------

    def do_DELETE(self):

        if not self.require_authentication():
            return

        path = urlparse(self.path).path

        if path.startswith("/api/students/"):

            file = STUDENTS_FILE

        elif path.startswith("/api/faculty/"):

            file = FACULTY_FILE

        elif path.startswith("/api/courses/"):

            file = COURSES_FILE

        else:

            self.send_json({
                "error": "Delete endpoint not found"
            }, 404)

            return

        record_id = path.split("/")[-1]

        records = read_data(file)

        updated_records = [
            record for record in records
            if record.get("id") != record_id
        ]

        if len(records) == len(updated_records):

            self.send_json({
                "error": "Record not found"
            }, 404)

            return

        write_data(file, updated_records)

        self.send_json({
            "message": "Record deleted successfully"
        })


# --------------------------------------------------
# START THE APPLICATION
# --------------------------------------------------

if __name__ == "__main__":

    initialize_files()

    server = HTTPServer(
        ("127.0.0.1", 8000),
        CollegeHandler
    )

    print("------------------------------------")
    print("CampusConnect College Management System")
    print("------------------------------------")
    print("Server running at: http://127.0.0.1:8000")
    print("Default username: admin")
    print("Default password: Admin@123")
    print("------------------------------------")

    try:

        server.serve_forever()

    except KeyboardInterrupt:

        print("\nServer stopped.")

        server.server_close()
