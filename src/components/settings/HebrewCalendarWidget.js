/**
 * HebrewCalendarWidget - Shows Jewish calendar info
 *
 * Displays: Hebrew date, Today's Parasha, Daf Yomi
 * Uses hebcalService for accurate data
 */
import React, { useState, useEffect, useMemo } from 'react';
import './HebrewCalendarWidget.css';

// Hebcal API endpoint
const HEBCAL_API = 'https://www.hebcal.com/shabbat';

// Cache
const cache = { data: null, timestamp: 0 };
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Hebrew month names
const HEBREW_MONTHS = {
  Nisan: 'ניסן', Iyar: 'אייר', Sivan: 'סיון', Tammuz: 'תמוז',
  Av: 'אב', Elul: 'אלול', Tishrei: 'תשרי', Cheshvan: 'חשון',
  Kislev: 'כסלו', Tevet: 'טבת', Shevat: 'שבט', Adar: 'אדר',
  'Adar I': 'אדר א׳', 'Adar II': 'אדר ב׳'
};

// Convert number to Hebrew numerals
const toHebrewNumeral = (num) => {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  const tens = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ'];

  if (num <= 0 || num > 30) return String(num);

  // Special cases for 15 and 16
  if (num === 15) return 'ט״ו';
  if (num === 16) return 'ט״ז';

  const t = Math.floor(num / 10);
  const o = num % 10;

  if (t === 0) return ones[o] + '׳';
  if (o === 0) return tens[t] + '׳';
  return tens[t] + '״' + ones[o];
};

const HebrewCalendarWidget = ({
  onNavigateToParsha,
  onNavigateToDaf,
  compact = false,
  showZmanim = false
}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCalendarData = async () => {
      // Check cache
      if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
        setData(cache.data);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Get user's location for accurate Shabbat times (fallback to Jerusalem)
        let lat = 31.7683, lng = 35.2137; // Jerusalem default

        try {
          const pos = await new Promise((resolve, reject) => {
            navigator.geolocation?.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        } catch {
          // Use default Jerusalem coordinates
        }

        // Fetch from Hebcal API
        const params = new URLSearchParams({
          cfg: 'json',
          geo: 'pos',
          latitude: lat,
          longitude: lng,
          M: 'on', // Include Havdalah
          b: '18', // Candle lighting minutes before sunset
        });

        const response = await fetch(`${HEBCAL_API}?${params}`);
        if (!response.ok) throw new Error('Failed to fetch calendar data');

        const result = await response.json();

        // Parse response
        const parsedData = {
          hebrewDate: result.date?.hebrew || '',
          hebrewDay: result.date?.hd || 1,
          hebrewMonth: result.date?.hm || 'Tishrei',
          hebrewYear: result.date?.hy || 5785,
          parsha: null,
          dafYomi: null,
          candleLighting: null,
          havdalah: null,
          holiday: null
        };

        // Extract items from response
        result.items?.forEach(item => {
          switch (item.category) {
            case 'parashat':
              parsedData.parsha = {
                name: item.title?.replace('Parashat ', ''),
                hebrew: item.hebrew,
                link: item.link
              };
              break;
            case 'dafyomi':
              parsedData.dafYomi = {
                name: item.title?.replace('Daf Yomi: ', ''),
                link: item.link
              };
              break;
            case 'candles':
              parsedData.candleLighting = item.title;
              break;
            case 'havdalah':
              parsedData.havdalah = item.title;
              break;
            case 'holiday':
              parsedData.holiday = {
                name: item.title,
                hebrew: item.hebrew
              };
              break;
            default:
              break;
          }
        });

        // Cache and set data
        cache.data = parsedData;
        cache.timestamp = Date.now();
        setData(parsedData);
      } catch (err) {
        console.warn('Calendar fetch failed:', err);
        setError('Unable to load calendar');

        // Fallback data
        const now = new Date();
        setData({
          hebrewDate: '',
          hebrewDay: now.getDate(),
          hebrewMonth: 'Tishrei',
          hebrewYear: now.getFullYear() + 3760,
          parsha: null,
          dafYomi: null
        });
      }

      setLoading(false);
    };

    fetchCalendarData();
  }, []);

  // Format Hebrew date
  const formattedDate = useMemo(() => {
    if (!data) return '';
    const monthHeb = HEBREW_MONTHS[data.hebrewMonth] || data.hebrewMonth;
    const dayHeb = toHebrewNumeral(data.hebrewDay);
    return `${dayHeb} ${monthHeb}`;
  }, [data]);

  if (loading) {
    return (
      <div className={`hebrew-calendar-widget ${compact ? 'compact' : ''}`}>
        <div className="hcw-loading">
          <span className="hcw-loading-dot"></span>
          <span className="hcw-loading-dot"></span>
          <span className="hcw-loading-dot"></span>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return null; // Hide widget on error
  }

  return (
    <div className={`hebrew-calendar-widget ${compact ? 'compact' : ''}`}>
      {/* Hebrew Date */}
      <div className="hcw-date">
        <span className="hcw-date-hebrew" dir="rtl">{formattedDate}</span>
        <span className="hcw-date-year">{data.hebrewYear}</span>
      </div>

      {/* Holiday (if any) */}
      {data.holiday && (
        <div className="hcw-holiday">
          <span className="hcw-holiday-icon">🕯️</span>
          <span className="hcw-holiday-name" dir="rtl">{data.holiday.hebrew || data.holiday.name}</span>
        </div>
      )}

      {/* Parsha */}
      {data.parsha && (
        <button
          className="hcw-item hcw-parsha"
          onClick={() => onNavigateToParsha?.(data.parsha)}
          title={`Go to ${data.parsha.name}`}
        >
          <span className="hcw-item-icon">📖</span>
          <div className="hcw-item-content">
            <span className="hcw-item-label">פרשת השבוע</span>
            <span className="hcw-item-value" dir="rtl">{data.parsha.hebrew || data.parsha.name}</span>
          </div>
          <span className="hcw-item-arrow">→</span>
        </button>
      )}

      {/* Daf Yomi */}
      {data.dafYomi && !compact && (
        <button
          className="hcw-item hcw-daf"
          onClick={() => onNavigateToDaf?.(data.dafYomi)}
          title={`Go to ${data.dafYomi.name}`}
        >
          <span className="hcw-item-icon">📚</span>
          <div className="hcw-item-content">
            <span className="hcw-item-label">דף יומי</span>
            <span className="hcw-item-value">{data.dafYomi.name}</span>
          </div>
          <span className="hcw-item-arrow">→</span>
        </button>
      )}

      {/* Shabbat Times */}
      {showZmanim && (data.candleLighting || data.havdalah) && (
        <div className="hcw-zmanim">
          {data.candleLighting && (
            <div className="hcw-zman">
              <span className="hcw-zman-icon">🕯️</span>
              <span className="hcw-zman-text">{data.candleLighting}</span>
            </div>
          )}
          {data.havdalah && (
            <div className="hcw-zman">
              <span className="hcw-zman-icon">✨</span>
              <span className="hcw-zman-text">{data.havdalah}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(HebrewCalendarWidget);
