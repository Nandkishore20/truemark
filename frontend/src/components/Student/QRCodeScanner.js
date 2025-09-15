import React, { useState, useCallback } from 'react';
import { QrReader } from 'react-qr-reader';
import api from '../../services/api';

const QRCodeScanner = ({ onScanSuccess, onClose }) => {
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(true);

  // Use useCallback to prevent the function from being recreated on every render
  const handleScan = useCallback(async (result) => {
    if (result && isScanning) {
      setIsScanning(false); // Stop further scanning to prevent multiple submissions
      const qrDataText = result.getText();

      try {
        const qrData = JSON.parse(qrDataText);

        if (!qrData.token || !qrData.courseId) {
          setError('Invalid QR code format. Please scan a valid code.');
          setIsScanning(true); // Re-enable scanning
          return;
        }

        // Get user's current location
        const position = await getCurrentPosition();

        // Submit attendance data to the backend
        const response = await api.post('/student/mark-attendance', {
          token: qrData.token,
          courseId: qrData.courseId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        // Report success to the dashboard
        onScanSuccess({
          success: true,
          message: response.data.message,
        });

      } catch (err) {
        const errorMessage = err.response?.data?.message || err.message || 'Failed to mark attendance';
        onScanSuccess({
          success: false,
          message: errorMessage,
        });
      }
    }
  }, [isScanning, onScanSuccess]); // Dependencies for useCallback

  const handleError = (err) => {
    console.error('QR Scanner Error:', err);
    setError('Could not start the camera. Please grant camera permissions and refresh the page.');
  };

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation is not supported by your browser.'));
      }
      navigator.geolocation.getCurrentPosition(
        resolve,
        (err) => reject(new Error(err.message)),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  return (
    <div className="scanner-container">
      <h3>Scan QR Code to Mark Attendance</h3>

      {error && (
        <div className="message error">
          {error}
        </div>
      )}

      <div className="qr-reader">
        <QrReader
          onResult={(result, error) => {
            if (result) {
              handleScan(result);
            }
            if (error) {
              // We can ignore certain errors that are not critical
              if (error.name !== 'NotFoundException') {
                handleError(error);
              }
            }
          }}
          constraints={{ facingMode: 'environment' }}
          // This is the key fix: adds a delay between scan attempts
          scanDelay={500}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <p className="message info">
          {isScanning ? 'Point your camera at the QR code...' : 'Processing...'}
        </p>
        <button
          className="btn btn-danger"
          onClick={onClose}
        >
          Close Scanner
        </button>
      </div>
    </div>
  );
};

export default QRCodeScanner;