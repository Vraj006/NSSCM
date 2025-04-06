// import React, { useState } from 'react';
// import axios from 'axios';

// const CsvUpload = () => {
//   const [file, setFile] = useState(null);
//   const [message, setMessage] = useState('');

//   const handleFileChange = (event) => {
//     setFile(event.target.files[0]);
//   };

//   const handleUpload = async () => {
//     if (!file) {
//       setMessage('Please select a CSV file to upload.');
//       return;
//     }

//     const formData = new FormData();
//     formData.append('file', file);

//     try {
//       const response = await axios.post('http://localhost:8000/api/items/import', formData, {
//         headers: {
//           'Content-Type': 'multipart/form-data',
//         },
//       });
//       setMessage(`Successfully imported ${response.data.itemsImported} items.`);
//     } catch (error) {
//       console.error('Error uploading file:', error);
//       setMessage('Failed to upload file. Please try again.');
//     }
//   };

//   return (
//     <div>
//       <h2>Upload CSV File</h2>
//       <input type="file" accept=".csv" onChange={handleFileChange} />
//       <button onClick={handleUpload}>Upload CSV</button>
//       {message && <p>{message}</p>}
//     </div>
//   );
// };

// export default CsvUpload;

















import React, { useState } from 'react';
import axios from 'axios';
import { Container, Typography, Button, Box, Alert } from '@mui/material';

const CsvUpload = () => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a CSV file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:8000/api/items/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage(`Successfully imported ${response.data.itemsImported} items.`);
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage('Failed to upload file. Please try again.');
    }
  };

//   return (
//     <Container maxWidth="sm" sx={{ mt: 4, backgroundColor: '#f5f5f5', borderRadius: '16px', padding: '20px', boxShadow: 3 }}>
//       <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', color: '#1976d2' }}>
//         Upload CSV File
//       </Typography>
//       <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
//         <input
//           type="file"
//           accept=".csv"
//           onChange={handleFileChange}
//           style={{ marginBottom: '16px' }}
//         />
//         <Button variant="contained" color="primary" onClick={handleUpload}>
//           Upload CSV
//         </Button>
//       </Box>
//       {message && <Alert severity={message.includes('Failed') ? 'error' : 'success'} sx={{ mt: 2 }}>{message}</Alert>}
//     </Container>
//   );
// };

// ... existing code ...
return (
  <Container maxWidth="sm" sx={{ mt: 4, p: 4, backgroundColor: 'background.paper', borderRadius: 2, boxShadow: 3 }}>
    <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mb: 3 }}>
      Upload CSV File
    </Typography>
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Button
        variant="contained"
        component="label"
        sx={{ 
          py: 2, 
          textTransform: 'none', 
          fontSize: '1rem',
          background: 'linear-gradient(45deg, #1976d2 30%, #21CBF3 90%)',
          color: 'white',
          '&:hover': {
            background: 'linear-gradient(45deg, #1565c0 30%, #1e88e5 90%)'
          }
        }}
      >
        Select CSV File
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          hidden
        />
      </Button>
      <Button
        variant="contained"
        sx={{ 
          py: 2, 
          textTransform: 'none', 
          fontSize: '1rem',
          background: 'linear-gradient(45deg, #ff9800 30%, #ffc107 90%)',
          color: 'white',
          '&:hover': {
            background: 'linear-gradient(45deg, #f57c00 30%, #ffa000 90%)'
          }
        }}
        onClick={handleUpload}
      >
        Upload CSV
      </Button>
    </Box>
    {message && (
      <Alert
        severity={message.includes('Failed') ? 'error' : 'success'}
        sx={{ mt: 3, borderRadius: 1 }}
      >
        {message}
      </Alert>
    )}
  </Container>
);
};
// ... existing code ...

export default CsvUpload;