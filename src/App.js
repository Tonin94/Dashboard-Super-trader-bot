import React, { useState, useEffect, useRef } from 'react';
import GraficCharts from './GraficCharts';

const App = () => {
  const [data, setData] = useState([]);
  const [currentCandle, setCurrentCandle] = useState(null);
  const [streamSessionId, setStreamSessionId] = useState(null);
  const [askData, setAskData] = useState([]);
  const [bidData, setBidData] = useState([]);
  const [averageData, setAverageData] = useState([]);
  const demoWebSocketRef = useRef(null);
  const streamWebSocketRef = useRef(null);
  const lastTimestampRef = useRef(null); // Aggiunto per tracciare l'ultimo timestamp

  // Intervallo per inviare ping e mantenere viva la connessione
  useEffect(() => {
    let pingInterval;

    if (demoWebSocketRef.current && demoWebSocketRef.current.readyState === WebSocket.OPEN) {
      pingInterval = setInterval(() => {
        if (demoWebSocketRef.current && demoWebSocketRef.current.readyState === WebSocket.OPEN) {
          const pingMessage = {
            command: 'ping',
          };
          demoWebSocketRef.current.send(JSON.stringify(pingMessage));
          console.log('Ping inviato sulla connessione principale per mantenerla attiva');
        }
      }, 30000); // ogni 30 secondi
    }

    return () => {
      if (pingInterval) clearInterval(pingInterval);
    };
  }, [demoWebSocketRef.current]);

  // Aggiorna l'array dei dati con la candela corrente
  useEffect(() => {
    if (currentCandle) {
      setData((prevData) => [...prevData, currentCandle]);
    }
  }, [currentCandle]);

  // Stabilisce la connessione WebSocket iniziale per l'autenticazione
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
        console.log('Richiesta di login inviata');
      };

      ws.onmessage = (event) => {
        const response = JSON.parse(event.data);
        console.log('Autenticato:', response);

        if (response.status && response.streamSessionId) {
          setStreamSessionId(response.streamSessionId);
        } else if (response.status === false && response.errorCode) {
          console.error(`Errore dal server: ${response.errorCode} - ${response.errorDescr}`);
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

  // Stabilisce la connessione WebSocket per lo streaming e gestisce le riconnessioni
  useEffect(() => {
    const maxReconnectAttempts = 5;
    let reconnectAttempts = 0;

    const connectWebSocket = () => {
      if (streamSessionId) {
        if (streamWebSocketRef.current) {
          streamWebSocketRef.current.close();
        }

        const streamWS = new WebSocket('wss://ws.xtb.com/demoStream');

        streamWS.onopen = () => {
          console.log('Connessione allo stream aperta');

          const subscribeMessage = {
            command: 'getTickPrices',
            streamSessionId: streamSessionId,
            symbol: 'BITCOIN',
            minArrivalTime: 200,
            maxLevel: 0,
          };

          streamWS.send(JSON.stringify(subscribeMessage));
          console.log('Richiesta di abbonamento inviata:', subscribeMessage);
          reconnectAttempts = 0;
        };

        streamWS.onmessage = (event) => {
          console.log('Messaggio ricevuto dallo stream', event.data);

          try {
            const parsedResponse = JSON.parse(event.data);
            console.log('Dati parsati:', parsedResponse);

            // Gestione dei messaggi ping dal server
            if (parsedResponse.command === 'ping') {
              const pongMessage = { command: 'pong', streamSessionId: streamSessionId };
              streamWS.send(JSON.stringify(pongMessage));
              console.log('Pong inviato in risposta al ping del server');
              return;
            }

            if (
                parsedResponse.command === 'tickPrices' &&
                parsedResponse.data &&
                parsedResponse.data.level === 0
            ) {
              console.log('Dati tick ricevuti (livello 0):', parsedResponse.data);

              const timestamp = Math.floor(parsedResponse.data.timestamp / 1000);

              // Controlla se il timestamp è diverso dall'ultimo
              if (lastTimestampRef.current !== timestamp) {
                lastTimestampRef.current = timestamp;

                const askPrice = parsedResponse.data.ask;
                const bidPrice = parsedResponse.data.bid;
                const averagePrice = (askPrice + bidPrice) / 2;

                // Aggiorna i dati per le linee
                setAskData((prevData) => {
                  const newData = [...prevData, { time: timestamp, value: askPrice }];
                  return newData.slice(-1000);
                });

                setBidData((prevData) => {
                  const newData = [...prevData, { time: timestamp, value: bidPrice }];
                  return newData.slice(-1000);
                });

                setAverageData((prevData) => {
                  const newData = [...prevData, { time: timestamp, value: averagePrice }];
                  return newData.slice(-1000);
                });

                // Aggiorna la candela corrente
                setCurrentCandle({
                  time: timestamp,
                  open: askPrice,
                  high: askPrice,
                  low: askPrice,
                  close: askPrice,
                });
              } else {
                // Aggiorna la candela corrente esistente
                const askPrice = parsedResponse.data.ask;
                setCurrentCandle((prevCandle) => {
                  if (prevCandle) {
                    return {
                      ...prevCandle,
                      high: Math.max(prevCandle.high, askPrice),
                      low: Math.min(prevCandle.low, askPrice),
                      close: askPrice,
                    };
                  } else {
                    return prevCandle;
                  }
                });
              }
            } else {
              console.log('Nessun dato di tick ricevuto o comando errato:', parsedResponse);
            }
          } catch (error) {
            console.error('Errore nella parsing della risposta:', error);
          }
        };

        streamWS.onclose = (event) => {
          console.log('Connessione allo stream chiusa:', event);
          if (!event.wasClean) {
            console.error('Chiusura inaspettata dello stream:', event);

            if (reconnectAttempts < maxReconnectAttempts) {
              reconnectAttempts += 1;
              console.log(`Tentativo di riconnessione ${reconnectAttempts}...`);
              setTimeout(() => {
                connectWebSocket();
              }, 1000 * reconnectAttempts);
            } else {
              console.error('Numero massimo di tentativi di riconnessione raggiunto');
            }
          } else {
            console.log('Connessione allo stream chiusa correttamente');
          }
        };

        streamWS.onerror = (error) => {
          console.error('Errore WebSocket streaming:', error);
        };

        streamWebSocketRef.current = streamWS;
      }
    };

    connectWebSocket();

    return () => {
      if (streamWebSocketRef.current) {
        streamWebSocketRef.current.close();
      }
    };
  }, [streamSessionId]);

  return (
      <div>
        <h1>Grafico Candlestick EUR/USD in Tempo Reale</h1>
        <GraficCharts
            data={data}
            currentCandle={currentCandle}
            askData={askData}
            bidData={bidData}
            averageData={averageData}
        />
      </div>
  );
};

export default App;
