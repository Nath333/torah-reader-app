import { useState, useEffect } from 'react';

// Hebrew month names
const HEBREW_MONTHS = [
  'Nisan', 'Iyar', 'Sivan', 'Tammuz', 'Av', 'Elul',
  'Tishrei', 'Cheshvan', 'Kislev', 'Tevet', 'Shevat', 'Adar'
];

const HEBREW_MONTHS_HE = [
  'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול',
  'תשרי', 'חשון', 'כסלו', 'טבת', 'שבט', 'אדר'
];

// Convert number to Hebrew numerals
const toHebrewNumeral = (num) => {
  const ones = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  if (num <= 10) return ones[num] || String(num);
  if (num < 20) return 'י' + ones[num - 10];
  if (num < 30) return 'כ' + ones[num - 20];
  if (num === 30) return 'ל';
  return String(num);
};

// Get time-based greeting
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { en: 'Good Morning', he: 'בוקר טוב' };
  if (hour < 17) return { en: 'Good Afternoon', he: 'צהריים טובים' };
  if (hour < 21) return { en: 'Good Evening', he: 'ערב טוב' };
  return { en: 'Good Night', he: 'לילה טוב' };
};

// Shared hook for Hebrew date
const useHebrewDate = () => {
  const [hebrewDate, setHebrewDate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchDate = async () => {
      try {
        const today = new Date();
        const response = await fetch(
          `https://www.hebcal.com/converter?cfg=json&gy=${today.getFullYear()}&gm=${today.getMonth() + 1}&gd=${today.getDate()}&g2h=1`
        );
        const data = await response.json();

        if (mounted) {
          setHebrewDate({
            day: data.hd,
            month: data.hm,
            monthHe: HEBREW_MONTHS_HE[HEBREW_MONTHS.indexOf(data.hm)] || data.hm,
            year: data.hy,
            dayHe: toHebrewNumeral(data.hd),
            formatted: `${toHebrewNumeral(data.hd)} ${HEBREW_MONTHS_HE[HEBREW_MONTHS.indexOf(data.hm)] || data.hm}`,
            formattedEn: `${data.hd} ${data.hm} ${data.hy}`
          });
        }
      } catch {
        // Silent fail - date is optional
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDate();
    return () => { mounted = false; };
  }, []);

  return { hebrewDate, loading, greeting: getGreeting() };
};

export default useHebrewDate;
