/**
 * Utility to convert numbers to Qatari Riyal words.
 */
export function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];
  const teens = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];

  function convertGroup(n: number): string {
    let res = '';
    if (n >= 100) {
      res += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 10 && n < 20) {
      res += teens[n - 10] + ' ';
    } else if (n >= 20) {
      res += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
      if (n > 0) res += ones[n] + ' ';
    } else if (n > 0) {
      res += ones[n] + ' ';
    }
    return res;
  }

  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n) || n === null || n === undefined) return '';

  if (n === 0) return 'Zero Qatari Riyals Only';

  let integerStr = '';
  // Ensure we handle fixed decimals for precision
  const fixedNum = n.toFixed(2);
  const [wholePartStr, decimalPartStr] = fixedNum.split('.');
  let wholePart = parseInt(wholePartStr);
  const decimalPart = parseInt(decimalPartStr);

  if (wholePart === 0) {
    integerStr = 'Zero ';
  } else {
    // Millions
    if (wholePart >= 1000000) {
      integerStr += convertGroup(Math.floor(wholePart / 1000000)) + 'Million ';
      wholePart %= 1000000;
    }
    // Thousands
    if (wholePart >= 10000) {
      integerStr += convertGroup(Math.floor(wholePart / 1000)) + 'Thousand ';
      wholePart %= 1000;
    } else if (wholePart >= 1000) {
      integerStr += ones[Math.floor(wholePart / 1000)] + ' Thousand ';
      wholePart %= 1000;
    }
    // Hundreds
    if (wholePart > 0) {
      integerStr += convertGroup(wholePart);
    }
  }

  let finalWords = integerStr.trim() + ' Qatari Riyals';

  if (decimalPart > 0) {
    finalWords += ' and ' + convertGroup(decimalPart).trim() + ' Dirhams';
  }

  return finalWords + ' Only';
}
