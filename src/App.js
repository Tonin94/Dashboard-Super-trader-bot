import React, { useState, useEffect, useRef } from 'react';
import GraficCharts from './GraficCharts';

const App = () => {
  const [data, setData] = useState([]);
  const [currentCandle, setCurrentCandle] = useState(null);
  const [streamSessionId, setStreamSessionId] = useState(null);
  const demoWebSocketRef = useRef(null);
  const streamWebSocketRef = useRef(null);

  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (streamWebSocketRef.current && streamWebSocketRef.current.readyState === WebSocket.OPEN) {
        const pingMessage = {
          command: 'ping',
          streamSessionId: streamSessionId,
        };
        streamWebSocketRef.current.send(JSON.stringify(pingMessage));
        console.log('Ping inviato per mantenere la connessione attiva');
      }
    }, 300000);

    return () => clearInterval(pingInterval);
  }, [streamSessionId]);


  useEffect(() => {
    const interval = setInterval(() => {
      if (currentCandle) {
        setData((prevData) => [...prevData, currentCandle]);
        setCurrentCandle(null); 
      }
    }, 60000); 

    return () => clearInterval(interval);
  }, [currentCandle]);

  useEffect(() => {
    if (!demoWebSocketRef.current) {
      const ws = new WebSocket('wss://ws.xtb.com/demo');

      const loginMessage = {
        command: 'login',
        arguments: {
          userId: '16786780',  
          password: 'Antonio94?'
        }
      };

      ws.onopen = () => {
        ws.send(JSON.stringify(loginMessage));
        console.log('Autenticazione inviata');
      };

      ws.onmessage = (event) => {
        const response = JSON.parse(event.data);
        console.log('Autenticato:', response);

        if (response.status && response.streamSessionId) {
          setStreamSessionId(response.streamSessionId); 
        }
      };

      ws.onerror = (error) => {
        console.error('Errore WebSocket:', error);
      };
      demoWebSocketRef.current = ws;
    }

    return () => {
      if (demoWebSocketRef.current && demoWebSocketRef.current.readyState === WebSocket.OPEN) {
        demoWebSocketRef.current.close();
      }
    };
  }, []);


 useEffect(() => {
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  const connectWebSocket = () => {
    if (streamSessionId && !streamWebSocketRef.current) {
      const streamWS = new WebSocket('wss://ws.xtb.com/demoStream');

      streamWS.onopen = () => {
        console.log('Connessione allo stream aperta');

        const subscribeMessage = {
          command: 'getTickPrices',
          streamSessionId: streamSessionId,
          symbol: 'EURUSD',
          minArrivalTime: 200,
        };

        streamWS.send(JSON.stringify(subscribeMessage));
        console.log('Richiesta di abbonamento inviata:', subscribeMessage);
        reconnectAttempts = 0;
      };

      streamWS.addEventListener("message", (event) => {
        console.log("Messaggio ricevuto dallo stream", event.data);

        try {
          const parsedResponse = JSON.parse(event.data);
          console.log("Dati parsati:", parsedResponse);

          if (parsedResponse.command === 'tickPrices' && parsedResponse.data && parsedResponse.data.level === 0) {
            console.log("Dati tick ricevuti (livello 0):", parsedResponse.data);

            const timestamp = Math.floor(parsedResponse.data.timestamp / 1000); 
            const price = parsedResponse.data.ask; 

            setCurrentCandle((prevCandle) => {
              if (prevCandle) {
                return {
                  ...prevCandle,
                  high: Math.max(prevCandle.high, price),
                  low: Math.min(prevCandle.low, price),
                  close: price, 
                };
              } else {
                return {
                  time: timestamp,
                  open: price,
                  high: price,
                  low: price,
                  close: price,
                };
              }
            });
          } else {
            console.log("Nessun dato di tick ricevuto o comando errato:", parsedResponse);
          }
        } catch (error) {
          console.error("Errore nella parsing della risposta:", error);
        }
      });

      streamWS.onclose = (event) => {
        console.log('Connessione chiusa:', event);
        if (!event.wasClean) {
          console.error('Connessione chiusa inaspettatamente:', event);

          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts += 1;
            console.log(`Tentativo di riconnessione ${reconnectAttempts}...`);
            setTimeout(() => {
              connectWebSocket();
            }, 1000 * reconnectAttempts);
          } else {
            console.error('Numero massimo di tentativi di riconnessione raggiunto');
          }
        }
      };

      streamWS.onerror = (error) => {
        console.error("Errore WebSocket streaming:", error);
      };

      streamWebSocketRef.current = streamWS;
    }
  };

  connectWebSocket();

  return () => {
    if (streamWebSocketRef.current && streamWebSocketRef.current.readyState === WebSocket.OPEN) {
      streamWebSocketRef.current.close();
    }
  };
}, [streamSessionId]);

  return (
    <div>
      <h1>Grafico Candlestick EUR/USD in Tempo Reale</h1>
      <GraficCharts data={data} currentCandle={currentCandle} />
    </div>
  );
};

export default App;
