# BigQuery Release Notes Hub

A modern web application built with **Python Flask** and **Vanilla HTML, JavaScript, and CSS** that fetches, structures, and displays the official BigQuery release notes. It provides advanced filters, instant search, and interactive capabilities to draft and publish updates directly on X (formerly Twitter).

---

## ✨ Features

- **Automated RSS/Atom Parsing**: Custom splits daily feed entries into separate atomic updates (grouped by category: Features, Announcements, Issues, Deprecations).
- **In-Memory Caching**: Implements a 5-minute caching mechanism on the backend to load notes quickly while preventing rate-limiting from Google servers.
- **Glassmorphic UI**: Sleek dark mode design utilizing visual accents tailored to update severity levels.
- **Instant Search & Category Filters**: Responsive local filtering on the client-side for rapid search access.
- **Draft Tweet Modal & Custom Character Counter**: 
  - Generates template draft contents containing emoji, type, and source link.
  - Automatically identifies URLs inside the text and counts them as exactly **23 characters** (emulating real-world X/Twitter link shortening rules).
  - Displays a circular SVG progress tracker that warns the user and disables submission if the text exceeds 280 characters.

---

## 📂 Project Structure

- `app.py`: Backend Flask server, XML retrieval, and parsing.
- `templates/index.html`: Base web document and tweet modal elements.
- `static/css/style.css`: Modern visual elements, animations, and typography configurations.
- `static/js/main.js`: Interactive client controller for feeds, filters, search, and the modal.
- `run.sh`: Launcher shell script.
- `requirements.txt`: Python package requirements.
- `implementation.md`: Detailed system architecture documentation.

---

## 🚀 Setup & Execution

### Prerequisites
- Python 3.9+ installed on your system.

### Steps
1. Navigate to the project directory:
   ```bash
   cd Magesh-event-talks-app
   ```

2. Start the development server using the launcher script (it activates the virtual environment automatically):
   ```bash
   ./run.sh
   ```

3. Access the web app:
   Open your browser and go to **`http://localhost:5000`**

---

## 🤝 Open Source & Disclaimer
This project is powered by Flask & Vanilla Web Technologies. The app retrieves official RSS feeds from Google Cloud, but is not affiliated with Google or X/Twitter.
