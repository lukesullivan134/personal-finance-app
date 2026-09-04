import React, { useState, useRef, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';

export default function App() {
  // Default values definition
  const DEFAULTS = {
    initialAssets: 10000,
    monthlyInvested: 500,
    annualReturn: 8,
    inflationRate: 2.5,
    adjustForInflation: false,
    startInvestYear: 0,
    stopInvestYear: 20,
    initialDebt: 20000,
    monthlyDebtPayoff: 500,
    years: 20,
    retirementGoal: 500000,
  };

  // Helper: Read initial state from URL params or localStorage
  const getInitialState = () => {
    const params = new URLSearchParams(window.location.search);
    const saved = localStorage.getItem('wealthplot_state');
    const localData = saved ? JSON.parse(saved) : {};

    const getValue = (key, parseFn = parseFloat) => {
      if (params.has(key)) return parseFn(params.get(key));
      if (localData[key] !== undefined) return localData[key];
      return DEFAULTS[key];
    };

    return {
      initialAssets: getValue('initialAssets'),
      monthlyInvested: getValue('monthlyInvested'),
      annualReturn: getValue('annualReturn'),
      inflationRate: getValue('inflationRate'),
      adjustForInflation: params.has('adjustForInflation')
        ? params.get('adjustForInflation') === 'true'
        : localData.adjustForInflation ?? DEFAULTS.adjustForInflation,
      startInvestYear: getValue('startInvestYear', (v) => parseInt(v, 10)),
      stopInvestYear: getValue('stopInvestYear', (v) => parseInt(v, 10)),
      initialDebt: getValue('initialDebt'),
      monthlyDebtPayoff: getValue('monthlyDebtPayoff'),
      years: getValue('years', (v) => parseInt(v, 10)),
      retirementGoal: getValue('retirementGoal'),
    };
  };

  const initialState = getInitialState();

  // Asset Parameters
  const [initialAssets, setInitialAssets] = useState(initialState.initialAssets);
  const [monthlyInvested, setMonthlyInvested] = useState(initialState.monthlyInvested);
  const [annualReturn, setAnnualReturn] = useState(initialState.annualReturn);
  const [inflationRate, setInflationRate] = useState(initialState.inflationRate);
  const [adjustForInflation, setAdjustForInflation] = useState(initialState.adjustForInflation);
  const [startInvestYear, setStartInvestYear] = useState(initialState.startInvestYear);
  const [stopInvestYear, setStopInvestYear] = useState(initialState.stopInvestYear);

  // Liability / Debt Parameters
  const [initialDebt, setInitialDebt] = useState(initialState.initialDebt);
  const [monthlyDebtPayoff, setMonthlyDebtPayoff] = useState(initialState.monthlyDebtPayoff);

  // Targets & Timeline
  const [years, setYears] = useState(initialState.years);
  const [retirementGoal, setRetirementGoal] = useState(initialState.retirementGoal);

  // UI & Modal States
  const [showTable, setShowTable] = useState(false);
  const [copied, setCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [activeModal, setActiveModal] = useState(null); // 'about' | 'privacy' | 'terms' | 'contact' | null

  // Legend Line Visibility State
  const [visibleLines, setVisibleLines] = useState({
    NetWorth: true,
    Assets: true,
    Liabilities: true,
    Goal: true,
  });

  // Zoom State Management
  const [refAreaLeft, setRefAreaLeft] = useState('');
  const [refAreaRight, setRefAreaRight] = useState('');
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(null);

  // Track hovered x-axis index for wheel zooming
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const chartContainerRef = useRef(null);

  // Save state to Local Storage on input changes
  useEffect(() => {
    const stateToSave = {
      initialAssets,
      monthlyInvested,
      annualReturn,
      inflationRate,
      adjustForInflation,
      startInvestYear,
      stopInvestYear,
      initialDebt,
      monthlyDebtPayoff,
      years,
      retirementGoal,
    };
    localStorage.setItem('wealthplot_state', JSON.stringify(stateToSave));
  }, [
    initialAssets,
    monthlyInvested,
    annualReturn,
    inflationRate,
    adjustForInflation,
    startInvestYear,
    stopInvestYear,
    initialDebt,
    monthlyDebtPayoff,
    years,
    retirementGoal,
  ]);

  // Generate Shareable Link to Clipboard
  const handleShareLink = () => {
    const params = new URLSearchParams({
      initialAssets,
      monthlyInvested,
      annualReturn,
      inflationRate,
      adjustForInflation,
      startInvestYear,
      stopInvestYear,
      initialDebt,
      monthlyDebtPayoff,
      years,
      retirementGoal,
    });
    const shareableUrl = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(shareableUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Copy Email to Clipboard
  const handleCopyEmail = () => {
    navigator.clipboard.writeText('wealthplotorg@gmail.com');
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2500);
  };

  // Toggle handler for legend item clicks
  const handleLegendClick = (e) => {
    const { dataKey } = e;
    setVisibleLines((prev) => ({
      ...prev,
      [dataKey]: !prev[dataKey],
    }));
  };

  // Currency Formatter
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

  // Formatter for Text Input Fields
  const formatDisplayInput = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    const parts = val.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  // Handles Input Field Changes
  const handleFormattedInput = (rawVal, setter, maxVal = 99999999) => {
    const cleanVal = rawVal.replace(/,/g, '');
    let num = parseFloat(cleanVal);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > maxVal) num = maxVal;
    setter(num);
  };

  // Safe Rate Input Handlers
  const handleReturnInput = (val) => {
    let num = parseFloat(val);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 999) num = 999;
    setAnnualReturn(num);
  };

  const handleInflationInput = (val) => {
    let num = parseFloat(val);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 100) num = 100;
    setInflationRate(num);
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

  // Validated Start Investment Year Handler
  const handleStartInvestInput = (val) => {
    let num = parseInt(val, 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 100) num = 100;

    if (num > stopInvestYear) {
      setStopInvestYear(num);
    }
    setStartInvestYear(num);
  };

  // Validated Stop Investment Year Handler
  const handleStopInvestInput = (val) => {
    let num = parseInt(val, 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 100) num = 100;

    if (num < startInvestYear) {
      setStartInvestYear(num);
    }
    setStopInvestYear(num);
  };

  // Reset All Input Fields
  const handleResetValues = () => {
    setInitialAssets(DEFAULTS.initialAssets);
    setMonthlyInvested(DEFAULTS.monthlyInvested);
    setAnnualReturn(DEFAULTS.annualReturn);
    setInflationRate(DEFAULTS.inflationRate);
    setAdjustForInflation(DEFAULTS.adjustForInflation);
    setStartInvestYear(DEFAULTS.startInvestYear);
    setStopInvestYear(DEFAULTS.stopInvestYear);
    setInitialDebt(DEFAULTS.initialDebt);
    setMonthlyDebtPayoff(DEFAULTS.monthlyDebtPayoff);
    setYears(DEFAULTS.years);
    setRetirementGoal(DEFAULTS.retirementGoal);
    localStorage.removeItem('wealthplot_state');
    window.history.replaceState({}, document.title, window.location.pathname);
    handleResetZoom();
  };

  // Calculate Net Worth Projections
  const calculateData = () => {
    const data = [];
    let currentAssets = initialAssets;
    let currentDebt = initialDebt;
    let totalContributions = initialAssets;
    let totalInterestEarned = 0;

    const netAnnualReturn = adjustForInflation
      ? ((1 + annualReturn / 100) / (1 + inflationRate / 100) - 1) * 100
      : annualReturn;

    const monthlyReturnRate = netAnnualReturn / 100 / 12;

    for (let yr = 0; yr <= years; yr++) {
      if (yr === 0) {
        data.push({
          index: 0,
          year: `Yr 0`,
          Assets: currentAssets,
          Liabilities: currentDebt,
          NetWorth: currentAssets - currentDebt,
          Goal: retirementGoal,
          totalContributions,
          totalInterestEarned,
        });
      } else {
        const isInvesting = yr >= startInvestYear && yr <= stopInvestYear;
        const currentMonthlyContribution = isInvesting ? monthlyInvested : 0;

        let yearlyContributions = 0;
        let yearlyAssetGrowth = 0;

        for (let m = 0; m < 12; m++) {
          yearlyContributions += currentMonthlyContribution;
          const startOfMonthAssets = currentAssets + currentMonthlyContribution;
          const interestThisMonth = startOfMonthAssets * monthlyReturnRate;
          yearlyAssetGrowth += interestThisMonth;
          currentAssets = startOfMonthAssets + interestThisMonth;

          if (currentAssets > 1e15) currentAssets = 1e15;

          if (currentDebt > 0) {
            currentDebt = currentDebt - monthlyDebtPayoff;
            if (currentDebt < 0) currentDebt = 0;
          }
        }

        totalContributions += yearlyContributions;
        totalInterestEarned += yearlyAssetGrowth;

        const netWorth = currentAssets - currentDebt;
        data.push({
          index: yr,
          year: `Yr ${yr}`,
          Assets: currentAssets,
          Liabilities: currentDebt,
          NetWorth: netWorth,
          Goal: retirementGoal,
          totalContributions,
          totalInterestEarned,
        });
      }
    }
    return data;
  };

  const rawData = calculateData();

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = ['Year', 'Total Contributions', 'Interest Earned', 'Assets', 'Liabilities', 'Net Worth'];
    const rows = rawData.map((d) => [
      d.year,
      d.totalContributions.toFixed(2),
      d.totalInterestEarned.toFixed(2),
      d.Assets.toFixed(2),
      d.Liabilities.toFixed(2),
      d.NetWorth.toFixed(2),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wealthplot_projection_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Find Milestone Intersect Year
  const milestoneEntry = rawData.find((entry) => entry.NetWorth >= retirementGoal);
  const milestoneYear = milestoneEntry ? milestoneEntry.year : null;

  // Determine Dynamic Y-Axis Minimum Domain
  const hasNegativeValues = rawData.some(
    (d) => d.NetWorth < 0 || d.Assets < 0 || d.Liabilities < 0
  );
  const yAxisDomain = hasNegativeValues ? ['auto', 'auto'] : [0, 'auto'];

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

    const focusIdx =
      hoveredIndex !== null ? hoveredIndex : Math.floor((leftIndex + currentRight) / 2);

    let newLeft = leftIndex;
    let newRight = currentRight;

    if (e.deltaY < 0) {
      if (currentRange <= 2) return;
      const step = Math.max(1, Math.floor(currentRange * 0.15));
      newLeft = Math.min(focusIdx - 1, leftIndex + step);
      newRight = Math.max(focusIdx + 1, currentRight - step);
    } else {
      if (leftIndex === 0 && currentRight === maxIdx) return;
      const step = Math.max(1, Math.floor(currentRange * 0.15));
      newLeft = Math.max(0, leftIndex - step);
      newRight = Math.min(maxIdx, currentRight + step);
    }

    if (newLeft <= 0 && newRight >= maxIdx) {
      handleResetZoom();
    } else {
      setLeftIndex(newLeft);
      setRightIndex(newRight);
    }
  };

  useEffect(() => {
    const chartNode = chartContainerRef.current;
    if (!chartNode) return;

    const onWheel = (e) => handleWheelZoom(e);
    chartNode.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      chartNode.removeEventListener('wheel', onWheel);
    };
  }, [leftIndex, rightIndex, hoveredIndex, rawData.length]);

  const visibleData = rawData.slice(
    leftIndex,
    rightIndex !== null ? rightIndex + 1 : rawData.length
  );

  const lastEntry = rawData[rawData.length - 1] || { NetWorth: 0, Assets: 0, Liabilities: 0 };
  const currentNetWorth = lastEntry.NetWorth;
  const currentAssetsFinal = lastEntry.Assets;
  const currentDebtFinal = lastEntry.Liabilities;

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
    <div style={{ padding: '1rem', fontFamily: 'sans-serif', maxWidth: '1400px', margin: '0 auto', color: '#e2e8f0', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Bar with Title, Nav Links, & Share Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid #334155' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', color: '#f8fafc', margin: 0 }}>
            <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>WealthPlot</span> | Early Retirement & Investment Projection Dashboard
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <nav style={{ display: 'flex', gap: '0.8rem', fontSize: '0.85rem' }}>
            <button onClick={() => setActiveModal('about')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>About</button>
            <button onClick={() => setActiveModal('privacy')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>Privacy Policy</button>
            <button onClick={() => setActiveModal('terms')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>Terms</button>
            <button onClick={() => setActiveModal('contact')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>Contact</button>
          </nav>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={handleShareLink}
              style={{ background: copied ? '#22c55e' : '#3b82f6', color: '#ffffff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
            >
              {copied ? '✓ Link Copied!' : '🔗 Share Scenario'}
            </button>
            <button 
              onClick={handleExportCSV}
              style={{ background: '#0284c7', color: '#ffffff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
            >
              📥 Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Controls on Left, Visualizations on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '1.25rem', alignItems: 'start', flex: 1 }}>
        
        {/* Left Column: Side-by-Side Control Panel */}
        <div style={{ background: '#1e293b', padding: '1rem', borderRadius: '8px', border: '1px solid #334155' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, color: '#f8fafc' }}>Asset Controls</h4>
            <button 
              onClick={handleResetValues}
              style={{ background: '#475569', color: '#ffffff', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
            >
              Reset All
            </button>
          </div>
          
          {/* Starting Assets */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem' }}>Starting Assets</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '0.2rem 0.4rem' }}>
                <span style={{ color: '#4ade80', fontSize: '0.85rem', marginRight: '0.2rem' }}>$</span>
                <input 
                  type="text" 
                  value={formatDisplayInput(initialAssets)} 
                  onChange={(e) => handleFormattedInput(e.target.value, setInitialAssets, 99999999)}
                  style={{ width: '100px', border: 'none', background: 'transparent', color: '#4ade80', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }} 
                />
              </div>
            </div>
            <input type="range" min="0" max="1000000" step="1000" value={initialAssets} onChange={(e) => handleFormattedInput(e.target.value, setInitialAssets, 1000000)} style={{ width: '100%', accentColor: '#4ade80' }} />
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
                  onChange={(e) => handleFormattedInput(e.target.value, setMonthlyInvested, 999999)}
                  style={{ width: '100px', border: 'none', background: 'transparent', color: '#4ade80', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }} 
                />
              </div>
            </div>
            <input type="range" min="0" max="50000" step="100" value={monthlyInvested} onChange={(e) => handleFormattedInput(e.target.value, setMonthlyInvested, 50000)} style={{ width: '100%', accentColor: '#4ade80' }} />
          </div>

          {/* Start & Stop Investing Years Side-by-Side */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem' }}>Start Inv.</label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '0.15rem 0.3rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.7rem', marginRight: '0.1rem' }}>Yr</span>
                  <input 
                    type="number" min="0" max="100" step="1" 
                    value={startInvestYear} 
                    onChange={(e) => handleStartInvestInput(e.target.value)}
                    style={{ width: '35px', border: 'none', background: 'transparent', color: '#4ade80', fontSize: '0.8rem', textAlign: 'right', outline: 'none' }} 
                  />
                </div>
              </div>
              <input type="range" min="0" max="100" step="1" value={startInvestYear} onChange={(e) => handleStartInvestInput(e.target.value)} style={{ width: '100%', accentColor: '#4ade80' }} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem' }}>Stop Inv.</label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '0.15rem 0.3rem' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.7rem', marginRight: '0.1rem' }}>Yr</span>
                  <input 
                    type="number" min="0" max="100" step="1" 
                    value={stopInvestYear} 
                    onChange={(e) => handleStopInvestInput(e.target.value)}
                    style={{ width: '35px', border: 'none', background: 'transparent', color: '#f87171', fontSize: '0.8rem', textAlign: 'right', outline: 'none' }} 
                  />
                </div>
              </div>
              <input type="range" min="0" max="100" step="1" value={stopInvestYear} onChange={(e) => handleStopInvestInput(e.target.value)} style={{ width: '100%', accentColor: '#f87171' }} />
            </div>
          </div>

          {/* Est. Annual Return & Inflation Adjustments */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem' }}>Est. Annual Return</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '0.2rem 0.4rem' }}>
                <input 
                  type="number" min="0" max="999" step="0.1" 
                  value={annualReturn} 
                  onChange={(e) => handleReturnInput(e.target.value)}
                  style={{ width: '50px', border: 'none', background: 'transparent', color: '#60a5fa', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }} 
                />
                <span style={{ color: '#60a5fa', fontSize: '0.85rem', marginLeft: '0.2rem' }}>%</span>
              </div>
            </div>
            <input type="range" min="0" max="30" step="0.5" value={annualReturn} onChange={(e) => handleReturnInput(e.target.value)} style={{ width: '100%', accentColor: '#60a5fa' }} />
          </div>

          {/* Inflation Rate & Adjustment Toggle */}
          <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '6px', border: '1px solid #334155', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input 
                  type="checkbox" 
                  checked={adjustForInflation} 
                  onChange={(e) => setAdjustForInflation(e.target.checked)} 
                  style={{ accentColor: '#3b82f6' }}
                />
                Adjust for Inflation
              </label>
            </div>
            {adjustForInflation && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Est. Inflation Rate</span>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#1e293b', border: '1px solid #475569', borderRadius: '4px', padding: '0.1rem 0.3rem' }}>
                    <input 
                      type="number" min="0" max="100" step="0.1" 
                      value={inflationRate} 
                      onChange={(e) => handleInflationInput(e.target.value)}
                      style={{ width: '45px', border: 'none', background: 'transparent', color: '#f59e0b', fontSize: '0.8rem', textAlign: 'right', outline: 'none' }} 
                    />
                    <span style={{ color: '#f59e0b', fontSize: '0.8rem', marginLeft: '0.1rem' }}>%</span>
                  </div>
                </div>
                <input type="range" min="0" max="15" step="0.1" value={inflationRate} onChange={(e) => handleInflationInput(e.target.value)} style={{ width: '100%', accentColor: '#f59e0b' }} />
              </div>
            )}
          </div>

          <h4 style={{ marginTop: '1rem', marginBottom: '0.75rem', color: '#f8fafc' }}>Liability Controls</h4>
          
          {/* Current Debt */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem' }}>Current Debt</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '0.2rem 0.4rem' }}>
                <span style={{ color: '#f87171', fontSize: '0.85rem', marginRight: '0.2rem' }}>$</span>
                <input 
                  type="text" 
                  value={formatDisplayInput(initialDebt)} 
                  onChange={(e) => handleFormattedInput(e.target.value, setInitialDebt, 99999999)}
                  style={{ width: '100px', border: 'none', background: 'transparent', color: '#f87171', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }} 
                />
              </div>
            </div>
            <input type="range" min="0" max="500000" step="1000" value={initialDebt} onChange={(e) => handleFormattedInput(e.target.value, setInitialDebt, 500000)} style={{ width: '100%', accentColor: '#f87171' }} />
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
                  onChange={(e) => handleFormattedInput(e.target.value, setMonthlyDebtPayoff, 999999)}
                  style={{ width: '100px', border: 'none', background: 'transparent', color: '#f87171', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }} 
                />
              </div>
            </div>
            <input type="range" min="0" max="20000" step="100" value={monthlyDebtPayoff} onChange={(e) => handleFormattedInput(e.target.value, setMonthlyDebtPayoff, 20000)} style={{ width: '100%', accentColor: '#f87171' }} />
          </div>

          <h4 style={{ marginTop: '1rem', marginBottom: '0.75rem', color: '#f8fafc' }}>Timeline & Target</h4>
          
          {/* Target Goal */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem' }}>Target Goal</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '0.2rem 0.4rem' }}>
                <span style={{ color: '#fbbf24', fontSize: '0.85rem', marginRight: '0.2rem' }}>$</span>
                <input 
                  type="text" 
                  value={formatDisplayInput(retirementGoal)} 
                  onChange={(e) => handleFormattedInput(e.target.value, setRetirementGoal, 100000000)}
                  style={{ width: '100px', border: 'none', background: 'transparent', color: '#fbbf24', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }} 
                />
              </div>
            </div>
            <input type="range" min="0" max="5000000" step="10000" value={retirementGoal} onChange={(e) => handleFormattedInput(e.target.value, setRetirementGoal, 5000000)} style={{ width: '100%', accentColor: '#fbbf24' }} />
          </div>

          {/* Timeline Years */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.85rem' }}>Timeline (Years)</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', border: '1px solid #475569', borderRadius: '4px', padding: '0.2rem 0.4rem' }}>
                <input 
                  type="number" min="1" max="250" step="1" 
                  value={years} 
                  onChange={(e) => handleYearsInput(e.target.value, setYears, 250)}
                  style={{ width: '45px', border: 'none', background: 'transparent', color: '#fbbf24', fontSize: '0.85rem', textAlign: 'right', outline: 'none' }} 
                />
                <span style={{ color: '#fbbf24', fontSize: '0.85rem', marginLeft: '0.2rem' }}>Yrs</span>
              </div>
            </div>
            <input type="range" min="1" max="100" step="1" value={years} onChange={(e) => handleYearsInput(e.target.value, setYears, 100)} style={{ width: '100%', accentColor: '#fbbf24' }} />
          </div>

        </div>

        {/* Right Column: Dashboard Visualizations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* KPI Cards */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ flex: '1 1 130px', background: '#1e293b', padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155' }}>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.75rem' }}>Projected Assets</p>
              <h3 style={{ margin: '0.2rem 0 0 0', color: '#4ade80', fontSize: '1rem' }}>{formatCurrency(currentAssetsFinal)}</h3>
            </div>
            <div style={{ flex: '1 1 130px', background: '#1e293b', padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155' }}>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.75rem' }}>Liabilities</p>
              <h3 style={{ margin: '0.2rem 0 0 0', color: '#f87171', fontSize: '1rem' }}>{formatCurrency(currentDebtFinal)}</h3>
            </div>
            <div style={{ flex: '1 1 130px', background: '#1e293b', padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155' }}>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.75rem' }}>Net Worth</p>
              <h3 style={{ margin: '0.2rem 0 0 0', color: '#60a5fa', fontSize: '1rem' }}>{formatCurrency(currentNetWorth)}</h3>
            </div>
            <div style={{ flex: '1 1 130px', background: '#1e293b', padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155' }}>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.75rem' }}>Target Goal</p>
              <h3 style={{ margin: '0.2rem 0 0 0', color: '#fbbf24', fontSize: '1rem' }}>{formatCurrency(retirementGoal)}</h3>
            </div>
          </div>

          {/* Chart Section Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              Scroll wheel to zoom. Click legend items above graph to toggle.
            </span>
            {(leftIndex !== 0 || rightIndex !== null) && (
              <button 
                onClick={handleResetZoom}
                style={{ background: '#3b82f6', color: '#ffffff', border: 'none', padding: '0.25rem 0.6rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
              >
                Reset Zoom
              </button>
            )}
          </div>

          {/* Chart Container */}
          <div 
            ref={chartContainerRef}
            style={{ width: '100%', height: '440px', background: '#1e293b', padding: '0.75rem', borderRadius: '8px', border: '1px solid #334155', boxSizing: 'border-box', userSelect: 'none' }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={visibleData} 
                margin={{ top: 10, right: 15, left: 15, bottom: 10 }}
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
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickFormatter={formatYAxis} tick={{ fontSize: 11, fill: '#94a3b8' }} width={75} domain={yAxisDomain} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '6px' }} 
                  formatter={(value) => [formatCurrency(value), '']} 
                />
                
                <Legend 
                  verticalAlign="top"
                  align="right"
                  onClick={handleLegendClick}
                  wrapperStyle={{ fontSize: '12px', color: '#cbd5e1', cursor: 'pointer', paddingBottom: '15px' }} 
                />

                {visibleLines.NetWorth && (
                  <Line type="monotone" dataKey="NetWorth" stroke="#60a5fa" strokeWidth={3} name="Net Worth" dot={false} animationDuration={300} />
                )}
                {visibleLines.Assets && (
                  <Line type="monotone" dataKey="Assets" stroke="#4ade80" strokeWidth={2} strokeDasharray="5 5" name="Assets" dot={false} animationDuration={300} />
                )}
                {visibleLines.Liabilities && (
                  <Line type="monotone" dataKey="Liabilities" stroke="#f87171" strokeWidth={2} name="Liabilities" dot={false} animationDuration={300} />
                )}
                {visibleLines.Goal && (
                  <Line type="monotone" dataKey="Goal" stroke="#fbbf24" strokeDasharray="3 3" strokeWidth={2} name="Goal" dot={false} animationDuration={300} />
                )}

                {/* Milestone Intersection Indicator */}
                {milestoneYear && visibleLines.Goal && (
                  <ReferenceLine 
                    x={milestoneYear} 
                    stroke="#fbbf24" 
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    label={{ value: `Goal Reached (${milestoneYear})`, fill: '#fbbf24', fontSize: 11, position: 'insideTopLeft' }} 
                  />
                )}

                {refAreaLeft && refAreaRight ? (
                  <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#60a5fa" fillOpacity={0.3} />
                ) : null}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Expandable Breakdown Table Toggle Button */}
          <div>
            <button 
              onClick={() => setShowTable(!showTable)}
              style={{ background: '#334155', color: '#f8fafc', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>Year-by-Year Breakdown Table</span>
              <span>{showTable ? '▲ Hide' : '▼ Expand'}</span>
            </button>

            {/* Breakdown Data Table */}
            {showTable && (
              <div style={{ marginTop: '0.75rem', overflowX: 'auto', background: '#1e293b', borderRadius: '8px', border: '1px solid #334155', maxHeight: '350px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #334155' }}>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Year</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Total Contributions</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Interest Earned</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Liabilities</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Net Worth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawData.map((row) => (
                      <tr key={row.index} style={{ borderBottom: '1px solid #334155', color: row.year === milestoneYear ? '#fbbf24' : '#e2e8f0', background: row.year === milestoneYear ? 'rgba(251, 191, 36, 0.05)' : 'transparent' }}>
                        <td style={{ padding: '0.4rem 0.75rem', textAlign: 'left', fontWeight: row.year === milestoneYear ? 'bold' : 'normal' }}>
                          {row.year} {row.year === milestoneYear ? '🎯' : ''}
                        </td>
                        <td style={{ padding: '0.4rem 0.75rem' }}>{formatCurrency(row.totalContributions)}</td>
                        <td style={{ padding: '0.4rem 0.75rem', color: '#4ade80' }}>{formatCurrency(row.totalInterestEarned)}</td>
                        <td style={{ padding: '0.4rem 0.75rem', color: '#f87171' }}>{formatCurrency(row.Liabilities)}</td>
                        <td style={{ padding: '0.4rem 0.75rem', fontWeight: 'bold', color: '#60a5fa' }}>{formatCurrency(row.NetWorth)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Footer Area with AdSense-Required Navigation Links */}
      <footer style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #334155', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          © {new Date().getFullYear()} WealthPlot. All rights reserved.
        </div>
        <div style={{ display: 'flex', gap: '1.25rem' }}>
          <button onClick={() => setActiveModal('about')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}>About Us</button>
          <button onClick={() => setActiveModal('privacy')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}>Privacy Policy</button>
          <button onClick={() => setActiveModal('terms')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}>Terms of Service</button>
          <button onClick={() => setActiveModal('contact')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}>Contact Us</button>
        </div>
      </footer>

      {/* Pop-up Overlay Component for Legal & Info Pages */}
      {activeModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '1.5rem', maxWidth: '650px', width: '100%', maxHeight: '80vh', overflowY: 'auto', position: 'relative', color: '#e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <button 
              onClick={() => setActiveModal(null)} 
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: '#334155', border: 'none', color: '#f8fafc', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold' }}
            >
              ✕
            </button>

            {activeModal === 'about' && (
              <div>
                <h3 style={{ color: '#f8fafc', marginTop: 0 }}>About WealthPlot</h3>
                <p style={{ lineHeight: '1.6', fontSize: '0.9rem' }}>
                  <strong>WealthPlot</strong> is an interactive financial planning tool built to help individuals visualize their path to financial independence, early retirement (FIRE), and long-term net worth growth.
                </p>
                <p style={{ lineHeight: '1.6', fontSize: '0.9rem' }}>
                  Our mission is to make financial modeling accessible, responsive, and easy to understand. By providing real-time trajectory visualization, debt payoff tracking, and inflation-adjusted projections, WealthPlot helps users make informed decisions about their savings and investment strategies.
                </p>
                <h4 style={{ color: '#f8fafc', marginTop: '1rem' }}>Disclaimer</h4>
                <p style={{ lineHeight: '1.6', fontSize: '0.85rem', color: '#94a3b8' }}>
                  WealthPlot provides estimated estimations for educational and planning purposes only. It does not constitute professional financial advice.
                </p>
              </div>
            )}

            {activeModal === 'privacy' && (
              <div>
                <h3 style={{ color: '#f8fafc', marginTop: 0 }}>Privacy Policy</h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Last Updated: September 2026</p>
                
                <h4 style={{ color: '#f8fafc' }}>1. Data Storage & Local State</h4>
                <p style={{ lineHeight: '1.5', fontSize: '0.85rem' }}>
                  WealthPlot stores your inputs locally in your browser's <code>localStorage</code> or URL parameters. Your financial data is calculated client-side and is never transmitted or stored on remote servers.
                </p>

                <h4 style={{ color: '#f8fafc' }}>2. Third-Party Advertising & Cookies</h4>
                <p style={{ lineHeight: '1.5', fontSize: '0.85rem' }}>
                  Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites. Google's use of advertising cookies enables it and its partners to serve ads based on your visit to this site and/or other sites on the Internet.
                </p>
                <p style={{ lineHeight: '1.5', fontSize: '0.85rem' }}>
                  Users may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noreferrer" style={{ color: '#60a5fa' }}>Google Ads Settings</a>.
                </p>

                <h4 style={{ color: '#f8fafc' }}>3. Analytics</h4>
                <p style={{ lineHeight: '1.5', fontSize: '0.85rem' }}>
                  We may collect standard web analytics data (such as page traffic and browser types) to improve site performance and user experience.
                </p>
              </div>
            )}

            {activeModal === 'terms' && (
              <div>
                <h3 style={{ color: '#f8fafc', marginTop: 0 }}>Terms of Service</h3>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Last Updated: September 2026</p>

                <h4 style={{ color: '#f8fafc' }}>1. Agreement to Terms</h4>
                <p style={{ lineHeight: '1.5', fontSize: '0.85rem' }}>
                  By accessing or using WealthPlot, you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you should discontinue use of the application.
                </p>

                <h4 style={{ color: '#f8fafc' }}>2. Financial Calculator Disclaimer</h4>
                <p style={{ lineHeight: '1.5', fontSize: '0.85rem' }}>
                  The calculations, results, and charts provided by WealthPlot are hypothetical projections for informational purposes only. Actual financial market returns, inflation rates, and personal outcomes may vary significantly. WealthPlot is not a licensed financial advisor.
                </p>

                <h4 style={{ color: '#f8fafc' }}>3. Limitation of Liability</h4>
                <p style={{ lineHeight: '1.5', fontSize: '0.85rem' }}>
                  Under no circumstances shall the site owners or creators be held liable for any financial losses or damages resulting from decisions made based on outputs from this tool.
                </p>
              </div>
            )}

            {activeModal === 'contact' && (
              <div>
                <h3 style={{ color: '#f8fafc', marginTop: 0 }}>Contact Us</h3>
                <p style={{ lineHeight: '1.6', fontSize: '0.9rem' }}>
                  Have questions, feature requests, or general feedback about WealthPlot? We’d love to hear from you!
                </p>
                
                <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', padding: '1rem', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block' }}>Primary Support Email</span>
                    <strong style={{ fontSize: '1rem', color: '#3b82f6' }}>wealthplotorg@gmail.com</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <a 
                      href="mailto:wealthplotorg@gmail.com?subject=WealthPlot%20Inquiry"
                      style={{ background: '#3b82f6', color: '#ffffff', textDecoration: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-block' }}
                    >
                      ✉ Send Direct Email
                    </a>
                    <button 
                      onClick={handleCopyEmail}
                      style={{ background: emailCopied ? '#22c55e' : '#334155', color: '#ffffff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                      {emailCopied ? '✓ Email Copied!' : '📋 Copy Email'}
                    </button>
                  </div>
                </div>

                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '1rem', lineHeight: '1.5' }}>
                  We aim to respond to user inquiries and feedback within 1-2 business days.
                </p>
              </div>
            )}

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button 
                onClick={() => setActiveModal(null)}
                style={{ background: '#3b82f6', color: '#ffffff', border: 'none', padding: '0.4rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}