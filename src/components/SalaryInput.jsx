import { useState, useEffect } from 'react'

const SALARY_PRESETS = [
  { label: '₱10,000', value: 10000 },
  { label: '₱12,000', value: 12000 },
  { label: '₱15,000', value: 15000 },
  { label: '₱18,000', value: 18000 },
  { label: '₱20,000', value: 20000 },
  { label: '₱25,000', value: 25000 },
  { label: '₱30,000', value: 30000 },
  { label: '₱35,000', value: 35000 },
  { label: '₱40,000', value: 40000 },
  { label: '₱45,000', value: 45000 },
  { label: '₱50,000', value: 50000 },
  { label: '₱60,000', value: 60000 },
  { label: '₱70,000', value: 70000 },
  { label: '₱80,000', value: 80000 },
  { label: '₱100,000', value: 100000 },
]

function formatSalary(value) {
  if (!value) return ''
  const num = value.toString().replace(/[^0-9]/g, '')
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export default function SalaryInput({ value, onChange }) {
  const [displayValue, setDisplayValue] = useState(
    value ? formatSalary(value.toString().replace(/[^0-9]/g, '')) : ''
  )
  const [selectedPreset, setSelectedPreset] = useState('')

  // Sync display when value prop changes externally
  useEffect(() => {
    if (value) {
      const clean = value.toString().replace(/[^0-9]/g, '')
      setDisplayValue(formatSalary(clean))
    } else {
      setDisplayValue('')
    }
  }, [value])

  function handleInput(e) {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    setDisplayValue(formatSalary(raw))
    setSelectedPreset('') // reset dropdown when typing custom
    onChange(raw ? formatSalary(raw) : '')
  }

  function handlePreset(e) {
    const val = e.target.value
    setSelectedPreset(val)
    if (!val) return
    const preset = SALARY_PRESETS.find(p => p.value === parseInt(val))
    if (preset) {
      setDisplayValue(formatSalary(preset.value))
      onChange(formatSalary(preset.value))
    }
  }

  function handleClear() {
    setDisplayValue('')
    setSelectedPreset('')
    onChange('')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Quick select dropdown */}
      <select
        className="fselect"
        value={selectedPreset}
        onChange={handlePreset}
      >
        <option value="">Quick select salary range...</option>
        {SALARY_PRESETS.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      {/* Custom input with ₱ prefix */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        overflow: 'hidden'
      }}>
        <span style={{
          padding: '0 12px',
          color: 'var(--text2)',
          fontSize: '15px',
          fontWeight: 700,
          borderRight: '1px solid var(--border)',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          background: 'var(--surface2)'
        }}>
          ₱
        </span>
        <input
          type="text"
          inputMode="numeric"
          className="finput"
          placeholder="e.g. 25,000"
          value={displayValue}
          onChange={handleInput}
          style={{
            border: 'none',
            borderRadius: '0',
            flex: 1,
            background: 'transparent'
          }}
        />
        {displayValue && (
          <button
            onClick={handleClear}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text2)',
              cursor: 'pointer',
              padding: '0 12px',
              fontSize: '16px'
            }}
          >
            ✕
          </button>
        )}
      </div>
      {displayValue && (
        <span style={{ fontSize: '12px', color: 'var(--text2)' }}>
          Salary: ₱{displayValue} per month
        </span>
      )}
    </div>
  )
}
