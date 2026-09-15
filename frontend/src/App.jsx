import { useState, useEffect } from 'react';
import apiClient from './services/apiClient';

function App() {
  const [oficios, setOficios] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.get('/oficios')
      .then((response) => setOficios(response.data))
      .then(() => setError(null))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div>
      <h1>ServiMap</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <p>Oficios cargados: {oficios.length}</p>
    </div>
  );
}

export default App;