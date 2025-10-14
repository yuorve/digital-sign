// ========== CONFIGURACIÓN ==========
// Configura estos valores según tu hoja de cálculo
const SHEET_ID = 'ID-DE-LA-HOJA';
const SHEET_NAME = 'NOMBRE-DE-LA-HOJA';
const TEMPLATE_DOC_ID = 'ID-DOCUMENTO';
// ===================================

function doGet(e) {
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

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'savePDF') {
      // Generar y guardar PDF en Drive
      return savePDFToDrive(data);
    }
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'error',
      'message': error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function savePDFToDrive(data) {
  try {
    // 1. Crear el PDF
    const pdfBlob = createPDFFromTemplate(data);
    
    // 2. Obtener o crear carpeta "Documentos Firmados"
    const folderName = 'Documentos Firmados';
    let folder = getFolderByName(folderName);
    
    if (!folder) {
      folder = DriveApp.createFolder(folderName);
    }
    
    // 3. Guardar PDF en Drive
    const fileName = `Documento_${data.date.replace(/\//g, '-')}_${data.firstName}_${data.lastName}.pdf`;
    const file = folder.createFile(pdfBlob.setName(fileName));
    
    // 4. Actualizar el estado en la hoja con el enlace del PDF
    const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);    
    sheet.getRange('E' + data.row).setValue('firmado');    
    
    // Opcional: Agregar enlace del PDF en columna D
    const fileUrl = file.getUrl();
    sheet.getRange('F' + data.row).setValue(fileUrl);
    
    return ContentService.createTextOutput(JSON.stringify({
      'status': 'success',
      'fileUrl': fileUrl,
      'fileId': file.getId()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    throw error;
  }
}

function createPDFFromTemplate(data) {
  // Hacer una copia de la plantilla
  const templateDoc = DriveApp.getFileById(TEMPLATE_DOC_ID);
  const tempDoc = templateDoc.makeCopy('Temp_' + new Date().getTime());
  const doc = DocumentApp.openById(tempDoc.getId());
  const body = doc.getBody();
  
  // Reemplazar marcadores de posición (placeholders)
  body.replaceText('{{NOMBRE}}', data.firstName);
  body.replaceText('{{APELLIDO}}', data.lastName);
  body.replaceText('{{FECHA}}', data.date);
  body.replaceText('{{TURNO}}', data.shift);
  body.replaceText('{{NOMBRE_COMPLETO}}', data.firstName + ' ' + data.lastName);
  
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
        Utilities.base64Decode(data.signatureBase64),
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

