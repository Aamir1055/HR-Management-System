const mysql = require('mysql2/promise');
const { generateSalarySlipPDF } = require('./controllers/salarySlipController');
const fs = require('fs');

const testPDF = async () => {
  console.log('=== TESTING PDF GENERATION DIRECTLY ===');
  
  try {
    // Create database connection
    const db = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'payroll_system2',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Mock request object
    const mockReq = {
      db: db,
      params: {
        employeeId: 'EMP-018',
        month: '7',
        year: '2025'
      }
    };

    // Mock response object to capture PDF output
    let pdfData = [];
    let headersSent = false;
    const mockRes = {
      setHeader: (name, value) => {
        console.log(`Header set: ${name} = ${value}`);
      },
      set: () => {},
      pipe: null,
      headersSent,
      status: (code) => ({
        json: (data) => {
          console.log(`STATUS ${code}:`, JSON.stringify(data, null, 2));
        }
      })
    };

    // Create a mock writable stream to capture PDF output
    const mockStream = {
      write: (chunk) => {
        pdfData.push(chunk);
        return true;
      },
      end: () => {
        console.log('PDF generation completed');
        console.log('PDF data length:', pdfData.length);
        // Don't save actual PDF, just log completion
      }
    };

    // Mock the doc.pipe method
    let docPipeCallback = null;
    const originalPipe = mockRes.pipe;
    Object.defineProperty(mockRes, 'pipe', {
      get: () => mockStream,
      set: (value) => {
        docPipeCallback = value;
      }
    });

    // Call the PDF controller function
    await generateSalarySlipPDF(mockReq, mockRes);

    await db.end();
  } catch (error) {
    console.error('Error testing PDF:', error);
  }
};

testPDF();
