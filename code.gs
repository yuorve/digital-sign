// ========== CONFIGURACIÓN ==========
// Configura estos valores según tu hoja de cálculo
const SHEET_ID = 'ID-DE-LA-HOJA';
const SHEET_NAME = 'NOMBRE-DE-LA-HOJA';
const TEMPLATE_DOC_ID = 'ID-DOCUMENTO';
// ===================================

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    if (action === 'getData') {
      cleanOldPreviews();
      return getData();
    } else if (action === 'generatePreview') {
      return generatePreview(e.parameter.row);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': 'Acción no válida'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getData() {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
    
    // Obtener todos los datos desde la fila 2 (asumiendo que fila 1 son encabezados)
    const lastRow = sheet.getLastRow();
    
    if (lastRow < 2) {
      return ContentService.createTextOutput(JSON.stringify({
        'status': 'success',
        'data': []
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Obtener columnas A (fecha), B (turno), C (nombre), D (apellido), E (estado)
    const range = sheet.getRange(2, 1, lastRow - 1, 5);
    const values = range.getDisplayValues();
    
    // Formatear datos
    const data = values.map(row => {           
      return {
        date: row[0],
        shift: row[1] || '',
        firstName: row[2] || '',
        lastName: row[3] || '',
        status: row[4] || ''
      };
    });
    
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'success',
      'data': data
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Obtener datos de una fila específica
function getRowData(rowIndex) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const range = sheet.getRange(rowIndex, 1, 1, 4);
  const values = range.getValues()[0];
  
  let dateStr = '';
  if (values[0]) {
    const date = new Date(values[0]);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      dateStr = `${day}/${month}/${year}`;
    } else {
      dateStr = values[0].toString();
    }
  }
  
  return {
    date: dateStr,
    shift: values[1] || '',
    firstName: values[2] || '',
    lastName: values[3] || ''    
  };
}

// Función para manejar peticiones POST
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;

    if (action === 'savePDF') {
      // Eliminar Vista Previa
      const previewDoc = DriveApp.getFileById(requestData.previewDocId);
      previewDoc.setTrashed(true);
      
      // Pasar los parámetros obtenidos del JSON del cuerpo
      return savePDFToDrive(requestData.row, requestData.signatureBase64);
    }

    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': 'Acción no válida o no soportada por POST'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': 'Error en la solicitud POST: ' + error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function savePDFToDrive(rowIndex, signatureBase64) {
  try {
    // Obtener datos de la fila
    const rowData = getRowData(rowIndex);
    
    const pdfBlob = createPDFFromTemplate(rowData, signatureBase64);
    
    // Obtener o crear carpeta "Documentos Firmados"
    const folderName = 'Documentos Firmados';
    let folder = getFolderByName(folderName);
    
    if (!folder) {
      folder = DriveApp.createFolder(folderName);
    }
    
    // Guardar PDF en Drive
    const fileName = `Documento_${rowData.date.replace(/\//g, '-')}_${rowData.firstName}_${rowData.lastName}.pdf`;
    const file = folder.createFile(pdfBlob.setName(fileName));
    
    // Actualizar el estado en la hoja con el enlace del PDF
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);    
    sheet.getRange('E' + rowIndex).setValue('firmado');    
    
    // Agregar enlace del PDF en columna D
    const fileUrl = file.getUrl();
    sheet.getRange('F' + rowIndex).setValue(fileUrl);
    
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'success',
      'fileUrl': fileUrl,
      'fileId': file.getId()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function createPDFFromTemplate(rowData, signatureBase64) {
  // Hacer una copia de la plantilla
  const templateDoc = DriveApp.getFileById(TEMPLATE_DOC_ID);
  const tempDoc = templateDoc.makeCopy('Temp_' + new Date().getTime());
  const doc = DocumentApp.openById(tempDoc.getId());
  const body = doc.getBody();
  
  // Reemplazar marcadores de posición (placeholders)
  body.replaceText('{{FECHA}}', rowData.date);
  body.replaceText('{{TURNO}}', rowData.shift);
  body.replaceText('{{NOMBRE_COMPLETO}}', rowData.firstName + ' ' + rowData.lastName);
  body.replaceText('{{FECHA_COMPLETA}}', formatearFecha());
  
  // Buscar el marcador {{FIRMA}} y reemplazarlo con la imagen
  const searchResult = body.findText('{{FIRMA}}');
  if (searchResult) {
    const element = searchResult.getElement();
    const parent = element.getParent();
    
    // Eliminar el texto del marcador
    element.asText().setText('');
    
    // Agregar la imagen de la firma
    try {
      const imageBlob = Utilities.newBlob(
        Utilities.base64Decode(signatureBase64),
        'image/png',
        'signature.png'
      );
      
      if (parent.getType() === DocumentApp.ElementType.PARAGRAPH) {
        parent.asParagraph().appendInlineImage(imageBlob).setWidth(250).setHeight(70);
      }
    } catch (e) {
      Logger.log('Error al agregar imagen: ' + e.toString());
      element.asText().setText('[Firma digital]');
    }
  }
  
  // Guardar cambios
  doc.saveAndClose();
  
  // Convertir a PDF
  const pdfBlob = tempDoc.getAs('application/pdf');
  
  // Eliminar documento temporal
  tempDoc.setTrashed(true);
  
  return pdfBlob;
}

function getFolderByName(folderName) {
  const folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return null;
}

function formatearFecha() {
  // Obtener la fecha de hoy (la hora y fecha actuales).
  const hoy = new Date();
  
  // Extraer el mes de la fecha con métodos del objeto Date.
  const mesNumero = hoy.getMonth();   // Devuelve el mes (0=Enero, 11=Diciembre)

  // Array de meses en español (el índice 0 corresponde a Enero)
  const mesesEnEspanol = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio", 
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  
  // Obtenemos el nombre del mes. Como mesNumero va de 1 a 12, restamos 1.
  const nombreMes = mesesEnEspanol[mesNumero - 1];
  
  // Construimos la cadena final
  const fechaFormateada = `${hoy.getDate()} de ${nombreMes} de ${hoy.getFullYear()}`;  
  
  return fechaFormateada;
}

// Generar vista previa del documento con datos personalizados
function generatePreview(rowIndex) {
  try {
    // Obtener datos de la fila
    const rowData = getRowData(rowIndex);

    // Hacer una copia de la plantilla
    const templateDoc = DriveApp.getFileById(TEMPLATE_DOC_ID);
    const tempDoc = templateDoc.makeCopy('Temp_' + new Date().getTime());

    // Compartir el documento públicamente
    tempDoc.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Abrir y reemplazar marcadores
    const doc = DocumentApp.openById(tempDoc.getId());
    const body = doc.getBody();
    
    // Reemplazar marcadores de posición (placeholders)
    body.replaceText('{{FECHA}}', rowData.date);
    body.replaceText('{{TURNO}}', rowData.shift);
    body.replaceText('{{NOMBRE_COMPLETO}}', rowData.firstName + ' ' + rowData.lastName);
    body.replaceText('{{FECHA_COMPLETA}}', formatearFecha());
    body.replaceText('{{FIRMA}}', '[La firma se añadirá al finalizar]');

    doc.saveAndClose();

    // Generar URL de vista previa
    const previewUrl = `https://docs.google.com/document/d/${tempDoc.getId()}/preview`;
    
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'success',
      'previewUrl': previewUrl,
      'docId': tempDoc.getId()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error generating preview: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Elimina vistas previas anteriores
function cleanOldPreviews() {
  try {
    const parentFile = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId());
    const folder = parentFile.getParents().next()    
    if (!folder) return;
    
    const files = folder.getFiles();
    const oneHourAgo = new Date().getTime() - (60 * 60 * 1000);
    
    while (files.hasNext()) {
      const file = files.next();
      if (file.getName().startsWith('Temp_')) {
        const createdDate = file.getDateCreated().getTime();
        if (createdDate < oneHourAgo) {
          file.setTrashed(true);
        }
      }
    }
  } catch (error) {
    Logger.log('Error cleaning previews: ' + error.toString());
  }
}
