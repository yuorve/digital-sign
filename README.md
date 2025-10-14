# Digital Signature System

A simple single-page application for digitally signing documents. It fetches data from a Google Apps Script, allows users to sign using a canvas element, and saves the signed document as a PDF to Google Drive.

## Features

- **Data Fetching:** Retrieves a list of documents to be signed from a Google Apps Script connected to a Google Sheet.
- **Date Filtering:** Allows users to filter and view documents for a specific day.
- **Signature Pad:** Provides a canvas element for users to draw their digital signature.
- **PDF Generation:** Dynamically generates a PDF document of the signed agreement using jsPDF.
- **Google Drive Integration:** Saves the final signed PDF to a specified folder in Google Drive.

## Prerequisites

Before you begin, ensure you have the following:

-   A **Google Account** to access Google Drive, Google Sheets, and Google Apps Script.
-   Basic knowledge of HTML, JavaScript, and Google Workspace.

## Setup

Follow these steps to configure and deploy the application:

### 1. Set Up the Google Sheet

1.  Create a new **Google Sheet** in your Google Drive.
2.  Rename the sheet to a name of your choice (e.g., "Signatures").
3.  Set up the following columns in the first row:
    | Column A | Column B | Column C  | Column D | Column E | Column F   |
    | :------- | :------- | :-------- | :------- | :------- | :--------- |
    | `date`   | `shift`  | `firstName` | `lastName` | `status` | `fileUrl`  |

    -   `date`: The date of the signature (e.g., `DD/MM/YYYY`).
    -   `shift`: The work shift (e.g., "Morning", "Afternoon").
    -   `firstName`: The first name of the person signing.
    -   `lastName`: The last name of the person signing.
    -   `status`: The status of the signature ("pending" or "firmado").
    -   `fileUrl`: The URL of the saved PDF (will be filled automatically).

### 2. Create the Google Docs Template

1.  Create a new **Google Doc** to be used as a template for the PDF.
2.  Add the content you want to appear in the final PDF, using placeholders for dynamic data:
    -   `{{NOMBRE}}`: The first name of the person signing.
    -   `{{APELLIDO}}`: The last name of the person signing.
    -   `{{FECHA}}`: The date of the signature.
    -   `{{TURNO}}`: The work shift.
    -   `{{NOMBRE_COMPLETO}}`: The full name of the person signing.
    -   `{{FIRMA}}`: The placeholder for the signature image.

### 3. Configure the Google Apps Script

1.  Open your Google Sheet and go to **Extensions > Apps Script**.
2.  Copy the content of the `code.gs` file from this repository and paste it into the script editor.
3.  Update the configuration constants at the top of the `code.gs` file:
    -   `SHEET_ID`: The ID of your Google Sheet (from the URL).
    -   `SHEET_NAME`: The name of the sheet you created (e.g., "Signatures").
    -   `TEMPLATE_DOC_ID`: The ID of your Google Docs template (from the URL).

### 4. Deploy the Google Apps Script

1.  In the Apps Script editor, click **Deploy > New deployment**.
2.  Select **Web app** as the deployment type.
3.  Configure the web app with the following settings:
    -   **Execute as:** `Me`
    -   **Who has access:** `Anyone with Google account` (or `Anyone` if you want it to be public).
4.  Click **Deploy**.
5.  **Authorize** the script to access your Google account.
6.  Copy the **Web app URL** provided after deployment.

### 5. Configure the `index.html` File

1.  Open the `index.html` file.
2.  Find the `CONFIG` object in the `<script>` section.
3.  Replace the placeholder URL with the **Web app URL** you copied in the previous step:
    ```javascript
    const CONFIG = {
        scriptUrl: 'YOUR_GOOGLE_APPS_SCRIPT_URL'
    };
    ```

### 6. Using the Application

1.  Open the `index.html` file in your web browser.
2.  The application will fetch the data from your Google Sheet.
3.  Users can sign the documents, and the signed PDFs will be saved to a "Documentos Firmados" folder in your Google Drive.

## How it Works

1.  **Data Fetching:** When the `index.html` page is loaded, a JavaScript function sends a `GET` request to the deployed Google Apps Script. The `doGet` function in the script reads the data from the Google Sheet and returns it in JSON format.
2.  **Displaying Data:** The web application parses the JSON data and displays it in a table, allowing users to filter the records by date.
3.  **Signing Process:** When a user clicks the "Sign" button, a modal window appears with a canvas element. The user can draw their signature on the canvas.
4.  **PDF Generation and Saving:** Upon saving the signature, the JavaScript code captures the signature as a Base64 image. It then sends a `POST` request to the Apps Script with the user's data and the signature image.
5.  **Google Drive Integration:** The `doPost` function in the script creates a copy of the Google Docs template, replaces the placeholders with the user's information, inserts the signature image, and converts the document to a PDF.
6.  **Updating the Sheet:** The generated PDF is saved to a "Documentos Firmados" folder in Google Drive, and the Google Sheet is updated with the "firmado" status and a link to the PDF file.

## Technologies Used

-   **HTML:** For the structure of the web page.
-   **CSS:** For styling the user interface.
-   **JavaScript:** For the application logic and interactivity.
-   **jsPDF:** A library to generate PDFs in JavaScript.
-   **Google Apps Script:** To connect with Google Sheets and Google Drive.
-   **Google Docs:** Used as a template for generating the final PDF.
