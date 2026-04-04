import React, { useState, useRef, useEffect } from 'react';

interface CountryCode {
  code: string;
  dial: string;
  name: string;
  priority?: boolean;
}

// Flag image URL helper using flagcdn.com
const flagUrl = (code: string) => `https://flagcdn.com/20x15/${code.toLowerCase()}.png`;

const COUNTRY_CODES: CountryCode[] = [
  // Priority countries
  { code: 'IN', dial: '91', name: 'India', priority: true },
  { code: 'PK', dial: '92', name: 'Pakistan', priority: true },
  { code: 'NP', dial: '977', name: 'Nepal', priority: true },
  // Gulf / Middle East
  { code: 'AE', dial: '971', name: 'UAE' },
  { code: 'SA', dial: '966', name: 'Saudi Arabia' },
  { code: 'QA', dial: '974', name: 'Qatar' },
  { code: 'KW', dial: '965', name: 'Kuwait' },
  { code: 'BH', dial: '973', name: 'Bahrain' },
  { code: 'OM', dial: '968', name: 'Oman' },
  // Asia
  { code: 'BD', dial: '880', name: 'Bangladesh' },
  { code: 'LK', dial: '94', name: 'Sri Lanka' },
  { code: 'PH', dial: '63', name: 'Philippines' },
  { code: 'CN', dial: '86', name: 'China' },
  { code: 'JP', dial: '81', name: 'Japan' },
  { code: 'KR', dial: '82', name: 'South Korea' },
  { code: 'ID', dial: '62', name: 'Indonesia' },
  { code: 'MY', dial: '60', name: 'Malaysia' },
  { code: 'SG', dial: '65', name: 'Singapore' },
  { code: 'TH', dial: '66', name: 'Thailand' },
  { code: 'VN', dial: '84', name: 'Vietnam' },
  { code: 'MM', dial: '95', name: 'Myanmar' },
  { code: 'AF', dial: '93', name: 'Afghanistan' },
  { code: 'IR', dial: '98', name: 'Iran' },
  { code: 'IQ', dial: '964', name: 'Iraq' },
  { code: 'JO', dial: '962', name: 'Jordan' },
  { code: 'LB', dial: '961', name: 'Lebanon' },
  { code: 'PS', dial: '970', name: 'Palestine' },
  { code: 'SY', dial: '963', name: 'Syria' },
  { code: 'YE', dial: '967', name: 'Yemen' },
  { code: 'TR', dial: '90', name: 'Turkey' },
  // Africa
  { code: 'EG', dial: '20', name: 'Egypt' },
  { code: 'NG', dial: '234', name: 'Nigeria' },
  { code: 'KE', dial: '254', name: 'Kenya' },
  { code: 'ZA', dial: '27', name: 'South Africa' },
  { code: 'ET', dial: '251', name: 'Ethiopia' },
  { code: 'GH', dial: '233', name: 'Ghana' },
  { code: 'TZ', dial: '255', name: 'Tanzania' },
  { code: 'UG', dial: '256', name: 'Uganda' },
  { code: 'SD', dial: '249', name: 'Sudan' },
  { code: 'MA', dial: '212', name: 'Morocco' },
  // Europe
  { code: 'GB', dial: '44', name: 'United Kingdom' },
  { code: 'DE', dial: '49', name: 'Germany' },
  { code: 'FR', dial: '33', name: 'France' },
  { code: 'IT', dial: '39', name: 'Italy' },
  { code: 'ES', dial: '34', name: 'Spain' },
  { code: 'PT', dial: '351', name: 'Portugal' },
  { code: 'NL', dial: '31', name: 'Netherlands' },
  { code: 'BE', dial: '32', name: 'Belgium' },
  { code: 'SE', dial: '46', name: 'Sweden' },
  { code: 'NO', dial: '47', name: 'Norway' },
  { code: 'DK', dial: '45', name: 'Denmark' },
  { code: 'FI', dial: '358', name: 'Finland' },
  { code: 'CH', dial: '41', name: 'Switzerland' },
  { code: 'AT', dial: '43', name: 'Austria' },
  { code: 'PL', dial: '48', name: 'Poland' },
  { code: 'RO', dial: '40', name: 'Romania' },
  { code: 'GR', dial: '30', name: 'Greece' },
  { code: 'RU', dial: '7', name: 'Russia' },
  { code: 'UA', dial: '380', name: 'Ukraine' },
  // Americas
  { code: 'US', dial: '1', name: 'United States' },
  { code: 'CA', dial: '1', name: 'Canada' },
  { code: 'MX', dial: '52', name: 'Mexico' },
  { code: 'BR', dial: '55', name: 'Brazil' },
  { code: 'AR', dial: '54', name: 'Argentina' },
  { code: 'CO', dial: '57', name: 'Colombia' },
  // Oceania
  { code: 'AU', dial: '61', name: 'Australia' },
  { code: 'NZ', dial: '64', name: 'New Zealand' },
];

interface CountryCodeSelectProps {
  value: string;
  onChange: (dialCode: string) => void;
  disabled?: boolean;
}

const CountryCodeSelect: React.FC<CountryCodeSelectProps> = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  const selected = COUNTRY_CODES.find(c => c.dial === value);

  const filtered = COUNTRY_CODES.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase().includes(q);
  });

  // Sort: priority countries first, then alphabetical
  const sorted = [...filtered].sort((a, b) => {
    if (a.priority && !b.priority) return -1;
    if (!a.priority && b.priority) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 py-2 bg-white hover:bg-gray-50 min-w-[90px] justify-between"
      >
        <span className="flex items-center gap-1 text-sm">
          {selected ? (
            <><img src={flagUrl(selected.code)} alt={selected.name} className="w-5 h-4 object-cover" /><span>+{selected.dial}</span></>
          ) : value ? (
            <span>+{value}</span>
          ) : (
            <span className="text-gray-400">Code</span>
          )}
        </span>
        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              placeholder="Search country or code..."
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {sorted.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400">No results</div>
            )}
            {sorted.map((c) => (
              <button
                key={c.code + c.dial}
                type="button"
                onClick={() => {
                  onChange(c.dial);
                  setOpen(false);
                  setSearch('');
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 ${
                  value === c.dial ? 'bg-blue-50 font-medium' : ''
                }`}
              >
                <img src={flagUrl(c.code)} alt={c.name} className="w-5 h-4 object-cover" />
                <span className="flex-1 text-left">{c.name}</span>
                <span className="text-gray-400">+{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryCodeSelect;
