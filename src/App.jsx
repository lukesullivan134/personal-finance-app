import React, { useState, useRef, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceArea } from 'recharts';

export default function App() {
  // Default values definition
  const DEFAULTS = {
    initialAssets: 10000,
    monthlyInvested: 500,
    annualReturn: 8,
    startInvestYear: 0,
    stopInvestYear: 59,
    initialDebt: 20000,
    monthlyDebtPayoff: 500,
    years: 20,
    retirementGoal: 500000,
  };

  // Asset Parameters
  const [initialAssets, setInitialAssets] = useState(DEFAULTS.initialAssets);
  const [monthlyInvested, setMonthlyInvested] = useState(DEFAULTS.monthlyInvested);
  const [annualReturn, setAnnualReturn] = useState(DEFAULTS.annualReturn);
  const [startInvestYear, setStartInvestYear] = useState(DEFAULTS.startInvestYear);
  const [stopInvestYear, setStopInvestYear] = useState(DEFAULTS.stopInvestYear);

  // Liability / Debt Parameters
  const [initialDebt, setInitialDebt] = useState(DEFAULTS.initialDebt);
  const [monthlyDebtPayoff, setMonthlyDebtPayoff] = useState(DEFAULTS.monthlyDebtPayoff);

  // Targets & Timeline
  const [years, setYears] = useState(DEFAULTS.years);
  const [retirementGoal, setRetirementGoal] = useState(DEFAULTS.retirementGoal);

  // Zoom State Management
  const [refAreaLeft, setRefAreaLeft] = useState('');
  const [refAreaRight, setRefAreaRight] = useState('');
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(null);
  
  // Track hovered x-axis index for wheel zooming
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const chartContainerRef = useRef(null);

  // Currency Formatter for KPI Cards & Tooltips
  const formatCurrency = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '$0.00';
    if (!Number.isFinite(val)) return '$ MAX VALUE';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val);
  };

  // Formatter for Text Input Fields (Adds commas to raw numbers)
  const formatDisplayInput = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    const parts = val.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  // Handles Input Field Changes with Comma Stripping & Caps
  const handleFormattedInput = (rawVal, setter, maxVal = 999999.99) => {
    const cleanVal = rawVal.replace(/,/g, '');
    let num = parseFloat(cleanVal);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > maxVal) num = maxVal;
    setter(num);
  };

  // Safe Annual Return Handler
  const handleReturnInput = (val) => {
    let num = parseFloat(val);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 999) num = 999;
    setAnnualReturn(num);
  };

  // Safe Timeline Years Handler
  const handleYearsInput = (val, setter, maxVal = 250) => {
    let num = parseInt(val, 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > maxVal) num = maxVal;
    setter(num);
    handleResetZoom();
  };

  // Reset All Input Fields and Sliders to Default State
  const handleResetValues = () => {
    setInitialAssets(DEFAULTS.initialAssets);
    setMonthlyInvested(DEFAULTS.monthlyInvested);
    setAnnualReturn(DEFAULTS.annualReturn);
    setStartInvestYear(DEFAULTS.startInvestYear);
    setStopInvestYear(DEFAULTS.stopInvestYear);
    setInitialDebt(DEFAULTS.initialDebt);
    setMonthlyDebtPayoff(DEFAULTS.monthlyDebtPayoff);
    setYears(DEFAULTS.years);
    setRetirementGoal(DEFAULTS.retirementGoal);
    handleResetZoom();
  };

  // Calculate Net Worth Projections
  const calculateData = () => {
    const data = [];
    let currentAssets = initialAssets;
    let currentDebt = initialDebt;
    const monthlyReturnRate = annualReturn / 100 / 12;

    for (let yr = 0; yr <= years; yr++) {
      if (yr === 0) {
        data.push({
          index: 0,
          year: `Yr 0`,
          Assets: currentAssets,
          Liabilities: currentDebt,
          NetWorth: currentAssets - currentDebt,
          Goal: retirementGoal,
        });
      } else {
        const isInvesting = yr >= startInvestYear && yr <= stopInvestYear;
        const currentMonthlyContribution = isInvesting ? monthlyInvested : 0;

        for (let m = 0; m < 12; m++) {
          currentAssets = (currentAssets + currentMonthlyContribution) * (1 + monthlyReturnRate);
          if (currentAssets > 1e15) currentAssets = 1e15;

          if (currentDebt > 0) {
            currentDebt = currentDebt - monthlyDebtPayoff;
            if (currentDebt < 0) currentDebt = 0;
          }
        }

        const netWorth = currentAssets - currentDebt;
        data.push({
          index: yr,
          year: `Yr ${yr}`,
          Assets: currentAssets,
          Liabilities: currentDebt,
          NetWorth: netWorth,
          Goal: retirementGoal,
        });
      }
    }
    return data;
  };

  const rawData = calculateData();

  // Handle Zoom Drag Actions
  const handleZoom = () => {
    if (!refAreaLeft || !refAreaRight || refAreaLeft === refAreaRight) {
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }

    let left = parseInt(String(refAreaLeft).replace('Yr ', ''), 10);
    let right = parseInt(String(refAreaRight).replace('Yr ', ''), 10);

    if (isNaN(left) || isNaN(right)) {
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }

    if (left > right) [left, right] = [right, left];

    setLeftIndex(left);
    setRightIndex(right);
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  const handleResetZoom = () => {
    setLeftIndex(0);
    setRightIndex(null);
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  // Handle Mouse Wheel Zooming
  const handleWheelZoom = (e) => {
    e.preventDefault();
    const maxIdx = rawData.length - 1;
    const currentRight = rightIndex !== null ? rightIndex : maxIdx;
    const currentRange = currentRight - leftIndex;

    // Determine target index around cursor, default to center of view
    const focusIdx = hoveredIndex !== null ? hoveredIndex : Math.floor((leftIndex + currentRight) / 2);

    let newLeft = leftIndex;
    let newRight = currentRight;

    if (e.deltaY < 0) {
      // Scroll UP -> Zoom In
      if (currentRange <= 2) return; // Prevent over-zooming below 2 data points
      const step = Math.max(1, Math.floor(currentRange * 0.15));
      newLeft = Math.min(focusIdx - 1, leftIndex + step);
      newRight = Math.max(focusIdx + 1, currentRight - step);
    } else {
      // Scroll DOWN -> Zoom Out
      if (leftIndex === 0 && currentRight === maxIdx) return;
      const step = Math.max(1, Math.floor(currentRange * 0.15));
      newLeft = Math.max(0, leftIndex - step);
      newRight = Math.min(maxIdx, currentRight + step);
    }

    // Reset zoom state if fully expanded
    if (newLeft <= 0 && newRight >= maxIdx) {
      handleResetZoom();
    } else {
      setLeftIndex(newLeft);
      setRightIndex(newRight);
    }
  };

  // Prevent parent web page scrolling when wheeling inside chart
  useEffect(() => {
    const chartNode = chartContainerRef.current;
    if (!chartNode) return;

    const onWheel = (e) => handleWheelZoom(e);
    chartNode.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      chartNode.removeEventListener('wheel', onWheel);
    };
  }, [leftIndex, rightIndex, hoveredIndex, rawData.length]);

  // Slice data based on active zoom range
  const visibleData = rawData.slice(
    leftIndex,
    rightIndex !== null ? rightIndex + 1 : rawData.length
  );

  const lastEntry = rawData[rawData.length - 1] || { NetWorth: 0, Assets: 0, Liabilities: 0 };
  const currentNetWorth = lastEntry.NetWorth;
  const currentAssetsFinal = lastEntry.Assets;
  const currentDebtFinal = lastEntry.Liabilities;

  // Safe Y-Axis Formatter
  const formatYAxis = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '$0';
    if (!Number.isFinite(val)) return '$ MAX';
    const absVal = Math.abs(val);
    if (absVal >= 1000000000000) return `$${(val / 1000000000000).toFixed(1)}T`;
    if (absVal >= 1000000000) return `$${(val / 1000000000).toFixed(1)}B`;
    if (absVal >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
    if (absVal >= 1000) return `$${(val / 1000).toFixed(0)}k`;
    return `$${val.toFixed(2)}`;
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif', maxWidth: '1100px', margin: '0 auto', color: '#e2e8f0', minHeight: '100vh' }}>
      <h2 style={{ fontSize: '1.5rem', textAlign: 'center', color: '#f8fafc' }}>WealthPlot Dashboard</h2>

      {/* KPI Cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <div style={{ flex: '1 1 140px', background: '#1e293b', padding: '0.85rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem' }}>Projected Assets</p>
          <h3 style={{ margin: '0.2rem 0 0 0', color: '#4ade80', fontSize: '1.05rem' }}>{formatCurrency(currentAssetsFinal)}</h3>
        </div>
        <div style={{ flex: '1 1 140px', background: '#1e293b', padding: '0.85rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem' }}>Liabilities</p>
          <h3 style={{ margin: '0.2rem 0 0 0', color: '#f87171', fontSize: '1.05rem' }}>{formatCurrency(currentDebtFinal)}</h3>
        </div>
        <div style={{ flex: '1 1 140px', background: '#1e293b', padding: '0.85rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem' }}>Net Worth</p>
          <h3 style={{ margin: '0.2rem 0 0 0', color: '#60a5fa', fontSize: '1.05rem' }}>{formatCurrency(currentNetWorth)}</h3>
        </div>
        <div style={{ flex: '1 1 140px', background: '#1e293b', padding: '0.85rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem' }}>Target Goal</p>
          <h3 style={{ margin: '0.2rem 0 0 0', color: '#fbbf24', fontSize: '1.05rem' }}>{formatCurrency(retirementGoal)}</h3>
        </div>
      </div>

      {/* Main Container */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Chart Header Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '-0.75rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Scroll wheel over graph or click & drag across years to zoom.
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={handleResetValues}
              style={{ background: '#475569', color: '#ffffff', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
            >
              Reset Values
            </button>
            {(leftIndex !== 0 || rightIndex !== null) && (
              <button 
                onClick={handleResetZoom}
                style={{ background: '#3b82f6', color: '#ffffff', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
              >
                Reset Zoom
              </button>
            )}
          </div>
        </div>

        {/* Chart Container */}
        <div 
          ref={chartContainerRef}
          style={{ width: '100%', height: '380px', background: '#1e293b', padding: '0.5rem', borderRadius: '8px', border: '1px solid #334155', boxSizing: 'border-box', userSelect: 'none' }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={visibleData} 
              margin={{ top: 10, right: 10, left: 15, bottom: 0 }}
              onMouseDown={(e) => e && e.activeLabel && setRefAreaLeft(e.activeLabel)}
              onMouseMove={(e) => {
                if (e && e.activeLabel) {
                  const idx = parseInt(String(e.activeLabel).replace('Yr ', ''), 10);
                  if (!isNaN(idx)) setHoveredIndex(idx);
                  if (refAreaLeft) setRefAreaRight(e.activeLabel);
                }
              }}
              onMouseLeave={() => setHoveredIndex(null)}
              onMouseUp={handleZoom}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 12, fill: '#94a3b8' }} width={80} domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '6px' }} 
                formatter={(value) => [formatCurrency(value), '']} 
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }} />
              <Line type="monotone" dataKey="NetWorth" stroke="#60a5fa" strokeWidth={3} name="Net Worth" dot={false} animationDuration={300} />
              <Line type="monotone" dataKey="Assets" stroke="#4ade80" strokeWidth={2} name="Assets" dot={false} animationDuration={300} />
              <Line type="monotone" dataKey="Liabilities" stroke="#f87171" strokeWidth={2} name="Liabilities" dot={false} animationDuration={300} />
              <Line type="monotone" dataKey="Goal" stroke="#fbbf24" strokeDasharray="5 5" strokeWidth={2} name="Goal" dot={false} animationDuration={300} />

              {refAreaLeft && refAreaRight ? (
                <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#60a5fa" fillOpacity={0.3} />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Controls Panel */}
        <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
          
          <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#f8fafc' }}>Asset Controls</h4>
          
          {/* Starting Assets */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem' }}>Starting Assets</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '0.2rem 0.4rem' }}>
                <span style={{ color: '#4ade80', fontSize: '0.85rem', marginRight: '0.2rem' }}>$</span>
                <input 
                  type="text" 
                  value={formatDisplayInput(initialAssets)} 
                  onChange={(e) => handleFormattedInput(e.target.value, setInitialAssets, 999999.99)}
                  style={{ width: '130px', border: 'none', background: 'transparent', color: '#4ade80', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }} 
                />
              </div>
            </div>
            <input type="range" min="0" max="999999.99" step="1000" value={initialAssets} onChange={(e) => handleFormattedInput(e.target.value, setInitialAssets, 999999.99)} style={{ width: '100%', accentColor: '#4ade80' }} />
          </div>

          {/* Monthly Investment Amount */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem' }}>Monthly Investment</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '0.2rem 0.4rem' }}>
                <span style={{ color: '#4ade80', fontSize: '0.85rem', marginRight: '0.2rem' }}>$</span>
                <input 
                  type="text" 
                  value={formatDisplayInput(monthlyInvested)} 
                  onChange={(e) => handleFormattedInput(e.target.value, setMonthlyInvested, 999999.99)}
                  style={{ width: '130px', border: 'none', background: 'transparent', color: '#4ade80', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }} 
                />
              </div>
            </div>
            <input type="range" min="0" max="999999.99" step="100" value={monthlyInvested} onChange={(e) => handleFormattedInput(e.target.value, setMonthlyInvested, 999999.99)} style={{ width: '100%', accentColor: '#4ade80' }} />
          </div>

          {/* Start & Stop Investing Years Side-by-Side */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            
            {/* Start Investing Year */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.85rem' }}>Start Investing</label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '0.2rem 0.4rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginRight: '0.2rem' }}>Yr</span>
                  <input 
                    type="number" min="0" max={years} step="1" 
                    value={startInvestYear} 
                    onChange={(e) => handleYearsInput(e.target.value, setStartInvestYear, years)}
                    style={{ width: '45px', border: 'none', background: 'transparent', color: '#4ade80', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }} 
                  />
                </div>
              </div>
              <input type="range" min="0" max={years} step="1" value={startInvestYear} onChange={(e) => handleYearsInput(e.target.value, setStartInvestYear, years)} style={{ width: '100%', accentColor: '#4ade80' }} />
            </div>

            {/* Stop Investing Year */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.85rem' }}>Stop Investing</label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '0.2rem 0.4rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem', marginRight: '0.2rem' }}>Yr</span>
                  <input 
                    type="number" min="0" max="250" step="1" 
                    value={stopInvestYear} 
                    onChange={(e) => handleYearsInput(e.target.value, setStopInvestYear, 250)}
                    style={{ width: '45px', border: 'none', background: 'transparent', color: '#f87171', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }} 
                  />
                </div>
              </div>
              <input type="range" min="0" max="250" step="1" value={stopInvestYear} onChange={(e) => handleYearsInput(e.target.value, setStopInvestYear, 250)} style={{ width: '100%', accentColor: '#f87171' }} />
            </div>

          </div>

          {/* Est. Annual Return */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem' }}>Est. Annual Return</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '0.2rem 0.4rem' }}>
                <input 
                  type="number" min="0" max="999" step="0.1" 
                  value={annualReturn} 
                  onChange={(e) => handleReturnInput(e.target.value)}
                  style={{ width: '60px', border: 'none', background: 'transparent', color: '#60a5fa', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }} 
                />
                <span style={{ color: '#60a5fa', fontSize: '0.85rem', marginLeft: '0.2rem' }}>%</span>
              </div>
            </div>
            <input type="range" min="0" max="999" step="0.5" value={annualReturn} onChange={(e) => handleReturnInput(e.target.value)} style={{ width: '100%', accentColor: '#60a5fa' }} />
          </div>

          <h4 style={{ marginTop: '1.25rem', marginBottom: '0.75rem', color: '#f8fafc' }}>Liability Controls</h4>
          
          {/* Current Debt */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem' }}>Current Debt</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '0.2rem 0.4rem' }}>
                <span style={{ color: '#f87171', fontSize: '0.85rem', marginRight: '0.2rem' }}>$</span>
                <input 
                  type="text" 
                  value={formatDisplayInput(initialDebt)} 
                  onChange={(e) => handleFormattedInput(e.target.value, setInitialDebt, 999999.99)}
                  style={{ width: '130px', border: 'none', background: 'transparent', color: '#f87171', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }} 
                />
              </div>
            </div>
            <input type="range" min="0" max="999999.99" step="1000" value={initialDebt} onChange={(e) => handleFormattedInput(e.target.value, setInitialDebt, 999999.99)} style={{ width: '100%', accentColor: '#f87171' }} />
          </div>

          {/* Monthly Debt Payoff */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem' }}>Monthly Debt Payoff</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '0.2rem 0.4rem' }}>
                <span style={{ color: '#f87171', fontSize: '0.85rem', marginRight: '0.2rem' }}>$</span>
                <input 
                  type="text" 
                  value={formatDisplayInput(monthlyDebtPayoff)} 
                  onChange={(e) => handleFormattedInput(e.target.value, setMonthlyDebtPayoff, 999999.99)}
                  style={{ width: '130px', border: 'none', background: 'transparent', color: '#f87171', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }} 
                />
              </div>
            </div>
            <input type="range" min="0" max="999999.99" step="100" value={monthlyDebtPayoff} onChange={(e) => handleFormattedInput(e.target.value, setMonthlyDebtPayoff, 999999.99)} style={{ width: '100%', accentColor: '#f87171' }} />
          </div>

          <h4 style={{ marginTop: '1.25rem', marginBottom: '0.75rem', color: '#f8fafc' }}>Timeline & Target</h4>
          
          {/* Target Goal */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem' }}>Target Goal</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '0.2rem 0.4rem' }}>
                <span style={{ color: '#fbbf24', fontSize: '0.85rem', marginRight: '0.2rem' }}>$</span>
                <input 
                  type="text" 
                  value={formatDisplayInput(retirementGoal)} 
                  onChange={(e) => handleFormattedInput(e.target.value, setRetirementGoal, 10000000)}
                  style={{ width: '130px', border: 'none', background: 'transparent', color: '#fbbf24', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }} 
                />
              </div>
            </div>
            <input type="range" min="0" max="10000000" step="10000" value={retirementGoal} onChange={(e) => handleFormattedInput(e.target.value, setRetirementGoal, 10000000)} style={{ width: '100%', accentColor: '#fbbf24' }} />
          </div>

          {/* Timeline Years */}
          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem' }}>Timeline (Years)</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '0.2rem 0.4rem' }}>
                <input 
                  type="number" min="1" max="250" step="1" 
                  value={years} 
                  onChange={(e) => handleYearsInput(e.target.value, setYears, 250)}
                  style={{ width: '50px', border: 'none', background: 'transparent', color: '#fbbf24', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }} 
                />
                <span style={{ color: '#fbbf24', fontSize: '0.85rem', marginLeft: '0.2rem' }}>Yrs</span>
              </div>
            </div>
            <input type="range" min="1" max="250" step="1" value={years} onChange={(e) => handleYearsInput(e.target.value, setYears, 250)} style={{ width: '100%', accentColor: '#fbbf24' }} />
          </div>

        </div>

      </div>
    </div>
  );
}