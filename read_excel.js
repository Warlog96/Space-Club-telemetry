const XLSX = require('xlsx');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, '..', 'YT.xlsx'));
console.log('Sheets:', wb.SheetNames);

wb.SheetNames.forEach(name => {
    const ws = wb.Sheets[name];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
    console.log('\n=== Sheet:', name, '===');
    console.log('Total rows:', data.length);
    data.slice(0, 8).forEach((row, i) => {
        console.log('Row', i, ':', JSON.stringify(row));
    });
});
