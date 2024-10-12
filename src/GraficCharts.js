import React, {useEffect, useRef} from 'react';
import {createChart} from 'lightweight-charts';

const GraficCharts = ({ data, currentCandle, askData, bidData, averageData }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const askLineSeriesRef = useRef(null);
  const bidLineSeriesRef = useRef(null);
  const averageLineSeriesRef = useRef(null);

  const PriceFormatter = new Intl.NumberFormat(window.navigator.languages[0], {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  }).format;

  useEffect(() => {
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        textColor: '#d1d4dc',
        backgroundColor: '#000',
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        priceFormatter: PriceFormatter,
      },
    });
    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries();
    candleSeriesRef.current = candlestickSeries;

    // Aggiungi la serie per il prezzo ask (linea verde)
    const askLineSeries = chart.addLineSeries({
      color: 'green',
      lineWidth: 2,
    });
    askLineSeriesRef.current = askLineSeries;

    // Aggiungi la serie per il prezzo bid (linea rossa)
    const bidLineSeries = chart.addLineSeries({
      color: 'red',
      lineWidth: 2,
    });
    bidLineSeriesRef.current = bidLineSeries;

    // Aggiungi la serie per la media (linea grigia tratteggiata)
    averageLineSeriesRef.current = chart.addLineSeries({
      color: 'gray',
      lineWidth: 1,
      lineStyle: 2, // Linea tratteggiata
    });

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [PriceFormatter]);

  useEffect(() => {
    if (data.length > 0 && candleSeriesRef.current) {
      const sortedData = data.sort((a, b) => a.time - b.time);
      candleSeriesRef.current.setData(sortedData);
    }
  }, [data]);

  useEffect(() => {
    if (currentCandle && candleSeriesRef.current) {
      candleSeriesRef.current.update(currentCandle);
    }
  }, [currentCandle]);

  // Aggiorna la serie del prezzo ask
  useEffect(() => {
    if (askData.length > 0 && askLineSeriesRef.current) {
      const sortedAskData = askData.sort((a, b) => a.time - b.time);
      askLineSeriesRef.current.setData(sortedAskData);
    }
  }, [askData]);

  // Aggiorna la serie del prezzo bid
  useEffect(() => {
    if (bidData.length > 0 && bidLineSeriesRef.current) {
      const sortedBidData = bidData.sort((a, b) => a.time - b.time);
      bidLineSeriesRef.current.setData(sortedBidData);
    }
  }, [bidData]);

  // Aggiorna la serie della media
  useEffect(() => {
    if (averageData.length > 0 && averageLineSeriesRef.current) {
      const sortedAverageData = averageData.sort((a, b) => a.time - b.time);
      averageLineSeriesRef.current.setData(sortedAverageData);
    }
  }, [averageData]);

  return <div ref={chartContainerRef} style={{ width: '100%', height: '400px' }} />;
};

export default GraficCharts;
