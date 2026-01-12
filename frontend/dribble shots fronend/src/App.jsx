import { useState } from 'react'
import './App.css'

function App() {
  const [url, setUrl] = useState('');
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleScreenshot = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setImageSrc(null);

    try {
      // 1. Send Request to Backend
      // Note: We use encodeURIComponent to safely pass URL parameters
      const response = await fetch(`https://dribble-shots.onrender.com/screenshot?url=${encodeURIComponent(url)}`);

      if (!response.ok) {
        throw new Error('Failed to capture screenshot');
      }

      // 2. Handle Binary Data (Blob)
      // We don't get a JSON response; we get a "Blob" (Binary Large Object)
      const blob = await response.blob();
      
      // 3. Create a temporary URL for the browser to display the Blob
      const objectUrl = URL.createObjectURL(blob);
      setImageSrc(objectUrl);

    } catch (err) {
      setError("Could not screenshot that site. It might be blocked or invalid.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <h1>Web Screenshot Tool</h1>
      
      <form onSubmit={handleScreenshot} style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '2rem' }}>
        <input
          type="text"
          placeholder="Enter website (e.g., google.com)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{ padding: '10px', width: '300px', fontSize: '16px' }}
          required
        />
        <button 
          type="submit" 
          disabled={loading}
          style={{ padding: '10px 20px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Capturing...' : 'Snap!'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {imageSrc && (
        <div style={{ border: '2px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
          <img src={imageSrc} alt="Website Screenshot" style={{ width: '100%', display: 'block' }} />
        </div>
      )}
    </div>
  )
}

export default App