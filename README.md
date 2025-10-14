# Digital Signature System

A simple single-page application for digitally signing documents. It fetches data from a Google Apps Script, allows users to sign using a canvas element, and saves the signed document as a PDF to Google Drive.

## Features

- **Data Fetching:** Retrieves a list of documents to be signed from a Google Apps Script connected to a Google Sheet.
- **Date Filtering:** Allows users to filter and view documents for a specific day.
- **Signature Pad:** Provides a canvas element for users to draw their digital signature.
- **PDF Generation:** Dynamically generates a PDF document of the signed agreement using jsPDF.
- **Google Drive Integration:** Saves the final signed PDF to a specified folder in Google Drive.

## Setup

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/digital-signature-system.git
    ```
2.  **Set up the Google Apps Script:**
    - Create a new Google Sheet to store the data of the people who need to sign.
    - Create a Google Apps Script connected to the sheet. The script should have a `doGet` function to fetch the data and a `doPost` function to handle the saving of the signed PDF to Google Drive.
3.  **Configure the script URL:**
    - Open the `index.html` file.
    - Locate the `CONFIG` object in the `<script>` section.
    - Replace the `scriptUrl` placeholder with your deployed Google Apps Script URL.
    ```javascript
    const CONFIG = {
        scriptUrl: 'YOUR_GOOGLE_APPS_SCRIPT_URL'
    };
    ```

## Technologies Used

-   **HTML:** For the structure of the web page.
-   **CSS:** For styling the user interface.
-   **JavaScript:** For the application logic and interactivity.
-   **jsPDF:** A library to generate PDFs in JavaScript.
-   **Google Apps Script:** To connect with Google Sheets and Google Drive.
