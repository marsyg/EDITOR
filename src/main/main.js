import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import journalOperations from './database.js';
import * as fs from 'fs';

let mainWindow;

async function createWindow() {
  // Initialize database first
  const dbInitialized = journalOperations.initialize();
  if (!dbInitialized) {
    console.error(
      'Failed to initialize database. Application may not function correctly.'
    );
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    },
  });

  // Load the appropriate URL based on the environment
  if (app.isPackaged) {
    // Load the production build
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  } else {
    // Load the development URL
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.on('closed', () => (mainWindow = null));
}

// IPC Handlers for journal operations
ipcMain.handle('get-journal', async (event, id) => {
  try {
    console.log('Main process: Getting journal with ID:', id);
    if (!id) {
      throw new Error('Journal ID is required');
    }
    const journal = journalOperations.getJournalById(id);
    console.log('Main process: Journal retrieved from DB:', journal);
    
    // Parse the content JSON string back to an object if it exists
    if (journal && journal.content && typeof journal.content === 'string') {
      try {
        journal.content = JSON.parse(journal.content);
        console.log('Main process: Parsed content from JSON string to object');
      } catch (parseError) {
        console.error('Main process: Error parsing journal content JSON:', parseError);
        // Provide a default content structure if parsing fails
        journal.content = { bullets: [], images: [], videos: [] };
      }
    }
    
    return journal;
  } catch (error) {
    console.error('Main process: Error getting journal:', error);
    throw error;
  }
});

ipcMain.handle('get-all-journals', async () => {
  try {
    console.log('Main process: Getting all journals');
    const journals = journalOperations.getAllJournals();
    console.log(
      'Main process: Journals retrieved successfully from DB:',
      journals
    );
    
    // Parse the content JSON string back to an object for each journal
    if (journals && Array.isArray(journals)) {
      journals.forEach(journal => {
        if (journal.content && typeof journal.content === 'string') {
          try {
            journal.content = JSON.parse(journal.content);
          } catch (parseError) {
            console.error(`Main process: Error parsing content for journal ${journal.id}:`, parseError);
            // Provide a default content structure if parsing fails
            journal.content = { bullets: [], images: [], videos: [] };
          }
        }
      });
      console.log('Main process: Parsed all journal content from JSON strings to objects');
    }
    
    return journals;
  } catch (error) {
    console.error('Main process: Error getting all journals:', error);
    throw error;
  }
});

ipcMain.handle('create-journal', async (event, journal) => {
  try {
    console.log('Main process: Creating journal:', journal);
    if (!journal || !journal.title) {
      throw new Error('Invalid journal data');
    }
    const newJournal = { ...journal, id: uuidv4() };
    
    // Convert content object to JSON string if it's an object
    if (newJournal.content && typeof newJournal.content === 'object') {
      newJournal.content = JSON.stringify(newJournal.content);
      console.log('Main process: Stringified content for SQLite storage');
    }
    
    const result = journalOperations.createJournal(newJournal);
    console.log('Main process: Journal created successfully:', result);
    return result;
  } catch (error) {
    console.error('Main process: Error creating journal:', error);
    throw error;
  }
});

ipcMain.handle('update-journal', async (event, journal) => {
  try {
    console.log('Main process: Updating journal:', journal);
    if (!journal || !journal.id) {
      throw new Error('Invalid journal data');
    }
    
    // Create a copy of the journal object to avoid modifying the original
    const journalToSave = { ...journal };
    
    // Convert content object to JSON string if it's an object
    if (journalToSave.content && typeof journalToSave.content === 'object') {
      journalToSave.content = JSON.stringify(journalToSave.content);
      console.log('Main process: Stringified content for SQLite storage');
    }
    
    const result = journalOperations.updateJournal(journalToSave);
    console.log('Main process: Journal updated successfully:', result);
    return result;
  } catch (error) {
    console.error('Main process: Error updating journal:', error);
    throw error;
  }
});

ipcMain.handle('delete-journal', async (event, id) => {
  try {
    console.log('Main process: Deleting journal with ID:', id);
    if (!id) {
      throw new Error('Journal ID is required');
    }
    const result = journalOperations.deleteJournal(id);
    console.log('Main process: Journal deleted successfully:', result);
    return result;
  } catch (error) {
    console.error('Main process: Error deleting journal:', error);
    throw error;
  }
});

ipcMain.handle('auto-save-journal', async (event, journal) => {
  try {
    console.log('Main process: Auto-saving journal:', journal);
    if (!journal || !journal.id) {
      throw new Error('Invalid journal data');
    }
    
    // Create a copy of the journal object to avoid modifying the original
    const journalToSave = { ...journal };
    
    // Convert content object to JSON string if it's an object
    if (journalToSave.content && typeof journalToSave.content === 'object') {
      journalToSave.content = JSON.stringify(journalToSave.content);
      console.log('Main process: Stringified content for SQLite storage');
    }
    
    const result = journalOperations.autoSaveJournal(journalToSave);
    console.log('Main process: Journal auto-saved successfully:', result);
    return result;
  } catch (error) {
    console.error('Main process: Error auto-saving journal:', error);
    throw error;
  }
});

ipcMain.handle('select-image', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const imagePath = result.filePaths[0];
      // Read the image file
      const imageBuffer = fs.readFileSync(imagePath);
      // Convert to base64
      const base64Image = imageBuffer.toString('base64');
      return {
        path: imagePath,
        base64: `data:image/${path.extname(imagePath).slice(1)};base64,${base64Image}`
      };
    }
    return null;
  } catch (error) {
    console.error('Error selecting image:', error);
    throw error;
  }
});

ipcMain.handle('select-video', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Videos', extensions: ['mp4', 'webm', 'mov', 'avi', 'mkv'] }
      ]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const videoPath = result.filePaths[0];
      // Read the video file
      const videoBuffer = fs.readFileSync(videoPath);
      // Convert to base64
      const base64Video = videoBuffer.toString('base64');
      // Get the file extension without the dot
      const ext = path.extname(videoPath).slice(1);
      return {
        path: videoPath,
        base64: `data:video/${ext};base64,${base64Video}`
      };
    }
    return null;
  } catch (error) {
    console.error('Error selecting video:', error);
    throw error;
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow == null) {
    createWindow();
  }
});
