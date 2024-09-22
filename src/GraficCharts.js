import React, { useRef, useEffect } from 'react';
import { createChart } from 'lightweight-charts';

const GraficCharts = ({ data, currentCandle }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);

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

  return <div ref={chartContainerRef} style={{ width: '100%', height: '400px' }} />;
};

export default GraficCharts;
