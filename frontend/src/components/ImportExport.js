import React, { useState } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
  CircularProgress
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import FileDownloadIcon from '@mui/icons-material/FileDownload';

const ImportExport = () => {
  const [importStatus, setImportStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleImportItems = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      console.log('Uploading file:', file.name); // Debug log
      
      const response = await axios.post(
        'http://localhost:8000/api/import/items',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('Upload response:', response.data); // Debug log

      setImportStatus({
        success: true,
        itemsImported: response.data.itemsImported,
        errors: response.data.errors
      });
    } catch (err) {
      console.error('Import error details:', err.response?.data); // Debug log
      setError(err.response?.data?.message || 'Failed to import items');
    } finally {
      setLoading(false);
    }
  };

  const handleImportContainers = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        'http://localhost:8000/api/import/containers',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setImportStatus({
        success: true,
        containersImported: response.data.containersImported,
        errors: response.data.errors
      });
    } catch (err) {
      console.error('Import error details:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to import containers');
    } finally {
      setLoading(false);
    }
  };

  const handleExportArrangement = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/export/arrangement', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'arrangement.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export arrangement');
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'primary.main' }}>
        Import & Export
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gap: 4 }}>
        {/* Import Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Import Data</Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              component="label"
              startIcon={<FileUploadIcon />}
              disabled={loading}
            >
              Import Items
              <input
                type="file"
                hidden
                accept=".csv"
                onChange={handleImportItems}
              />
            </Button>

            <Button
              variant="contained"
              component="label"
              startIcon={<FileUploadIcon />}
              disabled={loading}
            >
              Import Containers
              <input
                type="file"
                hidden
                accept=".csv"
                onChange={handleImportContainers}
              />
            </Button>
          </Box>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress />
            </Box>
          )}

          {importStatus && (
            <Box>
              <Alert severity="success" sx={{ mb: 2 }}>
                {importStatus.itemsImported && `${importStatus.itemsImported} items imported successfully`}
                {importStatus.containersImported && `${importStatus.containersImported} containers imported successfully`}
              </Alert>

              {importStatus.errors && importStatus.errors.length > 0 && (
                <>
                  <Typography variant="subtitle2" color="error" gutterBottom>
                    Errors encountered:
                  </Typography>
                  <List dense>
                    {importStatus.errors.map((error, index) => (
                      <ListItem key={index}>
                        <ListItemText 
                          primary={`Row ${error.row}: ${error.error}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}
            </Box>
          )}
        </Paper>

        {/* Export Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Export Data</Typography>
          
          <Button
            variant="contained"
            onClick={handleExportArrangement}
            startIcon={<FileDownloadIcon />}
          >
            Export Current Arrangement
          </Button>
        </Paper>
      </Box>
    </Container>
  );
};

export default ImportExport; 